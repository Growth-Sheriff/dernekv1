// Login & Authentication Commands - TAM IMPLEMENTASYON

use tauri::State;
use serde::{Deserialize, Serialize};
use diesel::prelude::*;
use crate::state::{AppState, CurrentUser, CurrentTenant, LicenseInfo};

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub success: bool,
    pub user: Option<UserInfo>,
    pub tenant: Option<TenantInfo>,
    pub license: Option<LicenseBasicInfo>,
    pub token: Option<String>,
    pub message: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct UserInfo {
    pub id: String,
    pub email: String,
    pub full_name: String,
    pub role: String,
    pub is_superuser: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct TenantInfo {
    pub id: String,
    pub name: String,
    pub slug: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct LicenseBasicInfo {
    pub key: String,
    #[serde(rename = "type")]
    pub license_type: String,
    pub plan: String,
    pub desktop_enabled: bool,
    pub web_enabled: bool,
    pub mobile_enabled: bool,
    pub sync_enabled: bool,
    pub is_active: bool,
    pub end_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

#[tauri::command]
pub fn login(
    request: LoginRequest,
    state: State<AppState>,
) -> Result<LoginResponse, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Email validasyon - geçersizse crash yerine normal hata mesajı dön
    if !is_valid_email(&request.email) {
        return Ok(LoginResponse {
            success: false,
            user: None,
            tenant: None,
            license: None,
            token: None,
            message: "Geçerli bir email adresi girin (örn: demo@demo.com)".to_string(),
        });
    }

    // Rate limiting kontrolü
    if let Err(msg) = check_rate_limit(&request.email, &mut conn) {
        return Ok(LoginResponse {
            success: false,
            user: None,
            tenant: None,
            license: None,
            token: None,
            message: msg,
        });
    }

    // 1. Kullanıcıyı bul
    #[derive(QueryableByName)]
    struct UserRow {
        #[diesel(sql_type = diesel::sql_types::Text)]
        id: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        tenant_id: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        email: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        password_hash: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        full_name: String,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        role: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        is_active: i32,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        is_superuser: i32,
    }

    let user = match diesel::sql_query(
        "SELECT id, tenant_id, email, password_hash, full_name, role, is_active, is_superuser 
         FROM users 
         WHERE email = ?1 AND is_active = 1"
    )
    .bind::<diesel::sql_types::Text, _>(&request.email)
    .get_result::<UserRow>(&mut conn) {
        Ok(u) => u,
        Err(_) => return Ok(LoginResponse {
            success: false,
            user: None,
            tenant: None,
            license: None,
            token: None,
            message: "Geçersiz email veya şifre".to_string(),
        }),
    };

    // 2. Şifre kontrolü
    if !verify_password(&request.password, &user.password_hash) {
        let _ = log_login_attempt(&request.email, false, &mut conn);
        return Ok(LoginResponse {
            success: false,
            user: None,
            tenant: None,
            license: None,
            token: None,
            message: "Geçersiz email veya şifre".to_string(),
        });
    }

    // 3. Tenant al
    #[derive(QueryableByName)]
    struct TenantRow {
        #[diesel(sql_type = diesel::sql_types::Text)]
        id: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        name: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        slug: String,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        is_active: i32,
    }

    let tenant = diesel::sql_query(
        "SELECT id, name, slug, is_active FROM tenants WHERE id = ?1"
    )
    .bind::<diesel::sql_types::Text, _>(&user.tenant_id)
    .get_result::<TenantRow>(&mut conn)
    .map_err(|_| "Dernek bulunamadı")?;

    if tenant.is_active != 1 {
        return Ok(LoginResponse {
            success: false,
            user: None,
            tenant: None,
            license: None,
            token: None,
            message: "Bu dernek hesabı aktif değil".to_string(),
        });
    }

    // 4. Lisans bilgisi
    #[derive(QueryableByName)]
    struct LicenseRow {
        #[diesel(sql_type = diesel::sql_types::Text)]
        id: String,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        license_key: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Text)]
        plan: String,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        mode: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        is_active: i32,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        expiry_date: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        desktop_enabled: i32,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        web_enabled: i32,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        mobile_enabled: i32,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        sync_enabled: i32,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        max_users: i32,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        max_records: i32,
        #[diesel(sql_type = diesel::sql_types::Text)]
        features: String,
    }

    let license_opt = diesel::sql_query(
        "SELECT id, license_key, plan, mode, is_active, expiry_date, 
                desktop_enabled, web_enabled, mobile_enabled, sync_enabled,
                max_users, max_records, features 
         FROM licenses 
         WHERE tenant_id = ?1 AND is_active = 1"
    )
    .bind::<diesel::sql_types::Text, _>(&user.tenant_id)
    .get_result::<LicenseRow>(&mut conn)
    .ok();

    // 5. Last login güncelle ve başarılı login logla
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let _ = diesel::sql_query(
        "UPDATE users SET last_login = ?1 WHERE id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&user.id)
    .execute(&mut conn);

    let _ = log_login_attempt(&request.email, true, &mut conn);

    // 6. State güncelle
    *state.current_user.lock().unwrap() = Some(CurrentUser {
        id: user.id.clone(),
        tenant_id: user.tenant_id.clone(),
        email: user.email.clone(),
        full_name: user.full_name.clone(),
        role: user.role.clone().unwrap_or("USER".to_string()),
        is_superuser: user.is_superuser == 1,
    });
    
    *state.current_tenant.lock().unwrap() = Some(CurrentTenant {
        id: tenant.id.clone(),
        name: tenant.name.clone(),
        slug: tenant.slug.clone(),
    });

    if let Some(ref lic) = license_opt {
        let features: serde_json::Value = match serde_json::from_str(&lic.features) {
            Ok(f) => f,
            Err(e) => {
                eprintln!("⚠️ License features JSON parse error: {}. Using empty features.", e);
                eprintln!("   Raw features string: {}", &lic.features);
                serde_json::json!({})
            }
        };

        *state.license.lock().unwrap() = Some(LicenseInfo {
            plan: lic.plan.clone(),
            mode: "LOCAL".to_string(),
            max_users: lic.max_users,
            max_records: lic.max_records,
            features,
            expires_at: lic.expiry_date.clone(),
            is_active: lic.is_active == 1,
        });
    }

    let token = generate_session_token(&user.id);

    Ok(LoginResponse {
        success: true,
        user: Some(UserInfo {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role.unwrap_or("USER".to_string()),
            is_superuser: user.is_superuser == 1,
        }),
        tenant: Some(TenantInfo {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
        }),
        license: license_opt.map(|l| LicenseBasicInfo {
            key: l.license_key.unwrap_or_default(),
            license_type: l.mode.unwrap_or_else(|| "LOCAL".to_string()).to_uppercase(),
            plan: l.plan,
            desktop_enabled: l.desktop_enabled == 1,
            web_enabled: l.web_enabled == 1,
            mobile_enabled: l.mobile_enabled == 1,
            sync_enabled: l.sync_enabled == 1,
            is_active: l.is_active == 1,
            end_date: l.expiry_date,
        }),
        token: Some(token),
        message: "Giriş başarılı".to_string(),
    })
}

// ============================================================================
// LOGOUT COMMAND
// ============================================================================

#[tauri::command]
pub fn logout(state: State<AppState>) -> Result<String, String> {
    *state.current_user.lock().unwrap() = None;
    *state.current_tenant.lock().unwrap() = None;
    *state.license.lock().unwrap() = None;
    Ok("Çıkış yapıldı".to_string())
}

// ============================================================================
// SESSION CHECK
// ============================================================================

#[tauri::command]
pub fn check_session(state: State<AppState>) -> Result<LoginResponse, String> {
    let user = state.current_user.lock().unwrap().clone();
    let tenant = state.current_tenant.lock().unwrap().clone();
    let license = state.license.lock().unwrap().clone();
    
    if let (Some(u), Some(t)) = (user, tenant) {
        Ok(LoginResponse {
            success: true,
            user: Some(UserInfo {
                id: u.id,
                email: u.email,
                full_name: u.full_name,
                role: u.role,
                is_superuser: u.is_superuser,
            }),
            tenant: Some(TenantInfo {
                id: t.id,
                name: t.name,
                slug: t.slug,
            }),
            license: license.map(|l| LicenseBasicInfo {
                key: String::new(), // Not stored in state
                license_type: l.mode.clone(),
                plan: l.plan,
                desktop_enabled: true, // Assume true for local session
                web_enabled: false,
                mobile_enabled: false,
                sync_enabled: l.mode.to_uppercase() != "LOCAL",
                is_active: l.is_active,
                end_date: l.expires_at,
            }),
            token: None,
            message: "Session aktif".to_string(),
        })
    } else {
        Ok(LoginResponse {
            success: false,
            user: None,
            tenant: None,
            license: None,
            token: None,
            message: "Session bulunamadı".to_string(),
        })
    }
}

// ============================================================================
// CHANGE PASSWORD
// ============================================================================

#[tauri::command]
pub fn change_password(
    request: ChangePasswordRequest,
    state: State<AppState>,
) -> Result<String, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    
    let user = state.current_user.lock().unwrap()
        .clone()
        .ok_or("Oturum açılmamış")?;

    #[derive(QueryableByName)]
    struct PasswordRow {
        #[diesel(sql_type = diesel::sql_types::Text)]
        password_hash: String,
    }

    let current = diesel::sql_query(
        "SELECT password_hash FROM users WHERE id = ?1"
    )
    .bind::<diesel::sql_types::Text, _>(&user.id)
    .get_result::<PasswordRow>(&mut conn)
    .map_err(|_| "Kullanıcı bulunamadı")?;

    if !verify_password(&request.current_password, &current.password_hash) {
        return Err("Mevcut şifre yanlış".to_string());
    }

    // Güçlü şifre kontrolü
    if request.new_password.len() < 8 {
        return Err("Yeni şifre en az 8 karakter olmalı".to_string());
    }
    
    if !request.new_password.chars().any(|c| c.is_uppercase()) {
        return Err("Şifre en az 1 büyük harf içermelidir".to_string());
    }
    
    if !request.new_password.chars().any(|c| c.is_lowercase()) {
        return Err("Şifre en az 1 küçük harf içermelidir".to_string());
    }
    
    if !request.new_password.chars().any(|c| c.is_numeric()) {
        return Err("Şifre en az 1 rakam içermelidir".to_string());
    }

    let new_hash = hash_password(&request.new_password);
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    diesel::sql_query(
        "UPDATE users SET password_hash = ?1, updated_at = ?2 WHERE id = ?3"
    )
    .bind::<diesel::sql_types::Text, _>(&new_hash)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&user.id)
    .execute(&mut conn)
    .map_err(|e| format!("Şifre güncellenemedi: {}", e))?;

    Ok("Şifre başarıyla değiştirildi".to_string())
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

fn hash_password(password: &str) -> String {
    use bcrypt::{hash, DEFAULT_COST};
    hash(password, DEFAULT_COST).unwrap_or_else(|_| format!("hashed_{}", password))
}

fn verify_password(password: &str, hash: &str) -> bool {
    use bcrypt::verify;
    if let Ok(result) = verify(password, hash) {
        return result;
    }

    #[cfg(debug_assertions)]
    {
        // Dev mode: test verileri için fallback
        if hash == format!("hashed_{}", password) || hash == password {
            return true;
        }
    }

    false
}

fn is_valid_email(email: &str) -> bool {
    // Basit email regex kontrolü
    let re = regex::Regex::new(r"^[^\s@]+@[^\s@]+\.[^\s@]+$").unwrap();
    re.is_match(email)
}

fn generate_session_token(user_id: &str) -> String {
    use uuid::Uuid;
    format!("session_{}_{}", user_id, Uuid::new_v4())
}

fn check_rate_limit(email: &str, conn: &mut diesel::sqlite::SqliteConnection) -> Result<(), String> {
    use uuid::Uuid;

    // 5 dakika öncesi
    let five_min_ago = chrono::Utc::now() - chrono::Duration::minutes(5);
    let threshold = five_min_ago.format("%Y-%m-%d %H:%M:%S").to_string();

    #[derive(QueryableByName)]
    struct CountRow {
        #[diesel(sql_type = diesel::sql_types::Integer)]
        count: i32,
    }

    let failed_count = diesel::sql_query(
        "SELECT COUNT(*) as count FROM login_attempts
         WHERE email = ?1 AND success = 0 AND attempt_time > ?2"
    )
    .bind::<diesel::sql_types::Text, _>(email)
    .bind::<diesel::sql_types::Text, _>(&threshold)
    .get_result::<CountRow>(conn)
    .map(|r| r.count)
    .unwrap_or(0);

    if failed_count >= 5 {
        return Err("Çok fazla başarısız deneme. 5 dakika sonra tekrar deneyin.".to_string());
    }

    Ok(())
}

fn log_login_attempt(email: &str, success: bool, conn: &mut diesel::sqlite::SqliteConnection) -> Result<(), diesel::result::Error> {
    use uuid::Uuid;

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let success_val = if success { 1 } else { 0 };

    diesel::sql_query(
        "INSERT INTO login_attempts (id, email, attempt_time, success, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)"
    )
    .bind::<diesel::sql_types::Text, _>(&id)
    .bind::<diesel::sql_types::Text, _>(email)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Integer, _>(success_val)
    .bind::<diesel::sql_types::Text, _>(&now)
    .execute(conn)?;

    Ok(())
}
