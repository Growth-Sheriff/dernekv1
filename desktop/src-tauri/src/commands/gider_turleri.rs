use tauri::State;
use diesel::prelude::*;
use chrono::Utc;
use uuid::Uuid;
use crate::state::AppState;
use crate::db::models::GiderTuru;
use crate::db::schema::gider_turleri;

#[derive(serde::Deserialize)]
pub struct CreateGiderTuruRequest {
    pub ad: String,
    pub kod: Option<String>,
    pub aciklama: Option<String>,
    pub varsayilan_fatura_prefix: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct UpdateGiderTuruRequest {
    pub ad: Option<String>,
    pub kod: Option<String>,
    pub aciklama: Option<String>,
    pub varsayilan_fatura_prefix: Option<String>,
    pub is_active: Option<bool>,
}

#[tauri::command]
pub fn get_gider_turleri(
    state: State<AppState>,
    tenant_id_param: String,
) -> Result<Vec<GiderTuru>, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Hem kendi tenant'ın hem de 'default' tenant'ın türlerini getir
    let result = gider_turleri::table
        .filter(
            gider_turleri::tenant_id.eq(&tenant_id_param)
            .or(gider_turleri::tenant_id.eq("default"))
        )
        .filter(gider_turleri::is_active.eq(true))
        .order(gider_turleri::ad.asc())
        .load::<GiderTuru>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(result)
}

#[tauri::command]
pub fn create_gider_turu(
    state: State<AppState>,
    tenant_id_param: String,
    request: CreateGiderTuruRequest,
) -> Result<GiderTuru, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    diesel::insert_into(gider_turleri::table)
        .values((
            gider_turleri::id.eq(&id),
            gider_turleri::tenant_id.eq(&tenant_id_param),
            gider_turleri::ad.eq(&request.ad),
            gider_turleri::kod.eq(&request.kod),
            gider_turleri::aciklama.eq(&request.aciklama),
            gider_turleri::varsayilan_fatura_prefix.eq(&request.varsayilan_fatura_prefix),
            gider_turleri::is_active.eq(true),
            gider_turleri::created_at.eq(&now),
            gider_turleri::updated_at.eq(&now),
        ))
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;

    let created = gider_turleri::table
        .find(&id)
        .first::<GiderTuru>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(created)
}

#[tauri::command]
pub fn update_gider_turu(
    state: State<AppState>,
    tenant_id_param: String,
    id: String,
    request: UpdateGiderTuruRequest,
) -> Result<GiderTuru, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();

    // Mevcut kaydı al
    let current = gider_turleri::table
        .filter(gider_turleri::id.eq(&id))
        .filter(gider_turleri::tenant_id.eq(&tenant_id_param))
        .first::<GiderTuru>(&mut conn)
        .map_err(|e| e.to_string())?;

    diesel::update(gider_turleri::table.find(&id))
        .set((
            gider_turleri::ad.eq(request.ad.unwrap_or(current.ad)),
            gider_turleri::kod.eq(request.kod.or(current.kod)),
            gider_turleri::aciklama.eq(request.aciklama.or(current.aciklama)),
            gider_turleri::varsayilan_fatura_prefix.eq(request.varsayilan_fatura_prefix.or(current.varsayilan_fatura_prefix)),
            gider_turleri::is_active.eq(request.is_active.unwrap_or(current.is_active)),
            gider_turleri::updated_at.eq(&now),
        ))
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;

    let updated = gider_turleri::table
        .find(&id)
        .first::<GiderTuru>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(updated)
}

#[tauri::command]
pub fn delete_gider_turu(
    state: State<AppState>,
    tenant_id_param: String,
    id: String,
) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();

    // Soft delete - is_active = false
    diesel::update(gider_turleri::table.find(&id))
        .filter(gider_turleri::tenant_id.eq(&tenant_id_param))
        .set((
            gider_turleri::is_active.eq(false),
            gider_turleri::updated_at.eq(&now),
        ))
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(())
}
