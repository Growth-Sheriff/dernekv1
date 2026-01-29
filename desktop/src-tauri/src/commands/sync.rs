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

#[derive(Debug, Serialize)]
struct SyncPushRequest {
    pub changes: Vec<SyncChangePayload>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SyncChangePayload {
    pub table_name: String,
    pub record_id: String,
    pub action: String,
    pub data: serde_json::Value,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
struct SyncPullRequest {
    pub tenant_id: String,
    pub last_sync_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SyncPullResponse {
    pub changes: Vec<SyncChangePayload>,
}

#[tauri::command]
pub async fn push_changes(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    api_url: String,
    auth_token: String,
) -> Result<SyncResult, String> {
    use crate::db::schema::sync_changes::dsl::*;

    let changes_db = {
        let pool = state.db.lock().unwrap();
        let pool = pool.as_ref().ok_or("Database not initialized")?;
        let mut conn = pool.get().map_err(|e| e.to_string())?;

        sync_changes
            .filter(crate::db::schema::sync_changes::tenant_id.eq(&tenant_id_param))
            .filter(synced.eq(false))
            .limit(50)
            .load::<SyncChange>(&mut conn)
            .map_err(|e| e.to_string())?
    };

    if changes_db.is_empty() {
        return Ok(SyncResult {
            success: true,
            synced_count: 0,
            failed_count: 0,
            errors: vec![],
        });
    }

    let payload_changes: Vec<SyncChangePayload> = changes_db.iter().map(|c| {
        SyncChangePayload {
            table_name: c.table_name.clone(),
            record_id: c.record_id.clone(),
            action: c.operation.clone(),
            data: serde_json::from_str(&c.data).unwrap_or(serde_json::Value::Null),
            updated_at: c.created_at.clone(),
        }
    }).collect();

    let request = SyncPushRequest {
        changes: payload_changes,
    };

    let client = reqwest::Client::new();
    let endpoint = format!("{}/api/v1/sync/push", api_url);

    match client
        .post(&endpoint)
        .header("Authorization", format!("Bearer {}", auth_token))
        .json(&request)
        .send()
        .await
    {
        Ok(resp) => {
            if resp.status().is_success() {
                // Mark as synced
                let pool = state.db.lock().unwrap();
                let pool = pool.as_ref().ok_or("Database not initialized")?;
                let mut conn = pool.get().map_err(|e| e.to_string())?;
                
                let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
                let ids: Vec<String> = changes_db.iter().map(|c| c.id.clone()).collect();
                
                for sync_id in ids {
                     diesel::sql_query(
                        "UPDATE sync_changes SET synced = 1, updated_at = ?1 WHERE id = ?2"
                    )
                    .bind::<diesel::sql_types::Text, _>(&now)
                    .bind::<diesel::sql_types::Text, _>(sync_id)
                    .execute(&mut conn)
                    .map_err(|e| e.to_string())?;
                }

                Ok(SyncResult {
                    success: true,
                    synced_count: changes_db.len() as i32,
                    failed_count: 0,
                    errors: vec![],
                })
            } else {
                Ok(SyncResult {
                    success: false,
                    synced_count: 0,
                    failed_count: changes_db.len() as i32,
                    errors: vec![format!("Push failed: HTTP {}", resp.status())],
                })
            }
        }
        Err(e) => Ok(SyncResult {
            success: false,
            synced_count: 0,
            failed_count: changes_db.len() as i32,
            errors: vec![format!("Network error: {}", e)],
        }),
    }
}

#[tauri::command]
pub async fn pull_changes(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    api_url: String,
    auth_token: String,
    since_version: i32,
) -> Result<SyncResult, String> {
    // Note: since_version parameter is unused in new logic, we rely on last_sync_at logic if implemented,
    // or we just fetch everything? Backend expects nothing for full sync implies delta? 
    // Actually our backend SyncPullRequest takes (tenant_id, last_sync_at).
    
    let client = reqwest::Client::new();
    let endpoint = format!("{}/api/v1/sync/pull", api_url);

    let request = SyncPullRequest {
        tenant_id: tenant_id_param.clone(),
        last_sync_at: None, // TODO: Store/Retrieve last sync time from DB
    };

    match client
        .post(&endpoint)
        .header("Authorization", format!("Bearer {}", auth_token))
        .json(&request)
        .send()
        .await
    {
        Ok(resp) => {
            if resp.status().is_success() {
                 let pull_resp = resp.json::<SyncPullResponse>().await.map_err(|e| e.to_string())?;
                 
                 // Apply changes
                 // We reuse apply_sync_changes logic bit below, but need to reconstruct Value objects
                 // Or just call internal logic
                 
                 // Converting payload back to Values
                 let mut values = Vec::new();
                 for ch in pull_resp.changes {
                     let v = serde_json::json!({
                         "table_name": ch.table_name,
                         "record_id": ch.record_id,
                         "action": ch.action,
                         "data": ch.data,
                         "local_updated_at": ch.updated_at
                     });
                     values.push(v);
                 }
                 
                 let applied = apply_sync_changes(state, tenant_id_param, values)?;
                 
                Ok(SyncResult {
                    success: true,
                    synced_count: applied,
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
    
    // Only pull if push was successful (or partial)
    let pull_result = pull_changes(state, tenant_id_param, api_url, auth_token, 0).await?;

    Ok(SyncResult {
        success: push_result.success && pull_result.success,
        synced_count: push_result.synced_count + pull_result.synced_count,
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
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    for change in changes {
        let table_name = change.get("table_name").and_then(|v| v.as_str()).unwrap_or("");
        let record_id = change.get("record_id").and_then(|v| v.as_str()).unwrap_or("");
        let action = change.get("action").and_then(|v| v.as_str()).unwrap_or("");
        let data = change.get("data").cloned().unwrap_or(serde_json::Value::Null);

        let result = match table_name {
            "uyeler" => upsert_uye(&mut conn, &tenantIdParam, record_id, &data, action, &now),
            "gelirler" => upsert_gelir(&mut conn, &tenantIdParam, record_id, &data, action, &now),
            "giderler" => upsert_gider(&mut conn, &tenantIdParam, record_id, &data, action, &now),
            "kasalar" => upsert_kasa(&mut conn, &tenantIdParam, record_id, &data, action, &now),
            "aidatlar" | "aidat_takip" => upsert_aidat(&mut conn, &tenantIdParam, record_id, &data, action, &now),
            _ => {
                println!("⚠️ Unknown table for sync: {}", table_name);
                Ok(())
            }
        };

        match result {
            Ok(_) => {
                applied += 1;
                println!("✅ Applied {} to {} for record {}", action, table_name, record_id);
            }
            Err(e) => {
                println!("❌ Failed to apply {} to {} for record {}: {}", action, table_name, record_id, e);
            }
        }
    }

    Ok(applied)
}

// ============================================================================
// UPSERT HELPERS
// ============================================================================

fn upsert_uye(
    conn: &mut diesel::r2d2::PooledConnection<diesel::r2d2::ConnectionManager<SqliteConnection>>,
    tenant_id: &str,
    record_id: &str,
    data: &serde_json::Value,
    action: &str,
    now: &str,
) -> Result<(), String> {
    if action == "delete" {
        diesel::sql_query("UPDATE uyeler SET durum = 'PASIF', updated_at = ?1 WHERE id = ?2 AND tenant_id = ?3")
            .bind::<diesel::sql_types::Text, _>(now)
            .bind::<diesel::sql_types::Text, _>(record_id)
            .bind::<diesel::sql_types::Text, _>(tenant_id)
            .execute(conn)
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    let ad = data.get("ad").and_then(|v| v.as_str()).unwrap_or("");
    let soyad = data.get("soyad").and_then(|v| v.as_str()).unwrap_or("");
    let ad_soyad = format!("{} {}", ad, soyad);
    let uye_no = data.get("uye_no").and_then(|v| v.as_str()).unwrap_or("0");
    let tc_no = data.get("tc_no").and_then(|v| v.as_str()).unwrap_or("");
    let telefon = data.get("telefon").and_then(|v| v.as_str());
    let email = data.get("email").and_then(|v| v.as_str());
    let giris_tarihi = data.get("giris_tarihi").and_then(|v| v.as_str()).unwrap_or(now);
    let durum = data.get("durum").and_then(|v| v.as_str()).unwrap_or("AKTIF");
    let created_at = data.get("created_at").and_then(|v| v.as_str()).unwrap_or(now);

    // Check if exists
    let exists: i64 = diesel::sql_query("SELECT COUNT(*) as count FROM uyeler WHERE id = ?1")
        .bind::<diesel::sql_types::Text, _>(record_id)
        .get_result::<CountResult>(conn)
        .map(|r| r.count)
        .unwrap_or(0);

    if exists > 0 {
        // Update
        diesel::sql_query(
            "UPDATE uyeler SET ad = ?1, soyad = ?2, ad_soyad = ?3, uye_no = ?4, tc_no = ?5, \
             telefon = ?6, email = ?7, durum = ?8, updated_at = ?9 \
             WHERE id = ?10 AND tenant_id = ?11"
        )
        .bind::<diesel::sql_types::Text, _>(ad)
        .bind::<diesel::sql_types::Text, _>(soyad)
        .bind::<diesel::sql_types::Text, _>(&ad_soyad)
        .bind::<diesel::sql_types::Text, _>(uye_no)
        .bind::<diesel::sql_types::Text, _>(tc_no)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(telefon)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(email)
        .bind::<diesel::sql_types::Text, _>(durum)
        .bind::<diesel::sql_types::Text, _>(now)
        .bind::<diesel::sql_types::Text, _>(record_id)
        .bind::<diesel::sql_types::Text, _>(tenant_id)
        .execute(conn)
        .map_err(|e| e.to_string())?;
    } else {
        // Insert
        diesel::sql_query(
            "INSERT INTO uyeler (id, tenant_id, ad, soyad, ad_soyad, uye_no, tc_no, telefon, email, \
             giris_tarihi, durum, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)"
        )
        .bind::<diesel::sql_types::Text, _>(record_id)
        .bind::<diesel::sql_types::Text, _>(tenant_id)
        .bind::<diesel::sql_types::Text, _>(ad)
        .bind::<diesel::sql_types::Text, _>(soyad)
        .bind::<diesel::sql_types::Text, _>(&ad_soyad)
        .bind::<diesel::sql_types::Text, _>(uye_no)
        .bind::<diesel::sql_types::Text, _>(tc_no)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(telefon)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(email)
        .bind::<diesel::sql_types::Text, _>(giris_tarihi)
        .bind::<diesel::sql_types::Text, _>(durum)
        .bind::<diesel::sql_types::Text, _>(created_at)
        .bind::<diesel::sql_types::Text, _>(now)
        .execute(conn)
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn upsert_gelir(
    conn: &mut diesel::r2d2::PooledConnection<diesel::r2d2::ConnectionManager<SqliteConnection>>,
    tenant_id: &str,
    record_id: &str,
    data: &serde_json::Value,
    action: &str,
    now: &str,
) -> Result<(), String> {
    if action == "delete" {
        diesel::sql_query("UPDATE gelirler SET is_deleted = 1, updated_at = ?1 WHERE id = ?2 AND tenant_id = ?3")
            .bind::<diesel::sql_types::Text, _>(now)
            .bind::<diesel::sql_types::Text, _>(record_id)
            .bind::<diesel::sql_types::Text, _>(tenant_id)
            .execute(conn)
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    let kasa_id = data.get("kasa_id").and_then(|v| v.as_str()).unwrap_or("");
    let tutar = data.get("tutar").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let tarih = data.get("tarih").and_then(|v| v.as_str()).unwrap_or(now);
    let aciklama = data.get("aciklama").and_then(|v| v.as_str());
    let gelir_turu = data.get("gelir_turu").and_then(|v| v.as_str());
    let gelir_turu_id = data.get("gelir_turu_id").and_then(|v| v.as_str());
    let uye_id = data.get("uye_id").and_then(|v| v.as_str());
    let belge_no = data.get("belge_no").and_then(|v| v.as_str());
    let created_at = data.get("created_at").and_then(|v| v.as_str()).unwrap_or(now);

    let exists: i64 = diesel::sql_query("SELECT COUNT(*) as count FROM gelirler WHERE id = ?1")
        .bind::<diesel::sql_types::Text, _>(record_id)
        .get_result::<CountResult>(conn)
        .map(|r| r.count)
        .unwrap_or(0);

    if exists > 0 {
        diesel::sql_query(
            "UPDATE gelirler SET kasa_id = ?1, tutar = ?2, tarih = ?3, aciklama = ?4, \
             gelir_turu = ?5, gelir_turu_id = ?6, uye_id = ?7, belge_no = ?8, updated_at = ?9 \
             WHERE id = ?10 AND tenant_id = ?11"
        )
        .bind::<diesel::sql_types::Text, _>(kasa_id)
        .bind::<diesel::sql_types::Double, _>(tutar)
        .bind::<diesel::sql_types::Text, _>(tarih)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(aciklama)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(gelir_turu)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(gelir_turu_id)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(uye_id)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(belge_no)
        .bind::<diesel::sql_types::Text, _>(now)
        .bind::<diesel::sql_types::Text, _>(record_id)
        .bind::<diesel::sql_types::Text, _>(tenant_id)
        .execute(conn)
        .map_err(|e| e.to_string())?;
    } else {
        diesel::sql_query(
            "INSERT INTO gelirler (id, tenant_id, kasa_id, tutar, tarih, aciklama, gelir_turu, \
             gelir_turu_id, uye_id, belge_no, is_deleted, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0, ?11, ?12)"
        )
        .bind::<diesel::sql_types::Text, _>(record_id)
        .bind::<diesel::sql_types::Text, _>(tenant_id)
        .bind::<diesel::sql_types::Text, _>(kasa_id)
        .bind::<diesel::sql_types::Double, _>(tutar)
        .bind::<diesel::sql_types::Text, _>(tarih)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(aciklama)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(gelir_turu)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(gelir_turu_id)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(uye_id)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(belge_no)
        .bind::<diesel::sql_types::Text, _>(created_at)
        .bind::<diesel::sql_types::Text, _>(now)
        .execute(conn)
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn upsert_gider(
    conn: &mut diesel::r2d2::PooledConnection<diesel::r2d2::ConnectionManager<SqliteConnection>>,
    tenant_id: &str,
    record_id: &str,
    data: &serde_json::Value,
    action: &str,
    now: &str,
) -> Result<(), String> {
    if action == "delete" {
        diesel::sql_query("UPDATE giderler SET is_deleted = 1, updated_at = ?1 WHERE id = ?2 AND tenant_id = ?3")
            .bind::<diesel::sql_types::Text, _>(now)
            .bind::<diesel::sql_types::Text, _>(record_id)
            .bind::<diesel::sql_types::Text, _>(tenant_id)
            .execute(conn)
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    let kasa_id = data.get("kasa_id").and_then(|v| v.as_str()).unwrap_or("");
    let tutar = data.get("tutar").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let tarih = data.get("tarih").and_then(|v| v.as_str()).unwrap_or(now);
    let aciklama = data.get("aciklama").and_then(|v| v.as_str());
    let gider_turu = data.get("gider_turu").and_then(|v| v.as_str());
    let gider_turu_id = data.get("gider_turu_id").and_then(|v| v.as_str());
    let fatura_no = data.get("fatura_no").and_then(|v| v.as_str());
    let created_at = data.get("created_at").and_then(|v| v.as_str()).unwrap_or(now);

    let exists: i64 = diesel::sql_query("SELECT COUNT(*) as count FROM giderler WHERE id = ?1")
        .bind::<diesel::sql_types::Text, _>(record_id)
        .get_result::<CountResult>(conn)
        .map(|r| r.count)
        .unwrap_or(0);

    if exists > 0 {
        diesel::sql_query(
            "UPDATE giderler SET kasa_id = ?1, tutar = ?2, tarih = ?3, aciklama = ?4, \
             gider_turu = ?5, gider_turu_id = ?6, fatura_no = ?7, updated_at = ?8 \
             WHERE id = ?9 AND tenant_id = ?10"
        )
        .bind::<diesel::sql_types::Text, _>(kasa_id)
        .bind::<diesel::sql_types::Double, _>(tutar)
        .bind::<diesel::sql_types::Text, _>(tarih)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(aciklama)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(gider_turu)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(gider_turu_id)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(fatura_no)
        .bind::<diesel::sql_types::Text, _>(now)
        .bind::<diesel::sql_types::Text, _>(record_id)
        .bind::<diesel::sql_types::Text, _>(tenant_id)
        .execute(conn)
        .map_err(|e| e.to_string())?;
    } else {
        diesel::sql_query(
            "INSERT INTO giderler (id, tenant_id, kasa_id, tutar, tarih, aciklama, gider_turu, \
             gider_turu_id, fatura_no, is_deleted, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, ?10, ?11)"
        )
        .bind::<diesel::sql_types::Text, _>(record_id)
        .bind::<diesel::sql_types::Text, _>(tenant_id)
        .bind::<diesel::sql_types::Text, _>(kasa_id)
        .bind::<diesel::sql_types::Double, _>(tutar)
        .bind::<diesel::sql_types::Text, _>(tarih)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(aciklama)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(gider_turu)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(gider_turu_id)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(fatura_no)
        .bind::<diesel::sql_types::Text, _>(created_at)
        .bind::<diesel::sql_types::Text, _>(now)
        .execute(conn)
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn upsert_kasa(
    conn: &mut diesel::r2d2::PooledConnection<diesel::r2d2::ConnectionManager<SqliteConnection>>,
    tenant_id: &str,
    record_id: &str,
    data: &serde_json::Value,
    action: &str,
    now: &str,
) -> Result<(), String> {
    if action == "delete" {
        diesel::sql_query("UPDATE kasalar SET is_active = 0, updated_at = ?1 WHERE id = ?2 AND tenant_id = ?3")
            .bind::<diesel::sql_types::Text, _>(now)
            .bind::<diesel::sql_types::Text, _>(record_id)
            .bind::<diesel::sql_types::Text, _>(tenant_id)
            .execute(conn)
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    let kasa_adi = data.get("ad").or(data.get("kasa_adi")).and_then(|v| v.as_str()).unwrap_or("Kasa");
    let bakiye = data.get("bakiye").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let para_birimi = data.get("para_birimi").and_then(|v| v.as_str()).unwrap_or("TRY");
    let created_at = data.get("created_at").and_then(|v| v.as_str()).unwrap_or(now);

    let exists: i64 = diesel::sql_query("SELECT COUNT(*) as count FROM kasalar WHERE id = ?1")
        .bind::<diesel::sql_types::Text, _>(record_id)
        .get_result::<CountResult>(conn)
        .map(|r| r.count)
        .unwrap_or(0);

    if exists > 0 {
        diesel::sql_query(
            "UPDATE kasalar SET kasa_adi = ?1, bakiye = ?2, para_birimi = ?3, updated_at = ?4 \
             WHERE id = ?5 AND tenant_id = ?6"
        )
        .bind::<diesel::sql_types::Text, _>(kasa_adi)
        .bind::<diesel::sql_types::Double, _>(bakiye)
        .bind::<diesel::sql_types::Text, _>(para_birimi)
        .bind::<diesel::sql_types::Text, _>(now)
        .bind::<diesel::sql_types::Text, _>(record_id)
        .bind::<diesel::sql_types::Text, _>(tenant_id)
        .execute(conn)
        .map_err(|e| e.to_string())?;
    } else {
        diesel::sql_query(
            "INSERT INTO kasalar (id, tenant_id, kasa_adi, bakiye, para_birimi, is_active, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7)"
        )
        .bind::<diesel::sql_types::Text, _>(record_id)
        .bind::<diesel::sql_types::Text, _>(tenant_id)
        .bind::<diesel::sql_types::Text, _>(kasa_adi)
        .bind::<diesel::sql_types::Double, _>(bakiye)
        .bind::<diesel::sql_types::Text, _>(para_birimi)
        .bind::<diesel::sql_types::Text, _>(created_at)
        .bind::<diesel::sql_types::Text, _>(now)
        .execute(conn)
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn upsert_aidat(
    conn: &mut diesel::r2d2::PooledConnection<diesel::r2d2::ConnectionManager<SqliteConnection>>,
    tenant_id: &str,
    record_id: &str,
    data: &serde_json::Value,
    action: &str,
    now: &str,
) -> Result<(), String> {
    if action == "delete" {
        diesel::sql_query("DELETE FROM aidat_takip WHERE id = ?1 AND tenant_id = ?2")
            .bind::<diesel::sql_types::Text, _>(record_id)
            .bind::<diesel::sql_types::Text, _>(tenant_id)
            .execute(conn)
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    let uye_id = data.get("uye_id").and_then(|v| v.as_str()).unwrap_or("");
    let yil = data.get("yil").and_then(|v| v.as_i64()).unwrap_or(2026) as i32;
    let ay = data.get("ay").and_then(|v| v.as_i64()).unwrap_or(1) as i32;
    let tutar = data.get("tutar").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let odenen = data.get("odenen").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let durum = data.get("durum").and_then(|v| v.as_str()).unwrap_or("ODENMEDI");
    let odeme_tarihi = data.get("odeme_tarihi").and_then(|v| v.as_str());
    let created_at = data.get("created_at").and_then(|v| v.as_str()).unwrap_or(now);

    let exists: i64 = diesel::sql_query("SELECT COUNT(*) as count FROM aidat_takip WHERE id = ?1")
        .bind::<diesel::sql_types::Text, _>(record_id)
        .get_result::<CountResult>(conn)
        .map(|r| r.count)
        .unwrap_or(0);

    if exists > 0 {
        diesel::sql_query(
            "UPDATE aidat_takip SET uye_id = ?1, yil = ?2, ay = ?3, tutar = ?4, odenen = ?5, \
             durum = ?6, odeme_tarihi = ?7, updated_at = ?8, version = version + 1 \
             WHERE id = ?9 AND tenant_id = ?10"
        )
        .bind::<diesel::sql_types::Text, _>(uye_id)
        .bind::<diesel::sql_types::Integer, _>(yil)
        .bind::<diesel::sql_types::Integer, _>(ay)
        .bind::<diesel::sql_types::Double, _>(tutar)
        .bind::<diesel::sql_types::Double, _>(odenen)
        .bind::<diesel::sql_types::Text, _>(durum)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(odeme_tarihi)
        .bind::<diesel::sql_types::Text, _>(now)
        .bind::<diesel::sql_types::Text, _>(record_id)
        .bind::<diesel::sql_types::Text, _>(tenant_id)
        .execute(conn)
        .map_err(|e| e.to_string())?;
    } else {
        diesel::sql_query(
            "INSERT INTO aidat_takip (id, tenant_id, uye_id, yil, ay, tutar, odenen, durum, \
             odeme_tarihi, version, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1, ?10, ?11)"
        )
        .bind::<diesel::sql_types::Text, _>(record_id)
        .bind::<diesel::sql_types::Text, _>(tenant_id)
        .bind::<diesel::sql_types::Text, _>(uye_id)
        .bind::<diesel::sql_types::Integer, _>(yil)
        .bind::<diesel::sql_types::Integer, _>(ay)
        .bind::<diesel::sql_types::Double, _>(tutar)
        .bind::<diesel::sql_types::Double, _>(odenen)
        .bind::<diesel::sql_types::Text, _>(durum)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(odeme_tarihi)
        .bind::<diesel::sql_types::Text, _>(created_at)
        .bind::<diesel::sql_types::Text, _>(now)
        .execute(conn)
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

// CountResult helper struct for COUNT queries
#[derive(diesel::QueryableByName)]
struct CountResult {
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    count: i64,
}

/// Cihaz ID'sini döndür (hardware fingerprint) - PERSISTENT
#[tauri::command]
pub fn get_device_id() -> Result<String, String> {
    use std::fs;

    // Config dosyasından device_id oku
    let config_dir = dirs::config_dir()
        .ok_or("Config directory not found")?
        .join("bader");

    let device_id_file = config_dir.join("device_id.txt");

    // Eğer dosya varsa oku
    if device_id_file.exists() {
        if let Ok(stored_id) = fs::read_to_string(&device_id_file) {
            let trimmed = stored_id.trim();
            if !trimmed.is_empty() {
                return Ok(trimmed.to_string());
            }
        }
    }

    // Yoksa yeni generate et ve kaydet
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string());

    let device_id = format!("{}_{}", hostname, uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("0000"));

    // Config klasörünü oluştur
    fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;

    // Device ID'yi kaydet
    fs::write(&device_id_file, &device_id).map_err(|e| e.to_string())?;

    Ok(device_id)
}

