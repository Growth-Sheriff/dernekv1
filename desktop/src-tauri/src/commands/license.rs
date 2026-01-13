// license Tauri Commands

use tauri::State;

#[tauri::command]
pub async fn sample_license_command() -> Result<String, String> {
    // TODO: Implement command
    Ok("Not implemented".to_string())
}
