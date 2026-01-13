// auth Tauri Commands

use tauri::State;

#[tauri::command]
pub async fn sample_auth_command() -> Result<String, String> {
    // TODO: Implement command
    Ok("Not implemented".to_string())
}
