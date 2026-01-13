// export Tauri Commands
use serde::{Deserialize, Serialize};
use tauri::State;
use crate::state::AppState;
use diesel::prelude::*;
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize)]
pub struct ExportResult {
    pub success: bool,
    pub file_path: String,
    pub records_count: usize,
    pub file_size_kb: u64,
}

#[derive(Serialize, Deserialize, Queryable, QueryableByName)]
#[diesel(table_name = crate::db::schema::uyeler)]
struct UyeExport {
    #[diesel(sql_type = diesel::sql_types::Text)]
    uye_no: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    ad_soyad: String,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    telefon: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    email: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Text)]
    durum: String,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    uyelik_tipi: Option<String>,
}

#[tauri::command]
pub fn export_uyeler_csv(
    tenant_id_param: String,
    destination: String,
    state: State<'_, AppState>,
) -> Result<ExportResult, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Üyeleri getir
    let uyeler = diesel::sql_query(
        "SELECT uye_no, ad_soyad, telefon, email, durum, uyelik_tipi FROM uyeler WHERE tenant_id = ?1 ORDER BY uye_no"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .load::<UyeExport>(&mut conn)
    .map_err(|e| format!("Database error: {}", e))?;

    // CSV içeriği oluştur
    let mut csv_content = "Üye No,Ad Soyad,Telefon,Email,Durum,Üyelik Tipi\n".to_string();
    
    for uye in &uyeler {
        csv_content.push_str(&format!(
            "{},{},{},{},{},{}\n",
            uye.uye_no,
            uye.ad_soyad,
            uye.telefon.as_deref().unwrap_or("-"),
            uye.email.as_deref().unwrap_or("-"),
            uye.durum,
            uye.uyelik_tipi.as_deref().unwrap_or("-")
        ));
    }
    
    let path = PathBuf::from(&destination);
    fs::write(&path, csv_content)
        .map_err(|e| format!("File write error: {}", e))?;
    
    let metadata = fs::metadata(&path)
        .map_err(|e| format!("File metadata error: {}", e))?;
    
    Ok(ExportResult {
        success: true,
        file_path: destination,
        records_count: uyeler.len(),
        file_size_kb: metadata.len() / 1024,
    })
}

#[derive(Serialize, Deserialize, Queryable, QueryableByName)]
struct AidatExport {
    #[diesel(sql_type = diesel::sql_types::Text)]
    uye_no: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    ad_soyad: String,
    #[diesel(sql_type = diesel::sql_types::Integer)]
    yil: i32,
    #[diesel(sql_type = diesel::sql_types::Integer)]
    ay: i32,
    #[diesel(sql_type = diesel::sql_types::Double)]
    tutar: f64,
    #[diesel(sql_type = diesel::sql_types::Double)]
    odenen: f64,
    #[diesel(sql_type = diesel::sql_types::Double)]
    kalan: f64,
    #[diesel(sql_type = diesel::sql_types::Text)]
    durum: String,
}

#[tauri::command]
pub fn export_aidat_raporu_csv(
    tenant_id_param: String,
    yil: i32,
    destination: String,
    state: State<'_, AppState>,
) -> Result<ExportResult, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Aidat kayıtlarını getir
    let aidatlar = diesel::sql_query(
        "SELECT u.uye_no, u.ad_soyad, a.yil, a.ay, a.tutar, a.odenen, a.kalan, a.durum 
         FROM aidat_takip a 
         JOIN uyeler u ON a.uye_id = u.id 
         WHERE a.tenant_id = ?1 AND a.yil = ?2 
         ORDER BY u.uye_no, a.ay"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Integer, _>(yil)
    .load::<AidatExport>(&mut conn)
    .map_err(|e| format!("Database error: {}", e))?;

    // CSV içeriği oluştur
    let mut csv_content = "Üye No,Ad Soyad,Yıl,Ay,Tutar,Ödenen,Kalan,Durum\n".to_string();
    
    for aidat in &aidatlar {
        csv_content.push_str(&format!(
            "{},{},{},{},{:.2},{:.2},{:.2},{}\n",
            aidat.uye_no,
            aidat.ad_soyad,
            aidat.yil,
            aidat.ay,
            aidat.tutar,
            aidat.odenen,
            aidat.kalan,
            aidat.durum
        ));
    }
    
    let path = PathBuf::from(&destination);
    fs::write(&path, csv_content)
        .map_err(|e| format!("File write error: {}", e))?;
    
    let metadata = fs::metadata(&path)
        .map_err(|e| format!("File metadata error: {}", e))?;
    
    Ok(ExportResult {
        success: true,
        file_path: destination,
        records_count: aidatlar.len(),
        file_size_kb: metadata.len() / 1024,
    })
}

#[derive(Serialize, Deserialize, Queryable, QueryableByName)]
struct MaliExport {
    #[diesel(sql_type = diesel::sql_types::Text)]
    tarih: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    islem_turu: String,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    kategori: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    aciklama: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Double)]
    tutar: f64,
    #[diesel(sql_type = diesel::sql_types::Text)]
    kasa_adi: String,
}

#[tauri::command]
pub fn export_mali_raporu_csv(
    tenant_id_param: String,
    baslangic: String,
    bitis: String,
    destination: String,
    state: State<'_, AppState>,
) -> Result<ExportResult, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Gelirleri getir
    let gelirler = diesel::sql_query(
        "SELECT g.tarih, 'GELİR' as islem_turu, gt.ad as kategori, g.aciklama, g.tutar, k.kasa_adi 
         FROM gelirler g 
         JOIN kasalar k ON g.kasa_id = k.id 
         LEFT JOIN gelir_turleri gt ON g.gelir_turu_id = gt.id
         WHERE g.tenant_id = ?1 AND g.tarih BETWEEN ?2 AND ?3
         ORDER BY g.tarih"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Text, _>(&baslangic)
    .bind::<diesel::sql_types::Text, _>(&bitis)
    .load::<MaliExport>(&mut conn)
    .map_err(|e| format!("Database error (gelirler): {}", e))?;

    // Giderleri getir
    let giderler = diesel::sql_query(
        "SELECT g.tarih, 'GİDER' as islem_turu, gt.ad as kategori, g.aciklama, g.tutar, k.kasa_adi 
         FROM giderler g 
         JOIN kasalar k ON g.kasa_id = k.id 
         LEFT JOIN gider_turleri gt ON g.gider_turu_id = gt.id
         WHERE g.tenant_id = ?1 AND g.tarih BETWEEN ?2 AND ?3
         ORDER BY g.tarih"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Text, _>(&baslangic)
    .bind::<diesel::sql_types::Text, _>(&bitis)
    .load::<MaliExport>(&mut conn)
    .map_err(|e| format!("Database error (giderler): {}", e))?;

    // CSV içeriği oluştur
    let mut csv_content = "Tarih,İşlem Türü,Kategori,Açıklama,Tutar,Kasa\n".to_string();
    
    // Tüm işlemleri birleştir ve tarih sırasına göre sırala
    let mut tum_islemler: Vec<MaliExport> = gelirler;
    tum_islemler.extend(giderler);
    tum_islemler.sort_by(|a, b| a.tarih.cmp(&b.tarih));
    
    for islem in &tum_islemler {
        csv_content.push_str(&format!(
            "{},{},{},{},{:.2},{}\n",
            islem.tarih,
            islem.islem_turu,
            islem.kategori.as_deref().unwrap_or("-"),
            islem.aciklama.as_deref().unwrap_or("-"),
            islem.tutar,
            islem.kasa_adi
        ));
    }
    
    let path = PathBuf::from(&destination);
    fs::write(&path, csv_content)
        .map_err(|e| format!("File write error: {}", e))?;
    
    let metadata = fs::metadata(&path)
        .map_err(|e| format!("File metadata error: {}", e))?;
    
    Ok(ExportResult {
        success: true,
        file_path: destination,
        records_count: tum_islemler.len(),
        file_size_kb: metadata.len() / 1024,
    })
}
