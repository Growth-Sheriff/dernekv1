use tauri::State;
use diesel::prelude::*;
use chrono::Utc;
use uuid::Uuid;
use crate::state::AppState;
use crate::db::models::GelirTuru;
use crate::db::schema::gelir_turleri;

#[derive(serde::Deserialize)]
pub struct CreateGelirTuruRequest {
    pub ad: String,
    pub kod: Option<String>,
    pub aciklama: Option<String>,
    pub varsayilan_makbuz_prefix: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct UpdateGelirTuruRequest {
    pub ad: Option<String>,
    pub kod: Option<String>,
    pub aciklama: Option<String>,
    pub varsayilan_makbuz_prefix: Option<String>,
    pub is_active: Option<bool>,
}

#[tauri::command]
pub fn get_gelir_turleri(
    state: State<AppState>,
    tenant_id_param: String,
) -> Result<Vec<GelirTuru>, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Hem kendi tenant'ın hem de 'default' tenant'ın türlerini getir
    let result = gelir_turleri::table
        .filter(
            gelir_turleri::tenant_id.eq(&tenant_id_param)
            .or(gelir_turleri::tenant_id.eq("default"))
        )
        .filter(gelir_turleri::is_active.eq(true))
        .order(gelir_turleri::ad.asc())
        .load::<GelirTuru>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(result)
}

#[tauri::command]
pub fn create_gelir_turu(
    state: State<AppState>,
    tenant_id_param: String,
    request: CreateGelirTuruRequest,
) -> Result<GelirTuru, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    diesel::insert_into(gelir_turleri::table)
        .values((
            gelir_turleri::id.eq(&id),
            gelir_turleri::tenant_id.eq(&tenant_id_param),
            gelir_turleri::ad.eq(&request.ad),
            gelir_turleri::kod.eq(&request.kod),
            gelir_turleri::aciklama.eq(&request.aciklama),
            gelir_turleri::varsayilan_makbuz_prefix.eq(&request.varsayilan_makbuz_prefix),
            gelir_turleri::is_active.eq(true),
            gelir_turleri::created_at.eq(&now),
            gelir_turleri::updated_at.eq(&now),
        ))
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;

    let created = gelir_turleri::table
        .find(&id)
        .first::<GelirTuru>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(created)
}

#[tauri::command]
pub fn update_gelir_turu(
    state: State<AppState>,
    tenant_id_param: String,
    id: String,
    request: UpdateGelirTuruRequest,
) -> Result<GelirTuru, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();

    // Mevcut kaydı al
    let current = gelir_turleri::table
        .filter(gelir_turleri::id.eq(&id))
        .filter(gelir_turleri::tenant_id.eq(&tenant_id_param))
        .first::<GelirTuru>(&mut conn)
        .map_err(|e| e.to_string())?;

    diesel::update(gelir_turleri::table.find(&id))
        .set((
            gelir_turleri::ad.eq(request.ad.unwrap_or(current.ad)),
            gelir_turleri::kod.eq(request.kod.or(current.kod)),
            gelir_turleri::aciklama.eq(request.aciklama.or(current.aciklama)),
            gelir_turleri::varsayilan_makbuz_prefix.eq(request.varsayilan_makbuz_prefix.or(current.varsayilan_makbuz_prefix)),
            gelir_turleri::is_active.eq(request.is_active.unwrap_or(current.is_active)),
            gelir_turleri::updated_at.eq(&now),
        ))
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;

    let updated = gelir_turleri::table
        .find(&id)
        .first::<GelirTuru>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(updated)
}

#[tauri::command]
pub fn delete_gelir_turu(
    state: State<AppState>,
    tenant_id_param: String,
    id: String,
) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();

    // Soft delete - is_active = false
    diesel::update(gelir_turleri::table.find(&id))
        .filter(gelir_turleri::tenant_id.eq(&tenant_id_param))
        .set((
            gelir_turleri::is_active.eq(false),
            gelir_turleri::updated_at.eq(&now),
        ))
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(())
}
