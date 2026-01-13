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

    // 1. FORMAT KONTROLÜ: BADER-XXXX-XXXX-XXXX
    let key = request.license_key.to_uppercase();
    if !validate_license_format(&key) {
        return Err("Geçersiz lisans formatı. Format: BADER-XXXX-XXXX-XXXX".to_string());
    }

    // 2. DEMO MODE KONTROLÜ
    if key == "DEMO-MODE-0000-0000" {
        // Demo mode lisansını veritabanına kaydet (yoksa)
        let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let features_json = serde_json::json!({
            "modules": {
                "uye_yonetimi": true,
                "aidat_takip": true,
                "mali_islemler": true,
                "kasa_yonetimi": true,
                "raporlar": true
            }
        }).to_string();
        
        // INSERT OR IGNORE - zaten varsa hata vermez
        let _ = diesel::sql_query(
            "INSERT OR IGNORE INTO licenses (license_key, plan, max_users, max_records, features, is_active, start_date, created_at, updated_at)
             VALUES (?1, 'LOCAL', 5, 10000, ?2, 1, ?3, ?4, ?5)"
        )
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
        expiry_date: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        max_users: i32,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        max_records: i32,
        #[diesel(sql_type = diesel::sql_types::Text)]
        features: String,
    }

    let result = diesel::sql_query(
        "SELECT license_key, plan, is_active, expiry_date, max_users, max_records, features 
         FROM licenses 
         WHERE license_key = ?1"
    )
    .bind::<diesel::sql_types::Text, _>(&key)
    .get_result::<LicenseRow>(&mut conn);

    match result {
        Ok(license) => {
            // 4. TARİH KONTROLÜ
            let is_valid = if let Some(ref expiry) = license.expiry_date {
                // Expiry date varsa kontrol et
                let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
                expiry >= &today
            } else {
                // Expiry date yoksa süresiz
                true
            };

            let features: serde_json::Value = serde_json::from_str(&license.features)
                .unwrap_or(serde_json::json!({}));

            Ok(LicenseInfo {
                license_key: license.license_key,
                plan: license.plan,
                is_valid,
                is_active: license.is_active == 1,
                expiry_date: license.expiry_date,
                max_users: license.max_users,
                max_records: license.max_records,
                features,
            })
        }
        Err(_) => {
            // Lisans bulunamadı - yeni lisans oluştur (demo/test için)
            create_demo_license(&key, &mut conn)?;
            
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

fn validate_license_format(key: &str) -> bool {
    // BADER-XXXX-XXXX-XXXX veya DEMO-MODE-0000-0000
    let parts: Vec<&str> = key.split('-').collect();
    if parts.len() != 4 {
        return false;
    }
    
    // İlk kısım BADER veya DEMO olmalı
    if parts[0] != "BADER" && parts[0] != "DEMO" {
        return false;
    }
    
    // Diğer kısımlar 4 karakter olmalı ve alfanumerik olmalı
    for part in &parts[1..] {
        if part.len() != 4 {
            return false;
        }
        // Sadece alfanumerik karakterler kabul et
        if !part.chars().all(|c| c.is_ascii_alphanumeric()) {
            return false;
        }
    }
    
    true
}

fn create_demo_license(key: &str, conn: &mut diesel::sqlite::SqliteConnection) -> Result<(), String> {
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    
    diesel::sql_query(
        "INSERT INTO licenses (tenant_id, license_key, plan, max_users, max_records, start_date, is_active, created_at, updated_at)
         VALUES ('temp-' || lower(hex(randomblob(16))), ?1, 'LOCAL', 5, 10000, ?2, 1, ?3, ?4)"
    )
    .bind::<diesel::sql_types::Text, _>(key)
    .bind::<diesel::sql_types::Text, _>(&now.split(' ').next().unwrap())
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&now)
    .execute(conn)
    .map_err(|e| format!("Demo lisans oluşturulamadı: {}", e))?;
    
    Ok(())
}
