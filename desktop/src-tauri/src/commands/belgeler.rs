use tauri::State;
use diesel::prelude::*;
use chrono::Utc;
use uuid::Uuid;
use crate::state::AppState;
use serde::{Serialize, Deserialize};
use std::fs;
use std::path::Path;
use base64::{Engine as _, engine::general_purpose};

#[derive(Debug, Serialize, Deserialize, Queryable, QueryableByName)]
#[diesel(table_name = crate::db::schema::belgeler)]
pub struct Belge {
    pub id: String,
    pub tenant_id: String,
    pub belge_turu: String,
    pub baslik: String,
    pub dosya_adi: String,
    pub dosya_yolu: String,
    pub dosya_boyutu: Option<i32>,
    pub mime_type: Option<String>,
    pub bagli_kayit_turu: Option<String>,
    pub bagli_kayit_id: Option<String>,
    pub aciklama: Option<String>,
    pub etiketler: Option<String>,
    pub yukleyen_kullanici_id: Option<String>,
    pub is_active: bool,
    pub resmi_durum: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateBelgeRequest {
    pub belge_turu: String,
    pub baslik: String,
    pub dosya_adi: String,
    pub dosya_yolu: String,
    pub dosya_boyutu: Option<i32>,
    pub mime_type: Option<String>,
    pub bagli_kayit_turu: Option<String>,
    pub bagli_kayit_id: Option<String>,
    pub aciklama: Option<String>,
    pub etiketler: Option<String>,
    pub resmi_durum: Option<String>,
}

#[tauri::command]
pub fn get_belgeler(
    state: State<AppState>,
    tenant_id_param: String,
    belge_turu: Option<String>,
    bagli_kayit_turu: Option<String>,
    bagli_kayit_id: Option<String>,
    skip: Option<i64>,
    limit: Option<i64>,
) -> Result<Vec<Belge>, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let query_limit = limit.unwrap_or(100);
    let query_skip = skip.unwrap_or(0);

    match (belge_turu, bagli_kayit_turu, bagli_kayit_id) {
        (Some(turu), Some(bagli_turu), Some(bagli_id)) => {
            diesel::sql_query(
                "SELECT * FROM belgeler WHERE tenant_id = ?1 AND belge_turu = ?2 AND bagli_kayit_turu = ?3 AND bagli_kayit_id = ?4 AND is_active = 1 ORDER BY created_at DESC LIMIT ?5 OFFSET ?6"
            )
            .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
            .bind::<diesel::sql_types::Text, _>(&turu)
            .bind::<diesel::sql_types::Text, _>(&bagli_turu)
            .bind::<diesel::sql_types::Text, _>(&bagli_id)
            .bind::<diesel::sql_types::BigInt, _>(query_limit)
            .bind::<diesel::sql_types::BigInt, _>(query_skip)
            .load::<Belge>(&mut conn)
            .map_err(|e| e.to_string())
        },
        (Some(turu), None, None) => {
            diesel::sql_query(
                "SELECT * FROM belgeler WHERE tenant_id = ?1 AND belge_turu = ?2 AND is_active = 1 ORDER BY created_at DESC LIMIT ?3 OFFSET ?4"
            )
            .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
            .bind::<diesel::sql_types::Text, _>(&turu)
            .bind::<diesel::sql_types::BigInt, _>(query_limit)
            .bind::<diesel::sql_types::BigInt, _>(query_skip)
            .load::<Belge>(&mut conn)
            .map_err(|e| e.to_string())
        },
        (None, Some(bagli_turu), Some(bagli_id)) => {
            diesel::sql_query(
                "SELECT * FROM belgeler WHERE tenant_id = ?1 AND bagli_kayit_turu = ?2 AND bagli_kayit_id = ?3 AND is_active = 1 ORDER BY created_at DESC LIMIT ?4 OFFSET ?5"
            )
            .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
            .bind::<diesel::sql_types::Text, _>(&bagli_turu)
            .bind::<diesel::sql_types::Text, _>(&bagli_id)
            .bind::<diesel::sql_types::BigInt, _>(query_limit)
            .bind::<diesel::sql_types::BigInt, _>(query_skip)
            .load::<Belge>(&mut conn)
            .map_err(|e| e.to_string())
        },
        _ => {
            diesel::sql_query(
                "SELECT * FROM belgeler WHERE tenant_id = ?1 AND is_active = 1 ORDER BY created_at DESC LIMIT ?2 OFFSET ?3"
            )
            .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
            .bind::<diesel::sql_types::BigInt, _>(query_limit)
            .bind::<diesel::sql_types::BigInt, _>(query_skip)
            .load::<Belge>(&mut conn)
            .map_err(|e| e.to_string())
        }
    }
}

#[tauri::command]
pub fn create_belge(
    state: State<AppState>,
    tenant_id_param: String,
    request: CreateBelgeRequest,
) -> Result<Belge, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let belge_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let resmi_durum = request.resmi_durum.clone().unwrap_or_else(|| "gayri_resmi".to_string());

    diesel::sql_query(
        "INSERT INTO belgeler (id, tenant_id, belge_turu, baslik, dosya_adi, dosya_yolu, dosya_boyutu, mime_type, bagli_kayit_turu, bagli_kayit_id, aciklama, etiketler, resmi_durum, is_active, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, 1, ?14, ?15)"
    )
    .bind::<diesel::sql_types::Text, _>(&belge_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Text, _>(&request.belge_turu)
    .bind::<diesel::sql_types::Text, _>(&request.baslik)
    .bind::<diesel::sql_types::Text, _>(&request.dosya_adi)
    .bind::<diesel::sql_types::Text, _>(&request.dosya_yolu)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Integer>, _>(&request.dosya_boyutu)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&request.mime_type)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&request.bagli_kayit_turu)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&request.bagli_kayit_id)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&request.aciklama)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&request.etiketler)
    .bind::<diesel::sql_types::Text, _>(&resmi_durum)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&now)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    diesel::sql_query("SELECT * FROM belgeler WHERE id = ?1")
        .bind::<diesel::sql_types::Text, _>(&belge_id)
        .get_result::<Belge>(&mut conn)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_belge(
    state: State<AppState>,
    tenant_id_param: String,
    belge_id: String,
    request: CreateBelgeRequest,
) -> Result<Belge, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();
    let resmi_durum = request.resmi_durum.clone().unwrap_or_else(|| "gayri_resmi".to_string());

    diesel::sql_query(
        "UPDATE belgeler SET belge_turu = ?1, baslik = ?2, dosya_adi = ?3, dosya_yolu = ?4, dosya_boyutu = ?5, mime_type = ?6, bagli_kayit_turu = ?7, bagli_kayit_id = ?8, aciklama = ?9, etiketler = ?10, resmi_durum = ?11, updated_at = ?12 WHERE id = ?13 AND tenant_id = ?14"
    )
    .bind::<diesel::sql_types::Text, _>(&request.belge_turu)
    .bind::<diesel::sql_types::Text, _>(&request.baslik)
    .bind::<diesel::sql_types::Text, _>(&request.dosya_adi)
    .bind::<diesel::sql_types::Text, _>(&request.dosya_yolu)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Integer>, _>(&request.dosya_boyutu)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&request.mime_type)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&request.bagli_kayit_turu)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&request.bagli_kayit_id)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&request.aciklama)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&request.etiketler)
    .bind::<diesel::sql_types::Text, _>(&resmi_durum)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&belge_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    diesel::sql_query("SELECT * FROM belgeler WHERE id = ?1")
        .bind::<diesel::sql_types::Text, _>(&belge_id)
        .get_result::<Belge>(&mut conn)
        .map_err(|e| e.to_string())
}

#[derive(Debug, Serialize)]
pub struct DownloadBelgeResponse {
    pub dosya_adi: String,
    pub mime_type: String,
    pub dosya_boyutu: usize,
    pub base64_data: String,
}

#[tauri::command]
pub fn download_belge(
    state: State<AppState>,
    tenant_id_param: String,
    belge_id: String,
) -> Result<DownloadBelgeResponse, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Belge bilgisini getir
    let belge = diesel::sql_query(
        "SELECT * FROM belgeler WHERE id = ?1 AND tenant_id = ?2 AND is_active = 1"
    )
    .bind::<diesel::sql_types::Text, _>(&belge_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<Belge>(&mut conn)
    .map_err(|e| format!("Belge bulunamadı: {}", e))?;

    // Dosya yolunu çözümle
    let file_path = Path::new(&belge.dosya_yolu);
    
    // Dosya var mı kontrol et
    if !file_path.exists() {
        return Err(format!("Dosya bulunamadı: {}", belge.dosya_yolu));
    }

    // Dosyayı oku
    let file_data = fs::read(file_path)
        .map_err(|e| format!("Dosya okunamadı: {}", e))?;

    // Base64 encode
    let base64_data = general_purpose::STANDARD.encode(&file_data);

    // MIME type belirle
    let mime_type = belge.mime_type.unwrap_or_else(|| {
        // Dosya uzantısından MIME type tahmin et
        match file_path.extension().and_then(|s| s.to_str()) {
            Some("pdf") => "application/pdf".to_string(),
            Some("jpg") | Some("jpeg") => "image/jpeg".to_string(),
            Some("png") => "image/png".to_string(),
            Some("doc") => "application/msword".to_string(),
            Some("docx") => "application/vnd.openxmlformats-officedocument.wordprocessingml.document".to_string(),
            Some("xls") => "application/vnd.ms-excel".to_string(),
            Some("xlsx") => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet".to_string(),
            Some("txt") => "text/plain".to_string(),
            _ => "application/octet-stream".to_string(),
        }
    });

    Ok(DownloadBelgeResponse {
        dosya_adi: belge.dosya_adi,
        mime_type,
        dosya_boyutu: file_data.len(),
        base64_data,
    })
}

#[tauri::command]
pub fn delete_belge(
    state: State<AppState>,
    tenant_id_param: String,
    belge_id: String,
) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();

    // Soft delete
    diesel::sql_query(
        "UPDATE belgeler SET is_active = 0, updated_at = ?1 WHERE id = ?2 AND tenant_id = ?3"
    )
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&belge_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(())
}
