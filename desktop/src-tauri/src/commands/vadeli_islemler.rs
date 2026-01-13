use tauri::State;
use diesel::prelude::*;
use chrono::Utc;
use uuid::Uuid;
use crate::state::AppState;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, QueryableByName)]
pub struct VadeliIslem {
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub id: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub tenant_id: String,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub kasa_id: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub islem_tipi: String,
    #[diesel(sql_type = diesel::sql_types::Double)]
    pub tutar: f64,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub vade_tarihi: String,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub aciklama: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub kategori: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub tekrar_tipi: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Integer>)]
    pub tekrar_sayisi: Option<i32>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub ilgili_kisi: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub cari_id: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub durum: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub gerceklesen_id: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub gerceklesme_tarihi: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Integer>)]
    pub hatirlatma_gun: Option<i32>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub notlar: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Integer>)]
    pub is_active: Option<i32>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub created_at: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, QueryableByName)]
pub struct VadeliIslemWithKasa {
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub id: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub tenant_id: String,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub kasa_id: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub islem_tipi: String,
    #[diesel(sql_type = diesel::sql_types::Double)]
    pub tutar: f64,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub vade_tarihi: String,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub aciklama: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub tekrar_tipi: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub durum: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub created_at: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub kasa_adi: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct VadeliIslemInput {
    pub kasa_id: Option<String>,
    pub islem_tipi: String,
    pub tutar: f64,
    pub vade_tarihi: String,
    pub aciklama: Option<String>,
    pub kategori: Option<String>,
    pub tekrar_tipi: Option<String>,
    pub ilgili_kisi: Option<String>,
    pub cari_id: Option<String>,
    pub hatirlatma_gun: Option<i32>,
    pub notlar: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct VadeliOzet {
    pub toplam: i64,
    pub bekleyen: i64,
    pub gerceklesen: i64,
    pub iptal: i64,
    pub toplam_gelir: f64,
    pub toplam_gider: f64,
    pub yaklasan_7_gun: i64,
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
pub fn get_vadeli_islemler(
    state: State<AppState>,
    tenant_id_param: String,
    durum: Option<String>,
) -> Result<Vec<VadeliIslemWithKasa>, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    if let Some(d) = durum {
        diesel::sql_query(
            "SELECT v.id, v.tenant_id, v.kasa_id, v.islem_tipi, v.tutar, v.vade_tarihi, v.aciklama, v.tekrar_tipi, v.durum, v.created_at, k.kasa_adi as kasa_adi FROM vadeli_islemler v LEFT JOIN kasalar k ON v.kasa_id = k.id WHERE v.tenant_id = ?1 AND v.durum = ?2 AND v.is_active = 1 ORDER BY v.vade_tarihi ASC"
        )
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .bind::<diesel::sql_types::Text, _>(&d)
        .load::<VadeliIslemWithKasa>(&mut conn)
        .map_err(|e| e.to_string())
    } else {
        diesel::sql_query(
            "SELECT v.id, v.tenant_id, v.kasa_id, v.islem_tipi, v.tutar, v.vade_tarihi, v.aciklama, v.tekrar_tipi, v.durum, v.created_at, k.kasa_adi as kasa_adi FROM vadeli_islemler v LEFT JOIN kasalar k ON v.kasa_id = k.id WHERE v.tenant_id = ?1 AND v.is_active = 1 ORDER BY v.vade_tarihi ASC"
        )
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .load::<VadeliIslemWithKasa>(&mut conn)
        .map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn get_yaklasan_vadeler(
    state: State<AppState>,
    tenant_id_param: String,
    gun_sayisi: Option<i32>,
) -> Result<Vec<VadeliIslemWithKasa>, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let gun = gun_sayisi.unwrap_or(7);

    diesel::sql_query(
        &format!(
            "SELECT v.id, v.tenant_id, v.kasa_id, v.islem_tipi, v.tutar, v.vade_tarihi, v.aciklama, v.tekrar_tipi, v.durum, v.created_at, k.kasa_adi as kasa_adi FROM vadeli_islemler v LEFT JOIN kasalar k ON v.kasa_id = k.id WHERE v.tenant_id = ?1 AND v.durum = 'Bekliyor' AND v.is_active = 1 AND v.vade_tarihi <= date('now', '+{} days') ORDER BY v.vade_tarihi ASC",
            gun
        )
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .load::<VadeliIslemWithKasa>(&mut conn)
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_vadeli_ozet(
    state: State<AppState>,
    tenant_id_param: String,
) -> Result<VadeliOzet, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let toplam = diesel::sql_query(
        "SELECT COUNT(*) as count FROM vadeli_islemler WHERE tenant_id = ?1 AND is_active = 1"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<CountResult>(&mut conn)
    .map_err(|e| e.to_string())?
    .count;

    let bekleyen = diesel::sql_query(
        "SELECT COUNT(*) as count FROM vadeli_islemler WHERE tenant_id = ?1 AND is_active = 1 AND durum = 'Bekliyor'"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<CountResult>(&mut conn)
    .map_err(|e| e.to_string())?
    .count;

    let gerceklesen = diesel::sql_query(
        "SELECT COUNT(*) as count FROM vadeli_islemler WHERE tenant_id = ?1 AND is_active = 1 AND durum = 'Gerçekleşti'"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<CountResult>(&mut conn)
    .map_err(|e| e.to_string())?
    .count;

    let iptal = diesel::sql_query(
        "SELECT COUNT(*) as count FROM vadeli_islemler WHERE tenant_id = ?1 AND is_active = 1 AND durum = 'İptal'"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<CountResult>(&mut conn)
    .map_err(|e| e.to_string())?
    .count;

    let toplam_gelir = diesel::sql_query(
        "SELECT COALESCE(SUM(tutar), 0) as total FROM vadeli_islemler WHERE tenant_id = ?1 AND is_active = 1 AND durum = 'Bekliyor' AND islem_tipi = 'Gelir'"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<SumResult>(&mut conn)
    .map_err(|e| e.to_string())?
    .total
    .unwrap_or(0.0);

    let toplam_gider = diesel::sql_query(
        "SELECT COALESCE(SUM(tutar), 0) as total FROM vadeli_islemler WHERE tenant_id = ?1 AND is_active = 1 AND durum = 'Bekliyor' AND islem_tipi = 'Gider'"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<SumResult>(&mut conn)
    .map_err(|e| e.to_string())?
    .total
    .unwrap_or(0.0);

    let yaklasan_7_gun = diesel::sql_query(
        "SELECT COUNT(*) as count FROM vadeli_islemler WHERE tenant_id = ?1 AND is_active = 1 AND durum = 'Bekliyor' AND vade_tarihi <= date('now', '+7 days')"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<CountResult>(&mut conn)
    .map_err(|e| e.to_string())?
    .count;

    Ok(VadeliOzet {
        toplam,
        bekleyen,
        gerceklesen,
        iptal,
        toplam_gelir,
        toplam_gider,
        yaklasan_7_gun,
    })
}

#[tauri::command]
pub fn create_vadeli_islem(
    state: State<AppState>,
    tenant_id_param: String,
    data: VadeliIslemInput,
) -> Result<String, String> {
    let new_id = Uuid::new_v4().to_string();
    let now = Utc::now().naive_utc().to_string();
    let tekrar_tipi = data.tekrar_tipi.unwrap_or_else(|| "Tek Seferlik".to_string());

    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query(
        "INSERT INTO vadeli_islemler (id, tenant_id, kasa_id, islem_tipi, tutar, vade_tarihi, aciklama, kategori, tekrar_tipi, ilgili_kisi, cari_id, durum, hatirlatma_gun, notlar, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'Bekliyor', ?12, ?13, 1, ?14, ?15)"
    )
    .bind::<diesel::sql_types::Text, _>(&new_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.kasa_id)
    .bind::<diesel::sql_types::Text, _>(&data.islem_tipi)
    .bind::<diesel::sql_types::Double, _>(data.tutar)
    .bind::<diesel::sql_types::Text, _>(&data.vade_tarihi)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.aciklama)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.kategori)
    .bind::<diesel::sql_types::Text, _>(&tekrar_tipi)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.ilgili_kisi)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.cari_id)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Integer>, _>(&data.hatirlatma_gun)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.notlar)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&now)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(new_id)
}

#[tauri::command]
pub fn gerceklestir_vadeli_islem(
    state: State<AppState>,
    tenant_id_param: String,
    vadeli_islem_id: String,
) -> Result<String, String> {
    let now = Utc::now().naive_utc().to_string();
    let today = Utc::now().format("%Y-%m-%d").to_string();

    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // 1. Vadeli işlem bilgilerini al
    let vadeli: VadeliIslem = diesel::sql_query(
        "SELECT * FROM vadeli_islemler WHERE id = ?1 AND tenant_id = ?2 AND is_active = 1"
    )
    .bind::<diesel::sql_types::Text, _>(&vadeli_islem_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result(&mut conn)
    .map_err(|e| format!("Vadeli işlem bulunamadı: {}", e))?;

    // Kasa zorunlu kontrol
    let kasa_id = vadeli.kasa_id.as_ref()
        .ok_or("Vadeli işlem için kasa tanımlı değil")?;

    let gerceklesen_id = Uuid::new_v4().to_string();

    // 2. İşlem tipine göre gelir veya gider oluştur
    if vadeli.islem_tipi.to_lowercase() == "gelir" {
        // Gelir kaydı oluştur
        diesel::sql_query(
            "INSERT INTO gelirler (id, tenant_id, kasa_id, gelir_turu, tutar, tarih, aciklama, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?8)"
        )
        .bind::<diesel::sql_types::Text, _>(&gerceklesen_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .bind::<diesel::sql_types::Text, _>(kasa_id)
        .bind::<diesel::sql_types::Text, _>(vadeli.kategori.as_deref().unwrap_or("Vadeli Gelir"))
        .bind::<diesel::sql_types::Double, _>(vadeli.tutar)
        .bind::<diesel::sql_types::Text, _>(&today)
        .bind::<diesel::sql_types::Text, _>(vadeli.aciklama.as_deref().unwrap_or("Vadeli işlem gerçekleşti"))
        .bind::<diesel::sql_types::Text, _>(&now)
        .execute(&mut conn)
        .map_err(|e| format!("Gelir kaydı oluşturulamadı: {}", e))?;

        // Kasa bakiyesini artır
        diesel::sql_query(
            "UPDATE kasalar SET bakiye = bakiye + ?1, toplam_gelir = toplam_gelir + ?1, updated_at = ?2 WHERE id = ?3"
        )
        .bind::<diesel::sql_types::Double, _>(vadeli.tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(kasa_id)
        .execute(&mut conn)
        .map_err(|e| format!("Kasa güncellenemedi: {}", e))?;

    } else {
        // Gider kaydı oluştur
        diesel::sql_query(
            "INSERT INTO giderler (id, tenant_id, kasa_id, gider_turu, tutar, tarih, aciklama, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?8)"
        )
        .bind::<diesel::sql_types::Text, _>(&gerceklesen_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .bind::<diesel::sql_types::Text, _>(kasa_id)
        .bind::<diesel::sql_types::Text, _>(vadeli.kategori.as_deref().unwrap_or("Vadeli Gider"))
        .bind::<diesel::sql_types::Double, _>(vadeli.tutar)
        .bind::<diesel::sql_types::Text, _>(&today)
        .bind::<diesel::sql_types::Text, _>(vadeli.aciklama.as_deref().unwrap_or("Vadeli işlem gerçekleşti"))
        .bind::<diesel::sql_types::Text, _>(&now)
        .execute(&mut conn)
        .map_err(|e| format!("Gider kaydı oluşturulamadı: {}", e))?;

        // Kasa bakiyesini azalt
        diesel::sql_query(
            "UPDATE kasalar SET bakiye = bakiye - ?1, toplam_gider = toplam_gider + ?1, updated_at = ?2 WHERE id = ?3"
        )
        .bind::<diesel::sql_types::Double, _>(vadeli.tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(kasa_id)
        .execute(&mut conn)
        .map_err(|e| format!("Kasa güncellenemedi: {}", e))?;
    }

    // 3. Cari hareket oluştur (eğer cari_id varsa)
    if let Some(cari_id) = &vadeli.cari_id {
        let hareket_tipi = if vadeli.islem_tipi.to_lowercase() == "gelir" { "ALACAK" } else { "BORC" };
        let hareket_id = Uuid::new_v4().to_string();
        
        diesel::sql_query(
            "INSERT INTO cari_hareketler (id, tenant_id, cari_id, hareket_tipi, tarih, tutar, odenen, kalan, belge_turu, kasa_id, gelir_id, gider_id, durum, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, 0, 'Vadeli İşlem', ?7, ?8, ?9, 'Tamamlandı', ?10, ?10)"
        )
        .bind::<diesel::sql_types::Text, _>(&hareket_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .bind::<diesel::sql_types::Text, _>(cari_id)
        .bind::<diesel::sql_types::Text, _>(hareket_tipi)
        .bind::<diesel::sql_types::Text, _>(&today)
        .bind::<diesel::sql_types::Double, _>(vadeli.tutar)
        .bind::<diesel::sql_types::Text, _>(kasa_id)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(if vadeli.islem_tipi.to_lowercase() == "gelir" { Some(&gerceklesen_id) } else { None })
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(if vadeli.islem_tipi.to_lowercase() != "gelir" { Some(&gerceklesen_id) } else { None })
        .bind::<diesel::sql_types::Text, _>(&now)
        .execute(&mut conn)
        .map_err(|e| format!("Cari hareket oluşturulamadı: {}", e))?;

        // Cari bakiye güncelle
        if vadeli.islem_tipi.to_lowercase() == "gelir" {
            diesel::sql_query(
                "UPDATE cariler SET alacak_bakiye = alacak_bakiye + ?1, updated_at = ?2 WHERE id = ?3"
            )
            .bind::<diesel::sql_types::Double, _>(vadeli.tutar)
            .bind::<diesel::sql_types::Text, _>(&now)
            .bind::<diesel::sql_types::Text, _>(cari_id)
            .execute(&mut conn)
            .ok();
        } else {
            diesel::sql_query(
                "UPDATE cariler SET borc_bakiye = borc_bakiye + ?1, updated_at = ?2 WHERE id = ?3"
            )
            .bind::<diesel::sql_types::Double, _>(vadeli.tutar)
            .bind::<diesel::sql_types::Text, _>(&now)
            .bind::<diesel::sql_types::Text, _>(cari_id)
            .execute(&mut conn)
            .ok();
        }
    }

    // 4. Vadeli işlem durumunu güncelle
    diesel::sql_query(
        "UPDATE vadeli_islemler SET durum = 'Gerçekleşti', gerceklesen_id = ?1, gerceklesme_tarihi = ?2, updated_at = ?3 WHERE id = ?4 AND tenant_id = ?5"
    )
    .bind::<diesel::sql_types::Text, _>(&gerceklesen_id)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&vadeli_islem_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(gerceklesen_id)
}

#[tauri::command]
pub fn iptal_vadeli_islem(
    state: State<AppState>,
    tenant_id_param: String,
    vadeli_islem_id: String,
    _neden: Option<String>,
) -> Result<(), String> {
    let now = Utc::now().naive_utc().to_string();

    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query(
        "UPDATE vadeli_islemler SET durum = 'İptal', updated_at = ?1 WHERE id = ?2 AND tenant_id = ?3"
    )
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&vadeli_islem_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(())
}
