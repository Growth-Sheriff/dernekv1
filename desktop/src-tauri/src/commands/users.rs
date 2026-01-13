// User Management Commands - FULL CRUD

use tauri::State;
use serde::{Deserialize, Serialize};
use diesel::prelude::*;
use uuid::Uuid;
use sha2::{Sha256, Digest};
use crate::state::AppState;

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: String,
    pub tenant_id: String,
    pub email: String,
    pub full_name: String,
    pub username: String,
    pub phone: Option<String>,
    pub role: String,
    pub is_active: bool,
    pub is_superuser: bool,
    pub last_login: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub email: String,
    pub full_name: String,
    pub username: String,
    pub password: String,
    pub phone: Option<String>,
    pub role: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub email: Option<String>,
    pub full_name: Option<String>,
    pub username: Option<String>,
    pub phone: Option<String>,
    pub role: Option<String>,
    pub is_active: Option<bool>,
}

// ============================================================================
// COMMANDS
// ============================================================================

#[tauri::command]
pub async fn get_users(
    state: State<'_, AppState>,
    tenant_id_param: String,
) -> Result<Vec<User>, String> {
    // Tenant access kontrolü
    state.verify_tenant_access(&tenant_id_param)?;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    #[derive(QueryableByName)]
    struct UserRow {
        #[diesel(sql_type = diesel::sql_types::Text)]
        id: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        tenant_id: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        email: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        full_name: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        username: String,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        phone: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Text)]
        role: String,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        is_active: i32,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        is_superuser: i32,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        last_login: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Text)]
        created_at: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        updated_at: String,
    }

    let rows = diesel::sql_query(
        "SELECT id, tenant_id, email, full_name, username, phone, 
                COALESCE(role, 'viewer') as role, 
                is_active, is_superuser, last_login, created_at, updated_at
         FROM users
         WHERE tenant_id = ?1
         ORDER BY created_at DESC"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .load::<UserRow>(&mut conn)
    .map_err(|e| e.to_string())?;

    let users = rows.into_iter().map(|row| User {
        id: row.id,
        tenant_id: row.tenant_id,
        email: row.email,
        full_name: row.full_name,
        username: row.username,
        phone: row.phone,
        role: row.role,
        is_active: row.is_active == 1,
        is_superuser: row.is_superuser == 1,
        last_login: row.last_login,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }).collect();

    Ok(users)
}

#[tauri::command]
pub async fn get_user(
    state: State<'_, AppState>,
    tenant_id_param: String,
    user_id: String,
) -> Result<User, String> {
    state.verify_tenant_access(&tenant_id_param)?;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    #[derive(QueryableByName)]
    struct UserRow {
        #[diesel(sql_type = diesel::sql_types::Text)]
        id: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        tenant_id: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        email: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        full_name: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        username: String,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        phone: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Text)]
        role: String,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        is_active: i32,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        is_superuser: i32,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        last_login: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Text)]
        created_at: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        updated_at: String,
    }

    let row = diesel::sql_query(
        "SELECT id, tenant_id, email, full_name, username, phone, 
                COALESCE(role, 'viewer') as role, 
                is_active, is_superuser, last_login, created_at, updated_at
         FROM users
         WHERE id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&user_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<UserRow>(&mut conn)
    .map_err(|e| format!("Kullanıcı bulunamadı: {}", e))?;

    Ok(User {
        id: row.id,
        tenant_id: row.tenant_id,
        email: row.email,
        full_name: row.full_name,
        username: row.username,
        phone: row.phone,
        role: row.role,
        is_active: row.is_active == 1,
        is_superuser: row.is_superuser == 1,
        last_login: row.last_login,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}

#[tauri::command]
pub async fn create_user(
    state: State<'_, AppState>,
    tenant_id_param: String,
    data: CreateUserRequest,
) -> Result<User, String> {
    state.verify_tenant_access(&tenant_id_param)?;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Email validasyon
    if !data.email.contains('@') {
        return Err("Geçerli bir email adresi girin".to_string());
    }

    // Username benzersizlik kontrolü
    #[derive(QueryableByName)]
    struct CountResult {
        #[diesel(sql_type = diesel::sql_types::BigInt)]
        count: i64,
    }
    
    let exists = diesel::sql_query(
        "SELECT COUNT(*) as count FROM users WHERE tenant_id = ?1 AND (username = ?2 OR email = ?3)"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Text, _>(&data.username)
    .bind::<diesel::sql_types::Text, _>(&data.email)
    .get_result::<CountResult>(&mut conn)
    .map_err(|e| e.to_string())?;

    if exists.count > 0 {
        return Err("Bu kullanıcı adı veya email zaten kullanılıyor".to_string());
    }

    let new_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    
    // Şifre hash (basit SHA256 - production'da bcrypt kullanın)
    let mut hasher = Sha256::new();
    hasher.update(data.password.as_bytes());
    let password_hash = format!("{:x}", hasher.finalize());

    diesel::sql_query(
        "INSERT INTO users (id, tenant_id, email, full_name, username, phone, password_hash, role, is_active, is_superuser, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1, 0, ?9, ?10)"
    )
    .bind::<diesel::sql_types::Text, _>(&new_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Text, _>(&data.email)
    .bind::<diesel::sql_types::Text, _>(&data.full_name)
    .bind::<diesel::sql_types::Text, _>(&data.username)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.phone)
    .bind::<diesel::sql_types::Text, _>(&password_hash)
    .bind::<diesel::sql_types::Text, _>(&data.role.unwrap_or_else(|| "viewer".to_string()))
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&now)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    // Yeni kullanıcıyı getir
    #[derive(QueryableByName)]
    struct UserRow {
        #[diesel(sql_type = diesel::sql_types::Text)]
        id: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        tenant_id: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        email: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        full_name: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        username: String,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        phone: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Text)]
        role: String,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        is_active: i32,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        is_superuser: i32,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        last_login: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Text)]
        created_at: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        updated_at: String,
    }

    let row = diesel::sql_query(
        "SELECT id, tenant_id, email, full_name, username, phone, 
                COALESCE(role, 'viewer') as role, 
                is_active, is_superuser, last_login, created_at, updated_at
         FROM users
         WHERE id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&new_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<UserRow>(&mut conn)
    .map_err(|e| format!("Kullanıcı bulunamadı: {}", e))?;

    Ok(User {
        id: row.id,
        tenant_id: row.tenant_id,
        email: row.email,
        full_name: row.full_name,
        username: row.username,
        phone: row.phone,
        role: row.role,
        is_active: row.is_active == 1,
        is_superuser: row.is_superuser == 1,
        last_login: row.last_login,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}

#[tauri::command]
pub async fn update_user(
    state: State<'_, AppState>,
    tenant_id_param: String,
    user_id: String,
    data: UpdateUserRequest,
) -> Result<User, String> {
    state.verify_tenant_access(&tenant_id_param)?;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // SQL injection önleme için escape fonksiyonu
    fn escape_sql(s: &str) -> String {
        s.replace('\'', "''").replace('\\', "\\\\")
    }

    let mut updates = vec![];
    
    if let Some(email) = &data.email {
        if !email.contains('@') {
            return Err("Geçerli bir email adresi girin".to_string());
        }
        updates.push(format!("email = '{}'", escape_sql(email)));
    }
    if let Some(full_name) = &data.full_name {
        updates.push(format!("full_name = '{}'", escape_sql(full_name)));
    }
    if let Some(username) = &data.username {
        updates.push(format!("username = '{}'", escape_sql(username)));
    }
    if let Some(phone) = &data.phone {
        updates.push(format!("phone = '{}'", escape_sql(phone)));
    }
    if let Some(role) = &data.role {
        updates.push(format!("role = '{}'", escape_sql(role)));
    }
    if let Some(is_active) = data.is_active {
        updates.push(format!("is_active = {}", if is_active { 1 } else { 0 }));
    }

    if !updates.is_empty() {
        updates.push(format!("updated_at = '{}'", now));

        let query = format!(
            "UPDATE users SET {} WHERE id = '{}' AND tenant_id = '{}'",
            updates.join(", "),
            escape_sql(&user_id),
            escape_sql(&tenant_id_param)
        );

        diesel::sql_query(&query)
            .execute(&mut conn)
            .map_err(|e| e.to_string())?;
    }

    // Güncellenmiş kullanıcıyı getir
    #[derive(QueryableByName)]
    struct UserRow {
        #[diesel(sql_type = diesel::sql_types::Text)]
        id: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        tenant_id: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        email: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        full_name: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        username: String,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        phone: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Text)]
        role: String,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        is_active: i32,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        is_superuser: i32,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        last_login: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Text)]
        created_at: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        updated_at: String,
    }

    let row = diesel::sql_query(
        "SELECT id, tenant_id, email, full_name, username, phone, 
                COALESCE(role, 'viewer') as role, 
                is_active, is_superuser, last_login, created_at, updated_at
         FROM users
         WHERE id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&user_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<UserRow>(&mut conn)
    .map_err(|e| format!("Kullanıcı bulunamadı: {}", e))?;

    Ok(User {
        id: row.id,
        tenant_id: row.tenant_id,
        email: row.email,
        full_name: row.full_name,
        username: row.username,
        phone: row.phone,
        role: row.role,
        is_active: row.is_active == 1,
        is_superuser: row.is_superuser == 1,
        last_login: row.last_login,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}

#[tauri::command]
pub async fn delete_user(
    state: State<'_, AppState>,
    tenant_id_param: String,
    user_id: String,
) -> Result<(), String> {
    state.verify_tenant_access(&tenant_id_param)?;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Superuser silme kontrolü
    #[derive(QueryableByName)]
    struct UserCheck {
        #[diesel(sql_type = diesel::sql_types::Integer)]
        is_superuser: i32,
    }

    let check = diesel::sql_query(
        "SELECT is_superuser FROM users WHERE id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&user_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<UserCheck>(&mut conn)
    .map_err(|_| "Kullanıcı bulunamadı")?;

    if check.is_superuser == 1 {
        return Err("Superuser silinemez".to_string());
    }

    // Soft delete (is_active = 0)
    diesel::sql_query(
        "UPDATE users SET is_active = 0, updated_at = ?1 WHERE id = ?2 AND tenant_id = ?3"
    )
    .bind::<diesel::sql_types::Text, _>(&chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string())
    .bind::<diesel::sql_types::Text, _>(&user_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn activate_user(
    state: State<'_, AppState>,
    tenant_id_param: String,
    user_id: String,
) -> Result<User, String> {
    state.verify_tenant_access(&tenant_id_param)?;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query(
        "UPDATE users SET is_active = 1, updated_at = ?1 WHERE id = ?2 AND tenant_id = ?3"
    )
    .bind::<diesel::sql_types::Text, _>(&chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string())
    .bind::<diesel::sql_types::Text, _>(&user_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    // Aktif edilmiş kullanıcıyı getir
    #[derive(QueryableByName)]
    struct UserRow {
        #[diesel(sql_type = diesel::sql_types::Text)]
        id: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        tenant_id: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        email: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        full_name: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        username: String,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        phone: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Text)]
        role: String,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        is_active: i32,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        is_superuser: i32,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        last_login: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Text)]
        created_at: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        updated_at: String,
    }

    let row = diesel::sql_query(
        "SELECT id, tenant_id, email, full_name, username, phone, 
                COALESCE(role, 'viewer') as role, 
                is_active, is_superuser, last_login, created_at, updated_at
         FROM users
         WHERE id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&user_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<UserRow>(&mut conn)
    .map_err(|e| format!("Kullanıcı bulunamadı: {}", e))?;

    Ok(User {
        id: row.id,
        tenant_id: row.tenant_id,
        email: row.email,
        full_name: row.full_name,
        username: row.username,
        phone: row.phone,
        role: row.role,
        is_active: row.is_active == 1,
        is_superuser: row.is_superuser == 1,
        last_login: row.last_login,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}
