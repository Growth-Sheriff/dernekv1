use tauri::State;
use diesel::prelude::*;
use chrono::Utc;
use uuid::Uuid;
use crate::state::AppState;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Queryable, QueryableByName)]
#[diesel(table_name = crate::db::schema::toplantilar)]
pub struct Toplanti {
    pub id: String,
    pub tenant_id: String,
    pub baslik: String,
    pub aciklama: Option<String>,
    pub tarih: String,
    pub saat: Option<String>,
    pub yer: Option<String>,
    pub toplanti_tipi: Option<String>,
    pub durum: Option<String>,
    pub katilimci_sayisi: Option<i32>,
    pub gundem: Option<String>,
    pub kararlar: Option<String>,
    pub notlar: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub created_by: Option<String>,
    pub is_deleted: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct CreateToplantiRequest {
    pub baslik: String,
    pub aciklama: Option<String>,
    pub tarih: String,
    pub saat: Option<String>,
    pub yer: Option<String>,
    pub toplanti_tipi: Option<String>,
    pub durum: Option<String>,
    pub gundem: Option<String>,
    pub katilimci_sayisi: Option<i32>,
    pub kararlar: Option<String>,
    pub notlar: Option<String>,
}

#[tauri::command]
pub fn get_toplantilar(
    state: State<AppState>,
    tenant_id_param: String,
    durum: Option<String>,
    skip: Option<i64>,
    limit: Option<i64>,
) -> Result<Vec<Toplanti>, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let query = if let Some(d) = durum {
        diesel::sql_query(
            "SELECT * FROM toplantilar WHERE tenant_id = ?1 AND durum = ?2 ORDER BY tarih DESC, saat DESC LIMIT ?3 OFFSET ?4"
        )
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .bind::<diesel::sql_types::Text, _>(&d)
        .bind::<diesel::sql_types::BigInt, _>(limit.unwrap_or(100))
        .bind::<diesel::sql_types::BigInt, _>(skip.unwrap_or(0))
        .load::<Toplanti>(&mut conn)
    } else {
        diesel::sql_query(
            "SELECT * FROM toplantilar WHERE tenant_id = ?1 ORDER BY tarih DESC, saat DESC LIMIT ?2 OFFSET ?3"
        )
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .bind::<diesel::sql_types::BigInt, _>(limit.unwrap_or(100))
        .bind::<diesel::sql_types::BigInt, _>(skip.unwrap_or(0))
        .load::<Toplanti>(&mut conn)
    };

    query.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_toplanti(
    state: State<AppState>,
    tenant_id_param: String,
    toplanti_id: String,
) -> Result<Toplanti, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query(
        "SELECT * FROM toplantilar WHERE id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&toplanti_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<Toplanti>(&mut conn)
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_toplanti(
    state: State<AppState>,
    tenant_id_param: String,
    data: CreateToplantiRequest,
) -> Result<Toplanti, String> {
    let new_id = Uuid::new_v4().to_string();
    let now = Utc::now().naive_utc().to_string();

    {
        let db = state.db.lock().unwrap();
        let pool = db.as_ref().ok_or("Database not initialized")?;
        let mut conn = pool.get().map_err(|e| e.to_string())?;

        diesel::sql_query(
            "INSERT INTO toplantilar (id, tenant_id, baslik, aciklama, tarih, saat, yer, toplanti_tipi, durum, katilimci_sayisi, gundem, kararlar, notlar, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)"
        )
        .bind::<diesel::sql_types::Text, _>(&new_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .bind::<diesel::sql_types::Text, _>(&data.baslik)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.aciklama)
        .bind::<diesel::sql_types::Text, _>(&data.tarih)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.saat)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.yer)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.toplanti_tipi)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.durum)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Integer>, _>(&data.katilimci_sayisi)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.gundem)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.kararlar)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.notlar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&now)
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;
    }

    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query("SELECT * FROM toplantilar WHERE id = ?1")
        .bind::<diesel::sql_types::Text, _>(&new_id)
        .get_result::<Toplanti>(&mut conn)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_toplanti(
    state: State<AppState>,
    tenant_id_param: String,
    toplanti_id: String,
    data: CreateToplantiRequest,
) -> Result<Toplanti, String> {
    let now = Utc::now().naive_utc().to_string();

    {
        let db = state.db.lock().unwrap();
        let pool = db.as_ref().ok_or("Database not initialized")?;
        let mut conn = pool.get().map_err(|e| e.to_string())?;

        diesel::sql_query(
            "UPDATE toplantilar SET baslik = ?1, aciklama = ?2, tarih = ?3, saat = ?4, yer = ?5, toplanti_tipi = ?6, durum = ?7, katilimci_sayisi = ?8, gundem = ?9, kararlar = ?10, notlar = ?11, updated_at = ?12
             WHERE id = ?13 AND tenant_id = ?14"
        )
        .bind::<diesel::sql_types::Text, _>(&data.baslik)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.aciklama)
        .bind::<diesel::sql_types::Text, _>(&data.tarih)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.saat)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.yer)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.toplanti_tipi)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.durum)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Integer>, _>(&data.katilimci_sayisi)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.gundem)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.kararlar)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.notlar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&toplanti_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;
    }

    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query("SELECT * FROM toplantilar WHERE id = ?1")
        .bind::<diesel::sql_types::Text, _>(&toplanti_id)
        .get_result::<Toplanti>(&mut conn)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_toplanti(
    state: State<AppState>,
    tenant_id_param: String,
    toplanti_id: String,
) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query(
        "DELETE FROM toplantilar WHERE id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&toplanti_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(())
}
