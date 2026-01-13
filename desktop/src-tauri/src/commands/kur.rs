use tauri::State;
use diesel::prelude::*;
use chrono::Utc;
use uuid::Uuid;
use crate::state::AppState;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, QueryableByName)]
pub struct Kur {
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub id: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub tenant_id: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub para_birimi: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub hedef_para_birimi: String,
    #[diesel(sql_type = diesel::sql_types::Double)]
    pub kur_degeri: f64,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub gecerlilik_baslangic: String,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub aciklama: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Integer>)]
    pub is_active: Option<i32>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub created_at: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct KurInput {
    pub para_birimi: String,
    pub hedef_para_birimi: Option<String>,
    pub kur_degeri: f64,
    pub gecerlilik_baslangic: String,
    pub aciklama: Option<String>,
}

/// Tüm aktif kurları getir
#[tauri::command]
pub fn get_kurlar(
    state: State<AppState>,
    tenant_id_param: String,
) -> Result<Vec<Kur>, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query(
        "SELECT * FROM kurlar WHERE tenant_id = ?1 AND is_active = 1 ORDER BY gecerlilik_baslangic DESC"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .load::<Kur>(&mut conn)
    .map_err(|e| e.to_string())
}

/// En güncel kurları getir (para birimi başına son kur)
#[tauri::command]
pub fn get_guncel_kurlar(
    state: State<AppState>,
    tenant_id_param: String,
) -> Result<Vec<Kur>, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query(
        "SELECT k.* FROM kurlar k
         INNER JOIN (
             SELECT para_birimi, hedef_para_birimi, MAX(gecerlilik_baslangic) as max_tarih
             FROM kurlar
             WHERE tenant_id = ?1 AND is_active = 1
             GROUP BY para_birimi, hedef_para_birimi
         ) latest ON k.para_birimi = latest.para_birimi 
                  AND k.hedef_para_birimi = latest.hedef_para_birimi
                  AND k.gecerlilik_baslangic = latest.max_tarih
         WHERE k.tenant_id = ?1 AND k.is_active = 1"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .load::<Kur>(&mut conn)
    .map_err(|e| e.to_string())
}

/// Belirli bir tarihteki kuru getir (virman için)
#[tauri::command]
pub fn get_kur_by_tarih(
    state: State<AppState>,
    tenant_id_param: String,
    para_birimi: String,
    hedef_para_birimi: String,
    tarih: String,
) -> Result<Option<Kur>, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Belirtilen tarihe en yakın önceki kuru getir
    let result = diesel::sql_query(
        "SELECT * FROM kurlar 
         WHERE tenant_id = ?1 
           AND para_birimi = ?2 
           AND hedef_para_birimi = ?3
           AND gecerlilik_baslangic <= ?4
           AND is_active = 1
         ORDER BY gecerlilik_baslangic DESC
         LIMIT 1"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Text, _>(&para_birimi)
    .bind::<diesel::sql_types::Text, _>(&hedef_para_birimi)
    .bind::<diesel::sql_types::Text, _>(&tarih)
    .get_result::<Kur>(&mut conn);

    match result {
        Ok(kur) => Ok(Some(kur)),
        Err(diesel::result::Error::NotFound) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Kur hesapla - iki para birimi arasında kur değerini döndür
#[tauri::command]
pub fn hesapla_kur(
    state: State<AppState>,
    tenant_id_param: String,
    kaynak_para_birimi: String,
    hedef_para_birimi: String,
    tarih: String,
) -> Result<f64, String> {
    // Aynı para birimi
    if kaynak_para_birimi == hedef_para_birimi {
        return Ok(1.0);
    }

    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Direkt kur var mı? (örn: USD -> TRY)
    let direkt_kur = diesel::sql_query(
        "SELECT * FROM kurlar 
         WHERE tenant_id = ?1 
           AND para_birimi = ?2 
           AND hedef_para_birimi = ?3
           AND gecerlilik_baslangic <= ?4
           AND is_active = 1
         ORDER BY gecerlilik_baslangic DESC
         LIMIT 1"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Text, _>(&kaynak_para_birimi)
    .bind::<diesel::sql_types::Text, _>(&hedef_para_birimi)
    .bind::<diesel::sql_types::Text, _>(&tarih)
    .get_result::<Kur>(&mut conn);

    if let Ok(kur) = direkt_kur {
        return Ok(kur.kur_degeri);
    }

    // Ters kur var mı? (örn: TRY -> USD için USD -> TRY'nin tersi)
    let ters_kur = diesel::sql_query(
        "SELECT * FROM kurlar 
         WHERE tenant_id = ?1 
           AND para_birimi = ?2 
           AND hedef_para_birimi = ?3
           AND gecerlilik_baslangic <= ?4
           AND is_active = 1
         ORDER BY gecerlilik_baslangic DESC
         LIMIT 1"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Text, _>(&hedef_para_birimi)
    .bind::<diesel::sql_types::Text, _>(&kaynak_para_birimi)
    .bind::<diesel::sql_types::Text, _>(&tarih)
    .get_result::<Kur>(&mut conn);

    if let Ok(kur) = ters_kur {
        return Ok(1.0 / kur.kur_degeri);
    }

    // Çapraz kur: Kaynak -> TRY -> Hedef (örn: USD -> EUR için USD->TRY ve EUR->TRY kullan)
    if kaynak_para_birimi != "TRY" && hedef_para_birimi != "TRY" {
        let kaynak_try = diesel::sql_query(
            "SELECT * FROM kurlar 
             WHERE tenant_id = ?1 
               AND para_birimi = ?2 
               AND hedef_para_birimi = 'TRY'
               AND gecerlilik_baslangic <= ?3
               AND is_active = 1
             ORDER BY gecerlilik_baslangic DESC
             LIMIT 1"
        )
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .bind::<diesel::sql_types::Text, _>(&kaynak_para_birimi)
        .bind::<diesel::sql_types::Text, _>(&tarih)
        .get_result::<Kur>(&mut conn);

        let hedef_try = diesel::sql_query(
            "SELECT * FROM kurlar 
             WHERE tenant_id = ?1 
               AND para_birimi = ?2 
               AND hedef_para_birimi = 'TRY'
               AND gecerlilik_baslangic <= ?3
               AND is_active = 1
             ORDER BY gecerlilik_baslangic DESC
             LIMIT 1"
        )
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .bind::<diesel::sql_types::Text, _>(&hedef_para_birimi)
        .bind::<diesel::sql_types::Text, _>(&tarih)
        .get_result::<Kur>(&mut conn);

        if let (Ok(k1), Ok(k2)) = (kaynak_try, hedef_try) {
            // USD -> EUR = (USD -> TRY) / (EUR -> TRY)
            return Ok(k1.kur_degeri / k2.kur_degeri);
        }
    }

    Err(format!(
        "Kur bulunamadı: {} -> {} ({})",
        kaynak_para_birimi, hedef_para_birimi, tarih
    ))
}

/// Yeni kur ekle veya güncelle
#[tauri::command]
pub fn set_kur(
    state: State<AppState>,
    tenant_id_param: String,
    data: KurInput,
) -> Result<String, String> {
    let now = Utc::now().naive_utc().to_string();
    let hedef = data.hedef_para_birimi.unwrap_or_else(|| "TRY".to_string());

    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Aynı tarih ve para birimi için mevcut kur var mı?
    let existing = diesel::sql_query(
        "SELECT * FROM kurlar 
         WHERE tenant_id = ?1 
           AND para_birimi = ?2 
           AND hedef_para_birimi = ?3
           AND gecerlilik_baslangic = ?4"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Text, _>(&data.para_birimi)
    .bind::<diesel::sql_types::Text, _>(&hedef)
    .bind::<diesel::sql_types::Text, _>(&data.gecerlilik_baslangic)
    .get_result::<Kur>(&mut conn);

    match existing {
        Ok(kur) => {
            // Güncelle
            diesel::sql_query(
                "UPDATE kurlar SET kur_degeri = ?1, aciklama = ?2, is_active = 1, updated_at = ?3 WHERE id = ?4"
            )
            .bind::<diesel::sql_types::Double, _>(data.kur_degeri)
            .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.aciklama)
            .bind::<diesel::sql_types::Text, _>(&now)
            .bind::<diesel::sql_types::Text, _>(&kur.id)
            .execute(&mut conn)
            .map_err(|e| e.to_string())?;
            
            Ok(kur.id)
        }
        Err(diesel::result::Error::NotFound) => {
            // Yeni kayıt
            let new_id = Uuid::new_v4().to_string();
            
            diesel::sql_query(
                "INSERT INTO kurlar (id, tenant_id, para_birimi, hedef_para_birimi, kur_degeri, gecerlilik_baslangic, aciklama, is_active, created_at, updated_at) 
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?9)"
            )
            .bind::<diesel::sql_types::Text, _>(&new_id)
            .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
            .bind::<diesel::sql_types::Text, _>(&data.para_birimi)
            .bind::<diesel::sql_types::Text, _>(&hedef)
            .bind::<diesel::sql_types::Double, _>(data.kur_degeri)
            .bind::<diesel::sql_types::Text, _>(&data.gecerlilik_baslangic)
            .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.aciklama)
            .bind::<diesel::sql_types::Text, _>(&now)
            .bind::<diesel::sql_types::Text, _>(&now)
            .execute(&mut conn)
            .map_err(|e| e.to_string())?;
            
            Ok(new_id)
        }
        Err(e) => Err(e.to_string()),
    }
}

/// Kur sil (soft delete)
#[tauri::command]
pub fn delete_kur(
    state: State<AppState>,
    tenant_id_param: String,
    kur_id: String,
) -> Result<(), String> {
    let now = Utc::now().naive_utc().to_string();

    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query(
        "UPDATE kurlar SET is_active = 0, updated_at = ?1 WHERE id = ?2 AND tenant_id = ?3"
    )
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&kur_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Kur geçmişi getir (belirli para birimi için)
#[tauri::command]
pub fn get_kur_gecmisi(
    state: State<AppState>,
    tenant_id_param: String,
    para_birimi: String,
) -> Result<Vec<Kur>, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query(
        "SELECT * FROM kurlar 
         WHERE tenant_id = ?1 AND para_birimi = ?2 AND is_active = 1
         ORDER BY gecerlilik_baslangic DESC
         LIMIT 50"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Text, _>(&para_birimi)
    .load::<Kur>(&mut conn)
    .map_err(|e| e.to_string())
}
