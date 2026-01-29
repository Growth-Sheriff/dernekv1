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

// Offline Lisans Doğrulama (BADER formatı kontrolü)
#[derive(Debug, Serialize)]
pub struct OfflineValidationResult {
    pub valid: bool,
    pub message: Option<String>,
    pub license: Option<OfflineLicenseInfo>,
}

#[derive(Debug, Serialize)]
pub struct OfflineLicenseInfo {
    pub id: String,
    #[serde(rename = "type")]
    pub license_type: String,
    pub desktop_enabled: bool,
    pub web_enabled: bool,
    pub mobile_enabled: bool,
    pub sync_enabled: bool,
    pub end_date: String,
}

#[tauri::command]
pub fn validate_license_offline(license_key: String) -> OfflineValidationResult {
    // BADER-PPPP-TTTT-IIII-CCCC formatını kontrol et
    let key = license_key.to_uppercase();
    
    if !key.starts_with("BADER-") {
        return OfflineValidationResult {
            valid: false,
            message: Some("Geçersiz lisans formatı".to_string()),
            license: None,
        };
    }
    
    let parts: Vec<&str> = key.split('-').collect();
    if parts.len() != 5 {
        return OfflineValidationResult {
            valid: false,
            message: Some("Geçersiz lisans segment sayısı".to_string()),
            license: None,
        };
    }
    
    // Basit Checksum kontrolü (production'da daha güçlü olmalı)
    // Şimdilik formatı kabul ediyoruz
    
    // Platform bitlerini çöz (basit hesaplama)
    let platform_segment = parts[1];
    let platform_bits = u32::from_str_radix(platform_segment, 16).unwrap_or(0);
    
    // XOR key (basit)
    let xor_key: u32 = 0x5A3B; // Basit sabit
    let decoded_bits = platform_bits ^ xor_key;
    
    let desktop_enabled = (decoded_bits & 1) != 0;
    let web_enabled = (decoded_bits & 2) != 0;
    let mobile_enabled = (decoded_bits & 4) != 0;
    let sync_enabled = (decoded_bits & 8) != 0;
    
    // Lisans tipi belirle
    let license_type = if desktop_enabled && web_enabled && sync_enabled {
        "HYBRID"
    } else if web_enabled && !desktop_enabled {
        "ONLINE"
    } else {
        "LOCAL"
    };
    
    // 1 yıl sonrası varsayılan bitiş
    let end_date = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::days(365))
        .map(|d| d.format("%Y-%m-%d").to_string())
        .unwrap_or_else(|| "2099-12-31".to_string());
    
    OfflineValidationResult {
        valid: true,
        message: Some("Lisans geçerli".to_string()),
        license: Some(OfflineLicenseInfo {
            id: uuid::Uuid::new_v4().to_string(),
            license_type: license_type.to_string(),
            desktop_enabled,
            web_enabled,
            mobile_enabled,
            sync_enabled,
            end_date,
        }),
    }
}

// Lisans Güncelleme
#[derive(Debug, Deserialize)]
pub struct UpdateLicenseData {
    pub desktop_enabled: Option<bool>,
    pub web_enabled: Option<bool>,
    pub mobile_enabled: Option<bool>,
    pub sync_enabled: Option<bool>,
    pub expires_at: Option<String>,
    pub plan: Option<String>,
}

#[tauri::command]
pub fn update_license(
    license_key: String,
    license_data: UpdateLicenseData,
    state: State<AppState>,
) -> Result<String, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    
    let key = license_key.to_uppercase();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    
    // Önce mevcut lisansı kontrol et
    let exists: bool = diesel::sql_query(
        "SELECT 1 FROM licenses WHERE license_key = ?1 LIMIT 1"
    )
    .bind::<diesel::sql_types::Text, _>(&key)
    .execute(&mut conn)
    .map(|count| count > 0)
    .unwrap_or(false);
    
    if exists {
        // Update - use end_date instead of expires_at
        diesel::sql_query(
            "UPDATE licenses SET 
                desktop_enabled = COALESCE(?1, desktop_enabled),
                web_enabled = COALESCE(?2, web_enabled),
                mobile_enabled = COALESCE(?3, mobile_enabled),
                sync_enabled = COALESCE(?4, sync_enabled),
                end_date = COALESCE(?5, end_date),
                plan = COALESCE(?6, plan),
                updated_at = ?7
             WHERE license_key = ?8"
        )
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Integer>, _>(license_data.desktop_enabled.map(|b| if b { 1 } else { 0 }))
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Integer>, _>(license_data.web_enabled.map(|b| if b { 1 } else { 0 }))
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Integer>, _>(license_data.mobile_enabled.map(|b| if b { 1 } else { 0 }))
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Integer>, _>(license_data.sync_enabled.map(|b| if b { 1 } else { 0 }))
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&license_data.expires_at)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&license_data.plan)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&key)
        .execute(&mut conn)
        .map_err(|e| format!("Lisans güncellenemedi: {}", e))?;
    } else {
        // Insert new - use end_date instead of expires_at
        let uuid = uuid::Uuid::new_v4().to_string();
        let tenant_id = format!("tenant-{}", uuid::Uuid::new_v4().to_string());
        
        diesel::sql_query(
            "INSERT INTO licenses (id, tenant_id, license_key, plan, max_users, max_records, 
                desktop_enabled, web_enabled, mobile_enabled, sync_enabled,
                starts_at, end_date, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, 100, 100000, ?5, ?6, ?7, ?8, ?9, ?10, 1, ?11, ?12)"
        )
        .bind::<diesel::sql_types::Text, _>(&uuid)
        .bind::<diesel::sql_types::Text, _>(&tenant_id)
        .bind::<diesel::sql_types::Text, _>(&key)
        .bind::<diesel::sql_types::Text, _>(license_data.plan.as_deref().unwrap_or("HYBRID"))
        .bind::<diesel::sql_types::Integer, _>(if license_data.desktop_enabled.unwrap_or(true) { 1 } else { 0 })
        .bind::<diesel::sql_types::Integer, _>(if license_data.web_enabled.unwrap_or(false) { 1 } else { 0 })
        .bind::<diesel::sql_types::Integer, _>(if license_data.mobile_enabled.unwrap_or(false) { 1 } else { 0 })
        .bind::<diesel::sql_types::Integer, _>(if license_data.sync_enabled.unwrap_or(false) { 1 } else { 0 })
        .bind::<diesel::sql_types::Text, _>(&now.split(' ').next().unwrap())
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&license_data.expires_at)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&now)
        .execute(&mut conn)
        .map_err(|e| format!("Lisans kaydedilemedi: {}", e))?;
    }
    
    Ok("Lisans başarıyla güncellendi".to_string())
}
