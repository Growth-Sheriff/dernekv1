use tauri::State;
use diesel::prelude::*;
use chrono::Utc;
use uuid::Uuid;
use crate::state::AppState;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Queryable, QueryableByName)]
#[diesel(table_name = crate::db::schema::butce)]
pub struct Butce {
    pub id: String,
    pub tenant_id: String,
    pub yil: i32,
    pub kategori: String,
    pub alt_kategori: Option<String>,
    pub planlanan_gelir: Option<f64>,
    pub planlanan_gider: Option<f64>,
    pub gerceklesen_gelir: Option<f64>,
    pub gerceklesen_gider: Option<f64>,
    pub notlar: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub donem: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateButceRequest {
    pub yil: i32,
    pub kategori: String,
    pub alt_kategori: Option<String>,
    pub donem: Option<String>,
    pub planlanan_gelir: f64,
    pub planlanan_gider: f64,
    pub notlar: Option<String>,
}

#[tauri::command]
pub fn get_butce(
    state: State<AppState>,
    tenant_id_param: String,
    yil: Option<i32>,
) -> Result<Vec<Butce>, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let query = if let Some(y) = yil {
        diesel::sql_query(
            "SELECT * FROM butce WHERE tenant_id = ?1 AND yil = ?2 ORDER BY yil DESC, donem DESC"
        )
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .bind::<diesel::sql_types::Integer, _>(y)
        .load::<Butce>(&mut conn)
    } else {
        diesel::sql_query(
            "SELECT * FROM butce WHERE tenant_id = ?1 ORDER BY yil DESC, donem DESC"
        )
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .load::<Butce>(&mut conn)
    };

    query.map_err(|e| e.to_string())
}

// Alias for frontend compatibility
#[tauri::command]
pub fn get_butceler(
    state: State<AppState>,
    tenant_id_param: String,
    yil: Option<i32>,
) -> Result<Vec<Butce>, String> {
    get_butce(state, tenant_id_param, yil)
}

#[tauri::command]
pub fn create_butce(
    state: State<AppState>,
    tenant_id_param: String,
    data: CreateButceRequest,
) -> Result<Butce, String> {
    let new_id = Uuid::new_v4().to_string();
    let now = Utc::now().naive_utc().to_string();

    {
        let db = state.db.lock().unwrap();
        let pool = db.as_ref().ok_or("Database not initialized")?;
        let mut conn = pool.get().map_err(|e| e.to_string())?;

        diesel::sql_query(
            "INSERT INTO butce (id, tenant_id, yil, kategori, alt_kategori, donem, planlanan_gelir, planlanan_gider, gerceklesen_gelir, gerceklesen_gider, notlar, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)"
        )
        .bind::<diesel::sql_types::Text, _>(&new_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .bind::<diesel::sql_types::Integer, _>(data.yil)
        .bind::<diesel::sql_types::Text, _>(&data.kategori)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.alt_kategori)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.donem)
        .bind::<diesel::sql_types::Double, _>(data.planlanan_gelir)
        .bind::<diesel::sql_types::Double, _>(data.planlanan_gider)
        .bind::<diesel::sql_types::Double, _>(0.0)  // gerceklesen_gelir başlangıç değeri
        .bind::<diesel::sql_types::Double, _>(0.0)  // gerceklesen_gider başlangıç değeri
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.notlar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&now)
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;
    }

    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query("SELECT * FROM butce WHERE id = ?1")
        .bind::<diesel::sql_types::Text, _>(&new_id)
        .get_result::<Butce>(&mut conn)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_butce(
    state: State<AppState>,
    tenant_id_param: String,
    butce_id: String,
    data: CreateButceRequest,
) -> Result<Butce, String> {
    let now = Utc::now().naive_utc().to_string();

    {
        let db = state.db.lock().unwrap();
        let pool = db.as_ref().ok_or("Database not initialized")?;
        let mut conn = pool.get().map_err(|e| e.to_string())?;

        diesel::sql_query(
            "UPDATE butce SET yil = ?1, kategori = ?2, alt_kategori = ?3, donem = ?4, planlanan_gelir = ?5, planlanan_gider = ?6, notlar = ?7, updated_at = ?8
             WHERE id = ?9 AND tenant_id = ?10"
        )
        .bind::<diesel::sql_types::Integer, _>(data.yil)
        .bind::<diesel::sql_types::Text, _>(&data.kategori)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.alt_kategori)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.donem)
        .bind::<diesel::sql_types::Double, _>(data.planlanan_gelir)
        .bind::<diesel::sql_types::Double, _>(data.planlanan_gider)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.notlar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&butce_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;
    }

    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query("SELECT * FROM butce WHERE id = ?1")
        .bind::<diesel::sql_types::Text, _>(&butce_id)
        .get_result::<Butce>(&mut conn)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_butce(
    state: State<AppState>,
    tenant_id_param: String,
    butce_id: String,
) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query(
        "DELETE FROM butce WHERE id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&butce_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct UpdateButceGerceklesenRequest {
    pub gerceklesen_gelir: Option<f64>,
    pub gerceklesen_gider: Option<f64>,
}

#[tauri::command]
pub fn update_butce_gerceklesen(
    state: State<AppState>,
    tenant_id_param: String,
    butce_id: String,
    request: UpdateButceGerceklesenRequest,
) -> Result<Butce, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();

    // Get current budget
    let current: Butce = diesel::sql_query(
        "SELECT * FROM butce WHERE id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&butce_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result(&mut conn)
    .map_err(|e| e.to_string())?;

    // Calculate new values
    let new_gelir = request.gerceklesen_gelir.unwrap_or(0.0);
    let new_gider = request.gerceklesen_gider.unwrap_or(0.0);

    diesel::sql_query(
        "UPDATE butce SET gerceklesen_gelir = gerceklesen_gelir + ?1, gerceklesen_gider = gerceklesen_gider + ?2, updated_at = ?3 WHERE id = ?4 AND tenant_id = ?5"
    )
    .bind::<diesel::sql_types::Double, _>(new_gelir)
    .bind::<diesel::sql_types::Double, _>(new_gider)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&butce_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    diesel::sql_query("SELECT * FROM butce WHERE id = ?1")
        .bind::<diesel::sql_types::Text, _>(&butce_id)
        .get_result::<Butce>(&mut conn)
        .map_err(|e| e.to_string())
}
