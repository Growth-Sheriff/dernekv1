// kullanici Tauri Commands - STATISTICS ONLY (user CRUD moved to users.rs)
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use tauri::State;
use crate::state::AppState;
use crate::db::models::User;

#[derive(Serialize, Deserialize)]
pub struct ChangePasswordInput {
    pub old_password: String,
    pub new_password: String,
}

#[tauri::command]
pub fn admin_change_user_password(
    user_id: String,
    _tenant_id_param: String,
    input: ChangePasswordInput,
    state: State<'_, AppState>,
) -> Result<(), String> {
    use crate::db::schema::users::dsl::*;
    
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    
    // Hash new password
    let new_password_hash = format!("hashed_{}", input.new_password);
    
    diesel::update(users.filter(id.eq(&user_id)))
        .set((
            password_hash.eq(&new_password_hash),
            updated_at.eq(chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string()),
        ))
        .execute(&mut conn)
        .map_err(|e| format!("Failed to change password: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub fn count_users_by_role(
    tenant_id_param: String,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    use crate::db::schema::users::dsl::*;
    
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    
    let all_users = users
        .filter(tenant_id.eq(&tenant_id_param))
        .filter(is_active.eq(true))
        .load::<User>(&mut conn)
        .map_err(|e| format!("Database error: {}", e))?;
    
    let admin_count = all_users.iter().filter(|u| u.role.as_deref() == Some("admin")).count();
    let accountant_count = all_users.iter().filter(|u| u.role.as_deref() == Some("accountant")).count();
    let viewer_count = all_users.iter().filter(|u| u.role.as_deref() == Some("viewer")).count();
    
    Ok(serde_json::json!({
        "total": all_users.len(),
        "admin": admin_count,
        "accountant": accountant_count,
        "viewer": viewer_count,
    }))
}
