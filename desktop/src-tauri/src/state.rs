// Application State - DÜZELTILMIŞ VERSİYON

use std::sync::Mutex;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use crate::db::Pool;

// ============================================================================
// USER & TENANT TYPES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurrentUser {
    pub id: String,
    pub tenant_id: String,
    pub email: String,
    pub full_name: String,
    pub role: String,
    pub is_superuser: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurrentTenant {
    pub id: String,
    pub name: String,
    pub slug: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseInfo {
    pub plan: String,
    pub mode: String,
    pub max_users: i32,
    pub max_records: i32,
    pub features: serde_json::Value,
    pub expires_at: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub theme: String,           // "light" | "dark" | "system"
    pub language: String,        // "tr" | "en"
    pub date_format: String,     // "DD.MM.YYYY" | "YYYY-MM-DD"
    pub currency: String,        // "TRY" | "USD" | "EUR"
    pub auto_backup: bool,
    pub backup_interval_days: i32,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            theme: "light".to_string(),
            language: "tr".to_string(),
            date_format: "DD.MM.YYYY".to_string(),
            currency: "TRY".to_string(),
            auto_backup: true,
            backup_interval_days: 7,
        }
    }
}

// ============================================================================
// APP STATE
// ============================================================================

pub struct AppState {
    // Database
    pub db: Mutex<Option<Pool>>,
    pub db_path: Mutex<Option<PathBuf>>,
    
    // Current Session
    pub current_user: Mutex<Option<CurrentUser>>,
    pub current_tenant: Mutex<Option<CurrentTenant>>,
    pub license: Mutex<Option<LicenseInfo>>,
    
    // Configuration
    pub config: Mutex<AppConfig>,
    
    // Runtime State
    pub is_online: Mutex<bool>,
    pub last_sync_at: Mutex<Option<String>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            db: Mutex::new(None),
            db_path: Mutex::new(None),
            current_user: Mutex::new(None),
            current_tenant: Mutex::new(None),
            license: Mutex::new(None),
            config: Mutex::new(AppConfig::default()),
            is_online: Mutex::new(false),
            last_sync_at: Mutex::new(None),
        }
    }
    
    // Helper methods
    pub fn set_user(&self, user: CurrentUser) {
        *self.current_user.lock().unwrap() = Some(user);
    }
    
    pub fn clear_user(&self) {
        *self.current_user.lock().unwrap() = None;
    }
    
    pub fn get_tenant_id(&self) -> Option<String> {
        self.current_tenant.lock().unwrap().as_ref().map(|t| t.id.clone())
    }
    
    pub fn is_authenticated(&self) -> bool {
        self.current_user.lock().unwrap().is_some()
    }
    
    pub fn has_feature(&self, feature: &str) -> bool {
        if let Some(license) = self.license.lock().unwrap().as_ref() {
            if let Some(features) = license.features.get("modules") {
                return features.get(feature)
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);
            }
        }
        false
    }
    
    pub fn is_within_limit(&self, limit_type: &str, current: i32) -> bool {
        if let Some(license) = self.license.lock().unwrap().as_ref() {
            match limit_type {
                "users" => current < license.max_users,
                "records" => current < license.max_records,
                _ => true
            }
        } else {
            false
        }
    }
    
    /// TENANT ISOLATION: Verify that request tenant_id matches current session tenant_id
    /// This prevents users from accessing other tenants' data
    pub fn verify_tenant_access(&self, request_tenant_id: &str) -> Result<(), String> {
        let current_tenant = self.current_tenant.lock().unwrap();
        
        match current_tenant.as_ref() {
            Some(tenant) => {
                if tenant.id == request_tenant_id {
                    Ok(())
                } else {
                    Err(format!(
                        "Unauthorized: You do not have access to tenant '{}'. Current tenant: '{}'",
                        request_tenant_id, tenant.id
                    ))
                }
            },
            None => {
                Err("Unauthorized: No active session. Please login first.".to_string())
            }
        }
    }
}

// ============================================================================
// TAURI COMMANDS FOR STATE MANAGEMENT
// ============================================================================

use tauri::State;

/// Get current user info
#[tauri::command]
pub fn get_current_user(state: State<AppState>) -> Option<CurrentUser> {
    state.current_user.lock().unwrap().clone()
}

/// Get current tenant info
#[tauri::command]
pub fn get_current_tenant(state: State<AppState>) -> Option<CurrentTenant> {
    state.current_tenant.lock().unwrap().clone()
}

/// Get license info
#[tauri::command]
pub fn get_license_info(state: State<AppState>) -> Option<LicenseInfo> {
    state.license.lock().unwrap().clone()
}

/// Get app config
#[tauri::command]
pub fn get_app_config(state: State<AppState>) -> AppConfig {
    state.config.lock().unwrap().clone()
}

/// Update app config
#[tauri::command]
pub fn update_app_config(
    config: AppConfig,
    state: State<AppState>,
) -> Result<String, String> {
    *state.config.lock().unwrap() = config;
    Ok("Config updated".to_string())
}

/// Check if user has permission
#[tauri::command]
pub fn check_permission(
    permission: String,
    state: State<AppState>,
) -> bool {
    if let Some(user) = state.current_user.lock().unwrap().as_ref() {
        match permission.as_str() {
            "admin" => user.role == "ADMIN" || user.is_superuser,
            "write" => user.role == "ADMIN" || user.role == "EDITOR",
            "read" => true,
            _ => false
        }
    } else {
        false
    }
}

/// Check if feature is enabled by license
#[tauri::command]
pub fn check_feature(
    feature: String,
    state: State<AppState>,
) -> bool {
    state.has_feature(&feature)
}
