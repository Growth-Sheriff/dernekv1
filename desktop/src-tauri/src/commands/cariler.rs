use tauri::State;
use diesel::prelude::*;
use chrono::Utc;
use uuid::Uuid;
use crate::state::AppState;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, QueryableByName)]
pub struct Cari {
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub id: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub tenant_id: String,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub cari_kodu: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    #[serde(rename = "tip")]
    pub cari_tipi: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub unvan: String,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub vergi_dairesi: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub vergi_no: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub tc_no: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub yetkili_kisi: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub telefon: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub telefon2: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub email: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub web: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub adres: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub il: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub ilce: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub posta_kodu: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub banka_adi: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub iban: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
    pub borc_bakiye: Option<f64>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
    pub alacak_bakiye: Option<f64>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
    pub kredi_limiti: Option<f64>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Integer>)]
    pub odeme_vadesi: Option<i32>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub notlar: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Integer>)]
    pub is_active: Option<i32>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub created_at: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CariInput {
    pub cari_kodu: Option<String>,
    pub tip: Option<String>,
    pub unvan: String,
    pub vergi_dairesi: Option<String>,
    pub vergi_no: Option<String>,
    pub tc_no: Option<String>,
    pub yetkili_kisi: Option<String>,
    pub telefon: Option<String>,
    pub telefon2: Option<String>,
    pub email: Option<String>,
    pub web: Option<String>,
    pub adres: Option<String>,
    pub il: Option<String>,
    pub ilce: Option<String>,
    pub posta_kodu: Option<String>,
    pub banka_adi: Option<String>,
    pub iban: Option<String>,
    pub odeme_vade: Option<i32>,
    pub risk_limiti: Option<f64>,
    pub notlar: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, QueryableByName)]
pub struct CariHareket {
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub id: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub tenant_id: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub cari_id: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub hareket_tipi: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub tarih: String,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub vade_tarihi: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Double)]
    pub tutar: f64,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
    pub odenen: Option<f64>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
    pub kalan: Option<f64>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub belge_turu: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub belge_no: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub aciklama: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub durum: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub kapanma_tarihi: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Integer>)]
    pub is_active: Option<i32>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub created_at: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CariOzet {
    pub toplam: i64,
    pub aktif: i64,
    pub toplam_borc: f64,
    pub toplam_alacak: f64,
    pub musteri_sayisi: i64,
    pub tedarikci_sayisi: i64,
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
pub fn get_cariler(
    state: State<AppState>,
    tenant_id_param: String,
    include_passive: Option<bool>,
) -> Result<Vec<Cari>, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let include_passive = include_passive.unwrap_or(false);
    
    if include_passive {
        diesel::sql_query(
            "SELECT * FROM cariler WHERE tenant_id = ?1 ORDER BY unvan ASC"
        )
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .load::<Cari>(&mut conn)
        .map_err(|e| e.to_string())
    } else {
        diesel::sql_query(
            "SELECT * FROM cariler WHERE tenant_id = ?1 AND is_active = 1 ORDER BY unvan ASC"
        )
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .load::<Cari>(&mut conn)
        .map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn get_cari(
    state: State<AppState>,
    tenant_id_param: String,
    cari_id: String,
) -> Result<Option<Cari>, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let result = diesel::sql_query(
        "SELECT * FROM cariler WHERE id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&cari_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<Cari>(&mut conn);

    match result {
        Ok(cari) => Ok(Some(cari)),
        Err(diesel::result::Error::NotFound) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn create_cari(
    state: State<AppState>,
    tenant_id_param: String,
    data: CariInput,
) -> Result<String, String> {
    let new_id = Uuid::new_v4().to_string();
    let now = Utc::now().naive_utc().to_string();
    let cari_tipi = data.tip.unwrap_or_else(|| "Müşteri".to_string());
    let odeme_vadesi = data.odeme_vade.unwrap_or(30);
    let kredi_limiti = data.risk_limiti.unwrap_or(0.0);

    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Otomatik cari kodu oluştur
    let cari_kodu = if data.cari_kodu.is_some() && !data.cari_kodu.as_ref().unwrap().is_empty() {
        data.cari_kodu
    } else {
        let count_result = diesel::sql_query(
            "SELECT COUNT(*) as count FROM cariler WHERE tenant_id = ?1"
        )
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .get_result::<CountResult>(&mut conn)
        .map_err(|e| e.to_string())?;
        
        Some(format!("CRI-{:04}", count_result.count + 1))
    };

    diesel::sql_query(
        "INSERT INTO cariler (id, tenant_id, cari_kodu, cari_tipi, unvan, vergi_dairesi, vergi_no, tc_no, yetkili_kisi, telefon, telefon2, email, web, adres, il, ilce, posta_kodu, banka_adi, iban, odeme_vadesi, kredi_limiti, notlar, borc_bakiye, alacak_bakiye, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, 0, 0, 1, ?23, ?24)"
    )
    .bind::<diesel::sql_types::Text, _>(&new_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&cari_kodu)
    .bind::<diesel::sql_types::Text, _>(&cari_tipi)
    .bind::<diesel::sql_types::Text, _>(&data.unvan)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.vergi_dairesi)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.vergi_no)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.tc_no)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.yetkili_kisi)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.telefon)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.telefon2)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.email)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.web)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.adres)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.il)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.ilce)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.posta_kodu)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.banka_adi)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.iban)
    .bind::<diesel::sql_types::Integer, _>(odeme_vadesi)
    .bind::<diesel::sql_types::Double, _>(kredi_limiti)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.notlar)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&now)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(new_id)
}

#[tauri::command]
pub fn update_cari(
    state: State<AppState>,
    tenant_id_param: String,
    cari_id: String,
    data: CariInput,
) -> Result<(), String> {
    let now = Utc::now().naive_utc().to_string();
    let cari_tipi = data.tip.unwrap_or_else(|| "Müşteri".to_string());
    let odeme_vadesi = data.odeme_vade.unwrap_or(30);
    let kredi_limiti = data.risk_limiti.unwrap_or(0.0);

    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query(
        "UPDATE cariler SET cari_kodu = ?1, cari_tipi = ?2, unvan = ?3, vergi_dairesi = ?4, vergi_no = ?5, tc_no = ?6, yetkili_kisi = ?7, telefon = ?8, telefon2 = ?9, email = ?10, web = ?11, adres = ?12, il = ?13, ilce = ?14, posta_kodu = ?15, banka_adi = ?16, iban = ?17, odeme_vadesi = ?18, kredi_limiti = ?19, notlar = ?20, updated_at = ?21 WHERE id = ?22 AND tenant_id = ?23"
    )
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.cari_kodu)
    .bind::<diesel::sql_types::Text, _>(&cari_tipi)
    .bind::<diesel::sql_types::Text, _>(&data.unvan)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.vergi_dairesi)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.vergi_no)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.tc_no)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.yetkili_kisi)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.telefon)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.telefon2)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.email)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.web)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.adres)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.il)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.ilce)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.posta_kodu)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.banka_adi)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.iban)
    .bind::<diesel::sql_types::Integer, _>(odeme_vadesi)
    .bind::<diesel::sql_types::Double, _>(kredi_limiti)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.notlar)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&cari_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_cari(
    state: State<AppState>,
    tenant_id_param: String,
    cari_id: String,
    _neden: Option<String>,
) -> Result<(), String> {
    let now = Utc::now().naive_utc().to_string();

    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query(
        "UPDATE cariler SET is_active = 0, updated_at = ?1 WHERE id = ?2 AND tenant_id = ?3"
    )
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&cari_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn activate_cari(
    state: State<AppState>,
    tenant_id_param: String,
    cari_id: String,
) -> Result<(), String> {
    let now = Utc::now().naive_utc().to_string();

    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query(
        "UPDATE cariler SET is_active = 1, updated_at = ?1 WHERE id = ?2 AND tenant_id = ?3"
    )
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&cari_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_cari_hareketler(
    state: State<AppState>,
    tenant_id_param: String,
    cari_id: String,
) -> Result<Vec<CariHareket>, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query(
        "SELECT * FROM cari_hareketler WHERE cari_id = ?1 AND tenant_id = ?2 AND is_active = 1 ORDER BY tarih DESC"
    )
    .bind::<diesel::sql_types::Text, _>(&cari_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .load::<CariHareket>(&mut conn)
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_cari_hareket(
    state: State<AppState>,
    tenant_id_param: String,
    cari_id: String,
    hareket_tipi: String,
    tutar: f64,
    aciklama: Option<String>,
    belge_no: Option<String>,
    tarih: Option<String>,
) -> Result<String, String> {
    let new_id = Uuid::new_v4().to_string();
    let now = Utc::now().naive_utc().to_string();
    let tarih = tarih.unwrap_or_else(|| now.split('T').next().unwrap_or(&now).to_string());

    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query(
        "INSERT INTO cari_hareketler (id, tenant_id, cari_id, hareket_tipi, tarih, tutar, kalan, aciklama, belge_no, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1, ?10, ?11)"
    )
    .bind::<diesel::sql_types::Text, _>(&new_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Text, _>(&cari_id)
    .bind::<diesel::sql_types::Text, _>(&hareket_tipi)
    .bind::<diesel::sql_types::Text, _>(&tarih)
    .bind::<diesel::sql_types::Double, _>(tutar)
    .bind::<diesel::sql_types::Double, _>(tutar)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&aciklama)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&belge_no)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&now)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    // Bakiye güncelle
    if hareket_tipi == "Borç" {
        diesel::sql_query(
            "UPDATE cariler SET borc_bakiye = COALESCE(borc_bakiye, 0) + ?1, updated_at = ?2 WHERE id = ?3"
        )
        .bind::<diesel::sql_types::Double, _>(tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&cari_id)
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;
    } else {
        diesel::sql_query(
            "UPDATE cariler SET alacak_bakiye = COALESCE(alacak_bakiye, 0) + ?1, updated_at = ?2 WHERE id = ?3"
        )
        .bind::<diesel::sql_types::Double, _>(tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&cari_id)
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;
    }

    Ok(new_id)
}

#[tauri::command]
pub fn odeme_kaydet_cari(
    state: State<AppState>,
    tenant_id_param: String,
    cari_id: String,
    tutar: f64,
    aciklama: Option<String>,
    belge_no: Option<String>,
) -> Result<String, String> {
    create_cari_hareket(state, tenant_id_param, cari_id, "Alacak".to_string(), tutar, aciklama, belge_no, None)
}

#[tauri::command]
pub fn get_cari_ekstre(
    state: State<AppState>,
    tenant_id_param: String,
    cari_id: String,
    _baslangic_tarihi: Option<String>,
    _bitis_tarihi: Option<String>,
) -> Result<serde_json::Value, String> {
    let cari = get_cari(state.clone(), tenant_id_param.clone(), cari_id.clone())?
        .ok_or("Cari bulunamadı")?;
    
    let hareketler = get_cari_hareketler(state, tenant_id_param, cari_id)?;
    
    let toplam_borc: f64 = hareketler.iter()
        .filter(|h| h.hareket_tipi == "Borç")
        .map(|h| h.tutar)
        .sum();
    
    let toplam_alacak: f64 = hareketler.iter()
        .filter(|h| h.hareket_tipi == "Alacak")
        .map(|h| h.tutar)
        .sum();
    
    Ok(serde_json::json!({
        "cari": cari,
        "hareketler": hareketler,
        "toplam_borc": toplam_borc,
        "toplam_alacak": toplam_alacak,
        "bakiye": toplam_borc - toplam_alacak,
    }))
}

#[tauri::command]
pub fn get_cari_ozet(
    state: State<AppState>,
    tenant_id_param: String,
) -> Result<CariOzet, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let toplam = diesel::sql_query(
        "SELECT COUNT(*) as count FROM cariler WHERE tenant_id = ?1"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<CountResult>(&mut conn)
    .map_err(|e| e.to_string())?
    .count;

    let aktif = diesel::sql_query(
        "SELECT COUNT(*) as count FROM cariler WHERE tenant_id = ?1 AND is_active = 1"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<CountResult>(&mut conn)
    .map_err(|e| e.to_string())?
    .count;

    let toplam_borc = diesel::sql_query(
        "SELECT COALESCE(SUM(borc_bakiye), 0) as total FROM cariler WHERE tenant_id = ?1 AND is_active = 1"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<SumResult>(&mut conn)
    .map_err(|e| e.to_string())?
    .total
    .unwrap_or(0.0);

    let toplam_alacak = diesel::sql_query(
        "SELECT COALESCE(SUM(alacak_bakiye), 0) as total FROM cariler WHERE tenant_id = ?1 AND is_active = 1"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<SumResult>(&mut conn)
    .map_err(|e| e.to_string())?
    .total
    .unwrap_or(0.0);

    let musteri_sayisi = diesel::sql_query(
        "SELECT COUNT(*) as count FROM cariler WHERE tenant_id = ?1 AND is_active = 1 AND (cari_tipi = 'Müşteri' OR cari_tipi = 'Hem Müşteri Hem Tedarikçi')"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<CountResult>(&mut conn)
    .map_err(|e| e.to_string())?
    .count;

    let tedarikci_sayisi = diesel::sql_query(
        "SELECT COUNT(*) as count FROM cariler WHERE tenant_id = ?1 AND is_active = 1 AND (cari_tipi = 'Tedarikçi' OR cari_tipi = 'Hem Müşteri Hem Tedarikçi')"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<CountResult>(&mut conn)
    .map_err(|e| e.to_string())?
    .count;

    Ok(CariOzet {
        toplam,
        aktif,
        toplam_borc,
        toplam_alacak,
        musteri_sayisi,
        tedarikci_sayisi,
    })
}
