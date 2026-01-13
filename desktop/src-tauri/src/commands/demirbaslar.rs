use tauri::State;
use diesel::prelude::*;
use chrono::Utc;
use uuid::Uuid;
use crate::state::AppState;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, QueryableByName)]
pub struct Demirbas {
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub id: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub tenant_id: String,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub demirbas_no: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub ad: String,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub kategori: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub marka_model: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub seri_no: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub alis_tarihi: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
    pub alis_bedeli: Option<f64>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Integer>)]
    pub amortisman_suresi: Option<i32>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub amortisman_turu: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
    pub guncel_deger: Option<f64>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub konum: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub sorumlu_uye_id: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub durum: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub garanti_bitis: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub fatura_no: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub tedarikci: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub notlar: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Integer>)]
    pub is_active: Option<i32>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub created_at: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub updated_at: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub gider_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DemirbasInput {
    pub demirbas_no: Option<String>,
    pub ad: String,
    pub kategori: Option<String>,
    pub aciklama: Option<String>,
    pub marka_model: Option<String>,
    pub seri_no: Option<String>,
    pub alis_tarihi: Option<String>,
    pub alis_bedeli: Option<f64>,
    pub garanti_bitis: Option<String>,
    pub amortisman_suresi: Option<i32>,
    pub konum: Option<String>,
    pub sorumlu_uye_id: Option<String>,
    pub durum: Option<String>,
    pub fatura_no: Option<String>,
    pub tedarikci: Option<String>,
    pub notlar: Option<String>,
    pub gider_id: Option<String>,  // Gider entegrasyonu için
}

#[derive(Debug, Serialize)]
pub struct DemirbasOzet {
    pub toplam: i64,
    pub aktif: i64,
    pub toplam_deger: f64,
    pub bakimda: i64,
}

#[derive(Debug, Serialize, QueryableByName)]
pub struct CountResult {
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    pub count: i64,
}

#[derive(Debug, Serialize, QueryableByName)]
pub struct SumResult {
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
    pub total: Option<f64>,
}

#[tauri::command]
pub fn get_demirbaslar(
    state: State<AppState>,
    tenant_id_param: String,
    include_passive: Option<bool>,
) -> Result<Vec<Demirbas>, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let include_passive = include_passive.unwrap_or(false);
    
    if include_passive {
        diesel::sql_query(
            "SELECT * FROM demirbaslar WHERE tenant_id = ?1 ORDER BY created_at DESC"
        )
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .load::<Demirbas>(&mut conn)
        .map_err(|e| e.to_string())
    } else {
        diesel::sql_query(
            "SELECT * FROM demirbaslar WHERE tenant_id = ?1 AND is_active = 1 ORDER BY created_at DESC"
        )
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .load::<Demirbas>(&mut conn)
        .map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn get_demirbas(
    state: State<AppState>,
    tenant_id_param: String,
    demirbas_id: String,
) -> Result<Option<Demirbas>, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let result = diesel::sql_query(
        "SELECT * FROM demirbaslar WHERE id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&demirbas_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<Demirbas>(&mut conn);

    match result {
        Ok(demirbas) => Ok(Some(demirbas)),
        Err(diesel::result::Error::NotFound) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn create_demirbas(
    state: State<AppState>,
    tenant_id_param: String,
    data: DemirbasInput,
) -> Result<String, String> {
    let new_id = Uuid::new_v4().to_string();
    let now = Utc::now().naive_utc().to_string();
    let durum = data.durum.unwrap_or_else(|| "Aktif".to_string());
    let kategori = data.kategori.unwrap_or_else(|| "Diğer".to_string());
    let amortisman_suresi = data.amortisman_suresi.unwrap_or(5);
    let alis_bedeli = data.alis_bedeli.unwrap_or(0.0);

    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Otomatik demirbaş no oluştur
    let demirbas_no = if data.demirbas_no.is_some() && !data.demirbas_no.as_ref().unwrap().is_empty() {
        data.demirbas_no
    } else {
        let count_result = diesel::sql_query(
            "SELECT COUNT(*) as count FROM demirbaslar WHERE tenant_id = ?1"
        )
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .get_result::<CountResult>(&mut conn)
        .map_err(|e| e.to_string())?;
        
        Some(format!("DMB-{:04}", count_result.count + 1))
    };

    diesel::sql_query(
        "INSERT INTO demirbaslar (id, tenant_id, demirbas_no, ad, kategori, marka_model, seri_no, alis_tarihi, alis_bedeli, amortisman_suresi, amortisman_turu, guncel_deger, konum, sorumlu_uye_id, durum, garanti_bitis, fatura_no, tedarikci, notlar, gider_id, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'Doğrusal', ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, 1, ?20, ?21)"
    )
    .bind::<diesel::sql_types::Text, _>(&new_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&demirbas_no)
    .bind::<diesel::sql_types::Text, _>(&data.ad)
    .bind::<diesel::sql_types::Text, _>(&kategori)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.marka_model)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.seri_no)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.alis_tarihi)
    .bind::<diesel::sql_types::Double, _>(alis_bedeli)
    .bind::<diesel::sql_types::Integer, _>(amortisman_suresi)
    .bind::<diesel::sql_types::Double, _>(alis_bedeli)  // guncel_deger = alis_bedeli
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.konum)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.sorumlu_uye_id)
    .bind::<diesel::sql_types::Text, _>(&durum)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.garanti_bitis)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.fatura_no)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.tedarikci)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.notlar)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.gider_id)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&now)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(new_id)
}

#[tauri::command]
pub fn update_demirbas(
    state: State<AppState>,
    tenant_id_param: String,
    demirbas_id: String,
    data: DemirbasInput,
) -> Result<(), String> {
    let now = Utc::now().naive_utc().to_string();
    let durum = data.durum.unwrap_or_else(|| "Aktif".to_string());
    let kategori = data.kategori.unwrap_or_else(|| "Diğer".to_string());
    let amortisman_suresi = data.amortisman_suresi.unwrap_or(5);
    let alis_bedeli = data.alis_bedeli.unwrap_or(0.0);

    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query(
        "UPDATE demirbaslar SET demirbas_no = ?1, ad = ?2, kategori = ?3, marka_model = ?4, seri_no = ?5, alis_tarihi = ?6, alis_bedeli = ?7, amortisman_suresi = ?8, konum = ?9, sorumlu_uye_id = ?10, durum = ?11, garanti_bitis = ?12, fatura_no = ?13, tedarikci = ?14, notlar = ?15, updated_at = ?16 WHERE id = ?17 AND tenant_id = ?18"
    )
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.demirbas_no)
    .bind::<diesel::sql_types::Text, _>(&data.ad)
    .bind::<diesel::sql_types::Text, _>(&kategori)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.marka_model)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.seri_no)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.alis_tarihi)
    .bind::<diesel::sql_types::Double, _>(alis_bedeli)
    .bind::<diesel::sql_types::Integer, _>(amortisman_suresi)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.konum)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.sorumlu_uye_id)
    .bind::<diesel::sql_types::Text, _>(&durum)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.garanti_bitis)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.fatura_no)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.tedarikci)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.notlar)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&demirbas_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_demirbas(
    state: State<AppState>,
    tenant_id_param: String,
    demirbas_id: String,
) -> Result<(), String> {
    let now = Utc::now().naive_utc().to_string();

    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query(
        "UPDATE demirbaslar SET is_active = 0, updated_at = ?1 WHERE id = ?2 AND tenant_id = ?3"
    )
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&demirbas_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn activate_demirbas(
    state: State<AppState>,
    tenant_id_param: String,
    demirbas_id: String,
) -> Result<(), String> {
    let now = Utc::now().naive_utc().to_string();

    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query(
        "UPDATE demirbaslar SET is_active = 1, updated_at = ?1 WHERE id = ?2 AND tenant_id = ?3"
    )
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&demirbas_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_demirbas_ozet(
    state: State<AppState>,
    tenant_id_param: String,
) -> Result<DemirbasOzet, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let toplam = diesel::sql_query(
        "SELECT COUNT(*) as count FROM demirbaslar WHERE tenant_id = ?1"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<CountResult>(&mut conn)
    .map_err(|e| e.to_string())?
    .count;

    let aktif = diesel::sql_query(
        "SELECT COUNT(*) as count FROM demirbaslar WHERE tenant_id = ?1 AND is_active = 1 AND durum = 'Aktif'"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<CountResult>(&mut conn)
    .map_err(|e| e.to_string())?
    .count;

    let toplam_deger = diesel::sql_query(
        "SELECT COALESCE(SUM(guncel_deger), 0) as total FROM demirbaslar WHERE tenant_id = ?1 AND is_active = 1"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<SumResult>(&mut conn)
    .map_err(|e| e.to_string())?
    .total
    .unwrap_or(0.0);

    let bakimda = diesel::sql_query(
        "SELECT COUNT(*) as count FROM demirbaslar WHERE tenant_id = ?1 AND is_active = 1 AND durum = 'Bakımda'"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<CountResult>(&mut conn)
    .map_err(|e| e.to_string())?
    .count;

    Ok(DemirbasOzet {
        toplam,
        aktif,
        toplam_deger,
        bakimda,
    })
}
