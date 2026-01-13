use tauri::State;
use crate::state::AppState;

#[tauri::command]
pub fn get_db_path(state: State<AppState>) -> Result<String, String> {
    let db = state.db.lock().unwrap();
    match &*db {
        Some(_) => Ok("Database connected".to_string()),
        None => Err("Database not initialized".to_string()),
    }
}
