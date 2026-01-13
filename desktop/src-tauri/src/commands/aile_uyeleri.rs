use tauri::State;
use diesel::prelude::*;
use chrono::Utc;
use uuid::Uuid;
use crate::state::AppState;
use crate::db::models::AileUyesi;
use crate::db::schema::uye_aile_uyeleri;

#[derive(serde::Deserialize)]
pub struct CreateAileUyesiRequest {
    pub uye_id: String,
    pub yakinlik: Option<String>,
    pub ad_soyad: String,
    pub dogum_tarihi: Option<String>,
    pub telefon: Option<String>,
    pub tc_no: Option<String>,
    pub cinsiyet: Option<String>,
    pub meslek: Option<String>,
    pub is_yeri: Option<String>,
    pub egitim_durumu: Option<String>,
    pub email: Option<String>,
    pub kan_grubu: Option<String>,
    pub ozel_durum: Option<String>,
    pub notlar: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct UpdateAileUyesiRequest {
    pub yakinlik: Option<String>,
    pub ad_soyad: Option<String>,
    pub dogum_tarihi: Option<String>,
    pub telefon: Option<String>,
    pub tc_no: Option<String>,
    pub cinsiyet: Option<String>,
    pub meslek: Option<String>,
    pub is_yeri: Option<String>,
    pub egitim_durumu: Option<String>,
    pub email: Option<String>,
    pub kan_grubu: Option<String>,
    pub ozel_durum: Option<String>,
    pub notlar: Option<String>,
}

#[tauri::command]
pub fn get_aile_uyeleri(
    state: State<AppState>,
    tenant_id_param: String,
    uye_id: String,
) -> Result<Vec<AileUyesi>, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let result = uye_aile_uyeleri::table
        .filter(uye_aile_uyeleri::tenant_id.eq(&tenant_id_param))
        .filter(uye_aile_uyeleri::uye_id.eq(&uye_id))
        .filter(uye_aile_uyeleri::is_deleted.eq(0))
        .order(uye_aile_uyeleri::created_at.desc())
        .load::<AileUyesi>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(result)
}

#[tauri::command]
pub fn create_aile_uyesi(
    state: State<AppState>,
    tenant_id_param: String,
    request: CreateAileUyesiRequest,
) -> Result<AileUyesi, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();
    let sync_id = Uuid::new_v4().to_string();

    diesel::insert_into(uye_aile_uyeleri::table)
        .values((
            uye_aile_uyeleri::id.eq(&id),
            uye_aile_uyeleri::tenant_id.eq(&tenant_id_param),
            uye_aile_uyeleri::uye_id.eq(&request.uye_id),
            uye_aile_uyeleri::yakinlik.eq(&request.yakinlik),
            uye_aile_uyeleri::ad_soyad.eq(&request.ad_soyad),
            uye_aile_uyeleri::dogum_tarihi.eq(&request.dogum_tarihi),
            uye_aile_uyeleri::telefon.eq(&request.telefon),
            uye_aile_uyeleri::meslek.eq(&request.meslek),
            uye_aile_uyeleri::egitim_durumu.eq(&request.egitim_durumu),
            uye_aile_uyeleri::notlar.eq(&request.notlar),
            uye_aile_uyeleri::sync_id.eq(&sync_id),
            uye_aile_uyeleri::version.eq(1),
            uye_aile_uyeleri::is_deleted.eq(0),
            uye_aile_uyeleri::created_at.eq(&now),
            uye_aile_uyeleri::updated_at.eq(&now),
        ))
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;

    let created = uye_aile_uyeleri::table
        .find(&id)
        .first::<AileUyesi>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(created)
}

#[tauri::command]
pub fn update_aile_uyesi(
    state: State<AppState>,
    tenant_id_param: String,
    id: String,
    request: UpdateAileUyesiRequest,
) -> Result<AileUyesi, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();

    // Version increment için önce mevcut version'ı alalım
    let current = uye_aile_uyeleri::table
        .filter(uye_aile_uyeleri::id.eq(&id))
        .filter(uye_aile_uyeleri::tenant_id.eq(&tenant_id_param))
        .first::<AileUyesi>(&mut conn)
        .map_err(|e| e.to_string())?;

    diesel::update(uye_aile_uyeleri::table.find(&id))
        .set((
            uye_aile_uyeleri::yakinlik.eq(&request.yakinlik),
            uye_aile_uyeleri::ad_soyad.eq(&request.ad_soyad.unwrap_or(current.ad_soyad)),
            uye_aile_uyeleri::dogum_tarihi.eq(&request.dogum_tarihi),
            uye_aile_uyeleri::telefon.eq(&request.telefon),
            uye_aile_uyeleri::meslek.eq(&request.meslek),
            uye_aile_uyeleri::egitim_durumu.eq(&request.egitim_durumu),
            uye_aile_uyeleri::notlar.eq(&request.notlar),
            uye_aile_uyeleri::version.eq(current.version + 1),
            uye_aile_uyeleri::updated_at.eq(&now),
        ))
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;

    let updated = uye_aile_uyeleri::table
        .find(&id)
        .first::<AileUyesi>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(updated)
}

#[tauri::command]
pub fn delete_aile_uyesi(
    state: State<AppState>,
    tenant_id_param: String,
    id: String,
) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();

    // Version increment için önce mevcut version'ı alalım
    let current = uye_aile_uyeleri::table
        .filter(uye_aile_uyeleri::id.eq(&id))
        .filter(uye_aile_uyeleri::tenant_id.eq(&tenant_id_param))
        .first::<AileUyesi>(&mut conn)
        .map_err(|e| e.to_string())?;

    // Soft delete
    diesel::update(uye_aile_uyeleri::table.find(&id))
        .set((
            uye_aile_uyeleri::is_deleted.eq(1),
            uye_aile_uyeleri::version.eq(current.version + 1),
            uye_aile_uyeleri::updated_at.eq(&now),
        ))
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(())
}
