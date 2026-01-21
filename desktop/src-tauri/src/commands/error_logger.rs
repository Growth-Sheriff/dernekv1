// Error Logging System
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use chrono::Utc;
use serde::{Serialize, Deserialize};
use tauri::State;
use crate::state::AppState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum LogLevel {
    Error,
    Warning,
    Info,
    Debug,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: LogLevel,
    pub module: String,
    pub message: String,
    pub details: Option<String>,
    pub user_id: Option<String>,
    pub tenant_id: Option<String>,
}

/// Log dizini al veya oluştur
fn get_log_dir() -> Result<PathBuf, String> {
    let log_dir = dirs::config_dir()
        .ok_or("Config directory not found")?
        .join("bader")
        .join("logs");

    fs::create_dir_all(&log_dir)
        .map_err(|e| format!("Failed to create log directory: {}", e))?;

    Ok(log_dir)
}

/// Log dosyası yaz
fn write_log_entry(entry: &LogEntry) -> Result<(), String> {
    let log_dir = get_log_dir()?;
    let today = Utc::now().format("%Y-%m-%d");
    let log_file = log_dir.join(format!("app_{}.log", today));

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file)
        .map_err(|e| format!("Failed to open log file: {}", e))?;

    let level_str = match entry.level {
        LogLevel::Error => "ERROR",
        LogLevel::Warning => "WARN",
        LogLevel::Info => "INFO",
        LogLevel::Debug => "DEBUG",
    };

    let tenant_info = entry.tenant_id.as_ref()
        .map(|t| format!(" [tenant:{}]", t))
        .unwrap_or_default();

    let user_info = entry.user_id.as_ref()
        .map(|u| format!(" [user:{}]", u))
        .unwrap_or_default();

    let details_info = entry.details.as_ref()
        .map(|d| format!(" | {}", d))
        .unwrap_or_default();

    let log_line = format!(
        "{} [{}]{}{} [{}] {}{}\n",
        entry.timestamp,
        level_str,
        tenant_info,
        user_info,
        entry.module,
        entry.message,
        details_info
    );

    file.write_all(log_line.as_bytes())
        .map_err(|e| format!("Failed to write log: {}", e))?;

    Ok(())
}

/// Error loglama tauri command
#[tauri::command]
pub fn log_error(
    module: String,
    message: String,
    details: Option<String>,
    state: State<AppState>,
) -> Result<(), String> {
    let user = state.current_user.lock().unwrap().clone();
    let tenant = state.current_tenant.lock().unwrap().clone();

    let entry = LogEntry {
        timestamp: Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        level: LogLevel::Error,
        module,
        message: message.clone(),
        details,
        user_id: user.map(|u| u.id),
        tenant_id: tenant.map(|t| t.id),
    };

    // Console'a da yaz
    eprintln!("❌ ERROR [{}]: {}", entry.module, message);

    write_log_entry(&entry)
}

/// Warning loglama
#[tauri::command]
pub fn log_warning(
    module: String,
    message: String,
    details: Option<String>,
    state: State<AppState>,
) -> Result<(), String> {
    let user = state.current_user.lock().unwrap().clone();
    let tenant = state.current_tenant.lock().unwrap().clone();

    let entry = LogEntry {
        timestamp: Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        level: LogLevel::Warning,
        module,
        message: message.clone(),
        details,
        user_id: user.map(|u| u.id),
        tenant_id: tenant.map(|t| t.id),
    };

    eprintln!("⚠️ WARNING [{}]: {}", entry.module, message);

    write_log_entry(&entry)
}

/// Info loglama
#[tauri::command]
pub fn log_info(
    module: String,
    message: String,
    details: Option<String>,
    state: State<AppState>,
) -> Result<(), String> {
    let user = state.current_user.lock().unwrap().clone();
    let tenant = state.current_tenant.lock().unwrap().clone();

    let entry = LogEntry {
        timestamp: Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        level: LogLevel::Info,
        module,
        message,
        details,
        user_id: user.map(|u| u.id),
        tenant_id: tenant.map(|t| t.id),
    };

    write_log_entry(&entry)
}

/// Rust backend'den internal log (tauri command değil)
pub fn log_internal_error(module: &str, message: &str, details: Option<String>) {
    let entry = LogEntry {
        timestamp: Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        level: LogLevel::Error,
        module: module.to_string(),
        message: message.to_string(),
        details,
        user_id: None,
        tenant_id: None,
    };

    eprintln!("❌ INTERNAL ERROR [{}]: {}", module, message);
    let _ = write_log_entry(&entry);
}

/// Log dosyalarını listele
#[tauri::command]
pub fn list_log_files() -> Result<Vec<String>, String> {
    let log_dir = get_log_dir()?;

    let entries = fs::read_dir(&log_dir)
        .map_err(|e| format!("Failed to read log directory: {}", e))?;

    let mut log_files = Vec::new();

    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.is_file() && path.extension().map_or(false, |ext| ext == "log") {
                if let Some(filename) = path.file_name().and_then(|n| n.to_str()) {
                    log_files.push(filename.to_string());
                }
            }
        }
    }

    log_files.sort();
    log_files.reverse(); // En yeni en başta

    Ok(log_files)
}

/// Log dosyası oku
#[tauri::command]
pub fn read_log_file(filename: String) -> Result<String, String> {
    let log_dir = get_log_dir()?;
    let log_file = log_dir.join(&filename);

    if !log_file.exists() {
        return Err(format!("Log file not found: {}", filename));
    }

    fs::read_to_string(&log_file)
        .map_err(|e| format!("Failed to read log file: {}", e))
}

/// Eski logları temizle (30 günden eski)
#[tauri::command]
pub fn cleanup_old_logs(days: u64) -> Result<String, String> {
    let log_dir = get_log_dir()?;

    let cutoff = std::time::SystemTime::now() - std::time::Duration::from_secs(days * 86400);
    let entries = fs::read_dir(&log_dir)
        .map_err(|e| format!("Failed to read log directory: {}", e))?;

    let mut deleted = 0;

    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.is_file() && path.extension().map_or(false, |ext| ext == "log") {
                if let Ok(metadata) = fs::metadata(&path) {
                    if let Ok(modified) = metadata.modified() {
                        if modified < cutoff {
                            if fs::remove_file(&path).is_ok() {
                                deleted += 1;
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(format!("Cleaned {} old log file(s)", deleted))
}
