use diesel::prelude::*;
use diesel::r2d2::{ConnectionManager, Pool};
use diesel::sqlite::SqliteConnection;
use serde::{Deserialize, Serialize};
use tauri::State;
use reqwest;
use std::collections::HashMap;

type DbPool = Pool<ConnectionManager<SqliteConnection>>;

#[derive(Debug, Serialize, Deserialize, Queryable, Selectable)]
#[diesel(table_name = crate::db::schema::sync_changes)]
pub struct SyncChange {
    pub id: String,
    pub tenant_id: String,
    pub table_name: String,
    pub record_id: String,
    pub operation: String,
    pub data: String,
    pub synced: bool,
    pub sync_version: i32,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct SyncStatus {
    pub pending_changes: i32,
    pub last_sync_at: Option<String>,
    pub is_syncing: bool,
}

#[derive(Debug, Serialize)]
pub struct SyncResult {
    pub success: bool,
    pub synced_count: i32,
    pub failed_count: i32,
    pub errors: Vec<String>,
}

#[tauri::command]
pub fn get_sync_status(
    state: State<'_, crate::AppState>,
    _tenant_id_param: String,
) -> Result<SyncStatus, String> {
    use crate::db::schema::sync_changes::dsl::*;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let pending: i64 = sync_changes
        .filter(crate::db::schema::sync_changes::tenant_id.eq(&_tenant_id_param))
        .filter(synced.eq(false))
        .count()
        .get_result(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(SyncStatus {
        pending_changes: pending as i32,
        last_sync_at: None,
        is_syncing: false,
    })
}

#[tauri::command]
pub fn get_pending_changes(
    state: State<'_, crate::AppState>,
    _tenant_id_param: String,
    limit: i64,
) -> Result<Vec<SyncChange>, String> {
    use crate::db::schema::sync_changes::dsl::*;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let changes = sync_changes
        .filter(crate::db::schema::sync_changes::tenant_id.eq(&_tenant_id_param))
        .filter(synced.eq(false))
        .order(created_at.asc())
        .limit(limit)
        .load::<SyncChange>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(changes)
}

#[derive(Debug, Serialize)]
struct SyncPushRequest {
    pub changes: Vec<SyncChangePayload>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SyncChangePayload {
    pub table_name: String,
    pub record_id: String,
    pub action: String,
    pub data: serde_json::Value,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
struct SyncPullRequest {
    pub tenant_id: String,
    pub last_sync_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SyncPullResponse {
    pub changes: Vec<SyncChangePayload>,
}

#[tauri::command]
pub async fn push_changes(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    api_url: String,
    auth_token: String,
) -> Result<SyncResult, String> {
    use crate::db::schema::sync_changes::dsl::*;

    let changes_db = {
        let pool = state.db.lock().unwrap();
        let pool = pool.as_ref().ok_or("Database not initialized")?;
        let mut conn = pool.get().map_err(|e| e.to_string())?;

        sync_changes
            .filter(crate::db::schema::sync_changes::tenant_id.eq(&tenant_id_param))
            .filter(synced.eq(false))
            .limit(50)
            .load::<SyncChange>(&mut conn)
            .map_err(|e| e.to_string())?
    };

    if changes_db.is_empty() {
        return Ok(SyncResult {
            success: true,
            synced_count: 0,
            failed_count: 0,
            errors: vec![],
        });
    }

    let payload_changes: Vec<SyncChangePayload> = changes_db.iter().map(|c| {
        SyncChangePayload {
            table_name: c.table_name.clone(),
            record_id: c.record_id.clone(),
            action: c.operation.clone(),
            data: serde_json::from_str(&c.data).unwrap_or(serde_json::Value::Null),
            updated_at: c.created_at.clone(),
        }
    }).collect();

    let request = SyncPushRequest {
        changes: payload_changes,
    };

    let client = reqwest::Client::new();
    let endpoint = format!("{}/api/v1/sync/push", api_url);

    match client
        .post(&endpoint)
        .header("Authorization", format!("Bearer {}", auth_token))
        .json(&request)
        .send()
        .await
    {
        Ok(resp) => {
            if resp.status().is_success() {
                // Mark as synced
                let pool = state.db.lock().unwrap();
                let pool = pool.as_ref().ok_or("Database not initialized")?;
                let mut conn = pool.get().map_err(|e| e.to_string())?;
                
                let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
                let ids: Vec<String> = changes_db.iter().map(|c| c.id.clone()).collect();
                
                for sync_id in ids {
                     diesel::sql_query(
                        "UPDATE sync_changes SET synced = 1, updated_at = ?1 WHERE id = ?2"
                    )
                    .bind::<diesel::sql_types::Text, _>(&now)
                    .bind::<diesel::sql_types::Text, _>(sync_id)
                    .execute(&mut conn)
                    .map_err(|e| e.to_string())?;
                }

                Ok(SyncResult {
                    success: true,
                    synced_count: changes_db.len() as i32,
                    failed_count: 0,
                    errors: vec![],
                })
            } else {
                Ok(SyncResult {
                    success: false,
                    synced_count: 0,
                    failed_count: changes_db.len() as i32,
                    errors: vec![format!("Push failed: HTTP {}", resp.status())],
                })
            }
        }
        Err(e) => Ok(SyncResult {
            success: false,
            synced_count: 0,
            failed_count: changes_db.len() as i32,
            errors: vec![format!("Network error: {}", e)],
        }),
    }
}

#[tauri::command]
pub async fn pull_changes(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    api_url: String,
    auth_token: String,
    since_version: i32,
) -> Result<SyncResult, String> {
    // Note: since_version parameter is unused in new logic, we rely on last_sync_at logic if implemented,
    // or we just fetch everything? Backend expects nothing for full sync implies delta? 
    // Actually our backend SyncPullRequest takes (tenant_id, last_sync_at).
    
    let client = reqwest::Client::new();
    let endpoint = format!("{}/api/v1/sync/pull", api_url);

    let request = SyncPullRequest {
        tenant_id: tenant_id_param.clone(),
        last_sync_at: None, // TODO: Store/Retrieve last sync time from DB
    };

    match client
        .post(&endpoint)
        .header("Authorization", format!("Bearer {}", auth_token))
        .json(&request)
        .send()
        .await
    {
        Ok(resp) => {
            if resp.status().is_success() {
                 let pull_resp = resp.json::<SyncPullResponse>().await.map_err(|e| e.to_string())?;
                 
                 // Apply changes
                 // We reuse apply_sync_changes logic bit below, but need to reconstruct Value objects
                 // Or just call internal logic
                 
                 // Converting payload back to Values
                 let mut values = Vec::new();
                 for ch in pull_resp.changes {
                     let v = serde_json::json!({
                         "table_name": ch.table_name,
                         "record_id": ch.record_id,
                         "action": ch.action,
                         "data": ch.data,
                         "local_updated_at": ch.updated_at
                     });
                     values.push(v);
                 }
                 
                 let applied = apply_sync_changes(state, tenant_id_param, values)?;
                 
                Ok(SyncResult {
                    success: true,
                    synced_count: applied,
                    failed_count: 0,
                    errors: vec![],
                })
            } else {
                Err(format!("Pull failed: HTTP {}", resp.status()))
            }
        }
        Err(e) => Err(format!("Network error: {}", e)),
    }
}

#[tauri::command]
pub async fn manual_sync(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    api_url: String,
    auth_token: String,
) -> Result<SyncResult, String> {
    let push_result = push_changes(state.clone(), tenant_id_param.clone(), api_url.clone(), auth_token.clone()).await?;
    
    // Only pull if push was successful (or partial)
    let pull_result = pull_changes(state, tenant_id_param, api_url, auth_token, 0).await?;

    Ok(SyncResult {
        success: push_result.success && pull_result.success,
        synced_count: push_result.synced_count + pull_result.synced_count,
        failed_count: push_result.failed_count + pull_result.failed_count,
        errors: [push_result.errors, pull_result.errors].concat(),
    })
}

/// Bekleyen sync değişikliklerinin sayısını döndür
#[tauri::command]
pub fn get_pending_sync_count(
    state: State<'_, crate::AppState>,
    tenantIdParam: String,
) -> Result<i32, String> {
    use crate::db::schema::sync_changes::dsl::*;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let count: i64 = sync_changes
        .filter(crate::db::schema::sync_changes::tenant_id.eq(&tenantIdParam))
        .filter(synced.eq(false))
        .count()
        .get_result(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(count as i32)
}

// ============================================================================
// SYNC v3 — TEK YAZAR MERKEZİ
// Kuyruk kaydı db::outbox üzerinden, veri yazımıyla aynı transaction içinde
// üretilir. Aşağıdaki komutlar TS syncService'in POST /sync/sync akışını besler.
// ============================================================================

/// Bekleyen değişiklikleri ServerSyncChange formatında döndür.
/// change_id: ack sonrası işaretleme için sync_changes.id.
#[tauri::command]
pub fn get_pending_sync_changes(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
) -> Result<Vec<serde_json::Value>, String> {
    use crate::db::schema::sync_changes::dsl::*;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let changes = sync_changes
        .filter(crate::db::schema::sync_changes::tenant_id.eq(&tenant_id_param))
        .filter(synced.eq(false))
        .order(created_at.asc())
        .load::<SyncChange>(&mut conn)
        .map_err(|e| e.to_string())?;

    let result: Vec<serde_json::Value> = changes
        .iter()
        .map(|c| {
            let data_val: serde_json::Value =
                serde_json::from_str(&c.data).unwrap_or(serde_json::Value::Null);
            let version = data_val
                .get("version")
                .and_then(|v| v.as_i64())
                .unwrap_or(1);
            let op = match c.operation.as_str() {
                "create" => "insert",
                "delete" => "delete",
                _ => "update",
            };
            serde_json::json!({
                "change_id": c.id,
                "table": c.table_name,
                "id": c.record_id,
                "operation": op,
                "data": data_val,
                "version": version,
                "changed_at": c.created_at,
            })
        })
        .collect();

    Ok(result)
}

/// Sunucu ack'i: sync_changes satırını synced=1 yapar ve veri satırının
/// versiyonunu sunucunun verdiği yeni değere çeker.
/// entries: [{change_id, table, id, version}]
#[tauri::command]
pub fn mark_changes_synced(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    entries: Vec<serde_json::Value>,
) -> Result<i32, String> {
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut pooled = pool.get().map_err(|e| e.to_string())?;
    let conn: &mut SqliteConnection = &mut pooled;

    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let mut updated = 0;

    for entry in &entries {
        let change_id = entry.get("change_id").and_then(|v| v.as_str());
        let table = entry.get("table").and_then(|v| v.as_str()).unwrap_or("");
        let record_id = entry.get("id").and_then(|v| v.as_str()).unwrap_or("");
        let new_version = entry.get("version").and_then(|v| v.as_i64());

        let marked = match change_id {
            Some(cid) => diesel::sql_query(
                "UPDATE sync_changes SET synced = 1, updated_at = ?1 WHERE id = ?2 AND tenant_id = ?3",
            )
            .bind::<diesel::sql_types::Text, _>(&now)
            .bind::<diesel::sql_types::Text, _>(cid)
            .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
            .execute(conn),
            None => diesel::sql_query(
                "UPDATE sync_changes SET synced = 1, updated_at = ?1 \
                 WHERE tenant_id = ?2 AND table_name = ?3 AND record_id = ?4 AND synced = 0",
            )
            .bind::<diesel::sql_types::Text, _>(&now)
            .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
            .bind::<diesel::sql_types::Text, _>(table)
            .bind::<diesel::sql_types::Text, _>(record_id)
            .execute(conn),
        };

        if marked.is_ok() {
            updated += 1;
        }

        if let Some(v) = new_version {
            if !table.is_empty() && !record_id.is_empty() {
                let _ = crate::db::outbox::set_row_version(
                    conn,
                    &tenant_id_param,
                    table,
                    record_id,
                    v,
                );
            }
        }
    }

    Ok(updated)
}

/// GERİYE UYUMLULUK: eski sayfalar hâlâ bu komutu çağırıyor olabilir.
/// Artık payload'daki data yok sayılır; outbox DB'deki güncel satırdan
/// snapshot alır ve kayıt bazında tekilleştirir (çift çağrı zararsızdır).
#[tauri::command]
pub fn queue_sync_change(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    change: serde_json::Value,
) -> Result<String, String> {
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut pooled = pool.get().map_err(|e| e.to_string())?;
    let conn: &mut SqliteConnection = &mut pooled;

    let table_name = change
        .get("table_name")
        .or_else(|| change.get("table"))
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let record_id = change
        .get("record_id")
        .or_else(|| change.get("id"))
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let action = change
        .get("action")
        .or_else(|| change.get("operation"))
        .and_then(|v| v.as_str())
        .unwrap_or("update");

    if table_name.is_empty() || record_id.is_empty() {
        return Err("table_name ve record_id zorunlu".to_string());
    }

    crate::db::outbox::queue_change(conn, &tenant_id_param, table_name, record_id, action)?;
    Ok(record_id.to_string())
}

enum ApplyError {
    Diesel(diesel::result::Error),
    Msg(String),
}

impl From<diesel::result::Error> for ApplyError {
    fn from(e: diesel::result::Error) -> Self {
        ApplyError::Diesel(e)
    }
}

/// Sunucudan gelen değişiklikleri TEK transaction içinde uygular.
/// - Yerel bekleyen değişikliği olan kayıtlar atlanır (çatışma push'ta
///   versiyon kontrolüyle çözülür; pull yerel düzenlemeyi ezmez).
/// - Silmeler tombstone (is_deleted=1) olarak uygulanır.
/// - Uygulama sonrası etkilenen kasaların bakiyesi baz kayıtlardan
///   yeniden hesaplanır (türetilmiş alanlar sync edilmez).
#[tauri::command]
pub fn apply_sync_changes(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    changes: Vec<serde_json::Value>,
) -> Result<i32, String> {
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut pooled = pool.get().map_err(|e| e.to_string())?;
    let conn: &mut SqliteConnection = &mut pooled;

    let mut applied: i32 = 0;
    let mut skipped: i32 = 0;

    let tx_result = conn.transaction::<_, ApplyError, _>(|conn| {
        let mut affected_kasalar: std::collections::HashSet<String> =
            std::collections::HashSet::new();

        for change in &changes {
            let table_name = change
                .get("table_name")
                .or_else(|| change.get("table"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let record_id = change
                .get("record_id")
                .or_else(|| change.get("id"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let action = change
                .get("action")
                .or_else(|| change.get("operation"))
                .and_then(|v| v.as_str())
                .unwrap_or("update");
            let data = change
                .get("data")
                .cloned()
                .unwrap_or(serde_json::Value::Null);

            if !crate::db::outbox::is_synced_table(table_name) || record_id.is_empty() {
                println!("⚠️ Sync dışı tablo veya kayıt atlandı: {} / {}", table_name, record_id);
                continue;
            }

            // Yerel bekleyen değişiklik varsa sunucu verisi uygulanmaz.
            if crate::db::outbox::has_pending_change(conn, &tenant_id_param, table_name, record_id)
                .map_err(ApplyError::Msg)?
            {
                skipped += 1;
                println!("⏭️ Yerel bekleyen değişiklik var, atlandı: {} / {}", table_name, record_id);
                continue;
            }

            let is_delete = action == "delete"
                || data
                    .get("is_deleted")
                    .map(|v| v.as_i64() == Some(1) || v.as_bool() == Some(true))
                    .unwrap_or(false);

            let server_version = change
                .get("version")
                .and_then(|v| v.as_i64())
                .or_else(|| data.get("version").and_then(|v| v.as_i64()));

            if is_delete {
                crate::db::outbox::apply_remote_delete(
                    conn,
                    &tenant_id_param,
                    table_name,
                    record_id,
                    server_version,
                )
                .map_err(ApplyError::Msg)?;
            } else {
                crate::db::outbox::apply_remote_upsert(
                    conn,
                    &tenant_id_param,
                    table_name,
                    record_id,
                    &data,
                )
                .map_err(ApplyError::Msg)?;
            }

            // Kasa bakiyesini etkileyen kayıtları topla.
            match table_name {
                "gelirler" | "giderler" => {
                    if let Some(kid) = data.get("kasa_id").and_then(|v| v.as_str()) {
                        affected_kasalar.insert(kid.to_string());
                    }
                }
                "virmanlar" => {
                    for f in ["kaynak_kasa_id", "hedef_kasa_id"] {
                        if let Some(kid) = data.get(f).and_then(|v| v.as_str()) {
                            affected_kasalar.insert(kid.to_string());
                        }
                    }
                }
                "kasalar" => {
                    affected_kasalar.insert(record_id.to_string());
                }
                _ => {}
            }

            applied += 1;
        }

        // Türetilmiş bakiyeler her zaman baz kayıtlardan yeniden hesaplanır.
        for kasa_id in &affected_kasalar {
            crate::commands::mali::update_kasa_bakiye(conn, kasa_id)?;
        }

        Ok(())
    });

    match tx_result {
        Ok(()) => {
            if skipped > 0 {
                println!("ℹ️ apply_sync_changes: {} uygulandı, {} yerel bekleyen nedeniyle atlandı", applied, skipped);
            }
            Ok(applied)
        }
        Err(ApplyError::Diesel(e)) => Err(format!("apply_sync_changes transaction hatası: {}", e)),
        Err(ApplyError::Msg(m)) => Err(format!("apply_sync_changes hatası: {}", m)),
    }
}

// CountResult helper struct for COUNT queries
#[derive(diesel::QueryableByName)]
struct CountResult {
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    count: i64,
}

/// Cihaz ID'sini döndür (hardware fingerprint) - PERSISTENT
#[tauri::command]
pub fn get_device_id() -> Result<String, String> {
    use std::fs;

    // Config dosyasından device_id oku
    let config_dir = dirs::config_dir()
        .ok_or("Config directory not found")?
        .join("bader");

    let device_id_file = config_dir.join("device_id.txt");

    // Eğer dosya varsa oku
    if device_id_file.exists() {
        if let Ok(stored_id) = fs::read_to_string(&device_id_file) {
            let trimmed = stored_id.trim();
            if !trimmed.is_empty() {
                return Ok(trimmed.to_string());
            }
        }
    }

    // Yoksa yeni generate et ve kaydet
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string());

    let device_id = format!("{}_{}", hostname, uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("0000"));

    // Config klasörünü oluştur
    fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;

    // Device ID'yi kaydet
    fs::write(&device_id_file, &device_id).map_err(|e| e.to_string())?;

    Ok(device_id)
}

