use tauri::State;
use diesel::prelude::*;
use chrono::Utc;
use uuid::Uuid;
use crate::state::AppState;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, QueryableByName)]
pub struct AidatTanimi {
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub id: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub tenant_id: String,
    #[diesel(sql_type = diesel::sql_types::Integer)]
    pub yil: i32,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub aidat_tipi: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub uye_turu: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Double)]
    pub tutar: f64,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
    pub gecikme_faiz_orani: Option<f64>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Integer>)]
    pub son_odeme_gunu: Option<i32>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub aciklama: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Integer>)]
    pub is_active: Option<i32>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub created_at: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub updated_at: Option<String>,
}

#[tauri::command]
pub fn get_aidat_tanimlari(
    state: State<AppState>,
    tenant_id_param: String,
) -> Result<Vec<AidatTanimi>, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query(
        "SELECT * FROM aidat_tanimlari WHERE tenant_id = ?1 AND is_active = 1 ORDER BY yil DESC"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .load::<AidatTanimi>(&mut conn)
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_aidat_tanimi_by_yil(
    state: State<AppState>,
    tenant_id_param: String,
    yil: i32,
) -> Result<Option<AidatTanimi>, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let result = diesel::sql_query(
        "SELECT * FROM aidat_tanimlari WHERE tenant_id = ?1 AND yil = ?2 AND uye_turu = 'Asil' AND is_active = 1"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Integer, _>(yil)
    .get_result::<AidatTanimi>(&mut conn);

    match result {
        Ok(tanim) => Ok(Some(tanim)),
        Err(diesel::result::Error::NotFound) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn get_aidat_tanimi_by_yil_uye_turu(
    state: State<AppState>,
    tenant_id_param: String,
    yil: i32,
    uye_turu: String,
) -> Result<Option<AidatTanimi>, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let result = diesel::sql_query(
        "SELECT * FROM aidat_tanimlari WHERE tenant_id = ?1 AND yil = ?2 AND uye_turu = ?3 AND is_active = 1"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Integer, _>(yil)
    .bind::<diesel::sql_types::Text, _>(&uye_turu)
    .get_result::<AidatTanimi>(&mut conn);

    match result {
        Ok(tanim) => Ok(Some(tanim)),
        Err(diesel::result::Error::NotFound) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn set_aidat_tanimi(
    state: State<AppState>,
    tenant_id_param: String,
    yil: i32,
    tutar: f64,
    gecikme_faiz_orani: Option<f64>,
    aciklama: Option<String>,
    uye_turu: Option<String>,
) -> Result<String, String> {
    let now = Utc::now().naive_utc().to_string();
    let uye_turu_val = uye_turu.unwrap_or_else(|| "Asil".to_string());

    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Önce mevcut kaydı kontrol et (yıl + üye türü bazlı)
    let existing = diesel::sql_query(
        "SELECT * FROM aidat_tanimlari WHERE tenant_id = ?1 AND yil = ?2 AND uye_turu = ?3"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Integer, _>(yil)
    .bind::<diesel::sql_types::Text, _>(&uye_turu_val)
    .get_result::<AidatTanimi>(&mut conn);

    match existing {
        Ok(tanim) => {
            // Güncelle
            diesel::sql_query(
                "UPDATE aidat_tanimlari SET tutar = ?1, gecikme_faiz_orani = ?2, aciklama = ?3, is_active = 1, updated_at = ?4 WHERE id = ?5"
            )
            .bind::<diesel::sql_types::Double, _>(tutar)
            .bind::<diesel::sql_types::Nullable<diesel::sql_types::Double>, _>(&gecikme_faiz_orani)
            .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&aciklama)
            .bind::<diesel::sql_types::Text, _>(&now)
            .bind::<diesel::sql_types::Text, _>(&tanim.id)
            .execute(&mut conn)
            .map_err(|e| e.to_string())?;
            
            Ok(tanim.id)
        }
        Err(diesel::result::Error::NotFound) => {
            // Yeni kayıt oluştur
            let new_id = Uuid::new_v4().to_string();
            
            diesel::sql_query(
                "INSERT INTO aidat_tanimlari (id, tenant_id, yil, aidat_tipi, uye_turu, tutar, gecikme_faiz_orani, aciklama, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, 'Yıllık', ?4, ?5, ?6, ?7, 1, ?8, ?9)"
            )
            .bind::<diesel::sql_types::Text, _>(&new_id)
            .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
            .bind::<diesel::sql_types::Integer, _>(yil)
            .bind::<diesel::sql_types::Text, _>(&uye_turu_val)
            .bind::<diesel::sql_types::Double, _>(tutar)
            .bind::<diesel::sql_types::Nullable<diesel::sql_types::Double>, _>(&gecikme_faiz_orani)
            .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&aciklama)
            .bind::<diesel::sql_types::Text, _>(&now)
            .bind::<diesel::sql_types::Text, _>(&now)
            .execute(&mut conn)
            .map_err(|e| e.to_string())?;
            
            Ok(new_id)
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn delete_aidat_tanimi(
    state: State<AppState>,
    tenant_id_param: String,
    aidat_tanimi_id: String,
) -> Result<(), String> {
    let now = Utc::now().naive_utc().to_string();

    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query(
        "UPDATE aidat_tanimlari SET is_active = 0, updated_at = ?1 WHERE id = ?2 AND tenant_id = ?3"
    )
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&aidat_tanimi_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(())
}

// toplu_aidat_kisi_bazli ve toplu_aidat_coklu_uye aidat.rs'de tanımlı
