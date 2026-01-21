use diesel::prelude::*;
use diesel::r2d2::{ConnectionManager, Pool};
use diesel::sqlite::SqliteConnection;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use crate::db::models::AidatTakip;

type DbPool = Pool<ConnectionManager<SqliteConnection>>;

// Tutar sorgusundan dönecek row için struct
#[derive(Debug, QueryableByName)]
pub struct TutarRow {
    #[diesel(sql_type = diesel::sql_types::Double)]
    pub tutar: f64,
}

#[derive(Debug, Deserialize)]
pub struct CreateAidatRequest {
    pub uye_id: String,
    pub yil: i32,
    pub ay: i32,
    pub tutar: f64,
    pub notlar: Option<String>,
    pub kasa_id: Option<String>,  // Aidat oluştururken kasa belirle
}

#[derive(Debug, Deserialize)]
pub struct OdemeRequest {
    pub tutar: f64,
    pub odeme_tarihi: String,
    pub tahsilat_turu: Option<String>,
    pub banka_sube: Option<String>,
    pub dekont_no: Option<String>,
    pub aciklama: Option<String>,
    pub kasa_id: Option<String>,  // Ödeme kasası
}

#[derive(Debug, Serialize)]
pub struct AidatOzet {
    pub toplam_tutar: f64,
    pub toplam_odenen: f64,
    pub toplam_kalan: f64,
    pub odenen_adet: i32,
    pub geciken_adet: i32,
}

// Aidat + Üye bilgisi birlikte
#[derive(Debug, Serialize, QueryableByName)]
pub struct AidatWithUye {
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub id: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub tenant_id: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub uye_id: String,
    #[diesel(sql_type = diesel::sql_types::Integer)]
    pub yil: i32,
    #[diesel(sql_type = diesel::sql_types::Integer)]
    pub ay: i32,
    #[diesel(sql_type = diesel::sql_types::Double)]
    pub tutar: f64,
    #[diesel(sql_type = diesel::sql_types::Double)]
    pub odenen: f64,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
    pub kalan: Option<f64>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub odeme_tarihi: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub durum: String,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Integer>)]
    pub gecikme_gun: Option<i32>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
    pub gecikme_faiz: Option<f64>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub notlar: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub kasa_id: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub created_at: String,
    // Üye bilgileri
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub uye_no: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub uye_ad_soyad: String,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub uye_telefon: Option<String>,
}

#[derive(QueryableByName)]
struct AidatOzetQuery {
    #[diesel(sql_type = diesel::sql_types::Double)]
    pub toplam_tutar: f64,
    #[diesel(sql_type = diesel::sql_types::Double)]
    pub toplam_odenen: f64,
    #[diesel(sql_type = diesel::sql_types::Integer)]
    pub odenen_adet: i32,
    #[diesel(sql_type = diesel::sql_types::Integer)]
    pub geciken_adet: i32,
}

#[tauri::command]
pub async fn get_aidat_takip(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    filter_uye_id: Option<String>,
    filter_yil: Option<i32>,
    filter_ay: Option<i32>,
    filter_durum: Option<String>,
    skip: i64,
    limit: i64,
) -> Result<Vec<AidatTakip>, String> {
    use crate::db::schema::aidat_takip::dsl::*;
    
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let mut query = aidat_takip
        .filter(tenant_id.eq(&tenant_id_param))
        .into_boxed();

    if let Some(uid) = filter_uye_id {
        query = query.filter(uye_id.eq(uid));
    }

    if let Some(y) = filter_yil {
        query = query.filter(yil.eq(y));
    }

    if let Some(a) = filter_ay {
        query = query.filter(ay.eq(a));
    }

    if let Some(d) = filter_durum {
        query = query.filter(durum.eq(d));
    }

    let results = query
        .order(yil.desc())
        .then_order_by(ay.desc())
        .offset(skip)
        .limit(limit)
        .load::<AidatTakip>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(results)
}

/// Aidat listesi üye bilgileriyle birlikte
#[tauri::command]
pub async fn get_aidat_takip_with_uye(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    filter_uye_id: Option<String>,
    filter_yil: Option<i32>,
    filter_ay: Option<i32>,
    filter_durum: Option<String>,
    skip: i64,
    limit: i64,
) -> Result<Vec<AidatWithUye>, String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Build dynamic WHERE clause with inline values for optional params
    let mut where_clauses = vec!["a.tenant_id = ?1".to_string()];
    
    if let Some(ref uid) = filter_uye_id {
        where_clauses.push(format!("a.uye_id = '{}'", uid.replace("'", "''")));
    }
    if let Some(y) = filter_yil {
        where_clauses.push(format!("a.yil = {}", y));
    }
    if let Some(a) = filter_ay {
        where_clauses.push(format!("a.ay = {}", a));
    }
    if let Some(ref d) = filter_durum {
        where_clauses.push(format!("a.durum = '{}'", d.replace("'", "''")));
    }

    let where_sql = where_clauses.join(" AND ");
    
    let query = format!(
        "SELECT 
            a.id, a.tenant_id, a.uye_id, a.yil, a.ay, a.tutar, a.odenen, a.kalan,
            a.odeme_tarihi, a.durum, a.gecikme_gun, a.gecikme_faiz, a.notlar, a.kasa_id,
            a.created_at,
            u.uye_no, COALESCE(u.ad || ' ' || u.soyad, u.ad_soyad) as uye_ad_soyad, u.telefon as uye_telefon
         FROM aidat_takip a
         LEFT JOIN uyeler u ON u.id = a.uye_id
         WHERE {}
         ORDER BY a.yil DESC, a.ay DESC
         LIMIT ?2 OFFSET ?3",
        where_sql
    );

    let results = diesel::sql_query(&query)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .bind::<diesel::sql_types::BigInt, _>(limit)
        .bind::<diesel::sql_types::BigInt, _>(skip)
        .load::<AidatWithUye>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(results)
}

#[tauri::command]
pub async fn create_aidat(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    data: CreateAidatRequest,
) -> Result<AidatTakip, String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let new_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    diesel::sql_query(
        "INSERT INTO aidat_takip (id, tenant_id, uye_id, yil, ay, tutar, odenen, gecikme_gun, gecikme_faiz, durum, notlar, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0.0, 0, 0.0, 'beklemede', ?7, ?8, ?9)"
    )
    .bind::<diesel::sql_types::Text, _>(&new_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Text, _>(&data.uye_id)
    .bind::<diesel::sql_types::Integer, _>(data.yil)
    .bind::<diesel::sql_types::Integer, _>(data.ay)
    .bind::<diesel::sql_types::Double, _>(data.tutar)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.notlar)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&now)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    let sync_id = Uuid::new_v4().to_string();
    diesel::sql_query(
        "INSERT INTO sync_changes (id, tenant_id, table_name, record_id, operation, data, created_at)
         VALUES (?1, ?2, 'aidat_takip', ?3, 'INSERT', '{}', ?4)"
    )
    .bind::<diesel::sql_types::Text, _>(&sync_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Text, _>(&new_id)
    .bind::<diesel::sql_types::Text, _>(&now)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    use crate::db::schema::aidat_takip::dsl::*;
    let result = aidat_takip
        .filter(id.eq(&new_id))
        .first::<AidatTakip>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(result)
}

#[tauri::command]
pub async fn kaydet_odeme(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    aidat_id: String,
    odeme: OdemeRequest,
) -> Result<AidatTakip, String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    
    use crate::db::schema::aidat_takip::dsl::*;
    let current = aidat_takip
        .filter(id.eq(&aidat_id))
        .filter(tenant_id.eq(&tenant_id_param))
        .first::<AidatTakip>(&mut conn)
        .map_err(|e| e.to_string())?;

    let yeni_odenen = current.odenen + odeme.tutar;
    let yeni_durum = if yeni_odenen >= current.tutar {
        "odendi"
    } else {
        "kismi_odendi"
    };

    diesel::sql_query(
        "UPDATE aidat_takip SET odenen = ?1, odeme_tarihi = ?2, durum = ?3, updated_at = ?4 WHERE id = ?5 AND tenant_id = ?6"
    )
    .bind::<diesel::sql_types::Double, _>(yeni_odenen)
    .bind::<diesel::sql_types::Text, _>(&odeme.odeme_tarihi)
    .bind::<diesel::sql_types::Text, _>(yeni_durum)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&aidat_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    let sync_id = Uuid::new_v4().to_string();
    diesel::sql_query(
        "INSERT INTO sync_changes (id, tenant_id, table_name, record_id, operation, data, created_at)
         VALUES (?1, ?2, 'aidat_takip', ?3, 'UPDATE', '{}', ?4)"
    )
    .bind::<diesel::sql_types::Text, _>(&sync_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Text, _>(&aidat_id)
    .bind::<diesel::sql_types::Text, _>(&now)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    let result = aidat_takip
        .filter(id.eq(&aidat_id))
        .first::<AidatTakip>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(result)
}

#[tauri::command]
pub async fn hesapla_gecikme(
    state: State<'_, crate::AppState>,
    _tenant_id_param: String,
    aidat_id: String,
    gun_sayisi: i32,
    faiz_orani: f64,
) -> Result<f64, String> {
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    use crate::db::schema::aidat_takip::dsl::*;
    let aidat = aidat_takip
        .filter(id.eq(&aidat_id))
        .first::<AidatTakip>(&mut conn)
        .map_err(|e| e.to_string())?;

    let kalan_tutar = aidat.tutar - aidat.odenen;
    let hesaplanan_faiz = kalan_tutar * (faiz_orani / 100.0) * (gun_sayisi as f64 / 30.0);

    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    diesel::sql_query(
        "UPDATE aidat_takip SET gecikme_gun = ?1, gecikme_faiz = ?2, updated_at = ?3 WHERE id = ?4"
    )
    .bind::<diesel::sql_types::Integer, _>(gun_sayisi)
    .bind::<diesel::sql_types::Double, _>(hesaplanan_faiz)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&aidat_id)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(hesaplanan_faiz)
}

#[tauri::command]
pub async fn get_aidat_ozet(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    yil: i32,
) -> Result<AidatOzet, String> {
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let result = diesel::sql_query(
        "SELECT 
            COALESCE(SUM(tutar), 0.0) as toplam_tutar,
            COALESCE(SUM(odenen), 0.0) as toplam_odenen,
            COUNT(CASE WHEN durum = 'odendi' THEN 1 END) as odenen_adet,
            COUNT(CASE WHEN durum = 'gecikti' THEN 1 END) as geciken_adet
         FROM aidat_takip 
         WHERE tenant_id = ?1 AND yil = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Integer, _>(yil)
    .get_result::<AidatOzetQuery>(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(AidatOzet {
        toplam_tutar: result.toplam_tutar,
        toplam_odenen: result.toplam_odenen,
        toplam_kalan: result.toplam_tutar - result.toplam_odenen,
        odenen_adet: result.odenen_adet,
        geciken_adet: result.geciken_adet,
    })
}

// ============================================================================
// TOPLU İŞLEMLER
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct TopluAidatRequest {
    pub yil: i32,
    pub varsayilan_tutar: f64,
    pub sadece_aktif_uyeler: bool,
    pub kasa_id: String,
    pub otomatik_gelir_olustur: bool,
}

#[derive(Debug, Serialize)]
pub struct TopluAidatResult {
    pub success: bool,
    pub olusturulan_adet: i32,
    pub toplam_tutar: f64,
    pub mesaj: String,
}

#[tauri::command]
pub async fn toplu_aidat_olustur(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    data: TopluAidatRequest,
) -> Result<TopluAidatResult, String> {
    use crate::db::schema::aidat_takip::dsl as aidat_dsl;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Aktif üyeleri getir
    let uyeler: Vec<crate::db::models::Uye> = if data.sadece_aktif_uyeler {
        diesel::sql_query("SELECT * FROM uyeler WHERE tenant_id = ?1 AND cikis_tarihi IS NULL")
            .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
            .load(&mut conn)
            .map_err(|e| e.to_string())?
    } else {
        diesel::sql_query("SELECT * FROM uyeler WHERE tenant_id = ?1")
            .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
            .load(&mut conn)
            .map_err(|e| e.to_string())?
    };

    let mut olusturulan = 0;
    let mut toplam = 0.0;

    for uye in uyeler {
        // Bu üyenin bu yıl için aidatı var mı kontrol et
        let mevcut = aidat_dsl::aidat_takip
            .filter(aidat_dsl::tenant_id.eq(&tenant_id_param))
            .filter(aidat_dsl::uye_id.eq(&uye.id))
            .filter(aidat_dsl::yil.eq(data.yil))
            .first::<AidatTakip>(&mut conn)
            .optional()
            .map_err(|e| e.to_string())?;

        if mevcut.is_none() {
            let aidat_id = Uuid::new_v4().to_string();
            let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
            
            // Öncelik sırası: 1. Üyenin özel aidat tutarı, 2. Üyelik tipine göre tanım, 3. Varsayılan tutar
            let uye_aidat_tutari = if let Some(ozel_tutar) = uye.ozel_aidat_tutari {
                ozel_tutar
            } else {
                // Üyelik tipine göre aidat tanımından tutar çek
                let uye_tipi = uye.uyelik_tipi.clone().unwrap_or_else(|| "Asil".to_string());
                let tanim_tutar: Option<f64> = diesel::sql_query(
                    "SELECT tutar FROM aidat_tanimlari WHERE tenant_id = ?1 AND yil = ?2 AND uye_turu = ?3 AND is_active = 1"
                )
                .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
                .bind::<diesel::sql_types::Integer, _>(data.yil)
                .bind::<diesel::sql_types::Text, _>(&uye_tipi)
                .get_result::<TutarRow>(&mut conn)
                .ok()
                .map(|r| r.tutar);
                
                tanim_tutar.unwrap_or(data.varsayilan_tutar)
            };
            
            // Transaction içinde aidat + gelir oluştur
            conn.transaction::<_, diesel::result::Error, _>(|conn| {
                // Aidat kaydı oluştur
                diesel::sql_query(
                    "INSERT INTO aidat_takip (
                        id, tenant_id, uye_id, yil, ay, tutar, odenen, kalan,
                        durum, gecikme_gun, gecikme_faiz, notlar, aktarim_durumu,
                        created_at, updated_at
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)"
                )
                .bind::<diesel::sql_types::Text, _>(&aidat_id)
                .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
                .bind::<diesel::sql_types::Text, _>(&uye.id)
                .bind::<diesel::sql_types::Integer, _>(data.yil)
                .bind::<diesel::sql_types::Integer, _>(1)
                .bind::<diesel::sql_types::Double, _>(uye_aidat_tutari)
                .bind::<diesel::sql_types::Double, _>(0.0)
                .bind::<diesel::sql_types::Double, _>(uye_aidat_tutari)
                .bind::<diesel::sql_types::Text, _>("beklemede")
                .bind::<diesel::sql_types::Integer, _>(0)
                .bind::<diesel::sql_types::Double, _>(0.0)
                .bind::<diesel::sql_types::Text, _>("Toplu oluşturuldu")
                .bind::<diesel::sql_types::Text, _>("Bekliyor")
                .bind::<diesel::sql_types::Text, _>(&now)
                .bind::<diesel::sql_types::Text, _>(&now)
                .execute(conn)?;
                
                Ok(())
            }).map_err(|e| format!("Aidat oluşturulamadı: {}", e))?;

            olusturulan += 1;
            toplam += uye_aidat_tutari;
        }
    }

    Ok(TopluAidatResult {
        success: true,
        olusturulan_adet: olusturulan,
        toplam_tutar: toplam,
        mesaj: format!("{} üye için {} yılı aidatı oluşturuldu", olusturulan, data.yil),
    })
}

// Kişi bazlı toplu aidat oluşturma (belirli bir üye için yıl aralığı)
#[tauri::command]
pub async fn toplu_aidat_kisi_bazli(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    uye_id: String,
    baslangic_yili: i32,
    bitis_yili: i32,
) -> Result<TopluAidatResult, String> {
    use crate::db::schema::aidat_takip::dsl as aidat_dsl;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Üyeyi kontrol et
    let uye: crate::db::models::Uye = diesel::sql_query("SELECT * FROM uyeler WHERE id = ?1 AND tenant_id = ?2")
        .bind::<diesel::sql_types::Text, _>(&uye_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .get_result(&mut conn)
        .map_err(|_| "Üye bulunamadı!")?;

    let mut olusturulan = 0;
    let mut toplam = 0.0;

    for yil in baslangic_yili..=bitis_yili {
        // Bu üyenin bu yıl için aidatı var mı kontrol et
        let mevcut = aidat_dsl::aidat_takip
            .filter(aidat_dsl::tenant_id.eq(&tenant_id_param))
            .filter(aidat_dsl::uye_id.eq(&uye.id))
            .filter(aidat_dsl::yil.eq(yil))
            .first::<AidatTakip>(&mut conn)
            .optional()
            .map_err(|e| e.to_string())?;

        if mevcut.is_none() {
            let aidat_id = Uuid::new_v4().to_string();
            let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
            
            // Öncelik sırası: 1. Üyenin özel aidat tutarı, 2. Üyelik tipine göre tanım, 3. Varsayılan 0
            let uye_aidat_tutari = if let Some(ozel_tutar) = uye.ozel_aidat_tutari {
                ozel_tutar
            } else {
                // Üyelik tipine göre aidat tanımından tutar çek
                let uye_tipi = uye.uyelik_tipi.clone().unwrap_or_else(|| "Asil".to_string());
                let tanim_tutar: Option<f64> = diesel::sql_query(
                    "SELECT tutar FROM aidat_tanimlari WHERE tenant_id = ?1 AND yil = ?2 AND uye_turu = ?3 AND is_active = 1"
                )
                .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
                .bind::<diesel::sql_types::Integer, _>(yil)
                .bind::<diesel::sql_types::Text, _>(&uye_tipi)
                .get_result::<TutarRow>(&mut conn)
                .ok()
                .map(|r| r.tutar);
                
                tanim_tutar.unwrap_or(0.0)
            };
            
            // Aidat kaydı oluştur
            diesel::sql_query(
                "INSERT INTO aidat_takip (
                    id, tenant_id, uye_id, yil, ay, tutar, odenen, kalan,
                    durum, gecikme_gun, gecikme_faiz, notlar, aktarim_durumu,
                    created_at, updated_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)"
            )
            .bind::<diesel::sql_types::Text, _>(&aidat_id)
            .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
            .bind::<diesel::sql_types::Text, _>(&uye.id)
            .bind::<diesel::sql_types::Integer, _>(yil)
            .bind::<diesel::sql_types::Integer, _>(1)
            .bind::<diesel::sql_types::Double, _>(uye_aidat_tutari)
            .bind::<diesel::sql_types::Double, _>(0.0)
            .bind::<diesel::sql_types::Double, _>(uye_aidat_tutari)
            .bind::<diesel::sql_types::Text, _>("beklemede")
            .bind::<diesel::sql_types::Integer, _>(0)
            .bind::<diesel::sql_types::Double, _>(0.0)
            .bind::<diesel::sql_types::Text, _>(format!("Toplu oluşturuldu ({})", yil))
            .bind::<diesel::sql_types::Text, _>("aktarilmadi")
            .bind::<diesel::sql_types::Text, _>(&now)
            .bind::<diesel::sql_types::Text, _>(&now)
            .execute(&mut conn)
            .map_err(|e| e.to_string())?;
            
            olusturulan += 1;
            toplam += uye_aidat_tutari;
        }
    }

    Ok(TopluAidatResult {
        success: true,
        olusturulan_adet: olusturulan,
        toplam_tutar: toplam,
        mesaj: format!("{} yıl için {} adet aidat oluşturuldu.", bitis_yili - baslangic_yili + 1, olusturulan),
    })
}

#[derive(Debug, Deserialize)]
pub struct CokluYilOdemeRequest {
    pub uye_id: String,
    pub baslangic_yili: i32,
    pub bitis_yili: i32,
    pub toplam_tutar: f64,
    pub odeme_tarihi: String,
    pub kasa_id: String,
}

#[derive(Debug, Serialize)]
pub struct CokluYilOdemeResult {
    pub success: bool,
    pub odenen_yil_sayisi: i32,
    pub yillar: Vec<i32>,
    pub yillik_tutar: f64,
}

#[tauri::command]
pub async fn coklu_yil_odeme(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    data: CokluYilOdemeRequest,
) -> Result<CokluYilOdemeResult, String> {
    use crate::db::schema::aidat_takip::dsl::*;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let yil_sayisi = (data.bitis_yili - data.baslangic_yili + 1) as f64;
    let yillik_tutar = data.toplam_tutar / yil_sayisi;

    let mut yillar = Vec::new();
    let mut toplam_odenen: f64 = 0.0;

    for y in data.baslangic_yili..=data.bitis_yili {
        // Bu yıl için aidat var mı kontrol et
        let mevcut = aidat_takip
            .filter(tenant_id.eq(&tenant_id_param))
            .filter(uye_id.eq(&data.uye_id))
            .filter(yil.eq(y))
            .first::<AidatTakip>(&mut conn)
            .optional()
            .map_err(|e| e.to_string())?;

        let aidat_id_for_gelir: String;

        if let Some(aidat_rec) = mevcut {
            aidat_id_for_gelir = aidat_rec.id.clone();
            
            // Mevcut aidatı güncelle
            diesel::update(aidat_takip.filter(id.eq(&aidat_rec.id)))
                .set((
                    odenen.eq(yillik_tutar),
                    kalan.eq(0.0),
                    durum.eq("odendi"),
                    odeme_tarihi.eq(Some(&data.odeme_tarihi)),
                    updated_at.eq(chrono::Utc::now().to_rfc3339()),
                ))
                .execute(&mut conn)
                .map_err(|e| e.to_string())?;
        } else {
            // Yeni aidat kaydı oluştur
            let new_id = Uuid::new_v4().to_string();
            aidat_id_for_gelir = new_id.clone();
            
            let new_aidat = AidatTakip {
                id: new_id,
                tenant_id: tenant_id_param.clone(),
                uye_id: data.uye_id.clone(),
                yil: y,
                ay: 1,
                tutar: yillik_tutar,
                odenen: yillik_tutar,
                kalan: Some(0.0),
                durum: "odendi".to_string(),
                gecikme_gun: Some(0),
                gecikme_faiz: Some(0.0),
                tahsilat_turu: None,
                banka_sube: None,
                dekont_no: None,
                aciklama: Some("Çoklu yıl ödemesi".to_string()),
                notlar: Some("Çoklu yıl ödemesi".to_string()),
                gelir_id: None,
                aktarim_durumu: Some("Bekliyor".to_string()),
                version: 1,
                odeme_tarihi: Some(data.odeme_tarihi.clone()),
                created_at: chrono::Utc::now().to_rfc3339(),
                updated_at: chrono::Utc::now().to_rfc3339(),
            };

            diesel::insert_into(aidat_takip)
                .values(&new_aidat)
                .execute(&mut conn)
                .map_err(|e| e.to_string())?;
        }

        // Her yıl için gelir kaydı oluştur ve kasa güncelle
        let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let new_gelir_id = Uuid::new_v4().to_string();
        let makbuz_no = format!("AIDAT-{}", &new_gelir_id[..8]);
        
        diesel::sql_query(
            "INSERT INTO gelirler (id, tenant_id, kasa_id, gelir_turu, tutar, tarih, aciklama, aidat_id, uye_id, makbuz_no, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 1, ?11, ?11)"
        )
        .bind::<diesel::sql_types::Text, _>(&new_gelir_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .bind::<diesel::sql_types::Text, _>(&data.kasa_id)
        .bind::<diesel::sql_types::Text, _>("Aidat")
        .bind::<diesel::sql_types::Double, _>(yillik_tutar)
        .bind::<diesel::sql_types::Text, _>(&data.odeme_tarihi)
        .bind::<diesel::sql_types::Text, _>(format!("Çoklu yıl ödemesi - {} yılı aidatı", y))
        .bind::<diesel::sql_types::Text, _>(&aidat_id_for_gelir)
        .bind::<diesel::sql_types::Text, _>(&data.uye_id)
        .bind::<diesel::sql_types::Text, _>(&makbuz_no)
        .bind::<diesel::sql_types::Text, _>(&now)
        .execute(&mut conn)
        .map_err(|e| format!("Gelir kaydı oluşturulamadı: {}", e))?;

        toplam_odenen += yillik_tutar;
        yillar.push(y);
    }

    // Toplam tutarı kasaya ekle (tek seferde)
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    diesel::sql_query(
        "UPDATE kasalar SET bakiye = bakiye + ?1, updated_at = ?2 WHERE id = ?3"
    )
    .bind::<diesel::sql_types::Double, _>(toplam_odenen)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&data.kasa_id)
    .execute(&mut conn)
    .map_err(|e| format!("Kasa güncellenemedi: {}", e))?;

    Ok(CokluYilOdemeResult {
        success: true,
        odenen_yil_sayisi: yillar.len() as i32,
        yillar,
        yillik_tutar,
    })
}

// ============================================================================
// HELPER FUNCTIONS - Aidat → Gelir → Kasa Entegrasyonu
// ============================================================================

/// Aidat ödemesi için otomatik gelir kaydı oluşturur ve kasa bakiyesini günceller
fn create_gelir_from_aidat(
    conn: &mut SqliteConnection,
    tenant_id: &str,
    kasa_id: &str,
    aidat: &AidatTakip,
    uye_id: &str,
    tutar: f64,
    tarih: &str,
) -> Result<String, String> {
    let gelir_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    
    // Gelir kaydı oluştur
    diesel::sql_query(
        "INSERT INTO gelirler (
            id, tenant_id, kasa_id, gelir_turu, tarih, tutar, aciklama,
            aidat_id, uye_id, ait_oldugu_yil, created_at, updated_at
        ) VALUES (?1, ?2, ?3, 'AİDAT', ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)"
    )
    .bind::<diesel::sql_types::Text, _>(&gelir_id)
    .bind::<diesel::sql_types::Text, _>(tenant_id)
    .bind::<diesel::sql_types::Text, _>(kasa_id)
    .bind::<diesel::sql_types::Text, _>(tarih)
    .bind::<diesel::sql_types::Double, _>(tutar)
    .bind::<diesel::sql_types::Text, _>(format!("{} yılı aidat ödemesi", aidat.yil))
    .bind::<diesel::sql_types::Text, _>(&aidat.id)
    .bind::<diesel::sql_types::Text, _>(uye_id)
    .bind::<diesel::sql_types::Integer, _>(aidat.yil)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&now)
    .execute(conn)
    .map_err(|e| format!("Gelir kaydı oluşturulamadı: {}", e))?;
    
    // Aidat kaydını güncelle - gelir_id ve aktarim_durumu
    diesel::sql_query(
        "UPDATE aidat_takip 
         SET gelir_id = ?1, aktarim_durumu = 'Aktarıldı', updated_at = ?2
         WHERE id = ?3"
    )
    .bind::<diesel::sql_types::Text, _>(&gelir_id)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&aidat.id)
    .execute(conn)
    .map_err(|e| format!("Aidat aktarım durumu güncellenemedi: {}", e))?;
    
    // Kasa bakiyesini güncelle
    update_kasa_bakiye(conn, kasa_id)?;
    
    Ok(gelir_id)
}

/// Kasa bakiyesini yeniden hesaplar (gelir/gider/virman toplamları)
fn update_kasa_bakiye(
    conn: &mut SqliteConnection,
    kasa_id: &str,
) -> Result<(), String> {
    #[derive(QueryableByName)]
    struct TotalQuery {
        #[diesel(sql_type = diesel::sql_types::Double)]
        total: f64,
    }
    
    #[derive(QueryableByName)]
    struct KasaInfoQuery {
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
        devir_bakiye: Option<f64>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
        virman_giris: Option<f64>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
        virman_cikis: Option<f64>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
        tahakkuk_tutari: Option<f64>,
    }
    
    // Toplam gelir hesapla
    let toplam_gelir: f64 = diesel::sql_query(
        "SELECT COALESCE(SUM(tutar), 0.0) as total FROM gelirler WHERE kasa_id = ?1"
    )
    .bind::<diesel::sql_types::Text, _>(kasa_id)
    .get_result::<TotalQuery>(conn)
    .map(|r| r.total)
    .unwrap_or(0.0);
    
    // Toplam gider hesapla
    let toplam_gider: f64 = diesel::sql_query(
        "SELECT COALESCE(SUM(tutar), 0.0) as total FROM giderler WHERE kasa_id = ?1"
    )
    .bind::<diesel::sql_types::Text, _>(kasa_id)
    .get_result::<TotalQuery>(conn)
    .map(|r| r.total)
    .unwrap_or(0.0);
    
    // Kasa bilgilerini çek (devir_bakiye için)
    let kasa_info = diesel::sql_query(
        "SELECT devir_bakiye, virman_giris, virman_cikis, tahakkuk_tutari FROM kasalar WHERE id = ?1"
    )
    .bind::<diesel::sql_types::Text, _>(kasa_id)
    .get_result::<KasaInfoQuery>(conn)
    .unwrap_or(KasaInfoQuery {
        devir_bakiye: Some(0.0),
        virman_giris: Some(0.0),
        virman_cikis: Some(0.0),
        tahakkuk_tutari: Some(0.0),
    });
    
    let devir_bakiye = kasa_info.devir_bakiye.unwrap_or(0.0);
    let virman_giris = kasa_info.virman_giris.unwrap_or(0.0);
    let virman_cikis = kasa_info.virman_cikis.unwrap_or(0.0);
    let tahakkuk_tutari = kasa_info.tahakkuk_tutari.unwrap_or(0.0);
    
    // Fiziksel bakiye = devir + gelir - gider + virman_giris - virman_cikis
    let fiziksel_bakiye = devir_bakiye + toplam_gelir - toplam_gider + virman_giris - virman_cikis;
    
    // Serbest bakiye = fiziksel_bakiye - tahakkuk
    let serbest_bakiye = fiziksel_bakiye - tahakkuk_tutari;
    
    // Kasa tablosunu güncelle
    diesel::sql_query(
        "UPDATE kasalar 
         SET toplam_gelir = ?1,
             toplam_gider = ?2,
             fiziksel_bakiye = ?3,
             serbest_bakiye = ?4,
             bakiye = ?5,
             updated_at = ?6
         WHERE id = ?7"
    )
    .bind::<diesel::sql_types::Double, _>(toplam_gelir)
    .bind::<diesel::sql_types::Double, _>(toplam_gider)
    .bind::<diesel::sql_types::Double, _>(fiziksel_bakiye)
    .bind::<diesel::sql_types::Double, _>(serbest_bakiye)
    .bind::<diesel::sql_types::Double, _>(fiziksel_bakiye) // bakiye = fiziksel_bakiye
    .bind::<diesel::sql_types::Text, _>(chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string())
    .bind::<diesel::sql_types::Text, _>(kasa_id)
    .execute(conn)
    .map_err(|e| format!("Kasa bakiyesi güncellenemedi: {}", e))?;
    
    Ok(())
}

/// Aidat ödemesi kaydet + Gelir oluştur + Kasa güncelle (Basit versiyon - transaction eklenecek)
#[derive(Debug, Deserialize)]
pub struct AidatOdemeRequest {
    pub aidat_id: String,
    pub kasa_id: String,
    pub tutar: f64,
    pub odeme_tarihi: String,
}

#[tauri::command]
pub async fn kaydet_aidat_odeme_with_gelir(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    data: AidatOdemeRequest,
) -> Result<String, String> {
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    
    use crate::db::schema::aidat_takip::dsl::*;
    
    // Mevcut aidat kaydını çek
    let current_aidat = aidat_takip
        .filter(id.eq(&data.aidat_id))
        .filter(tenant_id.eq(&tenant_id_param))
        .first::<AidatTakip>(&mut conn)
        .map_err(|e| format!("Aidat kaydı bulunamadı: {}", e))?;
    
    // Üye bilgisini al
    let uye: crate::db::models::Uye = diesel::sql_query("SELECT * FROM uyeler WHERE id = ?1")
        .bind::<diesel::sql_types::Text, _>(&current_aidat.uye_id)
        .get_result(&mut conn)
        .map_err(|e| format!("Üye bulunamadı: {}", e))?;
    
    // Yeni ödenen miktarı hesapla
    let yeni_odenen = current_aidat.odenen + data.tutar;
    let yeni_kalan = current_aidat.tutar - yeni_odenen;
    let yeni_durum = if yeni_kalan <= 0.01 { "odendi" } else { "kismi_odendi" };
    
    // Aidat kaydını güncelle
    diesel::sql_query(
        "UPDATE aidat_takip 
         SET odenen = ?1, kalan = ?2, durum = ?3, odeme_tarihi = ?4, updated_at = ?5
         WHERE id = ?6"
    )
    .bind::<diesel::sql_types::Double, _>(yeni_odenen)
    .bind::<diesel::sql_types::Double, _>(yeni_kalan)
    .bind::<diesel::sql_types::Text, _>(yeni_durum)
    .bind::<diesel::sql_types::Text, _>(&data.odeme_tarihi)
    .bind::<diesel::sql_types::Text, _>(chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string())
    .bind::<diesel::sql_types::Text, _>(&data.aidat_id)
    .execute(&mut conn)
    .map_err(|e| format!("Aidat güncellenemedi: {}", e))?;
    
    // Gelir kaydı oluştur + Kasa güncelle
    let created_gelir_id = create_gelir_from_aidat(
        &mut conn,
        &tenant_id_param,
        &data.kasa_id,
        &current_aidat,
        &uye.id,
        data.tutar,
        &data.odeme_tarihi,
    )?;
    
    Ok(created_gelir_id)
}

// ============================================================================
// EKSİK FONKSİYONLAR - Frontend'in çağırdığı ama backend'de olmayan
// ============================================================================

#[derive(Debug, Serialize, Queryable)]
pub struct AidatOdeme {
    pub id: String,
    pub aidat_id: String,
    pub tutar: f64,
    pub odeme_tarihi: String,
    pub created_at: String,
}

/// Basit aidat ödeme ekleme - kasa gerektirmeden
#[tauri::command]
pub async fn add_aidat_odeme(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    aidat_id: String,
    odeme_tutari: f64,
) -> Result<String, String> {
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    
    use crate::db::schema::aidat_takip::dsl::*;
    
    // Mevcut aidat kaydını çek
    let current_aidat = aidat_takip
        .filter(id.eq(&aidat_id))
        .filter(tenant_id.eq(&tenant_id_param))
        .first::<AidatTakip>(&mut conn)
        .map_err(|e| format!("Aidat kaydı bulunamadı: {}", e))?;
    
    // Yeni ödenen miktarı hesapla
    let yeni_odenen = current_aidat.odenen + odeme_tutari;
    let yeni_kalan = current_aidat.tutar - yeni_odenen;
    let yeni_durum = if yeni_kalan <= 0.01 { "odendi" } else { "kismi_odendi" };
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    
    // Aidat kaydını güncelle
    diesel::sql_query(
        "UPDATE aidat_takip 
         SET odenen = ?1, kalan = ?2, durum = ?3, odeme_tarihi = ?4, updated_at = ?5
         WHERE id = ?6"
    )
    .bind::<diesel::sql_types::Double, _>(yeni_odenen)
    .bind::<diesel::sql_types::Double, _>(yeni_kalan)
    .bind::<diesel::sql_types::Text, _>(yeni_durum)
    .bind::<diesel::sql_types::Text, _>(&today)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&aidat_id)
    .execute(&mut conn)
    .map_err(|e| format!("Aidat güncellenemedi: {}", e))?;
    
    Ok("Ödeme kaydedildi".to_string())
}

/// Aidat ödeme + Gelir kaydı + Kasa güncellemesi (Tam entegrasyon)
#[tauri::command]
pub async fn add_aidat_odeme_with_gelir(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    aidat_id: String,
    odeme_tutari: f64,
    kasa_id: String,
) -> Result<String, String> {
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // TRANSACTION START - Critical for data consistency
    conn.transaction::<_, diesel::result::Error, _>(|conn| {
        // 1. Mevcut aidat kaydını çek
        let current_aidat: AidatTakip = {
            use crate::db::schema::aidat_takip::dsl::*;
            aidat_takip
                .filter(id.eq(&aidat_id))
                .filter(tenant_id.eq(&tenant_id_param))
                .first(conn)?
        };

        // Yeni ödenen miktarı hesapla
        let yeni_odenen = current_aidat.odenen + odeme_tutari;
        let yeni_kalan = current_aidat.tutar - yeni_odenen;
        let yeni_durum = if yeni_kalan <= 0.01 { "odendi" } else { "kismi_odendi" };
        let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let gelir_id = Uuid::new_v4().to_string();

        // 2. Gelir kaydı oluştur
        diesel::sql_query(
            "INSERT INTO gelirler (id, tenant_id, kasa_id, gelir_turu, tutar, tarih, aciklama, aidat_id, makbuz_no, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1, ?10, ?10)"
        )
        .bind::<diesel::sql_types::Text, _>(&gelir_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .bind::<diesel::sql_types::Text, _>(&kasa_id)
        .bind::<diesel::sql_types::Text, _>("Aidat")
        .bind::<diesel::sql_types::Double, _>(odeme_tutari)
        .bind::<diesel::sql_types::Text, _>(&today)
        .bind::<diesel::sql_types::Text, _>(format!("Aidat ödemesi - {} {}", current_aidat.yil, current_aidat.ay))
        .bind::<diesel::sql_types::Text, _>(&aidat_id)
        .bind::<diesel::sql_types::Text, _>(format!("AIDAT-{}", &gelir_id[..8]))
        .bind::<diesel::sql_types::Text, _>(&now)
        .execute(conn)?;

        // 3. Kasa bakiyesini güncelle
        diesel::sql_query(
            "UPDATE kasalar SET bakiye = bakiye + ?1, toplam_gelir = toplam_gelir + ?1, updated_at = ?2 WHERE id = ?3"
        )
        .bind::<diesel::sql_types::Double, _>(odeme_tutari)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&kasa_id)
        .execute(conn)?;

        // 4. Aidat kaydını güncelle (gelir_id ile ilişkilendir) + version check
        let affected = diesel::sql_query(
            "UPDATE aidat_takip
             SET odenen = ?1, kalan = ?2, durum = ?3, odeme_tarihi = ?4, gelir_id = ?5, gelire_aktarildi = 1, version = version + 1, updated_at = ?6
             WHERE id = ?7 AND version = ?8"
        )
        .bind::<diesel::sql_types::Double, _>(yeni_odenen)
        .bind::<diesel::sql_types::Double, _>(yeni_kalan)
        .bind::<diesel::sql_types::Text, _>(yeni_durum)
        .bind::<diesel::sql_types::Text, _>(&today)
        .bind::<diesel::sql_types::Text, _>(&gelir_id)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&aidat_id)
        .bind::<diesel::sql_types::Integer, _>(current_aidat.version)
        .execute(conn)?;

        if affected == 0 {
            return Err(diesel::result::Error::RollbackTransaction);
        }

        Ok(())
    })
    .map_err(|e| format!("Transaction failed: {}", e))?;

    Ok("Ödeme kaydedildi, gelir oluşturuldu ve kasa güncellendi".to_string())
}

#[tauri::command]
pub async fn get_aidat_odemeleri(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    aidat_id: String,
) -> Result<Vec<AidatOdeme>, String> {
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Aidat'a bağlı gelirleri çek (gelirler tablosunda aidat_id foreign key var)
    use crate::db::schema::gelirler;
    
    let odemeler = gelirler::table
        .filter(gelirler::tenant_id.eq(&tenant_id_param))
        .filter(gelirler::aidat_id.eq(&aidat_id))
        .select((
            gelirler::id,
            gelirler::aidat_id,
            gelirler::tutar,
            gelirler::tarih,
            gelirler::created_at,
        ))
        .load::<(String, Option<String>, f64, String, String)>(&mut conn)
        .map_err(|e| e.to_string())?;

    let result: Vec<AidatOdeme> = odemeler
        .into_iter()
        .filter_map(|(id, aid_id, tutar, tarih, created)| {
            aid_id.map(|_| AidatOdeme {
                id,
                aidat_id: aidat_id.clone(),
                tutar,
                odeme_tarihi: tarih,
                created_at: created,
            })
        })
        .collect();

    Ok(result)
}

#[derive(Debug, Deserialize)]
pub struct UpdateAidatOdemeRequest {
    pub tutar: Option<f64>,
    pub odeme_tarihi: Option<String>,
}

#[tauri::command]
pub async fn update_aidat_odeme(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    id: String,
    request: UpdateAidatOdemeRequest,
) -> Result<(), String> {
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    use crate::db::schema::gelirler::dsl::*;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Mevcut gelir kaydını al
    use crate::db::schema::gelirler::dsl as gelir_dsl;
    let current = gelir_dsl::gelirler
        .filter(gelir_dsl::id.eq(&id))
        .filter(gelir_dsl::tenant_id.eq(&tenant_id_param))
        .first::<crate::db::models::Gelir>(&mut conn)
        .map_err(|e| e.to_string())?;

    let eski_tutar = current.tutar;
    let yeni_tutar = request.tutar.unwrap_or(eski_tutar);
    let tutar_farki = yeni_tutar - eski_tutar;

    conn.transaction::<_, diesel::result::Error, _>(|conn| {
        // Gelir kaydını güncelle
        diesel::update(gelirler.find(&id))
            .set((
                tutar.eq(yeni_tutar),
                tarih.eq(request.odeme_tarihi.unwrap_or(current.tarih)),
                updated_at.eq(&now),
            ))
            .execute(conn)?;

        // Kasa bakiyesini güncelle
        if tutar_farki.abs() > 0.01 {
            diesel::sql_query(
                "UPDATE kasalar 
                 SET toplam_gelir = COALESCE(toplam_gelir, 0.0) + ?1,
                     fiziksel_bakiye = COALESCE(fiziksel_bakiye, 0.0) + ?2,
                     bakiye = bakiye + ?3,
                     updated_at = ?4
                 WHERE id = ?5"
            )
            .bind::<diesel::sql_types::Double, _>(tutar_farki)
            .bind::<diesel::sql_types::Double, _>(tutar_farki)
            .bind::<diesel::sql_types::Double, _>(tutar_farki)
            .bind::<diesel::sql_types::Text, _>(&now)
            .bind::<diesel::sql_types::Text, _>(&current.kasa_id)
            .execute(conn)?;

            // Aidat takip tablosunu da güncelle
            if let Some(aid_id) = &current.aidat_id {
                use crate::db::schema::aidat_takip;
                let aidat = aidat_takip::table
                    .filter(aidat_takip::id.eq(aid_id))
                    .first::<AidatTakip>(conn)?;

                let yeni_odenen = aidat.odenen + tutar_farki;
                let yeni_kalan = aidat.tutar - yeni_odenen;
                let yeni_durum = if yeni_kalan <= 0.01 { "odendi" } else { "kismi_odendi" };

                diesel::update(aidat_takip::table.find(aid_id))
                    .set((
                        aidat_takip::odenen.eq(yeni_odenen),
                        aidat_takip::kalan.eq(Some(yeni_kalan)),
                        aidat_takip::durum.eq(yeni_durum),
                        aidat_takip::updated_at.eq(&now),
                    ))
                    .execute(conn)?;
            }
        }

        Ok(())
    }).map_err(|e: diesel::result::Error| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_aidat_odeme(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    id: String,
) -> Result<(), String> {
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    use crate::db::schema::gelirler::dsl::*;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Önce gelir kaydını al
    use crate::db::schema::gelirler::dsl as gelir_dsl;
    let gelir = gelir_dsl::gelirler
        .filter(gelir_dsl::id.eq(&id))
        .filter(gelir_dsl::tenant_id.eq(&tenant_id_param))
        .first::<crate::db::models::Gelir>(&mut conn)
        .map_err(|e| e.to_string())?;

    conn.transaction::<_, diesel::result::Error, _>(|conn| {
        // Gelir kaydını sil
        diesel::delete(gelirler.find(&id))
            .execute(conn)?;

        // Kasa bakiyesini güncelle (geliri geri çıkar)
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

        // Aidat takip tablosunu güncelle (ödenen tutarı düşür)
        if let Some(aid_id) = &gelir.aidat_id {
            use crate::db::schema::aidat_takip;
            let aidat = aidat_takip::table
                .filter(aidat_takip::id.eq(aid_id))
                .first::<AidatTakip>(conn)?;

            let yeni_odenen = aidat.odenen - gelir.tutar;
            let yeni_kalan = aidat.tutar - yeni_odenen;
            let yeni_durum = if yeni_odenen <= 0.01 { "odenmedi" } else { "kismi_odendi" };

            diesel::update(aidat_takip::table.find(aid_id))
                .set((
                    aidat_takip::odenen.eq(yeni_odenen),
                    aidat_takip::kalan.eq(Some(yeni_kalan)),
                    aidat_takip::durum.eq(yeni_durum),
                    aidat_takip::updated_at.eq(&now),
                ))
                .execute(conn)?;
        }

        Ok(())
    }).map_err(|e: diesel::result::Error| e.to_string())?;

    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct UpdateAidatTanimlamaRequest {
    pub tutar: Option<f64>,
    pub notlar: Option<String>,
}

#[tauri::command]
pub async fn update_aidat_tanimlama(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    id: String,
    request: UpdateAidatTanimlamaRequest,
) -> Result<AidatTakip, String> {
    use crate::db::schema::aidat_takip::dsl::*;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Mevcut kaydı al
    use crate::db::schema::aidat_takip::dsl as aidat_dsl;
    let current = aidat_dsl::aidat_takip
        .filter(aidat_dsl::id.eq(&id))
        .filter(aidat_dsl::tenant_id.eq(&tenant_id_param))
        .first::<AidatTakip>(&mut conn)
        .map_err(|e| e.to_string())?;

    let yeni_tutar = request.tutar.unwrap_or(current.tutar);
    let yeni_kalan = yeni_tutar - current.odenen;
    let yeni_durum = if yeni_kalan <= 0.01 { "odendi" } else if current.odenen > 0.01 { "kismi_odendi" } else { "odenmedi" };

    diesel::update(aidat_takip.find(&id))
        .set((
            tutar.eq(yeni_tutar),
            kalan.eq(Some(yeni_kalan)),
            durum.eq(yeni_durum),
            notlar.eq(request.notlar.or(current.notlar)),
            updated_at.eq(&now),
        ))
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;

    let updated = aidat_takip
        .find(&id)
        .first::<AidatTakip>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(updated)
}

#[tauri::command]
pub async fn delete_aidat_tanimlama(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    id: String,
) -> Result<(), String> {
    use crate::db::schema::aidat_takip::dsl::*;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Önce bağlı ödemeler var mı kontrol et (soft delete olmalı)
    use crate::db::schema::aidat_takip::dsl as aidat_dsl;
    let aidat_record = aidat_dsl::aidat_takip
        .filter(aidat_dsl::id.eq(&id))
        .filter(aidat_dsl::tenant_id.eq(&tenant_id_param))
        .first::<AidatTakip>(&mut conn)
        .map_err(|e| e.to_string())?;

    if aidat_record.odenen > 0.01 {
        return Err("Bu aidatın ödemeleri var, silinemez! Önce ödemeleri silin.".to_string());
    }

    // Hard delete (ödeme yoksa)
    diesel::delete(aidat_takip.find(&id))
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(())
}
// ============================================================================
// ÜYE BORÇ DURUMU SORGULAMA
// ============================================================================

#[derive(Debug, Serialize)]
pub struct UyeBorcDurumu {
    pub uye_id: String,
    pub toplam_borc: f64,
    pub odenen: f64,
    pub kalan_borc: f64,
}

#[derive(Debug, QueryableByName)]
struct BorcRow {
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub uye_id: String,
    #[diesel(sql_type = diesel::sql_types::Double)]
    pub toplam_borc: f64,
    #[diesel(sql_type = diesel::sql_types::Double)]
    pub odenen: f64,
}

/// Birden fazla üye için borç durumlarını toplu getir
#[tauri::command]
pub async fn get_uye_borc_durumlari(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    uye_ids: Vec<String>,
) -> Result<Vec<UyeBorcDurumu>, String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    
    if uye_ids.is_empty() {
        return Ok(vec![]);
    }
    
    // Tüm üyelerin borç durumlarını tek sorguda getir
    let placeholders: Vec<String> = uye_ids.iter().enumerate().map(|(i, _)| format!("?{}", i + 2)).collect();
    let query = format!(
        "SELECT uye_id, 
                COALESCE(SUM(tutar), 0.0) as toplam_borc, 
                COALESCE(SUM(odenen), 0.0) as odenen
         FROM aidat_takip 
         WHERE tenant_id = ?1 AND uye_id IN ({})
         GROUP BY uye_id",
        placeholders.join(", ")
    );
    
    // Dinamik parametre ile sorgu çalıştır
    let mut results: Vec<UyeBorcDurumu> = vec![];
    
    for uye_id in &uye_ids {
        let row = diesel::sql_query(
            "SELECT uye_id, 
                    COALESCE(SUM(tutar), 0.0) as toplam_borc, 
                    COALESCE(SUM(odenen), 0.0) as odenen
             FROM aidat_takip 
             WHERE tenant_id = ?1 AND uye_id = ?2
             GROUP BY uye_id"
        )
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .bind::<diesel::sql_types::Text, _>(uye_id)
        .get_result::<BorcRow>(&mut conn)
        .optional()
        .map_err(|e| e.to_string())?;
        
        if let Some(r) = row {
            results.push(UyeBorcDurumu {
                uye_id: r.uye_id,
                toplam_borc: r.toplam_borc,
                odenen: r.odenen,
                kalan_borc: r.toplam_borc - r.odenen,
            });
        } else {
            // Aidat kaydı olmayan üyeler için 0 borç
            results.push(UyeBorcDurumu {
                uye_id: uye_id.clone(),
                toplam_borc: 0.0,
                odenen: 0.0,
                kalan_borc: 0.0,
            });
        }
    }

    Ok(results)
}

// ============================================================================
// HELPER: Aidat tutar hesaplama
// ============================================================================

/// Üye için aidat tutarını hesapla (tanım + üye özel durumu)
pub fn calculate_uye_aidat_tutari(
    conn: &mut diesel::sqlite::SqliteConnection,
    tenant_id: &str,
    uye_id: &str,
    yil: i32,
) -> Result<f64, diesel::result::Error> {
    use crate::db::schema::uyeler_basic;

    // 1. Üyeyi al
    #[derive(QueryableByName)]
    struct UyeTutarRow {
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
        ozel_aidat_tutari: Option<f64>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
        aidat_indirimi_yuzde: Option<f64>,
    }

    let uye = diesel::sql_query(
        "SELECT ozel_aidat_tutari, aidat_indirimi_yuzde FROM uyeler WHERE id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(uye_id)
    .bind::<diesel::sql_types::Text, _>(tenant_id)
    .get_result::<UyeTutarRow>(conn)?;

    // 2. Üyenin özel tutarı varsa onu kullan
    if let Some(ozel_tutar) = uye.ozel_aidat_tutari {
        if ozel_tutar > 0.0 {
            return Ok(ozel_tutar);
        }
    }

    // 3. Aidat tanımından genel tutarı al
    #[derive(QueryableByName)]
    struct TanimRow {
        #[diesel(sql_type = diesel::sql_types::Double)]
        tutar: f64,
    }

    let tanim_tutar = diesel::sql_query(
        "SELECT tutar FROM aidat_tanimlari WHERE tenant_id = ?1 AND yil = ?2 AND is_active = 1"
    )
    .bind::<diesel::sql_types::Text, _>(tenant_id)
    .bind::<diesel::sql_types::Integer, _>(yil)
    .get_result::<TanimRow>(conn)
    .map(|r| r.tutar)
    .unwrap_or(0.0);

    // 4. İndirim varsa uygula
    if let Some(indirim_yuzde) = uye.aidat_indirimi_yuzde {
        if indirim_yuzde > 0.0 {
            let indirim_carpani = 1.0 - (indirim_yuzde / 100.0);
            return Ok(tanim_tutar * indirim_carpani);
        }
    }

    // 5. Normal tutar
    Ok(tanim_tutar)
}