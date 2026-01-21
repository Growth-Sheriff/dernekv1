use tauri::State;
use std::fs;
use std::path::{Path, PathBuf};
use chrono::Utc;
use crate::state::AppState;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupInfo {
    pub filename: String,
    pub path: String,
    pub size: u64,
    pub created_at: String,
}

#[tauri::command]
pub fn create_backup(
    state: State<AppState>,
    tenant_id_param: String,
    backup_dir: String,
) -> Result<BackupInfo, String> {
    use diesel::prelude::*;

    // WAL checkpoint BEFORE backup (CRITICAL for consistency)
    {
        let db = state.db.lock().unwrap();
        let pool = db.as_ref().ok_or("Database not initialized")?;
        let mut conn = pool.get().map_err(|e| e.to_string())?;

        diesel::sql_query("PRAGMA wal_checkpoint(FULL)")
            .execute(&mut conn)
            .map_err(|e| format!("WAL checkpoint failed: {}", e))?;
    }

    // Get database file path from connection
    let db_path = state.db_path.lock().unwrap();
    let source_path = db_path.as_ref().ok_or("Database path not set")?;

    // Create backup directory if it doesn't exist
    let backup_base = PathBuf::from(&backup_dir);
    fs::create_dir_all(&backup_base).map_err(|e| format!("Failed to create backup directory: {}", e))?;

    // Generate backup filename with timestamp
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
    let backup_filename = format!("backup_{}_{}.db", tenant_id_param, timestamp);
    let backup_path = backup_base.join(&backup_filename);

    // Copy database file to backup location
    fs::copy(source_path, &backup_path)
        .map_err(|e| format!("Failed to create backup: {}", e))?;

    // Get backup file size
    let metadata = fs::metadata(&backup_path)
        .map_err(|e| format!("Failed to read backup metadata: {}", e))?;

    Ok(BackupInfo {
        filename: backup_filename,
        path: backup_path.to_string_lossy().to_string(),
        size: metadata.len(),
        created_at: Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
pub fn restore_backup(
    state: State<AppState>,
    backup_path: String,
) -> Result<String, String> {
    // Verify backup file exists
    let source = Path::new(&backup_path);
    if !source.exists() {
        return Err(format!("Backup file not found: {}", backup_path));
    }

    // Get current database path
    let db_path = state.db_path.lock().unwrap();
    let target_path = db_path.as_ref().ok_or("Database path not set")?;

    // Create a temporary backup of current database before restoring
    let temp_backup = format!("{}.before_restore", target_path.to_string_lossy());
    fs::copy(target_path, &temp_backup)
        .map_err(|e| format!("Failed to create safety backup: {}", e))?;

    // Close current database connection
    drop(state.db.lock().unwrap().take());

    // Restore backup file
    match fs::copy(source, target_path) {
        Ok(_) => {
            // Remove temporary backup on success
            let _ = fs::remove_file(&temp_backup);
            
            // Reinitialize database connection
            match crate::db::connection::establish_connection(target_path.clone()) {
                pool => {
                    *state.db.lock().unwrap() = Some(pool);
                    Ok("Database restored successfully. Please restart the application.".to_string())
                }
            }
        }
        Err(e) => {
            // Restore original database if copy failed
            let _ = fs::copy(&temp_backup, target_path);
            let _ = fs::remove_file(&temp_backup);
            Err(format!("Failed to restore backup: {}", e))
        }
    }
}

#[tauri::command]
pub fn list_backups(
    backup_dir: String,
) -> Result<Vec<BackupInfo>, String> {
    let backup_base = PathBuf::from(&backup_dir);
    
    if !backup_base.exists() {
        return Ok(Vec::new());
    }

    let mut backups = Vec::new();

    let entries = fs::read_dir(&backup_base)
        .map_err(|e| format!("Failed to read backup directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if path.is_file() && path.extension().map_or(false, |ext| ext == "db") {
            if let Some(filename) = path.file_name() {
                if let Ok(metadata) = fs::metadata(&path) {
                    if let Ok(created) = metadata.created() {
                        backups.push(BackupInfo {
                            filename: filename.to_string_lossy().to_string(),
                            path: path.to_string_lossy().to_string(),
                            size: metadata.len(),
                            created_at: chrono::DateTime::<Utc>::from(created).to_rfc3339(),
                        });
                    }
                }
            }
        }
    }

    // Sort by creation date, newest first
    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    Ok(backups)
}

#[tauri::command]
pub fn delete_backup(
    backup_path: String,
) -> Result<(), String> {
    let path = Path::new(&backup_path);
    
    if !path.exists() {
        return Err(format!("Backup file not found: {}", backup_path));
    }

    fs::remove_file(path)
        .map_err(|e| format!("Failed to delete backup: {}", e))?;

    Ok(())
}

/// Auto backup check (24 saat kontrolü)
#[tauri::command]
pub fn auto_backup_check(
    state: State<AppState>,
    tenant_id_param: String,
    backup_dir: String,
) -> Result<Option<BackupInfo>, String> {
    let backup_base = PathBuf::from(&backup_dir);

    // Dizin yoksa oluştur ve ilk backup'ı al
    if !backup_base.exists() {
        let backup_info = create_backup(state, tenant_id_param, backup_dir)?;
        return Ok(Some(backup_info));
    }

    // Son backup zamanını bul
    let entries = fs::read_dir(&backup_base)
        .map_err(|e| format!("Failed to read backup directory: {}", e))?;

    let mut last_backup_time: Option<std::time::SystemTime> = None;

    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.is_file() && path.extension().map_or(false, |ext| ext == "db") {
                if let Ok(metadata) = fs::metadata(&path) {
                    if let Ok(modified) = metadata.modified() {
                        if last_backup_time.is_none() || modified > last_backup_time.unwrap() {
                            last_backup_time = Some(modified);
                        }
                    }
                }
            }
        }
    }

    // 24 saatten eski ise yeni backup al
    let needs_backup = if let Some(last_time) = last_backup_time {
        let elapsed = std::time::SystemTime::now()
            .duration_since(last_time)
            .unwrap_or(std::time::Duration::from_secs(0));

        elapsed.as_secs() > 86400 // 24 saat
    } else {
        true
    };

    if needs_backup {
        let backup_info = create_backup(state, tenant_id_param, backup_dir)?;
        Ok(Some(backup_info))
    } else {
        Ok(None)
    }
}

/// Eski backup'ları temizle
#[tauri::command]
pub fn cleanup_old_backups(
    backup_dir: String,
    days: u64,
) -> Result<String, String> {
    let backup_base = PathBuf::from(&backup_dir);

    if !backup_base.exists() {
        return Ok("No backups to clean".to_string());
    }

    let cutoff = std::time::SystemTime::now() - std::time::Duration::from_secs(days * 86400);
    let entries = fs::read_dir(&backup_base)
        .map_err(|e| format!("Failed to read backup directory: {}", e))?;

    let mut deleted = 0;

    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.is_file() && path.extension().map_or(false, |ext| ext == "db") {
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

    Ok(format!("Cleaned {} old backup(s)", deleted))
}
