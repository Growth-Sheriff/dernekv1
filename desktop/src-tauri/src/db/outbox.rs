// Outbox: yerel yazım + sync kuyruğu kaydı aynı SQLite transaction'ında atılır.
// Snapshot ve upsert kolon listeleri PRAGMA table_info'dan türetilir; el yazımı
// kolon listesi olmadığı için şema değişikliklerinde payload drift'i oluşmaz.
use diesel::prelude::*;
use diesel::sqlite::SqliteConnection;

/// Sync yüzeyi: yalnızca bu tablolar sunucuyla senkronize edilir.
/// Listede olmayan tablolar bilinçli olarak yerel kalır (toplantilar, belgeler,
/// butce, demirbaslar, cariler, koy_*, vadeli_islemler).
pub const SYNCED_TABLES: [&str; 9] = [
    "uyeler",
    "gelirler",
    "giderler",
    "kasalar",
    "aidat_takip",
    "virmanlar",
    "gelir_turleri",
    "gider_turleri",
    "etkinlikler",
];

/// Yerelde baz kayıtlardan yeniden hesaplanan alanlar; sync payload'ına girmez
/// ve sunucudan gelen değerleri yok sayılır.
fn derived_fields(table_name: &str) -> &'static [&'static str] {
    match table_name {
        "kasalar" => &[
            "bakiye",
            "toplam_gelir",
            "toplam_gider",
            "virman_giris",
            "virman_cikis",
            "fiziksel_bakiye",
            "tahakkuk_tutari",
            "serbest_bakiye",
        ],
        _ => &[],
    }
}

pub fn is_synced_table(table_name: &str) -> bool {
    SYNCED_TABLES.contains(&table_name)
}

/// CRUD komutlarının `conn.transaction` bloklarında hem diesel hem String
/// hatalarını taşıyabilmesi için ortak hata tipi.
#[derive(Debug)]
pub enum TxError {
    Diesel(diesel::result::Error),
    Msg(String),
}

impl From<diesel::result::Error> for TxError {
    fn from(e: diesel::result::Error) -> Self {
        TxError::Diesel(e)
    }
}

impl std::fmt::Display for TxError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TxError::Diesel(e) => write!(f, "{}", e),
            TxError::Msg(m) => write!(f, "{}", m),
        }
    }
}

#[derive(QueryableByName)]
struct ColumnName {
    #[diesel(sql_type = diesel::sql_types::Text)]
    name: String,
}

#[derive(QueryableByName)]
struct JsonRow {
    #[diesel(sql_type = diesel::sql_types::Text)]
    json: String,
}

#[derive(QueryableByName)]
struct CountRow {
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    count: i64,
}

#[derive(QueryableByName)]
struct OpRow {
    #[diesel(sql_type = diesel::sql_types::Text)]
    operation: String,
}

/// Tablonun gerçek kolon listesi. Tablo adı SYNCED_TABLES beyaz listesinden
/// geldiği için interpolasyon güvenlidir.
fn table_columns(conn: &mut SqliteConnection, table_name: &str) -> Result<Vec<String>, String> {
    if !is_synced_table(table_name) {
        return Err(format!("Sync dışı tablo: {}", table_name));
    }
    let rows: Vec<ColumnName> = diesel::sql_query(format!(
        "SELECT name FROM pragma_table_info('{}')",
        table_name
    ))
    .load(conn)
    .map_err(|e| e.to_string())?;
    if rows.is_empty() {
        return Err(format!("Tablo bulunamadı: {}", table_name));
    }
    Ok(rows.into_iter().map(|r| r.name).collect())
}

/// Satırın tam JSON snapshot'ı (version/is_deleted dahil). Kayıt yoksa None.
pub fn snapshot_row(
    conn: &mut SqliteConnection,
    table_name: &str,
    record_id: &str,
    tenant_id: &str,
) -> Result<Option<serde_json::Value>, String> {
    let cols = table_columns(conn, table_name)?;
    let pairs: Vec<String> = cols
        .iter()
        .map(|c| format!("'{}', \"{}\"", c, c))
        .collect();
    let sql = format!(
        "SELECT json_object({}) AS json FROM \"{}\" WHERE id = ?1 AND tenant_id = ?2",
        pairs.join(", "),
        table_name
    );
    let row: Option<JsonRow> = diesel::sql_query(sql)
        .bind::<diesel::sql_types::Text, _>(record_id)
        .bind::<diesel::sql_types::Text, _>(tenant_id)
        .get_result(conn)
        .optional()
        .map_err(|e| e.to_string())?;
    match row {
        Some(r) => serde_json::from_str(&r.json)
            .map(Some)
            .map_err(|e| e.to_string()),
        None => Ok(None),
    }
}

fn strip_derived(table_name: &str, data: &mut serde_json::Value) {
    if let serde_json::Value::Object(map) = data {
        for f in derived_fields(table_name) {
            map.remove(*f);
        }
    }
}

/// Bekleyen (synced=0) değişikliği kayıt bazında tekilleştirerek kuyruğa yazar.
/// create -> update = create; create -> delete = kuyruktan düşer (sunucu hiç görmedi);
/// diğer tüm kombinasyonlar son operasyona indirgenir.
/// ÇAĞRI KURALI: veri yazımıyla aynı transaction içinde çağrılmalıdır.
pub fn queue_change(
    conn: &mut SqliteConnection,
    tenant_id: &str,
    table_name: &str,
    record_id: &str,
    operation: &str,
) -> Result<(), String> {
    if !is_synced_table(table_name) {
        return Ok(());
    }

    let prev_op: Option<String> = diesel::sql_query(
        "SELECT operation FROM sync_changes \
         WHERE tenant_id = ?1 AND table_name = ?2 AND record_id = ?3 AND synced = 0 \
         ORDER BY created_at DESC LIMIT 1",
    )
    .bind::<diesel::sql_types::Text, _>(tenant_id)
    .bind::<diesel::sql_types::Text, _>(table_name)
    .bind::<diesel::sql_types::Text, _>(record_id)
    .get_result::<OpRow>(conn)
    .optional()
    .map_err(|e| e.to_string())?
    .map(|r| r.operation);

    let merged_op = match (prev_op.as_deref(), operation) {
        (Some("create"), "delete") => {
            // Sunucuya hiç gitmemiş kayıt silindi: kuyruğu temizle, hiç gönderme.
            clear_pending(conn, tenant_id, table_name, record_id)?;
            return Ok(());
        }
        (Some("create"), _) => "create",
        (_, op) => op,
    };

    let data = if merged_op == "delete" {
        // Tombstone: silinen satır artık okunamayabilir, minimal payload yeterli.
        serde_json::json!({
            "id": record_id,
            "tenant_id": tenant_id,
            "is_deleted": 1,
        })
    } else {
        let mut snap = snapshot_row(conn, table_name, record_id, tenant_id)?
            .ok_or_else(|| {
                format!(
                    "Outbox snapshot bulunamadı: {} / {} — queue_change yazımdan SONRA çağrılmalı",
                    table_name, record_id
                )
            })?;
        strip_derived(table_name, &mut snap);
        snap
    };

    clear_pending(conn, tenant_id, table_name, record_id)?;

    let change_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S%.3f").to_string();
    diesel::sql_query(
        "INSERT INTO sync_changes (id, tenant_id, table_name, record_id, operation, data, synced, sync_version, created_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 0, ?7)",
    )
    .bind::<diesel::sql_types::Text, _>(&change_id)
    .bind::<diesel::sql_types::Text, _>(tenant_id)
    .bind::<diesel::sql_types::Text, _>(table_name)
    .bind::<diesel::sql_types::Text, _>(record_id)
    .bind::<diesel::sql_types::Text, _>(merged_op)
    .bind::<diesel::sql_types::Text, _>(data.to_string())
    .bind::<diesel::sql_types::Text, _>(&now)
    .execute(conn)
    .map_err(|e| e.to_string())?;

    Ok(())
}

fn clear_pending(
    conn: &mut SqliteConnection,
    tenant_id: &str,
    table_name: &str,
    record_id: &str,
) -> Result<(), String> {
    diesel::sql_query(
        "DELETE FROM sync_changes \
         WHERE tenant_id = ?1 AND table_name = ?2 AND record_id = ?3 AND synced = 0",
    )
    .bind::<diesel::sql_types::Text, _>(tenant_id)
    .bind::<diesel::sql_types::Text, _>(table_name)
    .bind::<diesel::sql_types::Text, _>(record_id)
    .execute(conn)
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Kayıt için bekleyen yerel değişiklik var mı? (Pull sırasında yerel
/// beklemedeki düzenlemenin üzerine yazılmasını engellemek için.)
pub fn has_pending_change(
    conn: &mut SqliteConnection,
    tenant_id: &str,
    table_name: &str,
    record_id: &str,
) -> Result<bool, String> {
    let row: CountRow = diesel::sql_query(
        "SELECT COUNT(*) AS count FROM sync_changes \
         WHERE tenant_id = ?1 AND table_name = ?2 AND record_id = ?3 AND synced = 0",
    )
    .bind::<diesel::sql_types::Text, _>(tenant_id)
    .bind::<diesel::sql_types::Text, _>(table_name)
    .bind::<diesel::sql_types::Text, _>(record_id)
    .get_result(conn)
    .map_err(|e| e.to_string())?;
    Ok(row.count > 0)
}

/// Sunucudan gelen kaydı jenerik upsert ile uygular. Payload'daki kolonlar
/// gerçek tablo kolonlarıyla kesiştirilir; değerler tek JSON parametresinden
/// json_extract ile okunur (tip güvenli, injection güvenli).
/// Türetilmiş alanlar uygulanmaz; version alanı sunucu değeriyle yazılır.
pub fn apply_remote_upsert(
    conn: &mut SqliteConnection,
    tenant_id: &str,
    table_name: &str,
    record_id: &str,
    data: &serde_json::Value,
) -> Result<(), String> {
    let cols = table_columns(conn, table_name)?;
    let derived = derived_fields(table_name);

    let obj = match data {
        serde_json::Value::Object(m) => m,
        _ => return Err("Geçersiz sync payload: obje bekleniyordu".to_string()),
    };

    let mut apply_cols: Vec<&str> = Vec::new();
    for c in &cols {
        if c == "id" || c == "tenant_id" {
            continue;
        }
        if derived.contains(&c.as_str()) {
            continue;
        }
        if obj.contains_key(c) {
            apply_cols.push(c);
        }
    }

    let payload = data.to_string();

    let insert_cols: Vec<String> = apply_cols.iter().map(|c| format!("\"{}\"", c)).collect();
    let insert_vals: Vec<String> = apply_cols
        .iter()
        .map(|c| format!("json_extract(?3, '$.{}')", c))
        .collect();
    let update_sets: Vec<String> = apply_cols
        .iter()
        .map(|c| format!("\"{}\" = excluded.\"{}\"", c, c))
        .collect();

    let sql = if update_sets.is_empty() {
        format!(
            "INSERT INTO \"{}\" (id, tenant_id) VALUES (?1, ?2) ON CONFLICT(id) DO NOTHING",
            table_name
        )
    } else {
        format!(
            "INSERT INTO \"{}\" (id, tenant_id, {}) VALUES (?1, ?2, {}) \
             ON CONFLICT(id) DO UPDATE SET {} WHERE tenant_id = ?2",
            table_name,
            insert_cols.join(", "),
            insert_vals.join(", "),
            update_sets.join(", ")
        )
    };

    diesel::sql_query(sql)
        .bind::<diesel::sql_types::Text, _>(record_id)
        .bind::<diesel::sql_types::Text, _>(tenant_id)
        .bind::<diesel::sql_types::Text, _>(&payload)
        .execute(conn)
        .map_err(|e| format!("apply_remote_upsert {} {}: {}", table_name, record_id, e))?;

    Ok(())
}

/// Sunucudan gelen silmeyi tombstone olarak uygular (is_deleted = 1).
pub fn apply_remote_delete(
    conn: &mut SqliteConnection,
    tenant_id: &str,
    table_name: &str,
    record_id: &str,
    server_version: Option<i64>,
) -> Result<(), String> {
    let cols = table_columns(conn, table_name)?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    if cols.iter().any(|c| c == "is_deleted") {
        let version_set = if cols.iter().any(|c| c == "version") {
            match server_version {
                Some(v) => format!(", version = {}", v),
                None => String::new(),
            }
        } else {
            String::new()
        };
        diesel::sql_query(format!(
            "UPDATE \"{}\" SET is_deleted = 1, updated_at = ?1{} WHERE id = ?2 AND tenant_id = ?3",
            table_name, version_set
        ))
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(record_id)
        .bind::<diesel::sql_types::Text, _>(tenant_id)
        .execute(conn)
        .map_err(|e| e.to_string())?;
    } else {
        diesel::sql_query(format!(
            "DELETE FROM \"{}\" WHERE id = ?1 AND tenant_id = ?2",
            table_name
        ))
        .bind::<diesel::sql_types::Text, _>(record_id)
        .bind::<diesel::sql_types::Text, _>(tenant_id)
        .execute(conn)
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Sunucu ack'i sonrası kaydın versiyonunu sunucunun verdiği değere çeker.
pub fn set_row_version(
    conn: &mut SqliteConnection,
    tenant_id: &str,
    table_name: &str,
    record_id: &str,
    version: i64,
) -> Result<(), String> {
    if !is_synced_table(table_name) {
        return Ok(());
    }
    let cols = table_columns(conn, table_name)?;
    if !cols.iter().any(|c| c == "version") {
        return Ok(());
    }
    diesel::sql_query(format!(
        "UPDATE \"{}\" SET version = ?1 WHERE id = ?2 AND tenant_id = ?3",
        table_name
    ))
    .bind::<diesel::sql_types::BigInt, _>(version)
    .bind::<diesel::sql_types::Text, _>(record_id)
    .bind::<diesel::sql_types::Text, _>(tenant_id)
    .execute(conn)
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ============================================================================
// TESTLER — in-memory SQLite ile outbox garantileri
// ============================================================================
#[cfg(test)]
mod tests {
    use super::*;
    use diesel::Connection;

    fn setup() -> SqliteConnection {
        let mut conn = SqliteConnection::establish(":memory:").unwrap();
        diesel::sql_query(
            "CREATE TABLE sync_changes (
                id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, table_name TEXT NOT NULL,
                record_id TEXT NOT NULL, operation TEXT NOT NULL, data TEXT,
                synced INTEGER DEFAULT 0, sync_version INTEGER DEFAULT 0, created_at TEXT,
                updated_at TEXT)",
        )
        .execute(&mut conn)
        .unwrap();
        diesel::sql_query(
            "CREATE TABLE kasalar (
                id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, kasa_adi TEXT,
                bakiye REAL DEFAULT 0, para_birimi TEXT DEFAULT 'TRY',
                devir_bakiye REAL DEFAULT 0, toplam_gelir REAL DEFAULT 0,
                toplam_gider REAL DEFAULT 0, virman_giris REAL DEFAULT 0,
                virman_cikis REAL DEFAULT 0, fiziksel_bakiye REAL DEFAULT 0,
                tahakkuk_tutari REAL DEFAULT 0, serbest_bakiye REAL DEFAULT 0,
                is_active INTEGER DEFAULT 1, version INTEGER DEFAULT 1,
                is_deleted INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT)",
        )
        .execute(&mut conn)
        .unwrap();
        diesel::sql_query(
            "INSERT INTO kasalar (id, tenant_id, kasa_adi, bakiye, devir_bakiye, created_at, updated_at)
             VALUES ('k1', 't1', 'Ana Kasa', 500.0, 100.0, '2026-01-01', '2026-01-01')",
        )
        .execute(&mut conn)
        .unwrap();
        conn
    }

    #[derive(QueryableByName)]
    struct PendingRow {
        #[diesel(sql_type = diesel::sql_types::Text)]
        operation: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        data: String,
    }

    fn pending(conn: &mut SqliteConnection) -> Vec<PendingRow> {
        diesel::sql_query(
            "SELECT operation, data FROM sync_changes WHERE synced = 0 ORDER BY created_at",
        )
        .load(conn)
        .unwrap()
    }

    #[test]
    fn queue_dedupe_ve_merge() {
        let mut conn = setup();

        // create + update = tek satır, op=create
        queue_change(&mut conn, "t1", "kasalar", "k1", "create").unwrap();
        queue_change(&mut conn, "t1", "kasalar", "k1", "update").unwrap();
        let p = pending(&mut conn);
        assert_eq!(p.len(), 1);
        assert_eq!(p[0].operation, "create");

        // create + delete = kuyruk boşalır (sunucu hiç görmedi)
        queue_change(&mut conn, "t1", "kasalar", "k1", "delete").unwrap();
        assert_eq!(pending(&mut conn).len(), 0);

        // update + delete = delete kalır
        queue_change(&mut conn, "t1", "kasalar", "k1", "update").unwrap();
        queue_change(&mut conn, "t1", "kasalar", "k1", "delete").unwrap();
        let p = pending(&mut conn);
        assert_eq!(p.len(), 1);
        assert_eq!(p[0].operation, "delete");
        let data: serde_json::Value = serde_json::from_str(&p[0].data).unwrap();
        assert_eq!(data["is_deleted"], 1);
    }

    #[test]
    fn snapshot_turetilmis_alanlari_ayiklar() {
        let mut conn = setup();
        queue_change(&mut conn, "t1", "kasalar", "k1", "update").unwrap();
        let p = pending(&mut conn);
        let data: serde_json::Value = serde_json::from_str(&p[0].data).unwrap();
        // Baz alanlar payload'da
        assert_eq!(data["kasa_adi"], "Ana Kasa");
        assert_eq!(data["devir_bakiye"], 100.0);
        assert_eq!(data["version"], 1);
        // Türetilmiş alanlar AYIKLANDI
        assert!(data.get("bakiye").is_none());
        assert!(data.get("toplam_gelir").is_none());
        assert!(data.get("serbest_bakiye").is_none());
    }

    #[test]
    fn sync_disi_tablo_kuyruga_girmez() {
        let mut conn = setup();
        queue_change(&mut conn, "t1", "toplantilar", "x1", "create").unwrap();
        assert_eq!(pending(&mut conn).len(), 0);
    }

    #[test]
    fn apply_remote_upsert_turetilmisleri_uygulamaz() {
        let mut conn = setup();
        let data = serde_json::json!({
            "id": "k1", "tenant_id": "t1", "kasa_adi": "Yeni Ad",
            "devir_bakiye": 250.0,
            "bakiye": 99999.0,
            "bilinmeyen_alan": "yok",
            "version": 7
        });
        apply_remote_upsert(&mut conn, "t1", "kasalar", "k1", &data).unwrap();

        let snap = snapshot_row(&mut conn, "kasalar", "k1", "t1").unwrap().unwrap();
        assert_eq!(snap["kasa_adi"], "Yeni Ad");
        assert_eq!(snap["devir_bakiye"], 250.0);
        assert_eq!(snap["bakiye"], 500.0); // türetilmiş alan dokunulmadı
        assert_eq!(snap["version"], 7);    // sunucu versiyonu yazıldı
    }

    #[test]
    fn apply_remote_upsert_yeni_kayit_insert_eder() {
        let mut conn = setup();
        let data = serde_json::json!({
            "id": "k2", "tenant_id": "t1", "kasa_adi": "İkinci", "version": 1
        });
        apply_remote_upsert(&mut conn, "t1", "kasalar", "k2", &data).unwrap();
        let snap = snapshot_row(&mut conn, "kasalar", "k2", "t1").unwrap().unwrap();
        assert_eq!(snap["kasa_adi"], "İkinci");
    }

    #[test]
    fn apply_remote_delete_tombstone() {
        let mut conn = setup();
        apply_remote_delete(&mut conn, "t1", "kasalar", "k1", Some(4)).unwrap();
        let snap = snapshot_row(&mut conn, "kasalar", "k1", "t1").unwrap().unwrap();
        assert_eq!(snap["is_deleted"], 1);
        assert_eq!(snap["version"], 4);
    }

    #[test]
    fn pending_varsa_bilinir() {
        let mut conn = setup();
        assert!(!has_pending_change(&mut conn, "t1", "kasalar", "k1").unwrap());
        queue_change(&mut conn, "t1", "kasalar", "k1", "update").unwrap();
        assert!(has_pending_change(&mut conn, "t1", "kasalar", "k1").unwrap());
    }

    #[test]
    fn set_row_version_gunceller() {
        let mut conn = setup();
        set_row_version(&mut conn, "t1", "kasalar", "k1", 9).unwrap();
        let snap = snapshot_row(&mut conn, "kasalar", "k1", "t1").unwrap().unwrap();
        assert_eq!(snap["version"], 9);
    }
}
