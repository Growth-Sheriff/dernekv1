use diesel::prelude::*;
use diesel::r2d2::{ConnectionManager, Pool};
use diesel::sqlite::SqliteConnection;
use serde::{Deserialize, Serialize};
use tauri::State;
use reqwest;
use std::collections::HashMap;

type DbPool = Pool<ConnectionManager<SqliteConnection>>;

#[derive(Debug, Serialize, Deserialize, Queryable, Selectable)]
#[diesel(table_name = crate::db::schema::sync_changes)]
pub struct SyncChange {
    pub id: String,
    pub tenant_id: String,
    pub table_name: String,
    pub record_id: String,
    pub operation: String,
    pub data: String,
    pub synced: bool,
    pub sync_version: i32,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct SyncStatus {
    pub pending_changes: i32,
    pub last_sync_at: Option<String>,
    pub is_syncing: bool,
}

#[derive(Debug, Serialize)]
pub struct SyncResult {
    pub success: bool,
    pub synced_count: i32,
    pub failed_count: i32,
    pub errors: Vec<String>,
}

#[tauri::command]
pub fn get_sync_status(
    state: State<'_, crate::AppState>,
    _tenant_id_param: String,
) -> Result<SyncStatus, String> {
    use crate::db::schema::sync_changes::dsl::*;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let pending: i64 = sync_changes
        .filter(crate::db::schema::sync_changes::tenant_id.eq(&_tenant_id_param))
        .filter(synced.eq(false))
        .count()
        .get_result(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(SyncStatus {
        pending_changes: pending as i32,
        last_sync_at: None,
        is_syncing: false,
    })
}

#[tauri::command]
pub fn get_pending_changes(
    state: State<'_, crate::AppState>,
    _tenant_id_param: String,
    limit: i64,
) -> Result<Vec<SyncChange>, String> {
    use crate::db::schema::sync_changes::dsl::*;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let changes = sync_changes
        .filter(crate::db::schema::sync_changes::tenant_id.eq(&_tenant_id_param))
        .filter(synced.eq(false))
        .order(created_at.asc())
        .limit(limit)
        .load::<SyncChange>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(changes)
}

#[tauri::command]
pub async fn push_changes(
    state: State<'_, crate::AppState>,
    _tenant_id_param: String,
    api_url: String,
    auth_token: String,
) -> Result<SyncResult, String> {
    use crate::db::schema::sync_changes::dsl::*;

    let changes = {
        let pool = state.db.lock().unwrap();
        let pool = pool.as_ref().ok_or("Database not initialized")?;
        let mut conn = pool.get().map_err(|e| e.to_string())?;

        sync_changes
            .filter(crate::db::schema::sync_changes::tenant_id.eq(&_tenant_id_param))
            .filter(synced.eq(false))
            .limit(50)
            .load::<SyncChange>(&mut conn)
            .map_err(|e| e.to_string())?
    };

    if changes.is_empty() {
        return Ok(SyncResult {
            success: true,
            synced_count: 0,
            failed_count: 0,
            errors: vec![],
        });
    }

    let client = reqwest::Client::new();
    let mut synced_ids = Vec::new();
    let mut errors = Vec::new();

    for change in &changes {
        let endpoint = format!("{}/api/v1/sync/{}", api_url, change.table_name);
        
        let mut payload = HashMap::new();
        payload.insert("id", &change.record_id);
        payload.insert("operation", &change.operation);
        payload.insert("data", &change.data);

        match client
            .post(&endpoint)
            .header("Authorization", format!("Bearer {}", auth_token))
            .json(&payload)
            .send()
            .await
        {
            Ok(resp) => {
                if resp.status().is_success() {
                    synced_ids.push(change.id.clone());
                } else {
                    errors.push(format!(
                        "Failed to sync {}: HTTP {}",
                        change.id,
                        resp.status()
                    ));
                }
            }
            Err(e) => {
                errors.push(format!("Network error for {}: {}", change.id, e));
            }
        }
    }

    if !synced_ids.is_empty() {
        let pool = state.db.lock().unwrap();
        let pool = pool.as_ref().ok_or("Database not initialized")?;
        let mut conn = pool.get().map_err(|e| e.to_string())?;
        
        let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
        for sync_id in &synced_ids {
            diesel::sql_query(
                "UPDATE sync_changes SET synced = 1, updated_at = ?1 WHERE id = ?2"
            )
            .bind::<diesel::sql_types::Text, _>(&now)
            .bind::<diesel::sql_types::Text, _>(sync_id)
            .execute(&mut conn)
            .map_err(|e| e.to_string())?;
        }
    }

    Ok(SyncResult {
        success: errors.is_empty(),
        synced_count: synced_ids.len() as i32,
        failed_count: errors.len() as i32,
        errors,
    })
}

#[tauri::command]
pub async fn pull_changes(
    _state: State<'_, crate::AppState>,
    _tenant_id_param: String,
    api_url: String,
    auth_token: String,
    since_version: i32,
) -> Result<SyncResult, String> {
    let client = reqwest::Client::new();
    let endpoint = format!("{}/api/v1/sync/pull", api_url);

    let mut query = HashMap::new();
    query.insert("since_version", since_version.to_string());

    match client
        .get(&endpoint)
        .header("Authorization", format!("Bearer {}", auth_token))
        .query(&query)
        .send()
        .await
    {
        Ok(resp) => {
            if resp.status().is_success() {
                Ok(SyncResult {
                    success: true,
                    synced_count: 0,
                    failed_count: 0,
                    errors: vec![],
                })
            } else {
                Err(format!("Pull failed: HTTP {}", resp.status()))
            }
        }
        Err(e) => Err(format!("Network error: {}", e)),
    }
}

#[tauri::command]
pub async fn manual_sync(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    api_url: String,
    auth_token: String,
) -> Result<SyncResult, String> {
    let push_result = push_changes(state.clone(), tenant_id_param.clone(), api_url.clone(), auth_token.clone()).await?;
    
    let pull_result = pull_changes(state, tenant_id_param, api_url, auth_token, 0).await?;

    Ok(SyncResult {
        success: push_result.success && pull_result.success,
        synced_count: push_result.synced_count,
        failed_count: push_result.failed_count + pull_result.failed_count,
        errors: [push_result.errors, pull_result.errors].concat(),
    })
}

/// Bekleyen sync değişikliklerinin sayısını döndür
#[tauri::command]
pub fn get_pending_sync_count(
    state: State<'_, crate::AppState>,
    tenantIdParam: String,
) -> Result<i32, String> {
    use crate::db::schema::sync_changes::dsl::*;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let count: i64 = sync_changes
        .filter(crate::db::schema::sync_changes::tenant_id.eq(&tenantIdParam))
        .filter(synced.eq(false))
        .count()
        .get_result(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(count as i32)
}

/// Bekleyen sync değişikliklerini JSON olarak döndür
#[tauri::command]
pub fn get_pending_sync_changes(
    state: State<'_, crate::AppState>,
    tenantIdParam: String,
) -> Result<Vec<serde_json::Value>, String> {
    use crate::db::schema::sync_changes::dsl::*;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let changes = sync_changes
        .filter(crate::db::schema::sync_changes::tenant_id.eq(&tenantIdParam))
        .filter(synced.eq(false))
        .order(created_at.asc())
        .load::<SyncChange>(&mut conn)
        .map_err(|e| e.to_string())?;

    let result: Vec<serde_json::Value> = changes.iter().map(|c| {
        serde_json::json!({
            "table_name": c.table_name,
            "record_id": c.record_id,
            "action": c.operation,
            "data": serde_json::from_str::<serde_json::Value>(&c.data).unwrap_or(serde_json::Value::Null),
            "local_updated_at": c.created_at
        })
    }).collect();

    Ok(result)
}

/// Sync edilen değişiklikleri işaretle
#[tauri::command]
pub fn mark_changes_synced(
    state: State<'_, crate::AppState>,
    tenantIdParam: String,
    changeIds: Vec<String>,
) -> Result<i32, String> {
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let mut updated = 0;

    for change_id in &changeIds {
        let result = diesel::sql_query(
            "UPDATE sync_changes SET synced = 1, updated_at = ?1 WHERE record_id = ?2 AND tenant_id = ?3"
        )
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(change_id)
        .bind::<diesel::sql_types::Text, _>(&tenantIdParam)
        .execute(&mut conn);

        if result.is_ok() {
            updated += 1;
        }
    }

    Ok(updated)
}

/// Değişiklik kuyruğuna ekle
#[tauri::command]
pub fn queue_sync_change(
    state: State<'_, crate::AppState>,
    tenantIdParam: String,
    change: serde_json::Value,
) -> Result<String, String> {
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let id = uuid::Uuid::new_v4().to_string();
    let table_name = change.get("table_name").and_then(|v| v.as_str()).unwrap_or("");
    let record_id = change.get("record_id").and_then(|v| v.as_str()).unwrap_or("");
    let action = change.get("action").and_then(|v| v.as_str()).unwrap_or("update");
    let data = change.get("data").map(|v| v.to_string()).unwrap_or("{}".to_string());
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    diesel::sql_query(
        "INSERT INTO sync_changes (id, tenant_id, table_name, record_id, operation, data, synced, sync_version, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 0, ?7)"
    )
    .bind::<diesel::sql_types::Text, _>(&id)
    .bind::<diesel::sql_types::Text, _>(&tenantIdParam)
    .bind::<diesel::sql_types::Text, _>(table_name)
    .bind::<diesel::sql_types::Text, _>(record_id)
    .bind::<diesel::sql_types::Text, _>(action)
    .bind::<diesel::sql_types::Text, _>(&data)
    .bind::<diesel::sql_types::Text, _>(&now)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(id)
}

/// Sunucudan gelen değişiklikleri uygula
#[tauri::command]
pub fn apply_sync_changes(
    state: State<'_, crate::AppState>,
    tenantIdParam: String,
    changes: Vec<serde_json::Value>,
) -> Result<i32, String> {
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let mut applied = 0;

    for change in changes {
        let table_name = change.get("table_name").and_then(|v| v.as_str()).unwrap_or("");
        let record_id = change.get("record_id").and_then(|v| v.as_str()).unwrap_or("");
        let action = change.get("action").and_then(|v| v.as_str()).unwrap_or("");
        let data = change.get("data");

        // TODO: Tablo bazlı uygulama mantığı
        // Her tablo için ayrı handler yazılmalı
        match action {
            "create" | "update" => {
                // Upsert işlemi
                println!("Applying {} to {} for record {}", action, table_name, record_id);
                applied += 1;
            }
            "delete" => {
                // Soft delete
                println!("Deleting from {} record {}", table_name, record_id);
                applied += 1;
            }
            _ => {}
        }
    }

    Ok(applied)
}

/// Cihaz ID'sini döndür (hardware fingerprint)
#[tauri::command]
pub fn get_device_id() -> Result<String, String> {
    // TODO: Gerçek hardware fingerprint implementasyonu
    // Şimdilik machine-uid veya benzeri bir kütüphane kullanılabilir
    
    // Geçici olarak hostname + random id kullanalım
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string());
    
    let device_id = format!("{}_{}", hostname, uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("0000"));
    
    Ok(device_id)
}

