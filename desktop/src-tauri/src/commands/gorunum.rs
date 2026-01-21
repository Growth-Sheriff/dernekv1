use crate::db::Pool;
use serde::{Deserialize, Serialize};
use tauri::State;
use diesel::prelude::*;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ColumnConfig {
    pub visible: Vec<String>,        // Görünür sütunlar
    pub order: Vec<String>,           // Sütun sıralaması
    pub widths: Option<serde_json::Value>, // Sütun genişlikleri (opsiyonel)
}

#[derive(Debug, Serialize, Deserialize, Queryable)]
pub struct KullaniciGorunum {
    pub id: String,
    pub tenant_id: String,
    pub user_id: String,
    pub page_key: String,
    pub columns_config: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct SaveColumnConfigRequest {
    pub page_key: String,
    pub columns_config: ColumnConfig,
}

/// Kullanıcının sütun tercihlerini kaydet
#[tauri::command]
pub async fn save_column_preferences(
    pool: State<'_, Pool>,
    tenantIdParam: String,
    userId: String,
    request: SaveColumnConfigRequest,
) -> Result<String, String> {
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let config_json = serde_json::to_string(&request.columns_config)
        .map_err(|e| format!("JSON serialization error: {}", e))?;

    // UPSERT: Var olan kaydı güncelle, yoksa yeni oluştur
    let query = format!(
        r#"
        INSERT INTO kullanici_gorunumleri (id, tenant_id, user_id, page_key, columns_config, created_at, updated_at)
        VALUES ('{}', '{}', '{}', '{}', '{}', datetime('now'), datetime('now'))
        ON CONFLICT(tenant_id, user_id, page_key)
        DO UPDATE SET
            columns_config = excluded.columns_config,
            updated_at = datetime('now')
        "#,
        Uuid::new_v4().to_string(),
        tenantIdParam,
        userId,
        request.page_key,
        config_json.replace("'", "''") // SQL injection koruması
    );

    diesel::sql_query(query)
        .execute(&mut conn)
        .map_err(|e| format!("Failed to save column preferences: {}", e))?;

    Ok("Sütun tercihleri kaydedildi".to_string())
}

/// Kullanıcının sütun tercihlerini getir
#[tauri::command]
pub async fn get_column_preferences(
    pool: State<'_, Pool>,
    tenantIdParam: String,
    userId: String,
    pageKey: String,
) -> Result<Option<ColumnConfig>, String> {
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let query = format!(
        r#"
        SELECT id, tenant_id, user_id, page_key, columns_config, created_at, updated_at
        FROM kullanici_gorunumleri
        WHERE tenant_id = '{}' AND user_id = '{}' AND page_key = '{}'
        LIMIT 1
        "#,
        tenantIdParam, userId, pageKey
    );

    let result: Result<KullaniciGorunum, _> = diesel::sql_query(query)
        .get_result(&mut conn);

    match result {
        Ok(gorunum) => {
            let config: ColumnConfig = serde_json::from_str(&gorunum.columns_config)
                .map_err(|e| format!("JSON parse error: {}", e))?;
            Ok(Some(config))
        }
        Err(diesel::result::Error::NotFound) => Ok(None),
        Err(e) => Err(format!("Failed to get column preferences: {}", e)),
    }
}

/// Kullanıcının tüm sütun tercihlerini sıfırla (belirli bir sayfa için)
#[tauri::command]
pub async fn reset_column_preferences(
    pool: State<'_, Pool>,
    tenantIdParam: String,
    userId: String,
    pageKey: String,
) -> Result<String, String> {
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let query = format!(
        r#"
        DELETE FROM kullanici_gorunumleri
        WHERE tenant_id = '{}' AND user_id = '{}' AND page_key = '{}'
        "#,
        tenantIdParam, userId, pageKey
    );

    diesel::sql_query(query)
        .execute(&mut conn)
        .map_err(|e| format!("Failed to reset column preferences: {}", e))?;

    Ok("Sütun tercihleri sıfırlandı".to_string())
}

/// Kullanıcının tüm sayfalardaki sütun tercihlerini getir
#[tauri::command]
pub async fn get_all_column_preferences(
    pool: State<'_, Pool>,
    tenantIdParam: String,
    userId: String,
) -> Result<Vec<(String, ColumnConfig)>, String> {
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let query = format!(
        r#"
        SELECT id, tenant_id, user_id, page_key, columns_config, created_at, updated_at
        FROM kullanici_gorunumleri
        WHERE tenant_id = '{}' AND user_id = '{}'
        ORDER BY page_key
        "#,
        tenantIdParam, userId
    );

    let results: Vec<KullaniciGorunum> = diesel::sql_query(query)
        .load(&mut conn)
        .map_err(|e| format!("Failed to get all preferences: {}", e))?;

    let mut preferences = Vec::new();
    for gorunum in results {
        let config: ColumnConfig = serde_json::from_str(&gorunum.columns_config)
            .map_err(|e| format!("JSON parse error: {}", e))?;
        preferences.push((gorunum.page_key, config));
    }

    Ok(preferences)
}
