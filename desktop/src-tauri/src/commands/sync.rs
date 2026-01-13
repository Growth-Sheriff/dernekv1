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
