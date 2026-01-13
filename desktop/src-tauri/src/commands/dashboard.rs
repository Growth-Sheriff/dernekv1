use tauri::State;
use diesel::prelude::*;
use crate::state::AppState;
use serde::{Serialize, Deserialize};
use chrono::Datelike;

#[derive(Debug, Serialize)]
pub struct DashboardStats {
    pub total_uyeler: i64,
    pub aktif_uyeler: i64,
    pub pasif_uyeler: i64,
    pub bekleyen_uyeler: i64,
}

#[derive(Debug, Serialize)]
pub struct AidatStats {
    pub toplam_tutar: f64,
    pub toplam_odenen: f64,
    pub toplam_kalan: f64,
    pub odenen_adet: i64,
    pub geciken_adet: i64,
}

#[derive(Debug, Serialize)]
pub struct KasaStats {
    pub toplam_bakiye: f64,
    pub toplam_gelir: f64,
    pub toplam_gider: f64,
    pub kasa_sayisi: i64,
}

#[tauri::command]
pub fn get_dashboard_stats(
    state: State<AppState>,
    tenant_id_param: String,
) -> Result<DashboardStats, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Get uyeler stats
    let total_uyeler: i64 = diesel::sql_query(
        "SELECT COUNT(*) as count FROM uyeler WHERE tenant_id = ?1"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<CountResult>(&mut conn)
    .map(|r| r.count)
    .unwrap_or(0);

    let aktif_uyeler: i64 = diesel::sql_query(
        "SELECT COUNT(*) as count FROM uyeler WHERE tenant_id = ?1 AND durum = 'Aktif'"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<CountResult>(&mut conn)
    .map(|r| r.count)
    .unwrap_or(0);

    let pasif_uyeler: i64 = diesel::sql_query(
        "SELECT COUNT(*) as count FROM uyeler WHERE tenant_id = ?1 AND durum = 'Pasif'"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<CountResult>(&mut conn)
    .map(|r| r.count)
    .unwrap_or(0);

    let bekleyen_uyeler: i64 = diesel::sql_query(
        "SELECT COUNT(*) as count FROM uyeler WHERE tenant_id = ?1 AND durum = 'Bekleyen'"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<CountResult>(&mut conn)
    .map(|r| r.count)
    .unwrap_or(0);

    Ok(DashboardStats {
        total_uyeler,
        aktif_uyeler,
        pasif_uyeler,
        bekleyen_uyeler,
    })
}

#[tauri::command]
pub fn get_uye_stats(
    state: State<AppState>,
    tenant_id_param: String,
) -> Result<DashboardStats, String> {
    get_dashboard_stats(state, tenant_id_param)
}

#[tauri::command]
pub fn get_aidat_stats(
    state: State<AppState>,
    tenant_id_param: String,
    yil: Option<i32>,
) -> Result<AidatStats, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let current_year = chrono::Utc::now().year();
    let target_year = yil.unwrap_or(current_year);

    // Toplam tutar
    let toplam_tutar: f64 = diesel::sql_query(
        "SELECT COALESCE(SUM(tutar), 0.0) as sum FROM aidat_takip WHERE tenant_id = ?1 AND yil = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Integer, _>(target_year)
    .get_result::<SumResult>(&mut conn)
    .map(|r| r.sum)
    .unwrap_or(0.0);

    // Toplam ödenen
    let toplam_odenen: f64 = diesel::sql_query(
        "SELECT COALESCE(SUM(odenen), 0.0) as sum FROM aidat_takip WHERE tenant_id = ?1 AND yil = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Integer, _>(target_year)
    .get_result::<SumResult>(&mut conn)
    .map(|r| r.sum)
    .unwrap_or(0.0);

    let toplam_kalan = toplam_tutar - toplam_odenen;

    // Ödenen adet
    let odenen_adet: i64 = diesel::sql_query(
        "SELECT COUNT(*) as count FROM aidat_takip WHERE tenant_id = ?1 AND yil = ?2 AND odeme_durumu = 'Ödendi'"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Integer, _>(target_year)
    .get_result::<CountResult>(&mut conn)
    .map(|r| r.count)
    .unwrap_or(0);

    // Geciken adet
    let geciken_adet: i64 = diesel::sql_query(
        "SELECT COUNT(*) as count FROM aidat_takip WHERE tenant_id = ?1 AND yil = ?2 AND odeme_durumu = 'Gecikmiş'"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Integer, _>(target_year)
    .get_result::<CountResult>(&mut conn)
    .map(|r| r.count)
    .unwrap_or(0);

    Ok(AidatStats {
        toplam_tutar,
        toplam_odenen,
        toplam_kalan,
        odenen_adet,
        geciken_adet,
    })
}

#[tauri::command]
pub fn get_kasa_stats(
    state: State<AppState>,
    tenant_id_param: String,
) -> Result<KasaStats, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Toplam bakiye
    let toplam_bakiye: f64 = diesel::sql_query(
        "SELECT COALESCE(SUM(bakiye), 0.0) as sum FROM kasalar WHERE tenant_id = ?1 AND is_active = 1"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<SumResult>(&mut conn)
    .map(|r| r.sum)
    .unwrap_or(0.0);

    // Toplam gelir
    let toplam_gelir: f64 = diesel::sql_query(
        "SELECT COALESCE(SUM(tutar), 0.0) as sum FROM gelirler WHERE tenant_id = ?1"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<SumResult>(&mut conn)
    .map(|r| r.sum)
    .unwrap_or(0.0);

    // Toplam gider
    let toplam_gider: f64 = diesel::sql_query(
        "SELECT COALESCE(SUM(tutar), 0.0) as sum FROM giderler WHERE tenant_id = ?1"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<SumResult>(&mut conn)
    .map(|r| r.sum)
    .unwrap_or(0.0);

    // Kasa sayısı
    let kasa_sayisi: i64 = diesel::sql_query(
        "SELECT COUNT(*) as count FROM kasalar WHERE tenant_id = ?1 AND is_active = 1"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<CountResult>(&mut conn)
    .map(|r| r.count)
    .unwrap_or(0);

    Ok(KasaStats {
        toplam_bakiye,
        toplam_gelir,
        toplam_gider,
        kasa_sayisi,
    })
}

// Helper structs for SQL queries
#[derive(QueryableByName)]
struct CountResult {
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    count: i64,
}

#[derive(QueryableByName)]
struct SumResult {
    #[diesel(sql_type = diesel::sql_types::Double)]
    sum: f64,
}
