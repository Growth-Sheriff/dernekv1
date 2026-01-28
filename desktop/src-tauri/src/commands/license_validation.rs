use tauri::State;
use serde::{Deserialize, Serialize};
use diesel::prelude::*;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct ValidateLicenseRequest {
    pub license_key: String,
}

#[derive(Debug, Serialize)]
pub struct LicenseInfo {
    pub license_key: String,
    pub plan: String,
    pub is_valid: bool,
    pub is_active: bool,
    pub expiry_date: Option<String>,
    pub max_users: i32,
    pub max_records: i32,
    pub features: serde_json::Value,
}

#[tauri::command]
pub fn validate_license(
    request: ValidateLicenseRequest,
    state: State<AppState>,
) -> Result<LicenseInfo, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // 1. FORMAT KONTROLÜ: ARTIK YOK (Her format kabul)
    let key = request.license_key.to_uppercase();
    // if !validate_license_format(&key) { ... } // Kaldırıldı

    // 2. DEMO MODE KONTROLÜ
    if key == "DEMO-MODE-0000-0000" {
        // Demo mode lisansını veritabanına kaydet (yoksa)
        let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let uuid = uuid::Uuid::new_v4().to_string();
        let features_json = serde_json::json!({
            "modules": {
                "uye_yonetimi": true,
                "aidat_takip": true,
                "mali_islemler": true,
                "kasa_yonetimi": true,
                "raporlar": true
            }
        }).to_string();
        
        // INSERT OR IGNORE
        let _ = diesel::sql_query(
            "INSERT OR IGNORE INTO licenses (id, license_key, plan, max_users, max_records, features, is_active, starts_at, created_at, updated_at)
             VALUES (?1, ?2, 'LOCAL', 5, 10000, ?3, 1, ?4, ?5, ?6)"
        )
        .bind::<diesel::sql_types::Text, _>(&uuid)
        .bind::<diesel::sql_types::Text, _>(&key)
        .bind::<diesel::sql_types::Text, _>(&features_json)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&now)
        .execute(&mut conn);
        
        return Ok(LicenseInfo {
            license_key: key.clone(),
            plan: "LOCAL".to_string(),
            is_valid: true,
            is_active: true,
            expiry_date: None,
            max_users: 5,
            max_records: 10000,
            features: serde_json::json!({
                "modules": {
                    "uye_yonetimi": true,
                    "aidat_takip": true,
                    "mali_islemler": true,
                    "kasa_yonetimi": true,
                    "raporlar": true
                }
            }),
        });
    }

    // 3. VERİTABANINDA ARAMA
    #[derive(QueryableByName)]
    struct LicenseRow {
        #[diesel(sql_type = diesel::sql_types::Text)]
        license_key: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        plan: String,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        is_active: i32,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        expires_at: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        max_users: i32,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        max_records: i32,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        features: Option<String>,
    }

    let result = diesel::sql_query(
        "SELECT license_key, plan, is_active, expires_at, max_users, max_records, features 
         FROM licenses 
         WHERE license_key = ?1"
    )
    .bind::<diesel::sql_types::Text, _>(&key)
    .get_result::<LicenseRow>(&mut conn);

    match result {
        Ok(license) => {
            // 4. TARİH KONTROLÜ
            let is_valid = if let Some(ref expiry) = license.expires_at {
                let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
                expiry >= &today
            } else {
                true
            };

            let features_str = license.features.unwrap_or_else(|| "{}".to_string());
            let features: serde_json::Value = serde_json::from_str(&features_str)
                .unwrap_or(serde_json::json!({}));

            Ok(LicenseInfo {
                license_key: license.license_key,
                plan: license.plan,
                is_valid,
                is_active: license.is_active == 1,
                expiry_date: license.expires_at,
                max_users: license.max_users,
                max_records: license.max_records,
                features,
            })
        }
        Err(_) => {
            // Lisans bulunamadı - yeni lisans oluştur (demo/test için)
            create_demo_license(&key, &mut conn)?;
            
            // Tekrar oluşturduktan sonra varsayılan değerleri dön
             Ok(LicenseInfo {
                license_key: key,
                plan: "LOCAL".to_string(),
                is_valid: true,
                is_active: true,
                expiry_date: None,
                max_users: 5,
                max_records: 10000,
                features: serde_json::json!({
                    "modules": {
                        "uye_yonetimi": true,
                        "aidat_takip": true,
                        "mali_islemler": true,
                        "kasa_yonetimi": true,
                        "raporlar": true
                    }
                }),
            })
        }
    }
}

// Format kontrolü artık kullanılmıyor ama kod derlenmesi için boş bırakıyorum veya siliyoruz
fn validate_license_format(_key: &str) -> bool {
    true
}

fn create_demo_license(key: &str, conn: &mut diesel::sqlite::SqliteConnection) -> Result<(), String> {
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let uuid = uuid::Uuid::new_v4().to_string();
    let tenant_id = format!("temp-{}", uuid::Uuid::new_v4().to_string());
    
    diesel::sql_query(
        "INSERT INTO licenses (id, tenant_id, license_key, plan, max_users, max_records, starts_at, is_active, created_at, updated_at)
         VALUES (?1, ?2, ?3, 'LOCAL', 5, 10000, ?4, 1, ?5, ?6)"
    )
    .bind::<diesel::sql_types::Text, _>(&uuid)
    .bind::<diesel::sql_types::Text, _>(&tenant_id)
    .bind::<diesel::sql_types::Text, _>(key)
    .bind::<diesel::sql_types::Text, _>(&now.split(' ').next().unwrap())
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&now)
    .execute(conn)
    .map_err(|e| format!("Demo lisans oluşturulamadı: {}", e))?;
    
    Ok(())
}
