use tauri::State;
use diesel::prelude::*;
use chrono::Utc;
use uuid::Uuid;
use crate::state::AppState;
use serde::{Serialize, Deserialize};
use diesel::r2d2::{self, ConnectionManager, Pool};
use diesel::sqlite::SqliteConnection;

#[derive(Debug, Serialize, Deserialize, Queryable, QueryableByName)]
#[diesel(table_name = crate::db::schema::koy_kasalar)]
pub struct KoyKasa {
    pub id: String,
    pub tenant_id: String,
    pub kasa_adi: String,
    pub para_birimi: String,
    pub bakiye: f64,
    pub aciklama: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Queryable, QueryableByName)]
#[diesel(table_name = crate::db::schema::koy_gelirler)]
pub struct KoyGelir {
    pub id: String,
    pub tenant_id: String,
    pub kasa_id: String,
    pub gelir_turu: String,
    pub tarih: String,
    pub tutar: f64,
    pub aciklama: Option<String>,
    pub makbuz_no: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Queryable, QueryableByName)]
#[diesel(table_name = crate::db::schema::koy_giderler)]
pub struct KoyGider {
    pub id: String,
    pub tenant_id: String,
    pub kasa_id: String,
    pub gider_turu: String,
    pub tarih: String,
    pub tutar: f64,
    pub aciklama: Option<String>,
    pub fatura_no: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Queryable, QueryableByName)]
#[diesel(table_name = crate::db::schema::koy_virmanlar)]
pub struct KoyVirman {
    pub id: String,
    pub tenant_id: String,
    pub kaynak_kasa_id: String,
    pub hedef_kasa_id: String,
    pub tarih: String,
    pub tutar: f64,
    pub aciklama: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateKoyKasaRequest {
    pub kasa_adi: String,
    pub para_birimi: String,
    pub aciklama: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateKoyGelirRequest {
    pub kasa_id: String,
    pub gelir_turu: String,
    pub tarih: String,
    pub tutar: f64,
    pub aciklama: Option<String>,
    pub makbuz_no: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateKoyGelirRequest {
    pub kasa_id: Option<String>,
    pub gelir_turu: Option<String>,
    pub tarih: Option<String>,
    pub tutar: Option<f64>,
    pub aciklama: Option<String>,
    pub makbuz_no: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateKoyGiderRequest {
    pub kasa_id: String,
    pub gider_turu: String,
    pub tarih: String,
    pub tutar: f64,
    pub aciklama: Option<String>,
    pub fatura_no: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateKoyGiderRequest {
    pub kasa_id: Option<String>,
    pub gider_turu: Option<String>,
    pub tarih: Option<String>,
    pub tutar: Option<f64>,
    pub aciklama: Option<String>,
    pub fatura_no: Option<String>,
}

// KASA COMMANDS
#[tauri::command]
pub fn get_koy_kasalar(
    state: State<AppState>,
    tenant_id_param: String,
) -> Result<Vec<KoyKasa>, String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query(
        "SELECT * FROM koy_kasalar WHERE tenant_id = ?1 ORDER BY created_at DESC"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .load::<KoyKasa>(&mut conn)
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_koy_kasa(
    state: State<AppState>,
    tenant_id_param: String,
    data: CreateKoyKasaRequest,
) -> Result<KoyKasa, String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    let new_id = Uuid::new_v4().to_string();
    let now = Utc::now().naive_utc().to_string();

    {
        let db = state.db.lock().unwrap();
        let pool = db.as_ref().ok_or("Database not initialized")?;
        let mut conn = pool.get().map_err(|e| e.to_string())?;

        diesel::sql_query(
            "INSERT INTO koy_kasalar (id, tenant_id, kasa_adi, para_birimi, bakiye, aciklama, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, 0, ?5, 1, ?6, ?7)"
        )
        .bind::<diesel::sql_types::Text, _>(&new_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .bind::<diesel::sql_types::Text, _>(&data.kasa_adi)
        .bind::<diesel::sql_types::Text, _>(&data.para_birimi)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.aciklama)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&now)
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;
    }

    // Fetch the created record
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query("SELECT * FROM koy_kasalar WHERE id = ?1")
        .bind::<diesel::sql_types::Text, _>(&new_id)
        .get_result::<KoyKasa>(&mut conn)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_koy_kasa(
    state: State<AppState>,
    tenant_id_param: String,
    kasa_id: String,
    data: CreateKoyKasaRequest,
) -> Result<KoyKasa, String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    let now = Utc::now().naive_utc().to_string();

    {
        let db = state.db.lock().unwrap();
        let pool = db.as_ref().ok_or("Database not initialized")?;
        let mut conn = pool.get().map_err(|e| e.to_string())?;

        diesel::sql_query(
            "UPDATE koy_kasalar SET kasa_adi = ?1, para_birimi = ?2, aciklama = ?3, updated_at = ?4
             WHERE id = ?5 AND tenant_id = ?6"
        )
        .bind::<diesel::sql_types::Text, _>(&data.kasa_adi)
        .bind::<diesel::sql_types::Text, _>(&data.para_birimi)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.aciklama)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&kasa_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;
    }

    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query("SELECT * FROM koy_kasalar WHERE id = ?1")
        .bind::<diesel::sql_types::Text, _>(&kasa_id)
        .get_result::<KoyKasa>(&mut conn)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_koy_kasa(
    state: State<AppState>,
    tenant_id_param: String,
    kasa_id: String,
) -> Result<(), String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query(
        "DELETE FROM koy_kasalar WHERE id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&kasa_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(())
}

// GELIR COMMANDS
#[tauri::command]
pub fn get_koy_gelirler(
    state: State<AppState>,
    tenant_id_param: String,
    baslangic_tarih: Option<String>,
    bitis_tarih: Option<String>,
    kasa_id: Option<String>,
    skip: Option<i64>,
    limit: Option<i64>,
) -> Result<Vec<KoyGelir>, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let query_limit = limit.unwrap_or(100);
    let query_skip = skip.unwrap_or(0);

    // Basit koşullara göre query seç
    match (baslangic_tarih, bitis_tarih, kasa_id) {
        (Some(baslangic), Some(bitis), Some(kasa)) => {
            diesel::sql_query(
                "SELECT * FROM koy_gelirler WHERE tenant_id = ?1 AND kasa_id = ?2 AND tarih >= ?3 AND tarih <= ?4 ORDER BY tarih DESC LIMIT ?5 OFFSET ?6"
            )
            .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
            .bind::<diesel::sql_types::Text, _>(&kasa)
            .bind::<diesel::sql_types::Text, _>(&baslangic)
            .bind::<diesel::sql_types::Text, _>(&bitis)
            .bind::<diesel::sql_types::BigInt, _>(query_limit)
            .bind::<diesel::sql_types::BigInt, _>(query_skip)
            .load::<KoyGelir>(&mut conn)
            .map_err(|e| e.to_string())
        },
        (Some(baslangic), Some(bitis), None) => {
            diesel::sql_query(
                "SELECT * FROM koy_gelirler WHERE tenant_id = ?1 AND tarih >= ?2 AND tarih <= ?3 ORDER BY tarih DESC LIMIT ?4 OFFSET ?5"
            )
            .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
            .bind::<diesel::sql_types::Text, _>(&baslangic)
            .bind::<diesel::sql_types::Text, _>(&bitis)
            .bind::<diesel::sql_types::BigInt, _>(query_limit)
            .bind::<diesel::sql_types::BigInt, _>(query_skip)
            .load::<KoyGelir>(&mut conn)
            .map_err(|e| e.to_string())
        },
        (None, None, Some(kasa)) => {
            diesel::sql_query(
                "SELECT * FROM koy_gelirler WHERE tenant_id = ?1 AND kasa_id = ?2 ORDER BY tarih DESC LIMIT ?3 OFFSET ?4"
            )
            .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
            .bind::<diesel::sql_types::Text, _>(&kasa)
            .bind::<diesel::sql_types::BigInt, _>(query_limit)
            .bind::<diesel::sql_types::BigInt, _>(query_skip)
            .load::<KoyGelir>(&mut conn)
            .map_err(|e| e.to_string())
        },
        _ => {
            diesel::sql_query(
                "SELECT * FROM koy_gelirler WHERE tenant_id = ?1 ORDER BY tarih DESC LIMIT ?2 OFFSET ?3"
            )
            .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
            .bind::<diesel::sql_types::BigInt, _>(query_limit)
            .bind::<diesel::sql_types::BigInt, _>(query_skip)
            .load::<KoyGelir>(&mut conn)
            .map_err(|e| e.to_string())
        }
    }
}

#[tauri::command]
pub fn create_koy_gelir(
    state: State<AppState>,
    tenant_id_param: String,
    data: CreateKoyGelirRequest,
) -> Result<KoyGelir, String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    let new_id = Uuid::new_v4().to_string();
    let now = Utc::now().naive_utc().to_string();

    {
        let db = state.db.lock().unwrap();
        let pool = db.as_ref().ok_or("Database not initialized")?;
        let mut conn = pool.get().map_err(|e| e.to_string())?;

        // Insert gelir
        diesel::sql_query(
            "INSERT INTO koy_gelirler (id, tenant_id, kasa_id, gelir_turu, tarih, tutar, aciklama, makbuz_no, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)"
        )
        .bind::<diesel::sql_types::Text, _>(&new_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .bind::<diesel::sql_types::Text, _>(&data.kasa_id)
        .bind::<diesel::sql_types::Text, _>(&data.gelir_turu)
        .bind::<diesel::sql_types::Text, _>(&data.tarih)
        .bind::<diesel::sql_types::Double, _>(data.tutar)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.aciklama)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.makbuz_no)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&now)
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;

        // Update kasa bakiye
        diesel::sql_query(
            "UPDATE koy_kasalar SET bakiye = bakiye + ?1, updated_at = ?2 WHERE id = ?3 AND tenant_id = ?4"
        )
        .bind::<diesel::sql_types::Double, _>(data.tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&data.kasa_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;
    }

    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query("SELECT * FROM koy_gelirler WHERE id = ?1")
        .bind::<diesel::sql_types::Text, _>(&new_id)
        .get_result::<KoyGelir>(&mut conn)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_koy_gelir(
    state: State<AppState>,
    tenant_id_param: String,
    gelir_id: String,
) -> Result<(), String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Get gelir first to update kasa
    let gelir: KoyGelir = diesel::sql_query("SELECT * FROM koy_gelirler WHERE id = ?1 AND tenant_id = ?2")
        .bind::<diesel::sql_types::Text, _>(&gelir_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .get_result(&mut conn)
        .map_err(|e| e.to_string())?;

    let now = Utc::now().naive_utc().to_string();

    // Update kasa bakiye
    diesel::sql_query(
        "UPDATE koy_kasalar SET bakiye = bakiye - ?1, updated_at = ?2 WHERE id = ?3 AND tenant_id = ?4"
    )
    .bind::<diesel::sql_types::Double, _>(gelir.tutar)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&gelir.kasa_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    // Delete gelir
    diesel::sql_query("DELETE FROM koy_gelirler WHERE id = ?1 AND tenant_id = ?2")
        .bind::<diesel::sql_types::Text, _>(&gelir_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(())
}

// GIDER COMMANDS
#[tauri::command]
pub fn get_koy_giderler(
    state: State<AppState>,
    tenant_id_param: String,
    baslangic_tarih: Option<String>,
    bitis_tarih: Option<String>,
    kasa_id: Option<String>,
    skip: Option<i64>,
    limit: Option<i64>,
) -> Result<Vec<KoyGider>, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let query_limit = limit.unwrap_or(100);
    let query_skip = skip.unwrap_or(0);

    match (baslangic_tarih, bitis_tarih, kasa_id) {
        (Some(baslangic), Some(bitis), Some(kasa)) => {
            diesel::sql_query(
                "SELECT * FROM koy_giderler WHERE tenant_id = ?1 AND kasa_id = ?2 AND tarih >= ?3 AND tarih <= ?4 ORDER BY tarih DESC LIMIT ?5 OFFSET ?6"
            )
            .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
            .bind::<diesel::sql_types::Text, _>(&kasa)
            .bind::<diesel::sql_types::Text, _>(&baslangic)
            .bind::<diesel::sql_types::Text, _>(&bitis)
            .bind::<diesel::sql_types::BigInt, _>(query_limit)
            .bind::<diesel::sql_types::BigInt, _>(query_skip)
            .load::<KoyGider>(&mut conn)
            .map_err(|e| e.to_string())
        },
        (Some(baslangic), Some(bitis), None) => {
            diesel::sql_query(
                "SELECT * FROM koy_giderler WHERE tenant_id = ?1 AND tarih >= ?2 AND tarih <= ?3 ORDER BY tarih DESC LIMIT ?4 OFFSET ?5"
            )
            .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
            .bind::<diesel::sql_types::Text, _>(&baslangic)
            .bind::<diesel::sql_types::Text, _>(&bitis)
            .bind::<diesel::sql_types::BigInt, _>(query_limit)
            .bind::<diesel::sql_types::BigInt, _>(query_skip)
            .load::<KoyGider>(&mut conn)
            .map_err(|e| e.to_string())
        },
        (None, None, Some(kasa)) => {
            diesel::sql_query(
                "SELECT * FROM koy_giderler WHERE tenant_id = ?1 AND kasa_id = ?2 ORDER BY tarih DESC LIMIT ?3 OFFSET ?4"
            )
            .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
            .bind::<diesel::sql_types::Text, _>(&kasa)
            .bind::<diesel::sql_types::BigInt, _>(query_limit)
            .bind::<diesel::sql_types::BigInt, _>(query_skip)
            .load::<KoyGider>(&mut conn)
            .map_err(|e| e.to_string())
        },
        _ => {
            diesel::sql_query(
                "SELECT * FROM koy_giderler WHERE tenant_id = ?1 ORDER BY tarih DESC LIMIT ?2 OFFSET ?3"
            )
            .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
            .bind::<diesel::sql_types::BigInt, _>(query_limit)
            .bind::<diesel::sql_types::BigInt, _>(query_skip)
            .load::<KoyGider>(&mut conn)
            .map_err(|e| e.to_string())
        }
    }
}

#[tauri::command]
pub fn create_koy_gider(
    state: State<AppState>,
    tenant_id_param: String,
    data: CreateKoyGiderRequest,
) -> Result<KoyGider, String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    let new_id = Uuid::new_v4().to_string();
    let now = Utc::now().naive_utc().to_string();

    {
        let db = state.db.lock().unwrap();
        let pool = db.as_ref().ok_or("Database not initialized")?;
        let mut conn = pool.get().map_err(|e| e.to_string())?;

        // Insert gider
        diesel::sql_query(
            "INSERT INTO koy_giderler (id, tenant_id, kasa_id, gider_turu, tarih, tutar, aciklama, fatura_no, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)"
        )
        .bind::<diesel::sql_types::Text, _>(&new_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .bind::<diesel::sql_types::Text, _>(&data.kasa_id)
        .bind::<diesel::sql_types::Text, _>(&data.gider_turu)
        .bind::<diesel::sql_types::Text, _>(&data.tarih)
        .bind::<diesel::sql_types::Double, _>(data.tutar)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.aciklama)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.fatura_no)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&now)
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;

        // Update kasa bakiye
        diesel::sql_query(
            "UPDATE koy_kasalar SET bakiye = bakiye - ?1, updated_at = ?2 WHERE id = ?3 AND tenant_id = ?4"
        )
        .bind::<diesel::sql_types::Double, _>(data.tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&data.kasa_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;
    }

    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query("SELECT * FROM koy_giderler WHERE id = ?1")
        .bind::<diesel::sql_types::Text, _>(&new_id)
        .get_result::<KoyGider>(&mut conn)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_koy_gider(
    state: State<AppState>,
    tenant_id_param: String,
    gider_id: String,
) -> Result<(), String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Get gider first to update kasa
    let gider: KoyGider = diesel::sql_query("SELECT * FROM koy_giderler WHERE id = ?1 AND tenant_id = ?2")
        .bind::<diesel::sql_types::Text, _>(&gider_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .get_result(&mut conn)
        .map_err(|e| e.to_string())?;

    let now = Utc::now().naive_utc().to_string();

    // Update kasa bakiye
    diesel::sql_query(
        "UPDATE koy_kasalar SET bakiye = bakiye + ?1, updated_at = ?2 WHERE id = ?3 AND tenant_id = ?4"
    )
    .bind::<diesel::sql_types::Double, _>(gider.tutar)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&gider.kasa_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    // Delete gider
    diesel::sql_query("DELETE FROM koy_giderler WHERE id = ?1 AND tenant_id = ?2")
        .bind::<diesel::sql_types::Text, _>(&gider_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(())
}

// ============================================================================
// UPDATE FUNCTIONS - Frontend'in çağırdığı ama backend'de olmayan
// ============================================================================

#[tauri::command]
pub fn update_koy_gelir(
    state: State<AppState>,
    tenant_id_param: String,
    gelir_id: String,
    request: UpdateKoyGelirRequest,
) -> Result<KoyGelir, String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = Utc::now().naive_utc().to_string();

    // Get current gelir
    let current: KoyGelir = diesel::sql_query("SELECT * FROM koy_gelirler WHERE id = ?1 AND tenant_id = ?2")
        .bind::<diesel::sql_types::Text, _>(&gelir_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .get_result(&mut conn)
        .map_err(|e| e.to_string())?;

    let eski_kasa_id = current.kasa_id.clone();
    let eski_tutar = current.tutar;
    let yeni_kasa_id = request.kasa_id.clone().unwrap_or(eski_kasa_id.clone());
    let yeni_tutar = request.tutar.unwrap_or(eski_tutar);

    conn.transaction::<_, diesel::result::Error, _>(|conn| {
        // Update gelir
        diesel::sql_query(
            "UPDATE koy_gelirler 
             SET kasa_id = ?1, gelir_turu = ?2, tarih = ?3, tutar = ?4, aciklama = ?5, makbuz_no = ?6, updated_at = ?7 
             WHERE id = ?8"
        )
        .bind::<diesel::sql_types::Text, _>(&yeni_kasa_id)
        .bind::<diesel::sql_types::Text, _>(request.gelir_turu.unwrap_or(current.gelir_turu))
        .bind::<diesel::sql_types::Text, _>(request.tarih.unwrap_or(current.tarih))
        .bind::<diesel::sql_types::Double, _>(yeni_tutar)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(request.aciklama.or(current.aciklama))
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(request.makbuz_no.or(current.makbuz_no))
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&gelir_id)
        .execute(conn)?;

        // Update old kasa (subtract old amount)
        diesel::sql_query(
            "UPDATE koy_kasalar SET bakiye = bakiye - ?1, updated_at = ?2 WHERE id = ?3"
        )
        .bind::<diesel::sql_types::Double, _>(eski_tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&eski_kasa_id)
        .execute(conn)?;

        // Update new kasa (add new amount)
        diesel::sql_query(
            "UPDATE koy_kasalar SET bakiye = bakiye + ?1, updated_at = ?2 WHERE id = ?3"
        )
        .bind::<diesel::sql_types::Double, _>(yeni_tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&yeni_kasa_id)
        .execute(conn)?;

        Ok(())
    }).map_err(|e: diesel::result::Error| e.to_string())?;

    // Return updated gelir
    diesel::sql_query("SELECT * FROM koy_gelirler WHERE id = ?1")
        .bind::<diesel::sql_types::Text, _>(&gelir_id)
        .get_result::<KoyGelir>(&mut conn)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_koy_gider(
    state: State<AppState>,
    tenant_id_param: String,
    gider_id: String,
    request: UpdateKoyGiderRequest,
) -> Result<KoyGider, String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = Utc::now().naive_utc().to_string();

    // Get current gider
    let current: KoyGider = diesel::sql_query("SELECT * FROM koy_giderler WHERE id = ?1 AND tenant_id = ?2")
        .bind::<diesel::sql_types::Text, _>(&gider_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .get_result(&mut conn)
        .map_err(|e| e.to_string())?;

    let eski_kasa_id = current.kasa_id.clone();
    let eski_tutar = current.tutar;
    let yeni_kasa_id = request.kasa_id.clone().unwrap_or(eski_kasa_id.clone());
    let yeni_tutar = request.tutar.unwrap_or(eski_tutar);

    conn.transaction::<_, diesel::result::Error, _>(|conn| {
        // Update gider
        diesel::sql_query(
            "UPDATE koy_giderler 
             SET kasa_id = ?1, gider_turu = ?2, tarih = ?3, tutar = ?4, aciklama = ?5, fatura_no = ?6, updated_at = ?7 
             WHERE id = ?8"
        )
        .bind::<diesel::sql_types::Text, _>(&yeni_kasa_id)
        .bind::<diesel::sql_types::Text, _>(request.gider_turu.unwrap_or(current.gider_turu))
        .bind::<diesel::sql_types::Text, _>(request.tarih.unwrap_or(current.tarih))
        .bind::<diesel::sql_types::Double, _>(yeni_tutar)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(request.aciklama.or(current.aciklama))
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(request.fatura_no.or(current.fatura_no))
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&gider_id)
        .execute(conn)?;

        // Update old kasa (add old amount back)
        diesel::sql_query(
            "UPDATE koy_kasalar SET bakiye = bakiye + ?1, updated_at = ?2 WHERE id = ?3"
        )
        .bind::<diesel::sql_types::Double, _>(eski_tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&eski_kasa_id)
        .execute(conn)?;

        // Update new kasa (subtract new amount)
        diesel::sql_query(
            "UPDATE koy_kasalar SET bakiye = bakiye - ?1, updated_at = ?2 WHERE id = ?3"
        )
        .bind::<diesel::sql_types::Double, _>(yeni_tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&yeni_kasa_id)
        .execute(conn)?;

        Ok(())
    }).map_err(|e: diesel::result::Error| e.to_string())?;

    // Return updated gider
    diesel::sql_query("SELECT * FROM koy_giderler WHERE id = ?1")
        .bind::<diesel::sql_types::Text, _>(&gider_id)
        .get_result::<KoyGider>(&mut conn)
        .map_err(|e| e.to_string())
}

// ============== KOY VİRMANLAR ==============

#[derive(Debug, Deserialize)]
pub struct CreateKoyVirmanRequest {
    pub kaynak_kasa_id: String,
    pub hedef_kasa_id: String,
    pub tarih: String,
    pub tutar: f64,
    pub aciklama: Option<String>,
}

#[tauri::command]
pub fn get_koy_virmanlar(
    state: State<AppState>,
    tenant_id_param: String,
    baslangic_tarih: Option<String>,
    bitis_tarih: Option<String>,
    skip: Option<i64>,
    limit: Option<i64>,
) -> Result<Vec<KoyVirman>, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let query_limit = limit.unwrap_or(100);
    let query_skip = skip.unwrap_or(0);

    match (baslangic_tarih, bitis_tarih) {
        (Some(baslangic), Some(bitis)) => {
            diesel::sql_query(
                "SELECT * FROM koy_virmanlar WHERE tenant_id = ?1 AND tarih >= ?2 AND tarih <= ?3 ORDER BY tarih DESC LIMIT ?4 OFFSET ?5"
            )
            .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
            .bind::<diesel::sql_types::Text, _>(&baslangic)
            .bind::<diesel::sql_types::Text, _>(&bitis)
            .bind::<diesel::sql_types::BigInt, _>(query_limit)
            .bind::<diesel::sql_types::BigInt, _>(query_skip)
            .load::<KoyVirman>(&mut conn)
            .map_err(|e| e.to_string())
        },
        _ => {
            diesel::sql_query(
                "SELECT * FROM koy_virmanlar WHERE tenant_id = ?1 ORDER BY tarih DESC LIMIT ?2 OFFSET ?3"
            )
            .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
            .bind::<diesel::sql_types::BigInt, _>(query_limit)
            .bind::<diesel::sql_types::BigInt, _>(query_skip)
            .load::<KoyVirman>(&mut conn)
            .map_err(|e| e.to_string())
        }
    }
}

#[tauri::command]
pub fn create_koy_virman(
    state: State<AppState>,
    tenant_id_param: String,
    request: CreateKoyVirmanRequest,
) -> Result<KoyVirman, String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let virman_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Execute in transaction
    conn.transaction::<_, diesel::result::Error, _>(|conn| {
        // Insert virman
        diesel::sql_query(
            "INSERT INTO koy_virmanlar (id, tenant_id, kaynak_kasa_id, hedef_kasa_id, tarih, tutar, aciklama, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
        )
        .bind::<diesel::sql_types::Text, _>(&virman_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .bind::<diesel::sql_types::Text, _>(&request.kaynak_kasa_id)
        .bind::<diesel::sql_types::Text, _>(&request.hedef_kasa_id)
        .bind::<diesel::sql_types::Text, _>(&request.tarih)
        .bind::<diesel::sql_types::Double, _>(request.tutar)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&request.aciklama)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&now)
        .execute(conn)?;

        // Update kaynak kasa (subtract amount)
        diesel::sql_query(
            "UPDATE koy_kasalar SET bakiye = bakiye - ?1, updated_at = ?2 WHERE id = ?3"
        )
        .bind::<diesel::sql_types::Double, _>(request.tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&request.kaynak_kasa_id)
        .execute(conn)?;

        // Update hedef kasa (add amount)
        diesel::sql_query(
            "UPDATE koy_kasalar SET bakiye = bakiye + ?1, updated_at = ?2 WHERE id = ?3"
        )
        .bind::<diesel::sql_types::Double, _>(request.tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&request.hedef_kasa_id)
        .execute(conn)?;

        Ok(())
    }).map_err(|e: diesel::result::Error| e.to_string())?;

    // Return created virman
    diesel::sql_query("SELECT * FROM koy_virmanlar WHERE id = ?1")
        .bind::<diesel::sql_types::Text, _>(&virman_id)
        .get_result::<KoyVirman>(&mut conn)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_koy_virman(
    state: State<AppState>,
    tenant_id_param: String,
    virman_id: String,
) -> Result<(), String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Get virman details first
    let virman: KoyVirman = diesel::sql_query(
        "SELECT * FROM koy_virmanlar WHERE id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&virman_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result(&mut conn)
    .map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();

    // Execute in transaction
    conn.transaction::<_, diesel::result::Error, _>(|conn| {
        // Delete virman
        diesel::sql_query("DELETE FROM koy_virmanlar WHERE id = ?1")
            .bind::<diesel::sql_types::Text, _>(&virman_id)
            .execute(conn)?;

        // Reverse kaynak kasa (add amount back)
        diesel::sql_query(
            "UPDATE koy_kasalar SET bakiye = bakiye + ?1, updated_at = ?2 WHERE id = ?3"
        )
        .bind::<diesel::sql_types::Double, _>(virman.tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&virman.kaynak_kasa_id)
        .execute(conn)?;

        // Reverse hedef kasa (subtract amount)
        diesel::sql_query(
            "UPDATE koy_kasalar SET bakiye = bakiye - ?1, updated_at = ?2 WHERE id = ?3"
        )
        .bind::<diesel::sql_types::Double, _>(virman.tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&virman.hedef_kasa_id)
        .execute(conn)?;

        Ok(())
    }).map_err(|e: diesel::result::Error| e.to_string())
}
