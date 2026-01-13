use tauri::State;
use serde::Serialize;
use diesel::prelude::*;
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct InitialSetupResponse {
    pub count: i32,
}

#[derive(QueryableByName)]
struct CountResult {
    #[diesel(sql_type = diesel::sql_types::Integer)]
    count: i32,
}

#[tauri::command]
pub fn check_initial_setup(state: State<AppState>) -> Result<InitialSetupResponse, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Tenant sayısını kontrol et
    let result = diesel::sql_query("SELECT COUNT(*) as count FROM tenants")
        .get_result::<CountResult>(&mut conn)
        .map(|r| r.count)
        .unwrap_or(0);

    Ok(InitialSetupResponse { count: result })
}
