// export Tauri Commands
use serde::{Deserialize, Serialize};
use tauri::State;
use crate::state::AppState;
use diesel::prelude::*;
use std::fs;
use std::path::PathBuf;
use rust_xlsxwriter::*;
use chrono::Utc;

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

// ============================================================================
// EXCEL EXPORT FUNCTIONS
// ============================================================================

/// Kasalar Excel Export
#[tauri::command]
pub async fn export_kasalar_excel(
    state: State<'_, AppState>,
    tenant_id_param: String,
) -> Result<String, String> {
    // Kasaları getir
    let kasalar = crate::commands::mali::get_kasalar(state.clone(), tenant_id_param.clone()).await?;
    
    // Dosya yolu oluştur
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
    let filename = format!("kasalar_{}.xlsx", timestamp);
    let filepath = PathBuf::from(&filename);
    
    // Excel dosyası oluştur
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    
    // Stil tanımlamaları
    let header_format = Format::new()
        .set_bold()
        .set_font_color(Color::White)
        .set_background_color(Color::RGB(0x4472C4));
    
    let currency_format = Format::new()
        .set_num_format("#,##0.00");
    
    // Başlıklar
    let headers = vec![
        "Kasa Adı", "Para Birimi", "Devir Bakiye", "Toplam Gelir", 
        "Toplam Gider", "Virman Giriş", "Virman Çıkış", "Fiziksel Bakiye",
        "Tahakkuk Tutarı", "Serbest Bakiye", "Durum"
    ];
    
    for (col, header) in headers.iter().enumerate() {
        worksheet.write_string_with_format(0, col as u16, *header, &header_format)
            .map_err(|e| e.to_string())?;
    }
    
    // Veri satırları
    for (row_idx, kasa) in kasalar.iter().enumerate() {
        let row = (row_idx + 1) as u32;
        
        worksheet.write_string(row, 0, &kasa.kasa_adi).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 1, &kasa.para_birimi).map_err(|e| e.to_string())?;
        worksheet.write_number_with_format(row, 2, kasa.devir_bakiye.unwrap_or(0.0), &currency_format).map_err(|e| e.to_string())?;
        worksheet.write_number_with_format(row, 3, kasa.toplam_gelir.unwrap_or(0.0), &currency_format).map_err(|e| e.to_string())?;
        worksheet.write_number_with_format(row, 4, kasa.toplam_gider.unwrap_or(0.0), &currency_format).map_err(|e| e.to_string())?;
        worksheet.write_number_with_format(row, 5, kasa.virman_giris.unwrap_or(0.0), &currency_format).map_err(|e| e.to_string())?;
        worksheet.write_number_with_format(row, 6, kasa.virman_cikis.unwrap_or(0.0), &currency_format).map_err(|e| e.to_string())?;
        worksheet.write_number_with_format(row, 7, kasa.fiziksel_bakiye.unwrap_or(0.0), &currency_format).map_err(|e| e.to_string())?;
        worksheet.write_number_with_format(row, 8, kasa.tahakkuk_tutari.unwrap_or(0.0), &currency_format).map_err(|e| e.to_string())?;
        worksheet.write_number_with_format(row, 9, kasa.serbest_bakiye.unwrap_or(0.0), &currency_format).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 10, if kasa.is_active { "Aktif" } else { "Pasif" }).map_err(|e| e.to_string())?;
    }
    
    // Sütun genişliklerini ayarla
    worksheet.set_column_width(0, 25).map_err(|e| e.to_string())?;
    worksheet.set_column_width(1, 12).map_err(|e| e.to_string())?;
    for col in 2..11 {
        worksheet.set_column_width(col, 15).map_err(|e| e.to_string())?;
    }
    
    workbook.save(&filepath).map_err(|e| e.to_string())?;
    
    Ok(filepath.to_string_lossy().to_string())
}

/// Gelirler Excel Export
#[tauri::command]
pub async fn export_gelirler_excel(
    state: State<'_, AppState>,
    tenant_id_param: String,
    baslangic_tarih: Option<String>,
    bitis_tarih: Option<String>,
) -> Result<String, String> {
    
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    
    // Gelirleri getir
    let mut query = format!(
        "SELECT * FROM gelirler WHERE tenant_id = '{}' AND is_active = 1",
        tenant_id_param
    );
    
    if let Some(baslangic) = &baslangic_tarih {
        query.push_str(&format!(" AND tarih >= '{}'", baslangic));
    }
    if let Some(bitis) = &bitis_tarih {
        query.push_str(&format!(" AND tarih <= '{}'", bitis));
    }
    query.push_str(" ORDER BY tarih DESC");
    
    #[derive(QueryableByName, Debug)]
    struct GelirRow {
        #[diesel(sql_type = diesel::sql_types::Text)]
        tarih: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        kasa_id: String,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        gelir_turu_id: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Double)]
        tutar: f64,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        aciklama: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        makbuz_no: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        tahsil_eden: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        alt_kategori: Option<String>,
    }
    
    let gelirler: Vec<GelirRow> = diesel::sql_query(&query)
        .load(&mut conn)
        .map_err(|e| e.to_string())?;
    
    // Excel dosyası oluştur
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
    let filename = format!("gelirler_{}.xlsx", timestamp);
    let filepath = PathBuf::from(&filename);
    
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    
    let header_format = Format::new()
        .set_bold()
        .set_font_color(Color::White)
        .set_background_color(Color::RGB(0x4472C4));
    
    let currency_format = Format::new().set_num_format("#,##0.00");
    
    // Başlıklar
    let headers = vec![
        "Tarih", "Kasa", "Gelir Türü", "Tutar", "Açıklama", 
        "Makbuz No", "Tahsil Eden", "Alt Kategori"
    ];
    
    for (col, header) in headers.iter().enumerate() {
        worksheet.write_string_with_format(0, col as u16, *header, &header_format)
            .map_err(|e| e.to_string())?;
    }
    
    // Veri satırları
    for (row_idx, gelir) in gelirler.iter().enumerate() {
        let row = (row_idx + 1) as u32;
        
        worksheet.write_string(row, 0, &gelir.tarih).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 1, &gelir.kasa_id).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 2, gelir.gelir_turu_id.as_ref().map(|s| s.as_str()).unwrap_or("-")).map_err(|e| e.to_string())?;
        worksheet.write_number_with_format(row, 3, gelir.tutar, &currency_format).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 4, gelir.aciklama.as_ref().map(|s| s.as_str()).unwrap_or("-")).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 5, gelir.makbuz_no.as_ref().map(|s| s.as_str()).unwrap_or("-")).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 6, gelir.tahsil_eden.as_ref().map(|s| s.as_str()).unwrap_or("-")).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 7, gelir.alt_kategori.as_ref().map(|s| s.as_str()).unwrap_or("-")).map_err(|e| e.to_string())?;
    }
    
    // Sütun genişlikleri
    worksheet.set_column_width(0, 12).map_err(|e| e.to_string())?;
    worksheet.set_column_width(1, 20).map_err(|e| e.to_string())?;
    worksheet.set_column_width(2, 20).map_err(|e| e.to_string())?;
    worksheet.set_column_width(3, 15).map_err(|e| e.to_string())?;
    worksheet.set_column_width(4, 30).map_err(|e| e.to_string())?;
    for col in 5..8 {
        worksheet.set_column_width(col, 15).map_err(|e| e.to_string())?;
    }
    
    workbook.save(&filepath).map_err(|e| e.to_string())?;
    
    Ok(filepath.to_string_lossy().to_string())
}

/// Giderler Excel Export
#[tauri::command]
pub async fn export_giderler_excel(
    state: State<'_, AppState>,
    tenant_id_param: String,
    baslangic_tarih: Option<String>,
    bitis_tarih: Option<String>,
) -> Result<String, String> {
    
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    
    // Giderleri getir
    let mut query = format!(
        "SELECT * FROM giderler WHERE tenant_id = '{}' AND is_active = 1",
        tenant_id_param
    );
    
    if let Some(baslangic) = &baslangic_tarih {
        query.push_str(&format!(" AND tarih >= '{}'", baslangic));
    }
    if let Some(bitis) = &bitis_tarih {
        query.push_str(&format!(" AND tarih <= '{}'", bitis));
    }
    query.push_str(" ORDER BY tarih DESC");
    
    #[derive(QueryableByName, Debug)]
    struct GiderRow {
        #[diesel(sql_type = diesel::sql_types::Text)]
        tarih: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        kasa_id: String,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        gider_turu_id: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Double)]
        tutar: f64,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        aciklama: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        fatura_no: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        odeyen: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        alt_kategori: Option<String>,
    }
    
    let giderler: Vec<GiderRow> = diesel::sql_query(&query)
        .load(&mut conn)
        .map_err(|e| e.to_string())?;
    
    // Excel dosyası
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
    let filename = format!("giderler_{}.xlsx", timestamp);
    let filepath = PathBuf::from(&filename);
    
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    
    let header_format = Format::new()
        .set_bold()
        .set_font_color(Color::White)
        .set_background_color(Color::RGB(0xC00000));
    
    let currency_format = Format::new().set_num_format("#,##0.00");
    
    // Başlıklar
    let headers = vec![
        "Tarih", "Kasa", "Gider Türü", "Tutar", "Açıklama", 
        "Fatura No", "Ödeme Yapan", "Alt Kategori"
    ];
    
    for (col, header) in headers.iter().enumerate() {
        worksheet.write_string_with_format(0, col as u16, *header, &header_format)
            .map_err(|e| e.to_string())?;
    }
    
    // Veri
    for (row_idx, gider) in giderler.iter().enumerate() {
        let row = (row_idx + 1) as u32;
        
        worksheet.write_string(row, 0, &gider.tarih).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 1, &gider.kasa_id).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 2, gider.gider_turu_id.as_ref().map(|s| s.as_str()).unwrap_or("-")).map_err(|e| e.to_string())?;
        worksheet.write_number_with_format(row, 3, gider.tutar, &currency_format).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 4, gider.aciklama.as_ref().map(|s| s.as_str()).unwrap_or("-")).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 5, gider.fatura_no.as_ref().map(|s| s.as_str()).unwrap_or("-")).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 6, gider.odeyen.as_ref().map(|s| s.as_str()).unwrap_or("-")).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 7, gider.alt_kategori.as_ref().map(|s| s.as_str()).unwrap_or("-")).map_err(|e| e.to_string())?;
    }
    
    // Sütun genişlikleri
    for col in 0..8 {
        worksheet.set_column_width(col, if col == 4 { 30 } else { 15 }).map_err(|e| e.to_string())?;
    }
    
    workbook.save(&filepath).map_err(|e| e.to_string())?;
    
    Ok(filepath.to_string_lossy().to_string())
}

/// Üyeler Excel Export
#[tauri::command]
pub async fn export_uyeler_excel(
    state: State<'_, AppState>,
    tenant_id_param: String,
) -> Result<String, String> {
    
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    
    // Üyeleri getir
    #[derive(QueryableByName, Debug)]
    struct UyeRow {
        #[diesel(sql_type = diesel::sql_types::Text)]
        uye_no: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        ad: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        soyad: String,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        tc_no: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        telefon: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        email: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        uyelik_tipi: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        giris_tarihi: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
        ozel_aidat_tutari: Option<f64>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        cikis_tarihi: Option<String>,
    }
    
    let uyeler: Vec<UyeRow> = diesel::sql_query(
        "SELECT uye_no, ad, soyad, tc_no, telefon, email, uyelik_tipi, giris_tarihi, ozel_aidat_tutari, cikis_tarihi FROM uyeler WHERE tenant_id = ?1 ORDER BY uye_no ASC"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .load(&mut conn)
    .map_err(|e| e.to_string())?;
    
    // Excel dosyası
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
    let filename = format!("uyeler_{}.xlsx", timestamp);
    let filepath = PathBuf::from(&filename);
    
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    
    let header_format = Format::new()
        .set_bold()
        .set_font_color(Color::White)
        .set_background_color(Color::RGB(0x70AD47));
    
    // Başlıklar
    let headers = vec![
        "Üye No", "Ad", "Soyad", "TC No", "Telefon", "Email", 
        "Üyelik Tipi", "Giriş Tarihi", "Aidat Tutarı", "Durum"
    ];
    
    for (col, header) in headers.iter().enumerate() {
        worksheet.write_string_with_format(0, col as u16, *header, &header_format)
            .map_err(|e| e.to_string())?;
    }
    
    // Veri
    for (row_idx, uye) in uyeler.iter().enumerate() {
        let row = (row_idx + 1) as u32;
        
        worksheet.write_string(row, 0, &uye.uye_no).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 1, &uye.ad).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 2, &uye.soyad).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 3, uye.tc_no.as_ref().map(|s| s.as_str()).unwrap_or("-")).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 4, uye.telefon.as_ref().map(|s| s.as_str()).unwrap_or("-")).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 5, uye.email.as_ref().map(|s| s.as_str()).unwrap_or("-")).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 6, uye.uyelik_tipi.as_ref().map(|s| s.as_str()).unwrap_or("Asil")).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 7, uye.giris_tarihi.as_ref().map(|s| s.as_str()).unwrap_or("-")).map_err(|e| e.to_string())?;
        
        if let Some(tutar) = uye.ozel_aidat_tutari {
            worksheet.write_number(row, 8, tutar).map_err(|e| e.to_string())?;
        } else {
            worksheet.write_string(row, 8, "-").map_err(|e| e.to_string())?;
        }
        
        let durum = if uye.cikis_tarihi.is_some() { "Çıkış Yapmış" } else { "Aktif" };
        worksheet.write_string(row, 9, durum).map_err(|e| e.to_string())?;
    }
    
    // Sütun genişlikleri
    for col in 0..10 {
        worksheet.set_column_width(col, if col == 5 { 25 } else { 15 }).map_err(|e| e.to_string())?;
    }
    
    workbook.save(&filepath).map_err(|e| e.to_string())?;
    
    Ok(filepath.to_string_lossy().to_string())
}

/// Demirbaşlar Excel Export
#[tauri::command]
pub async fn export_demirbaslar_excel(
    state: State<'_, AppState>,
    tenant_id_param: String,
) -> Result<String, String> {
    use crate::commands::demirbaslar::Demirbas;
    
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    
    // Demirbaşları getir
    #[derive(QueryableByName, Debug)]
    struct DemirbasRow {
        #[diesel(sql_type = diesel::sql_types::Text)]
        demirbas_no: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        ad: String,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        kategori: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        marka_model: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        konum: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
        alis_bedeli: Option<f64>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
        guncel_deger: Option<f64>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        alis_tarihi: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        durum: Option<String>,
    }
    
    let demirbaslar: Vec<DemirbasRow> = diesel::sql_query(
        "SELECT demirbas_no, ad, kategori, marka_model, konum, alis_bedeli, guncel_deger, alis_tarihi, durum FROM demirbaslar WHERE tenant_id = ?1 AND is_active = 1 ORDER BY demirbas_no ASC"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .load(&mut conn)
    .map_err(|e| e.to_string())?;
    
    // Excel dosyası
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
    let filename = format!("demirbaslar_{}.xlsx", timestamp);
    let filepath = PathBuf::from(&filename);
    
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    
    let header_format = Format::new()
        .set_bold()
        .set_font_color(Color::White)
        .set_background_color(Color::RGB(0xFFC000));
    
    let currency_format = Format::new().set_num_format("#,##0.00");
    
    // Başlıklar
    let headers = vec![
        "Demirbaş No", "Ad", "Kategori", "Marka/Model", "Konum",
        "Alış Bedeli", "Güncel Değer", "Alış Tarihi", "Durum"
    ];
    
    for (col, header) in headers.iter().enumerate() {
        worksheet.write_string_with_format(0, col as u16, *header, &header_format)
            .map_err(|e| e.to_string())?;
    }
    
    // Veri
    for (row_idx, demirbas) in demirbaslar.iter().enumerate() {
        let row = (row_idx + 1) as u32;
        
        worksheet.write_string(row, 0, &demirbas.demirbas_no).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 1, &demirbas.ad).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 2, demirbas.kategori.as_ref().map(|s| s.as_str()).unwrap_or("-")).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 3, demirbas.marka_model.as_ref().map(|s| s.as_str()).unwrap_or("-")).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 4, demirbas.konum.as_ref().map(|s| s.as_str()).unwrap_or("-")).map_err(|e| e.to_string())?;
        
        if let Some(bedel) = demirbas.alis_bedeli {
            worksheet.write_number_with_format(row, 5, bedel, &currency_format).map_err(|e| e.to_string())?;
        } else {
            worksheet.write_string(row, 5, "-").map_err(|e| e.to_string())?;
        }
        
        if let Some(deger) = demirbas.guncel_deger {
            worksheet.write_number_with_format(row, 6, deger, &currency_format).map_err(|e| e.to_string())?;
        } else {
            worksheet.write_string(row, 6, "-").map_err(|e| e.to_string())?;
        }
        
        worksheet.write_string(row, 7, demirbas.alis_tarihi.as_ref().map(|s| s.as_str()).unwrap_or("-")).map_err(|e| e.to_string())?;
        worksheet.write_string(row, 8, demirbas.durum.as_ref().map(|s| s.as_str()).unwrap_or("Aktif")).map_err(|e| e.to_string())?;
    }
    
    // Sütun genişlikleri
    for col in 0..9 {
        worksheet.set_column_width(col, if col == 1 || col == 4 { 25 } else { 15 }).map_err(|e| e.to_string())?;
    }
    
    workbook.save(&filepath).map_err(|e| e.to_string())?;
    
    Ok(filepath.to_string_lossy().to_string())
}
