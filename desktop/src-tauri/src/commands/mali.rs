use diesel::prelude::*;
use diesel::r2d2::{ConnectionManager, Pool};
use diesel::sqlite::SqliteConnection;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use crate::db::models::{Kasa, Gelir, Gider, GelirTuru, GiderTuru, Virman};

type DbPool = Pool<ConnectionManager<SqliteConnection>>;

/// Generic paginated response for server-side pagination
#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateKasaRequest {
    pub kasa_adi: String,
    pub para_birimi: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateKasaRequest {
    pub kasa_adi: Option<String>,
    pub para_birimi: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateGelirTuruRequest {
    pub ad: String,
    pub kod: Option<String>,
    pub aciklama: Option<String>,
    pub varsayilan_makbuz_prefix: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateGiderTuruRequest {
    pub ad: String,
    pub kod: Option<String>,
    pub aciklama: Option<String>,
    pub varsayilan_fatura_prefix: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateGelirRequest {
    pub kasa_id: String,
    pub gelir_turu_id: Option<String>,
    pub tarih: String,
    pub tutar: f64,
    pub aciklama: Option<String>,
    pub makbuz_no: Option<String>,
    pub alt_kategori: Option<String>,
    pub tahakkuk_durumu: Option<String>,
    pub belge_no: Option<String>,
    pub tahsil_eden: Option<String>,
    pub belge_id: Option<String>,
    pub uye_id: Option<String>,        // İlgili üye
    pub aidat_id: Option<String>,      // Aidat bağlantısı
    pub ait_oldugu_yil: Option<i32>,   // Ait olduğu yıl
}

#[derive(Debug, Deserialize)]
pub struct UpdateGelirRequest {
    pub kasa_id: Option<String>,
    pub gelir_turu_id: Option<String>,
    pub tarih: Option<String>,
    pub tutar: Option<f64>,
    pub aciklama: Option<String>,
    pub makbuz_no: Option<String>,
    pub alt_kategori: Option<String>,
    pub tahakkuk_durumu: Option<String>,
    pub belge_no: Option<String>,
    pub tahsil_eden: Option<String>,
    pub belge_id: Option<String>,
    pub uye_id: Option<String>,        // İlgili üye
    pub aidat_id: Option<String>,      // Aidat bağlantısı
    pub ait_oldugu_yil: Option<i32>,   // Ait olduğu yıl
}

#[derive(Debug, Deserialize)]
pub struct CreateGiderRequest {
    pub kasa_id: String,
    pub gider_turu_id: Option<String>,
    pub tarih: String,
    pub tutar: f64,
    pub aciklama: Option<String>,
    pub fatura_no: Option<String>,
    pub alt_kategori: Option<String>,
    pub islem_no: Option<String>,
    pub odeyen: Option<String>,
    pub notlar: Option<String>,
    pub belge_id: Option<String>,
    pub uye_id: Option<String>,         // Opsiyonel ilgili üye
    pub demirbas_id: Option<String>,    // Demirbaş bağlantısı
}

#[derive(Debug, Deserialize)]
pub struct UpdateGiderRequest {
    pub kasa_id: Option<String>,
    pub gider_turu_id: Option<String>,
    pub tarih: Option<String>,
    pub tutar: Option<f64>,
    pub aciklama: Option<String>,
    pub fatura_no: Option<String>,
    pub alt_kategori: Option<String>,
    pub islem_no: Option<String>,
    pub odeyen: Option<String>,
    pub notlar: Option<String>,
    pub belge_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct VirmanRequest {
    pub kaynak_kasa_id: String,
    pub hedef_kasa_id: String,
    pub tutar: f64,
    pub aciklama: Option<String>,
    pub uygulanan_kur: Option<f64>,  // Manuel kur override
}

#[derive(Debug, Serialize)]
pub struct KasaOzet {
    pub toplam_bakiye: f64,
    pub toplam_gelir: f64,
    pub toplam_gider: f64,
    pub kasa_sayisi: i32,
}

#[derive(QueryableByName)]
struct DoubleResult {
    #[diesel(sql_type = diesel::sql_types::Double)]
    pub total: f64,
}

#[derive(QueryableByName)]
struct IntegerResult {
    #[diesel(sql_type = diesel::sql_types::Integer)]
    pub total: i32,
}

#[tauri::command]
pub async fn get_kasalar(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
) -> Result<Vec<Kasa>, String> {
    use crate::db::schema::kasalar::dsl::*;
    
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;;

    let results = kasalar
        .filter(tenant_id.eq(&tenant_id_param))
        .filter(is_active.eq(true))
        .order(kasa_adi.asc())
        .load::<Kasa>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(results)
}

#[tauri::command]
pub async fn create_kasa(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    data: CreateKasaRequest,
) -> Result<Kasa, String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let new_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    diesel::sql_query(
        "INSERT INTO kasalar (id, tenant_id, kasa_adi, bakiye, para_birimi, is_active, created_at, updated_at)
         VALUES (?1, ?2, ?3, 0.0, ?4, 1, ?5, ?6)"
    )
    .bind::<diesel::sql_types::Text, _>(&new_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Text, _>(&data.kasa_adi)
    .bind::<diesel::sql_types::Text, _>(&data.para_birimi)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&now)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    let sync_id = Uuid::new_v4().to_string();
    diesel::sql_query(
        "INSERT INTO sync_changes (id, tenant_id, table_name, record_id, operation, data, created_at)
         VALUES (?1, ?2, 'kasalar', ?3, 'INSERT', '{}', ?4)"
    )
    .bind::<diesel::sql_types::Text, _>(&sync_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Text, _>(&new_id)
    .bind::<diesel::sql_types::Text, _>(&now)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    use crate::db::schema::kasalar::dsl::*;
    let result = kasalar
        .filter(id.eq(&new_id))
        .first::<Kasa>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(result)
}

// ============================================================================
// GELİR TÜRLERİ COMMANDS - DEPRECATED (artık gelir_turleri modülünde)
// ============================================================================
// REMOVED - Ayrı gelir_turleri.rs modülüne taşındı

// ============================================================================
// GİDER TÜRLERİ COMMANDS - DEPRECATED (artık gider_turleri modülünde)
// ============================================================================
// REMOVED - Ayrı gider_turleri.rs modülüne taşındı

// ============================================================================
// GELİR COMMANDS (Updated)
// ============================================================================

#[tauri::command]
pub async fn get_gelirler(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    kasa_id_filter: Option<String>,
    baslangic_tarih: Option<String>,
    bitis_tarih: Option<String>,
    skip: i64,
    limit: i64,
) -> Result<Vec<Gelir>, String> {
    use crate::db::schema::gelirler::dsl::*;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let mut query = gelirler
        .filter(tenant_id.eq(&tenant_id_param))
        .into_boxed();

    if let Some(kid) = kasa_id_filter {
        query = query.filter(kasa_id.eq(kid));
    }

    if let Some(baslangic) = baslangic_tarih {
        query = query.filter(tarih.ge(baslangic));
    }

    if let Some(bitis) = bitis_tarih {
        query = query.filter(tarih.le(bitis));
    }

    let results = query
        .order(tarih.desc())
        .offset(skip)
        .limit(limit)
        .load::<Gelir>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(results)
}

#[tauri::command]
pub async fn create_gelir(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    data: CreateGelirRequest,
) -> Result<Gelir, String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let new_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Get gelir_turu name if gelir_turu_id is provided
    let gelir_turu_name: Option<String> = if let Some(ref turu_id) = data.gelir_turu_id {
        use crate::db::schema::gelir_turleri::dsl::*;
        gelir_turleri
            .filter(id.eq(turu_id))
            .select(ad)
            .first::<String>(&mut conn)
            .ok()
    } else {
        None
    };

    conn.transaction::<_, diesel::result::Error, _>(|conn| {
        diesel::sql_query(
            "INSERT INTO gelirler (id, tenant_id, kasa_id, gelir_turu, gelir_turu_id, tarih, tutar, aciklama, makbuz_no, alt_kategori, tahakkuk_durumu, belge_no, tahsil_eden, uye_id, aidat_id, ait_oldugu_yil, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)"
        )
        .bind::<diesel::sql_types::Text, _>(&new_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .bind::<diesel::sql_types::Text, _>(&data.kasa_id)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&gelir_turu_name)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.gelir_turu_id)
        .bind::<diesel::sql_types::Text, _>(&data.tarih)
        .bind::<diesel::sql_types::Double, _>(data.tutar)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.aciklama)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.makbuz_no)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.alt_kategori)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.tahakkuk_durumu)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.belge_no)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.tahsil_eden)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.uye_id)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.aidat_id)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Integer>, _>(&data.ait_oldugu_yil)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&now)
        .execute(conn)?;

        diesel::sql_query(
            "UPDATE kasalar SET bakiye = bakiye + ?1, updated_at = ?2 WHERE id = ?3 AND tenant_id = ?4"
        )
        .bind::<diesel::sql_types::Double, _>(data.tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&data.kasa_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .execute(conn)?;

        let sync_id = Uuid::new_v4().to_string();
        diesel::sql_query(
            "INSERT INTO sync_changes (id, tenant_id, table_name, record_id, operation, data, created_at)
             VALUES (?1, ?2, 'gelirler', ?3, 'INSERT', '{}', ?4)"
        )
        .bind::<diesel::sql_types::Text, _>(&sync_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .bind::<diesel::sql_types::Text, _>(&new_id)
        .bind::<diesel::sql_types::Text, _>(&now)
        .execute(conn)?;

        Ok(())
    }).map_err(|e: diesel::result::Error| e.to_string())?;

    use crate::db::schema::gelirler::dsl::*;
    let result = gelirler
        .filter(id.eq(&new_id))
        .first::<Gelir>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(result)
}

#[tauri::command]
pub async fn get_giderler(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    kasa_id_filter: Option<String>,
    baslangic_tarih: Option<String>,
    bitis_tarih: Option<String>,
    skip: i64,
    limit: i64,
) -> Result<Vec<Gider>, String> {
    use crate::db::schema::giderler::dsl::*;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let mut query = giderler
        .filter(tenant_id.eq(&tenant_id_param))
        .into_boxed();

    if let Some(kid) = kasa_id_filter {
        query = query.filter(kasa_id.eq(kid));
    }

    if let Some(baslangic) = baslangic_tarih {
        query = query.filter(tarih.ge(baslangic));
    }

    if let Some(bitis) = bitis_tarih {
        query = query.filter(tarih.le(bitis));
    }

    let results = query
        .order(tarih.desc())
        .offset(skip)
        .limit(limit)
        .load::<Gider>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(results)
}

#[tauri::command]
pub async fn get_giderler_paginated(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    kasa_id_filter: Option<String>,
    baslangic_tarih: Option<String>,
    bitis_tarih: Option<String>,
    page: i64,
    page_size: i64,
) -> Result<PaginatedResponse<Gider>, String> {
    use crate::db::schema::giderler::dsl::*;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Build count query
    let mut count_query = giderler
        .filter(tenant_id.eq(&tenant_id_param))
        .into_boxed();

    if let Some(ref kid) = kasa_id_filter {
        count_query = count_query.filter(kasa_id.eq(kid));
    }

    if let Some(ref baslangic) = baslangic_tarih {
        count_query = count_query.filter(tarih.ge(baslangic));
    }

    if let Some(ref bitis) = bitis_tarih {
        count_query = count_query.filter(tarih.le(bitis));
    }

    let total: i64 = count_query
        .count()
        .get_result(&mut conn)
        .map_err(|e| e.to_string())?;

    // Build data query
    let mut data_query = giderler
        .filter(tenant_id.eq(&tenant_id_param))
        .into_boxed();

    if let Some(kid) = kasa_id_filter {
        data_query = data_query.filter(kasa_id.eq(kid));
    }

    if let Some(baslangic) = baslangic_tarih {
        data_query = data_query.filter(tarih.ge(baslangic));
    }

    if let Some(bitis) = bitis_tarih {
        data_query = data_query.filter(tarih.le(bitis));
    }

    let skip = page * page_size;
    let results = data_query
        .order(tarih.desc())
        .offset(skip)
        .limit(page_size)
        .load::<Gider>(&mut conn)
        .map_err(|e| e.to_string())?;

    let total_pages = (total as f64 / page_size as f64).ceil() as i64;

    Ok(PaginatedResponse {
        data: results,
        total,
        page,
        page_size,
        total_pages,
    })
}

#[tauri::command]
pub async fn create_gider(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    data: CreateGiderRequest,
) -> Result<Gider, String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let new_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Get gider_turu name if gider_turu_id is provided
    let gider_turu_name: Option<String> = if let Some(ref turu_id) = data.gider_turu_id {
        use crate::db::schema::gider_turleri::dsl::*;
        gider_turleri
            .filter(id.eq(turu_id))
            .select(ad)
            .first::<String>(&mut conn)
            .ok()
    } else {
        None
    };

    conn.transaction::<_, diesel::result::Error, _>(|conn| {
        diesel::sql_query(
            "INSERT INTO giderler (id, tenant_id, kasa_id, gider_turu, gider_turu_id, tarih, tutar, aciklama, fatura_no, alt_kategori, islem_no, odeyen, notlar, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)"
        )
        .bind::<diesel::sql_types::Text, _>(&new_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .bind::<diesel::sql_types::Text, _>(&data.kasa_id)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&gider_turu_name)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.gider_turu_id)
        .bind::<diesel::sql_types::Text, _>(&data.tarih)
        .bind::<diesel::sql_types::Double, _>(data.tutar)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.aciklama)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.fatura_no)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.alt_kategori)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.islem_no)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.odeyen)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.notlar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&now)
        .execute(conn)?;

        diesel::sql_query(
            "UPDATE kasalar SET bakiye = bakiye - ?1, updated_at = ?2 WHERE id = ?3 AND tenant_id = ?4"
        )
        .bind::<diesel::sql_types::Double, _>(data.tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&data.kasa_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .execute(conn)?;

        let sync_id = Uuid::new_v4().to_string();
        diesel::sql_query(
            "INSERT INTO sync_changes (id, tenant_id, table_name, record_id, operation, data, created_at)
             VALUES (?1, ?2, 'giderler', ?3, 'INSERT', '{}', ?4)"
        )
        .bind::<diesel::sql_types::Text, _>(&sync_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .bind::<diesel::sql_types::Text, _>(&new_id)
        .bind::<diesel::sql_types::Text, _>(&now)
        .execute(conn)?;

        Ok(())
    }).map_err(|e: diesel::result::Error| e.to_string())?;

    use crate::db::schema::giderler::dsl::*;
    let result = giderler
        .filter(id.eq(&new_id))
        .first::<Gider>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(result)
}

#[tauri::command]
pub async fn virman_yap(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    virman: VirmanRequest,
) -> Result<String, String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Aynı kasaya virman kontrolü
    if virman.kaynak_kasa_id == virman.hedef_kasa_id {
        return Err("Kaynak ve hedef kasa aynı olamaz!".to_string());
    }

    // Tutar kontrolü
    if virman.tutar <= 0.0 {
        return Err("Virman tutarı 0'dan büyük olmalıdır!".to_string());
    }

    // Kasaların para birimlerini ve bakiyelerini al
    #[derive(QueryableByName)]
    struct KasaBilgi {
        #[diesel(sql_type = diesel::sql_types::Text)]
        para_birimi: String,
        #[diesel(sql_type = diesel::sql_types::Double)]
        fiziksel_bakiye: f64,
    }
    
    let kaynak_kasa = diesel::sql_query(
        "SELECT para_birimi, COALESCE(fiziksel_bakiye, 0.0) as fiziksel_bakiye 
         FROM kasalar WHERE id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&virman.kaynak_kasa_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<KasaBilgi>(&mut conn)
    .map_err(|_| "Kaynak kasa bulunamadı!")?;
    
    let hedef_kasa = diesel::sql_query(
        "SELECT para_birimi, COALESCE(fiziksel_bakiye, 0.0) as fiziksel_bakiye 
         FROM kasalar WHERE id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&virman.hedef_kasa_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<KasaBilgi>(&mut conn)
    .map_err(|_| "Hedef kasa bulunamadı!")?;
    
    // KRİTİK: Kaynak kasada yeterli bakiye kontrolü
    if kaynak_kasa.fiziksel_bakiye < virman.tutar {
        return Err(format!(
            "Kaynak kasada yeterli bakiye yok! Mevcut: {:.2}, İstenen: {:.2}",
            kaynak_kasa.fiziksel_bakiye, virman.tutar
        ));
    }
    
    let kaynak_para_birimi = kaynak_kasa.para_birimi;
    let hedef_para_birimi = hedef_kasa.para_birimi;

    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    
    // Kur hesapla
    let (uygulanan_kur, hedef_tutar) = if kaynak_para_birimi == hedef_para_birimi {
        // Aynı para birimi - kur 1
        (1.0, virman.tutar)
    } else if let Some(manuel_kur) = virman.uygulanan_kur {
        // Manuel kur verilmiş
        (manuel_kur, virman.tutar * manuel_kur)
    } else {
        // Sistemden kur al
        let kur = get_kur_degeri(&mut conn, &tenant_id_param, &kaynak_para_birimi, &hedef_para_birimi, &today)?;
        (kur, virman.tutar * kur)
    };
    
    // Transaction başlat
    conn.transaction::<_, diesel::result::Error, _>(|conn| {
        let virman_id = Uuid::new_v4().to_string();
        
        // 1. Virmanlar tablosuna kaydet (kur bilgileri ile)
        diesel::sql_query(
            "INSERT INTO virmanlar (id, tenant_id, kaynak_kasa_id, hedef_kasa_id, tarih, tutar, aciklama, kaynak_para_birimi, hedef_para_birimi, kaynak_tutar, hedef_tutar, uygulanan_kur, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)"
        )
        .bind::<diesel::sql_types::Text, _>(&virman_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .bind::<diesel::sql_types::Text, _>(&virman.kaynak_kasa_id)
        .bind::<diesel::sql_types::Text, _>(&virman.hedef_kasa_id)
        .bind::<diesel::sql_types::Text, _>(&today)
        .bind::<diesel::sql_types::Double, _>(virman.tutar)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&virman.aciklama)
        .bind::<diesel::sql_types::Text, _>(&kaynak_para_birimi)
        .bind::<diesel::sql_types::Text, _>(&hedef_para_birimi)
        .bind::<diesel::sql_types::Double, _>(virman.tutar)
        .bind::<diesel::sql_types::Double, _>(hedef_tutar)
        .bind::<diesel::sql_types::Double, _>(uygulanan_kur)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&now)
        .execute(conn)?;

        // 2. Kaynak kasadan çıkar (kaynak tutarı ile)
        diesel::sql_query(
            "UPDATE kasalar SET virman_cikis = virman_cikis + ?1, updated_at = ?2 WHERE id = ?3 AND tenant_id = ?4"
        )
        .bind::<diesel::sql_types::Double, _>(virman.tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&virman.kaynak_kasa_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .execute(conn)?;

        // 3. Hedef kasaya ekle (hedef tutarı ile - kur uygulanmış)
        diesel::sql_query(
            "UPDATE kasalar SET virman_giris = virman_giris + ?1, updated_at = ?2 WHERE id = ?3 AND tenant_id = ?4"
        )
        .bind::<diesel::sql_types::Double, _>(hedef_tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&virman.hedef_kasa_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .execute(conn)?;

        // 4. Her iki kasanın bakiyesini yeniden hesapla
        update_kasa_bakiye(conn, &virman.kaynak_kasa_id)?;
        update_kasa_bakiye(conn, &virman.hedef_kasa_id)?;

        Ok(virman_id)
    }).map_err(|e| e.to_string())
}

// Helper: Kur değerini hesapla
fn get_kur_degeri(
    conn: &mut SqliteConnection,
    tenant_id: &str,
    kaynak_para_birimi: &str,
    hedef_para_birimi: &str,
    tarih: &str,
) -> Result<f64, String> {
    // Aynı para birimi
    if kaynak_para_birimi == hedef_para_birimi {
        return Ok(1.0);
    }

    #[derive(QueryableByName)]
    struct KurDegeri {
        #[diesel(sql_type = diesel::sql_types::Double)]
        kur_degeri: f64,
    }

    // Direkt kur var mı?
    let direkt_kur = diesel::sql_query(
        "SELECT kur_degeri FROM kurlar 
         WHERE tenant_id = ?1 
           AND para_birimi = ?2 
           AND hedef_para_birimi = ?3
           AND gecerlilik_baslangic <= ?4
           AND is_active = 1
         ORDER BY gecerlilik_baslangic DESC
         LIMIT 1"
    )
    .bind::<diesel::sql_types::Text, _>(tenant_id)
    .bind::<diesel::sql_types::Text, _>(kaynak_para_birimi)
    .bind::<diesel::sql_types::Text, _>(hedef_para_birimi)
    .bind::<diesel::sql_types::Text, _>(tarih)
    .get_result::<KurDegeri>(conn);

    if let Ok(kur) = direkt_kur {
        return Ok(kur.kur_degeri);
    }

    // Ters kur var mı?
    let ters_kur = diesel::sql_query(
        "SELECT kur_degeri FROM kurlar 
         WHERE tenant_id = ?1 
           AND para_birimi = ?2 
           AND hedef_para_birimi = ?3
           AND gecerlilik_baslangic <= ?4
           AND is_active = 1
         ORDER BY gecerlilik_baslangic DESC
         LIMIT 1"
    )
    .bind::<diesel::sql_types::Text, _>(tenant_id)
    .bind::<diesel::sql_types::Text, _>(hedef_para_birimi)
    .bind::<diesel::sql_types::Text, _>(kaynak_para_birimi)
    .bind::<diesel::sql_types::Text, _>(tarih)
    .get_result::<KurDegeri>(conn);

    if let Ok(kur) = ters_kur {
        return Ok(1.0 / kur.kur_degeri);
    }

    // Çapraz kur: Kaynak -> TRY -> Hedef
    if kaynak_para_birimi != "TRY" && hedef_para_birimi != "TRY" {
        let kaynak_try = diesel::sql_query(
            "SELECT kur_degeri FROM kurlar 
             WHERE tenant_id = ?1 
               AND para_birimi = ?2 
               AND hedef_para_birimi = 'TRY'
               AND gecerlilik_baslangic <= ?3
               AND is_active = 1
             ORDER BY gecerlilik_baslangic DESC
             LIMIT 1"
        )
        .bind::<diesel::sql_types::Text, _>(tenant_id)
        .bind::<diesel::sql_types::Text, _>(kaynak_para_birimi)
        .bind::<diesel::sql_types::Text, _>(tarih)
        .get_result::<KurDegeri>(conn);

        let hedef_try = diesel::sql_query(
            "SELECT kur_degeri FROM kurlar 
             WHERE tenant_id = ?1 
               AND para_birimi = ?2 
               AND hedef_para_birimi = 'TRY'
               AND gecerlilik_baslangic <= ?3
               AND is_active = 1
             ORDER BY gecerlilik_baslangic DESC
             LIMIT 1"
        )
        .bind::<diesel::sql_types::Text, _>(tenant_id)
        .bind::<diesel::sql_types::Text, _>(hedef_para_birimi)
        .bind::<diesel::sql_types::Text, _>(tarih)
        .get_result::<KurDegeri>(conn);

        if let (Ok(k1), Ok(k2)) = (kaynak_try, hedef_try) {
            return Ok(k1.kur_degeri / k2.kur_degeri);
        }
    }

    Err(format!(
        "Kur bulunamadı: {} -> {}. Lütfen önce kur tanımlayın.",
        kaynak_para_birimi, hedef_para_birimi
    ))
}

// Helper: Kasa bakiyesini yeniden hesapla
fn update_kasa_bakiye(
    conn: &mut SqliteConnection,
    kasa_id: &str,
) -> Result<(), diesel::result::Error> {
    #[derive(QueryableByName)]
    struct KasaBalanceData {
        #[diesel(sql_type = diesel::sql_types::Double)]
        devir: f64,
        #[diesel(sql_type = diesel::sql_types::Double)]
        gelir: f64,
        #[diesel(sql_type = diesel::sql_types::Double)]
        gider: f64,
        #[diesel(sql_type = diesel::sql_types::Double)]
        virman_in: f64,
        #[diesel(sql_type = diesel::sql_types::Double)]
        virman_out: f64,
        #[diesel(sql_type = diesel::sql_types::Double)]
        tahakkuk: f64,
    }

    // Kasa bilgilerini al
    let kasa_data = diesel::sql_query(
        "SELECT 
            COALESCE(devir_bakiye, 0.0) as devir,
            COALESCE(toplam_gelir, 0.0) as gelir,
            COALESCE(toplam_gider, 0.0) as gider,
            COALESCE(virman_giris, 0.0) as virman_in,
            COALESCE(virman_cikis, 0.0) as virman_out,
            COALESCE(tahakkuk_tutari, 0.0) as tahakkuk
         FROM kasalar WHERE id = ?1"
    )
    .bind::<diesel::sql_types::Text, _>(kasa_id)
    .get_result::<KasaBalanceData>(conn)?;

    // Fiziksel bakiye = devir + gelir - gider + virman_giris - virman_cikis
    let fiziksel_bakiye = kasa_data.devir + kasa_data.gelir - kasa_data.gider 
                          + kasa_data.virman_in - kasa_data.virman_out;
    
    // Serbest bakiye = fiziksel - tahakkuk
    let serbest_bakiye = fiziksel_bakiye - kasa_data.tahakkuk;
    
    // Bakiye ve hesaplanmış alanları güncelle
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    diesel::sql_query(
        "UPDATE kasalar 
         SET fiziksel_bakiye = ?1, 
             serbest_bakiye = ?2, 
             bakiye = ?3,
             updated_at = ?4
         WHERE id = ?5"
    )
    .bind::<diesel::sql_types::Double, _>(fiziksel_bakiye)
    .bind::<diesel::sql_types::Double, _>(serbest_bakiye)
    .bind::<diesel::sql_types::Double, _>(fiziksel_bakiye) // bakiye = fiziksel_bakiye
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(kasa_id)
    .execute(conn)?;

    Ok(())
}

#[tauri::command]
pub async fn get_virmanlar(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    baslangic_tarih: Option<String>,
    bitis_tarih: Option<String>,
    skip: i64,
    limit: i64,
) -> Result<Vec<Virman>, String> {
    use crate::db::schema::virmanlar::dsl::*;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let mut query = virmanlar
        .filter(tenant_id.eq(&tenant_id_param))
        .into_boxed();

    if let Some(baslangic) = baslangic_tarih {
        query = query.filter(tarih.ge(baslangic));
    }

    if let Some(bitis) = bitis_tarih {
        query = query.filter(tarih.le(bitis));
    }

    let results = query
        .order(tarih.desc())
        .offset(skip)
        .limit(limit)
        .load::<Virman>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(results)
}

#[derive(Debug, Serialize)]
pub struct DevirOnizleme {
    pub kasa_id: String,
    pub kasa_adi: String,
    pub para_birimi: String,
    pub onceki_devir: f64,
    pub toplam_gelir: f64,
    pub toplam_gider: f64,
    pub virman_net: f64,
    pub fiziksel_bakiye: f64,
    pub tahakkuk_tutari: f64,
    pub serbest_bakiye: f64,
    pub yeni_devir: f64,
}

#[tauri::command]
pub async fn get_devir_onizleme(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    yil: i32,
) -> Result<Vec<DevirOnizleme>, String> {
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    #[derive(QueryableByName)]
    struct KasaDevirData {
        #[diesel(sql_type = diesel::sql_types::Text)]
        kasa_id: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        kasa_adi: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        para_birimi: String,
        #[diesel(sql_type = diesel::sql_types::Double)]
        devir_bakiye: f64,
        #[diesel(sql_type = diesel::sql_types::Double)]
        toplam_gelir: f64,
        #[diesel(sql_type = diesel::sql_types::Double)]
        toplam_gider: f64,
        #[diesel(sql_type = diesel::sql_types::Double)]
        virman_giris: f64,
        #[diesel(sql_type = diesel::sql_types::Double)]
        virman_cikis: f64,
        #[diesel(sql_type = diesel::sql_types::Double)]
        fiziksel_bakiye: f64,
        #[diesel(sql_type = diesel::sql_types::Double)]
        tahakkuk_tutari: f64,
        #[diesel(sql_type = diesel::sql_types::Double)]
        serbest_bakiye: f64,
    }

    let kasalar = diesel::sql_query(
        "SELECT 
            id as kasa_id,
            kasa_adi,
            para_birimi,
            COALESCE(devir_bakiye, 0.0) as devir_bakiye,
            COALESCE(toplam_gelir, 0.0) as toplam_gelir,
            COALESCE(toplam_gider, 0.0) as toplam_gider,
            COALESCE(virman_giris, 0.0) as virman_giris,
            COALESCE(virman_cikis, 0.0) as virman_cikis,
            COALESCE(fiziksel_bakiye, 0.0) as fiziksel_bakiye,
            COALESCE(tahakkuk_tutari, 0.0) as tahakkuk_tutari,
            COALESCE(serbest_bakiye, 0.0) as serbest_bakiye
         FROM kasalar 
         WHERE tenant_id = ?1 AND is_active = 1
         ORDER BY kasa_adi"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .load::<KasaDevirData>(&mut conn)
    .map_err(|e| e.to_string())?;

    let mut onizleme_list = Vec::new();
    for kasa in kasalar {
        let virman_net = kasa.virman_giris - kasa.virman_cikis;
        let yeni_devir = kasa.fiziksel_bakiye; // Fiziksel bakiye yeni yıla devredilecek

        onizleme_list.push(DevirOnizleme {
            kasa_id: kasa.kasa_id,
            kasa_adi: kasa.kasa_adi,
            para_birimi: kasa.para_birimi,
            onceki_devir: kasa.devir_bakiye,
            toplam_gelir: kasa.toplam_gelir,
            toplam_gider: kasa.toplam_gider,
            virman_net,
            fiziksel_bakiye: kasa.fiziksel_bakiye,
            tahakkuk_tutari: kasa.tahakkuk_tutari,
            serbest_bakiye: kasa.serbest_bakiye,
            yeni_devir,
        });
    }

    Ok(onizleme_list)
}

#[derive(Debug, Deserialize)]
pub struct DevirUygula {
    pub yil: i32,
    pub aciklama: Option<String>,
}

#[tauri::command]
pub async fn uygula_yil_sonu_devir(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    data: DevirUygula,
) -> Result<String, String> {
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.transaction::<_, diesel::result::Error, _>(|conn| {
        // Tüm kasaları al
        use crate::db::schema::kasalar::dsl::*;
        let kasa_list = kasalar
            .filter(tenant_id.eq(&tenant_id_param))
            .filter(is_active.eq(true))
            .load::<Kasa>(conn)?;

        for kasa in kasa_list {
            // Yeni devir = mevcut fiziksel bakiye
            let yeni_devir = kasa.fiziksel_bakiye.unwrap_or(0.0);

            // Kasayı sıfırla ve yeni devir bakiyesini ayarla
            diesel::sql_query(
                "UPDATE kasalar 
                 SET devir_bakiye = ?1,
                     toplam_gelir = 0.0,
                     toplam_gider = 0.0,
                     virman_giris = 0.0,
                     virman_cikis = 0.0,
                     fiziksel_bakiye = ?2,
                     serbest_bakiye = ?3,
                     bakiye = ?4,
                     updated_at = ?5
                 WHERE id = ?6"
            )
            .bind::<diesel::sql_types::Double, _>(yeni_devir)
            .bind::<diesel::sql_types::Double, _>(yeni_devir)
            .bind::<diesel::sql_types::Double, _>(yeni_devir - kasa.tahakkuk_tutari.unwrap_or(0.0))
            .bind::<diesel::sql_types::Double, _>(yeni_devir)
            .bind::<diesel::sql_types::Text, _>(&now)
            .bind::<diesel::sql_types::Text, _>(&kasa.id)
            .execute(conn)?;
        }

        Ok(format!("{} yılı devir işlemi tamamlandı", data.yil))
    }).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_kasa_ozet(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
) -> Result<KasaOzet, String> {
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let toplam_bakiye: f64 = diesel::sql_query(
        "SELECT COALESCE(SUM(bakiye), 0.0) as total FROM kasalar WHERE tenant_id = ?1 AND is_active = 1"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<DoubleResult>(&mut conn)
    .map(|r| r.total)
    .unwrap_or(0.0);

    let toplam_gelir: f64 = diesel::sql_query(
        "SELECT COALESCE(SUM(tutar), 0.0) as total FROM gelirler WHERE tenant_id = ?1"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<DoubleResult>(&mut conn)
    .map(|r| r.total)
    .unwrap_or(0.0);

    let toplam_gider: f64 = diesel::sql_query(
        "SELECT COALESCE(SUM(tutar), 0.0) as total FROM giderler WHERE tenant_id = ?1"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<DoubleResult>(&mut conn)
    .map(|r| r.total)
    .unwrap_or(0.0);

    let kasa_sayisi: i32 = diesel::sql_query(
        "SELECT COUNT(*) as total FROM kasalar WHERE tenant_id = ?1 AND is_active = 1"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<IntegerResult>(&mut conn)
    .map(|r| r.total)
    .unwrap_or(0);

    Ok(KasaOzet {
        toplam_bakiye,
        toplam_gelir,
        toplam_gider,
        kasa_sayisi,
    })
}

// ============================================================================
// UPDATE FUNCTIONS
// ============================================================================

#[tauri::command]
pub async fn update_kasa(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    id: String,
    request: UpdateKasaRequest,
) -> Result<Kasa, String> {
    use crate::db::schema::kasalar::dsl::*;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Mevcut kaydı al
    use crate::db::schema::kasalar::dsl as kasa_dsl;
    let current = kasa_dsl::kasalar
        .filter(kasa_dsl::id.eq(&id))
        .filter(kasa_dsl::tenant_id.eq(&tenant_id_param))
        .first::<Kasa>(&mut conn)
        .map_err(|e| e.to_string())?;

    diesel::update(kasalar.find(&id))
        .set((
            kasa_adi.eq(request.kasa_adi.unwrap_or(current.kasa_adi)),
            para_birimi.eq(request.para_birimi.unwrap_or(current.para_birimi)),
            updated_at.eq(&now),
        ))
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;

    let updated = kasalar
        .find(&id)
        .first::<Kasa>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(updated)
}

#[tauri::command]
pub async fn update_gelir(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    id: String,
    request: UpdateGelirRequest,
) -> Result<Gelir, String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    use crate::db::schema::gelirler::dsl::*;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Mevcut kaydı al
    use crate::db::schema::gelirler::dsl as gelir_dsl;
    let current = gelir_dsl::gelirler
        .filter(gelir_dsl::id.eq(&id))
        .filter(gelir_dsl::tenant_id.eq(&tenant_id_param))
        .first::<Gelir>(&mut conn)
        .map_err(|e| e.to_string())?;

    let eski_kasa_id = current.kasa_id.clone();
    let eski_tutar = current.tutar;
    let yeni_kasa_id = request.kasa_id.clone().unwrap_or(eski_kasa_id.clone());
    let yeni_tutar = request.tutar.unwrap_or(eski_tutar);

    conn.transaction::<_, diesel::result::Error, _>(|conn| {
        // Gelir kaydını güncelle
        diesel::update(gelirler.find(&id))
            .set((
                kasa_id.eq(&yeni_kasa_id),
                gelir_turu_id.eq(request.gelir_turu_id.or(current.gelir_turu_id)),
                tarih.eq(request.tarih.unwrap_or(current.tarih)),
                tutar.eq(yeni_tutar),
                aciklama.eq(request.aciklama.or(current.aciklama)),
                makbuz_no.eq(request.makbuz_no.or(current.makbuz_no)),
                alt_kategori.eq(request.alt_kategori.or(current.alt_kategori)),
                tahakkuk_durumu.eq(request.tahakkuk_durumu.or(current.tahakkuk_durumu)),
                belge_no.eq(request.belge_no.or(current.belge_no)),
                tahsil_eden.eq(request.tahsil_eden.or(current.tahsil_eden)),
                updated_at.eq(&now),
            ))
            .execute(conn)?;

        // Eski kasanın bakiyesini güncelle (geliri düş)
        use crate::db::schema::kasalar;
        diesel::sql_query(
            "UPDATE kasalar 
             SET toplam_gelir = COALESCE(toplam_gelir, 0.0) - ?1,
                 fiziksel_bakiye = COALESCE(fiziksel_bakiye, 0.0) - ?2,
                 bakiye = bakiye - ?3,
                 updated_at = ?4
             WHERE id = ?5"
        )
        .bind::<diesel::sql_types::Double, _>(eski_tutar)
        .bind::<diesel::sql_types::Double, _>(eski_tutar)
        .bind::<diesel::sql_types::Double, _>(eski_tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&eski_kasa_id)
        .execute(conn)?;

        // Yeni kasanın bakiyesini güncelle (geliri ekle)
        diesel::sql_query(
            "UPDATE kasalar 
             SET toplam_gelir = COALESCE(toplam_gelir, 0.0) + ?1,
                 fiziksel_bakiye = COALESCE(fiziksel_bakiye, 0.0) + ?2,
                 bakiye = bakiye + ?3,
                 updated_at = ?4
             WHERE id = ?5"
        )
        .bind::<diesel::sql_types::Double, _>(yeni_tutar)
        .bind::<diesel::sql_types::Double, _>(yeni_tutar)
        .bind::<diesel::sql_types::Double, _>(yeni_tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&yeni_kasa_id)
        .execute(conn)?;

        Ok(())
    }).map_err(|e: diesel::result::Error| e.to_string())?;

    let updated = gelirler
        .find(&id)
        .first::<Gelir>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(updated)
}

#[tauri::command]
pub async fn update_gider(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    id: String,
    request: UpdateGiderRequest,
) -> Result<Gider, String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    use crate::db::schema::giderler::dsl::*;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Mevcut kaydı al
    use crate::db::schema::giderler::dsl as gider_dsl;
    let current = gider_dsl::giderler
        .filter(gider_dsl::id.eq(&id))
        .filter(gider_dsl::tenant_id.eq(&tenant_id_param))
        .first::<Gider>(&mut conn)
        .map_err(|e| e.to_string())?;

    let eski_kasa_id = current.kasa_id.clone();
    let eski_tutar = current.tutar;
    let yeni_kasa_id = request.kasa_id.clone().unwrap_or(eski_kasa_id.clone());
    let yeni_tutar = request.tutar.unwrap_or(eski_tutar);

    conn.transaction::<_, diesel::result::Error, _>(|conn| {
        // Gider kaydını güncelle
        diesel::update(giderler.find(&id))
            .set((
                kasa_id.eq(&yeni_kasa_id),
                gider_turu_id.eq(request.gider_turu_id.or(current.gider_turu_id)),
                tarih.eq(request.tarih.unwrap_or(current.tarih)),
                tutar.eq(yeni_tutar),
                aciklama.eq(request.aciklama.or(current.aciklama)),
                fatura_no.eq(request.fatura_no.or(current.fatura_no)),
                alt_kategori.eq(request.alt_kategori.or(current.alt_kategori)),
                islem_no.eq(request.islem_no.or(current.islem_no)),
                odeyen.eq(request.odeyen.or(current.odeyen)),
                notlar.eq(request.notlar.or(current.notlar)),
                updated_at.eq(&now),
            ))
            .execute(conn)?;

        // Eski kasanın bakiyesini güncelle (gideri geri ekle)
        use crate::db::schema::kasalar;
        diesel::sql_query(
            "UPDATE kasalar 
             SET toplam_gider = COALESCE(toplam_gider, 0.0) - ?1,
                 fiziksel_bakiye = COALESCE(fiziksel_bakiye, 0.0) + ?2,
                 bakiye = bakiye + ?3,
                 updated_at = ?4
             WHERE id = ?5"
        )
        .bind::<diesel::sql_types::Double, _>(eski_tutar)
        .bind::<diesel::sql_types::Double, _>(eski_tutar)
        .bind::<diesel::sql_types::Double, _>(eski_tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&eski_kasa_id)
        .execute(conn)?;

        // Yeni kasanın bakiyesini güncelle (gideri çıkar)
        diesel::sql_query(
            "UPDATE kasalar 
             SET toplam_gider = COALESCE(toplam_gider, 0.0) + ?1,
                 fiziksel_bakiye = COALESCE(fiziksel_bakiye, 0.0) - ?2,
                 bakiye = bakiye - ?3,
                 updated_at = ?4
             WHERE id = ?5"
        )
        .bind::<diesel::sql_types::Double, _>(yeni_tutar)
        .bind::<diesel::sql_types::Double, _>(yeni_tutar)
        .bind::<diesel::sql_types::Double, _>(yeni_tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&yeni_kasa_id)
        .execute(conn)?;

        Ok(())
    }).map_err(|e: diesel::result::Error| e.to_string())?;

    let updated = giderler
        .find(&id)
        .first::<Gider>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(updated)
}

// ============================================================================
// DELETE FUNCTIONS
// ============================================================================

#[tauri::command]
pub async fn delete_kasa(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    id: String,
) -> Result<(), String> {
    use crate::db::schema::kasalar::dsl::*;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Soft delete
    diesel::update(kasalar.find(&id))
        .filter(tenant_id.eq(&tenant_id_param))
        .set((
            is_active.eq(false),
            updated_at.eq(&now),
        ))
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_gelir(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    id: String,
) -> Result<(), String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    use crate::db::schema::gelirler::dsl::*;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Önce kaydı al
    use crate::db::schema::gelirler::dsl as gelir_dsl;
    let gelir = gelir_dsl::gelirler
        .filter(gelir_dsl::id.eq(&id))
        .filter(gelir_dsl::tenant_id.eq(&tenant_id_param))
        .first::<Gelir>(&mut conn)
        .map_err(|e| e.to_string())?;

    conn.transaction::<_, diesel::result::Error, _>(|conn| {
        // Gelir kaydını sil
        diesel::delete(gelirler.find(&id))
            .execute(conn)?;

        // Kasa bakiyesini güncelle (geliri düş)
        use crate::db::schema::kasalar;
        diesel::sql_query(
            "UPDATE kasalar 
             SET toplam_gelir = COALESCE(toplam_gelir, 0.0) - ?1,
                 fiziksel_bakiye = COALESCE(fiziksel_bakiye, 0.0) - ?2,
                 bakiye = bakiye - ?3,
                 updated_at = ?4
             WHERE id = ?5"
        )
        .bind::<diesel::sql_types::Double, _>(gelir.tutar)
        .bind::<diesel::sql_types::Double, _>(gelir.tutar)
        .bind::<diesel::sql_types::Double, _>(gelir.tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&gelir.kasa_id)
        .execute(conn)?;

        Ok(())
    }).map_err(|e: diesel::result::Error| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_gider(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    id: String,
) -> Result<(), String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    use crate::db::schema::giderler::dsl::*;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Önce kaydı al
    use crate::db::schema::giderler::dsl as gider_dsl;
    let gider = gider_dsl::giderler
        .filter(gider_dsl::id.eq(&id))
        .filter(gider_dsl::tenant_id.eq(&tenant_id_param))
        .first::<Gider>(&mut conn)
        .map_err(|e| e.to_string())?;

    conn.transaction::<_, diesel::result::Error, _>(|conn| {
        // Gider kaydını sil
        diesel::delete(giderler.find(&id))
            .execute(conn)?;

        // Kasa bakiyesini güncelle (gideri geri ekle)
        use crate::db::schema::kasalar;
        diesel::sql_query(
            "UPDATE kasalar 
             SET toplam_gider = COALESCE(toplam_gider, 0.0) - ?1,
                 fiziksel_bakiye = COALESCE(fiziksel_bakiye, 0.0) + ?2,
                 bakiye = bakiye + ?3,
                 updated_at = ?4
             WHERE id = ?5"
        )
        .bind::<diesel::sql_types::Double, _>(gider.tutar)
        .bind::<diesel::sql_types::Double, _>(gider.tutar)
        .bind::<diesel::sql_types::Double, _>(gider.tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&gider.kasa_id)
        .execute(conn)?;

        Ok(())
    }).map_err(|e: diesel::result::Error| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_virman(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    id: String,
) -> Result<(), String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    use crate::db::schema::virmanlar::dsl::*;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Önce kaydı al
    use crate::db::schema::virmanlar::dsl as virman_dsl;
    let virman = virman_dsl::virmanlar
        .filter(virman_dsl::id.eq(&id))
        .filter(virman_dsl::tenant_id.eq(&tenant_id_param))
        .first::<Virman>(&mut conn)
        .map_err(|e| e.to_string())?;

    conn.transaction::<_, diesel::result::Error, _>(|conn| {
        // Virman kaydını sil
        diesel::delete(virmanlar.find(&id))
            .execute(conn)?;

        // Kaynak kasaya parayı geri ekle (virman_cikis azalt, bakiye artar)
        use crate::db::schema::kasalar;
        diesel::sql_query(
            "UPDATE kasalar 
             SET virman_cikis = COALESCE(virman_cikis, 0.0) - ?1,
                 fiziksel_bakiye = COALESCE(fiziksel_bakiye, 0.0) + ?2,
                 bakiye = bakiye + ?3,
                 updated_at = ?4
             WHERE id = ?5"
        )
        .bind::<diesel::sql_types::Double, _>(virman.tutar)
        .bind::<diesel::sql_types::Double, _>(virman.tutar)
        .bind::<diesel::sql_types::Double, _>(virman.tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&virman.kaynak_kasa_id)
        .execute(conn)?;

        // Hedef kasadan parayı çıkar (virman_giris azalt, bakiye azalır)
        diesel::sql_query(
            "UPDATE kasalar 
             SET virman_giris = COALESCE(virman_giris, 0.0) - ?1,
                 fiziksel_bakiye = COALESCE(fiziksel_bakiye, 0.0) - ?2,
                 bakiye = bakiye - ?3,
                 updated_at = ?4
             WHERE id = ?5"
        )
        .bind::<diesel::sql_types::Double, _>(virman.tutar)
        .bind::<diesel::sql_types::Double, _>(virman.tutar)
        .bind::<diesel::sql_types::Double, _>(virman.tutar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&virman.hedef_kasa_id)
        .execute(conn)?;

        Ok(())
    }).map_err(|e: diesel::result::Error| e.to_string())?;

    Ok(())
}

/// Kasa bakiyesini gelir/gider/virman toplamlarından yeniden hesapla
#[tauri::command]
pub async fn recalculate_kasa_bakiye(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    kasa_id: String,
) -> Result<String, String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    #[derive(QueryableByName)]
    struct SumRow {
        #[diesel(sql_type = diesel::sql_types::Double)]
        total: f64,
    }

    // 1. Toplam gelir
    let toplam_gelir = diesel::sql_query(
        "SELECT COALESCE(SUM(tutar), 0.0) as total FROM gelirler WHERE kasa_id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&kasa_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<SumRow>(&mut conn)
    .map(|r| r.total)
    .unwrap_or(0.0);

    // 2. Toplam gider
    let toplam_gider = diesel::sql_query(
        "SELECT COALESCE(SUM(tutar), 0.0) as total FROM giderler WHERE kasa_id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&kasa_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<SumRow>(&mut conn)
    .map(|r| r.total)
    .unwrap_or(0.0);

    // 3. Virman giriş (bu kasaya transfer edilen)
    let virman_giris = diesel::sql_query(
        "SELECT COALESCE(SUM(tutar), 0.0) as total FROM virmanlar WHERE hedef_kasa_id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&kasa_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<SumRow>(&mut conn)
    .map(|r| r.total)
    .unwrap_or(0.0);

    // 4. Virman çıkış (bu kasadan başka kasaya transfer)
    let virman_cikis = diesel::sql_query(
        "SELECT COALESCE(SUM(tutar), 0.0) as total FROM virmanlar WHERE kaynak_kasa_id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&kasa_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<SumRow>(&mut conn)
    .map(|r| r.total)
    .unwrap_or(0.0);

    // 5. Devir bakiye al
    #[derive(QueryableByName)]
    struct DevirRow {
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
        devir_bakiye: Option<f64>,
    }

    let devir = diesel::sql_query(
        "SELECT devir_bakiye FROM kasalar WHERE id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&kasa_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<DevirRow>(&mut conn)
    .map(|r| r.devir_bakiye.unwrap_or(0.0))
    .unwrap_or(0.0);

    // 6. Yeni bakiye hesapla
    let yeni_bakiye = devir + toplam_gelir - toplam_gider + virman_giris - virman_cikis;
    let fiziksel_bakiye = yeni_bakiye;
    let serbest_bakiye = yeni_bakiye;

    // 7. Kasa güncelle
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    diesel::sql_query(
        "UPDATE kasalar
         SET bakiye = ?1,
             toplam_gelir = ?2,
             toplam_gider = ?3,
             virman_giris = ?4,
             virman_cikis = ?5,
             fiziksel_bakiye = ?6,
             serbest_bakiye = ?7,
             updated_at = ?8
         WHERE id = ?9 AND tenant_id = ?10"
    )
    .bind::<diesel::sql_types::Double, _>(yeni_bakiye)
    .bind::<diesel::sql_types::Double, _>(toplam_gelir)
    .bind::<diesel::sql_types::Double, _>(toplam_gider)
    .bind::<diesel::sql_types::Double, _>(virman_giris)
    .bind::<diesel::sql_types::Double, _>(virman_cikis)
    .bind::<diesel::sql_types::Double, _>(fiziksel_bakiye)
    .bind::<diesel::sql_types::Double, _>(serbest_bakiye)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&kasa_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(format!(
        "Kasa bakiyesi yeniden hesaplandı: {} TL (Gelir: {}, Gider: {}, Virman Giriş: {}, Virman Çıkış: {})",
        yeni_bakiye, toplam_gelir, toplam_gider, virman_giris, virman_cikis
    ))
}
