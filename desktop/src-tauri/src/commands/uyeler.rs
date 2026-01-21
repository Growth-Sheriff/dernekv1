use tauri::State;
use diesel::prelude::*;
use diesel::sql_types::BigInt;
use chrono::{NaiveDate, Utc};
use uuid::Uuid;
use crate::state::AppState;
use crate::db::models::Uye;
use crate::db::schema::uyeler_basic;

#[derive(QueryableByName)]
pub struct CountResult {
    #[diesel(sql_type = BigInt)]
    pub count: i64,
}

#[derive(serde::Deserialize)]
pub struct CreateUyeRequest {
    pub tc_no: String,
    pub ad: String,
    pub soyad: String,
    pub telefon: Option<String>,
    pub telefon2: Option<String>,
    pub email: Option<String>,
    pub cinsiyet: Option<String>,
    pub dogum_tarihi: Option<String>,
    pub dogum_yeri: Option<String>,
    pub kan_grubu: Option<String>,
    pub aile_durumu: Option<String>,
    pub cocuk_sayisi: Option<i32>,
    pub egitim_durumu: Option<String>,
    pub meslek: Option<String>,
    pub is_yeri: Option<String>,
    pub adres: Option<String>,
    pub il: Option<String>,
    pub ilce: Option<String>,
    pub mahalle: Option<String>,
    pub posta_kodu: Option<String>,
    pub uyelik_tipi: Option<String>,
    pub ozel_aidat_tutari: Option<f64>,
    pub aidat_indirimi_yuzde: Option<f64>,
    pub giris_tarihi: String,
    pub durum: String,
    pub referans_uye_id: Option<String>,
    pub notlar: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct UpdateUyeRequest {
    pub ad: Option<String>,
    pub soyad: Option<String>,
    pub telefon: Option<String>,
    pub telefon2: Option<String>,
    pub email: Option<String>,
    pub cinsiyet: Option<String>,
    pub dogum_tarihi: Option<String>,
    pub dogum_yeri: Option<String>,
    pub kan_grubu: Option<String>,
    pub aile_durumu: Option<String>,
    pub cocuk_sayisi: Option<i32>,
    pub egitim_durumu: Option<String>,
    pub meslek: Option<String>,
    pub is_yeri: Option<String>,
    pub adres: Option<String>,
    pub il: Option<String>,
    pub ilce: Option<String>,
    pub mahalle: Option<String>,
    pub posta_kodu: Option<String>,
    pub ozel_aidat_tutari: Option<f64>,
    pub aidat_indirimi_yuzde: Option<f64>,
    pub cikis_tarihi: Option<String>,
    pub durum: Option<String>,
    pub referans_uye_id: Option<String>,
    pub ayrilma_nedeni: Option<String>,
    pub notlar: Option<String>,
}

#[tauri::command]
pub fn get_uyeler(
    state: State<AppState>,
    tenant_id_param: String,
    search: Option<String>,
    durum: Option<String>,
    skip: Option<i64>,
    limit: Option<i64>,
) -> Result<Vec<Uye>, String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let limit_val = limit.unwrap_or(100);
    let skip_val = skip.unwrap_or(0);

    // Pagination query with proper binding
    match durum {
        Some(d) => {
            diesel::sql_query(
                "SELECT * FROM uyeler
                 WHERE tenant_id = ?1 AND durum = ?2
                 ORDER BY created_at DESC
                 LIMIT ?3 OFFSET ?4"
            )
            .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
            .bind::<diesel::sql_types::Text, _>(&d)
            .bind::<diesel::sql_types::BigInt, _>(limit_val)
            .bind::<diesel::sql_types::BigInt, _>(skip_val)
            .load::<Uye>(&mut conn)
            .map_err(|e| e.to_string())
        }
        None => {
            diesel::sql_query(
                "SELECT * FROM uyeler
                 WHERE tenant_id = ?1
                 ORDER BY created_at DESC
                 LIMIT ?2 OFFSET ?3"
            )
            .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
            .bind::<diesel::sql_types::BigInt, _>(limit_val)
            .bind::<diesel::sql_types::BigInt, _>(skip_val)
            .load::<Uye>(&mut conn)
            .map_err(|e| e.to_string())
        }
    }
}

#[tauri::command]
pub fn get_uye_by_id(
    state: State<AppState>,
    tenant_id_param: String,
    uye_id: String,
) -> Result<Uye, String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    diesel::sql_query("SELECT * FROM uyeler WHERE id = ?1 AND tenant_id = ?2")
        .bind::<diesel::sql_types::Text, _>(&uye_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .get_result::<Uye>(&mut conn)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_uye(
    state: State<AppState>,
    tenant_id_param: String,
    data: CreateUyeRequest,
) -> Result<Uye, String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    let new_id = Uuid::new_v4().to_string();
    let now = Utc::now().naive_utc();
    let giris_tarihi = NaiveDate::parse_from_str(&data.giris_tarihi, "%Y-%m-%d")
        .map_err(|e| format!("Invalid date format: {}", e))?;

    {
        let db = state.db.lock().unwrap();
        let pool = db.as_ref().ok_or("Database not initialized")?;
        let mut conn = pool.get().map_err(|e| e.to_string())?;

        diesel::sql_query(
            "INSERT INTO uyeler (
                id, tenant_id, uye_no, tc_no, ad, soyad, ad_soyad, 
                telefon, telefon2, email, adres, 
                cinsiyet, dogum_tarihi, dogum_yeri, kan_grubu, aile_durumu, cocuk_sayisi,
                egitim_durumu, meslek, is_yeri,
                il, ilce, mahalle, posta_kodu,
                uyelik_tipi, ozel_aidat_tutari, aidat_indirimi_yuzde,
                giris_tarihi, durum, referans_uye_id, notlar, 
                created_at, updated_at
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, 
                ?8, ?9, ?10, ?11, 
                ?12, ?13, ?14, ?15, ?16, ?17,
                ?18, ?19, ?20,
                ?21, ?22, ?23, ?24,
                ?25, ?26, ?27,
                ?28, ?29, ?30, ?31, 
                ?32, ?33
            )"
        )
        .bind::<diesel::sql_types::Text, _>(&new_id)                    // 1
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)           // 2
        .bind::<diesel::sql_types::Text, _>(&new_id)                    // 3 uye_no
        .bind::<diesel::sql_types::Text, _>(&data.tc_no)                // 4
        .bind::<diesel::sql_types::Text, _>(&data.ad)                   // 5
        .bind::<diesel::sql_types::Text, _>(&data.soyad)                // 6
        .bind::<diesel::sql_types::Text, _>(&format!("{} {}", data.ad, data.soyad)) // 7
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.telefon)    // 8
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.telefon2)   // 9
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.email)      // 10
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.adres)      // 11
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.cinsiyet)   // 12
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.dogum_tarihi) // 13
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.dogum_yeri) // 14
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.kan_grubu)  // 15
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.aile_durumu) // 16
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Integer>, _>(&data.cocuk_sayisi) // 17
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.egitim_durumu) // 18
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.meslek)     // 19
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.is_yeri)    // 20
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.il)         // 21
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.ilce)       // 22
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.mahalle)    // 23
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.posta_kodu) // 24
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.uyelik_tipi) // 25
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Double>, _>(&data.ozel_aidat_tutari) // 26
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Double>, _>(&data.aidat_indirimi_yuzde) // 27
        .bind::<diesel::sql_types::Date, _>(giris_tarihi)               // 28
        .bind::<diesel::sql_types::Text, _>(&data.durum)                // 29
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.referans_uye_id) // 30
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.notlar)     // 31
        .bind::<diesel::sql_types::Timestamp, _>(now)                   // 32
        .bind::<diesel::sql_types::Timestamp, _>(now)                   // 33
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;
    }

    get_uye_by_id(state, tenant_id_param, new_id)
}

#[tauri::command]
pub fn update_uye(
    state: State<AppState>,
    tenant_id_param: String,
    uye_id: String,
    data: UpdateUyeRequest,
) -> Result<Uye, String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;

    {
        let db = state.db.lock().unwrap();
        let pool = db.as_ref().ok_or("Database not initialized")?;
        let mut conn = pool.get().map_err(|e| e.to_string())?;

        let now = Utc::now().naive_utc().format("%Y-%m-%d %H:%M:%S").to_string();

        // Parameterized queries - SQL injection safe
        if let Some(ad) = &data.ad {
            diesel::sql_query("UPDATE uyeler SET ad = ?1, updated_at = ?2 WHERE id = ?3 AND tenant_id = ?4")
                .bind::<diesel::sql_types::Text, _>(ad)
                .bind::<diesel::sql_types::Text, _>(&now)
                .bind::<diesel::sql_types::Text, _>(&uye_id)
                .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
                .execute(&mut conn)
                .map_err(|e| e.to_string())?;
        }

        if let Some(soyad) = &data.soyad {
            diesel::sql_query("UPDATE uyeler SET soyad = ?1, updated_at = ?2 WHERE id = ?3 AND tenant_id = ?4")
                .bind::<diesel::sql_types::Text, _>(soyad)
                .bind::<diesel::sql_types::Text, _>(&now)
                .bind::<diesel::sql_types::Text, _>(&uye_id)
                .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
                .execute(&mut conn)
                .map_err(|e| e.to_string())?;
        }

        if let Some(telefon) = &data.telefon {
            diesel::sql_query("UPDATE uyeler SET telefon = ?1, updated_at = ?2 WHERE id = ?3 AND tenant_id = ?4")
                .bind::<diesel::sql_types::Text, _>(telefon)
                .bind::<diesel::sql_types::Text, _>(&now)
                .bind::<diesel::sql_types::Text, _>(&uye_id)
                .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
                .execute(&mut conn)
                .map_err(|e| e.to_string())?;
        }

        if let Some(telefon2) = &data.telefon2 {
            diesel::sql_query("UPDATE uyeler SET telefon2 = ?1, updated_at = ?2 WHERE id = ?3 AND tenant_id = ?4")
                .bind::<diesel::sql_types::Text, _>(telefon2)
                .bind::<diesel::sql_types::Text, _>(&now)
                .bind::<diesel::sql_types::Text, _>(&uye_id)
                .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
                .execute(&mut conn)
                .map_err(|e| e.to_string())?;
        }

        if let Some(email) = &data.email {
            diesel::sql_query("UPDATE uyeler SET email = ?1, updated_at = ?2 WHERE id = ?3 AND tenant_id = ?4")
                .bind::<diesel::sql_types::Text, _>(email)
                .bind::<diesel::sql_types::Text, _>(&now)
                .bind::<diesel::sql_types::Text, _>(&uye_id)
                .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
                .execute(&mut conn)
                .map_err(|e| e.to_string())?;
        }

        if let Some(adres) = &data.adres {
            diesel::sql_query("UPDATE uyeler SET adres = ?1, updated_at = ?2 WHERE id = ?3 AND tenant_id = ?4")
                .bind::<diesel::sql_types::Text, _>(adres)
                .bind::<diesel::sql_types::Text, _>(&now)
                .bind::<diesel::sql_types::Text, _>(&uye_id)
                .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
                .execute(&mut conn)
                .map_err(|e| e.to_string())?;
        }

        if let Some(cikis_tarihi) = &data.cikis_tarihi {
            diesel::sql_query("UPDATE uyeler SET cikis_tarihi = ?1, updated_at = ?2 WHERE id = ?3 AND tenant_id = ?4")
                .bind::<diesel::sql_types::Text, _>(cikis_tarihi)
                .bind::<diesel::sql_types::Text, _>(&now)
                .bind::<diesel::sql_types::Text, _>(&uye_id)
                .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
                .execute(&mut conn)
                .map_err(|e| e.to_string())?;
        }

        if let Some(durum) = &data.durum {
            diesel::sql_query("UPDATE uyeler SET durum = ?1, updated_at = ?2 WHERE id = ?3 AND tenant_id = ?4")
                .bind::<diesel::sql_types::Text, _>(durum)
                .bind::<diesel::sql_types::Text, _>(&now)
                .bind::<diesel::sql_types::Text, _>(&uye_id)
                .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
                .execute(&mut conn)
                .map_err(|e| e.to_string())?;
        }

        if let Some(ozel_aidat_tutari) = data.ozel_aidat_tutari {
            diesel::sql_query("UPDATE uyeler SET ozel_aidat_tutari = ?1, updated_at = ?2 WHERE id = ?3 AND tenant_id = ?4")
                .bind::<diesel::sql_types::Double, _>(ozel_aidat_tutari)
                .bind::<diesel::sql_types::Text, _>(&now)
                .bind::<diesel::sql_types::Text, _>(&uye_id)
                .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
                .execute(&mut conn)
                .map_err(|e| e.to_string())?;
        }

        if let Some(aidat_indirimi_yuzde) = data.aidat_indirimi_yuzde {
            diesel::sql_query("UPDATE uyeler SET aidat_indirimi_yuzde = ?1, updated_at = ?2 WHERE id = ?3 AND tenant_id = ?4")
                .bind::<diesel::sql_types::Double, _>(aidat_indirimi_yuzde)
                .bind::<diesel::sql_types::Text, _>(&now)
                .bind::<diesel::sql_types::Text, _>(&uye_id)
                .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
                .execute(&mut conn)
                .map_err(|e| e.to_string())?;
        }

        if let Some(referans_uye_id) = &data.referans_uye_id {
            diesel::sql_query("UPDATE uyeler SET referans_uye_id = ?1, updated_at = ?2 WHERE id = ?3 AND tenant_id = ?4")
                .bind::<diesel::sql_types::Text, _>(referans_uye_id)
                .bind::<diesel::sql_types::Text, _>(&now)
                .bind::<diesel::sql_types::Text, _>(&uye_id)
                .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
                .execute(&mut conn)
                .map_err(|e| e.to_string())?;
        }

        if let Some(ayrilma_nedeni) = &data.ayrilma_nedeni {
            diesel::sql_query("UPDATE uyeler SET ayrilma_nedeni = ?1, updated_at = ?2 WHERE id = ?3 AND tenant_id = ?4")
                .bind::<diesel::sql_types::Text, _>(ayrilma_nedeni)
                .bind::<diesel::sql_types::Text, _>(&now)
                .bind::<diesel::sql_types::Text, _>(&uye_id)
                .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
                .execute(&mut conn)
                .map_err(|e| e.to_string())?;
        }

        if let Some(notlar) = &data.notlar {
            diesel::sql_query("UPDATE uyeler SET notlar = ?1, updated_at = ?2 WHERE id = ?3 AND tenant_id = ?4")
                .bind::<diesel::sql_types::Text, _>(notlar)
                .bind::<diesel::sql_types::Text, _>(&now)
                .bind::<diesel::sql_types::Text, _>(&uye_id)
                .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
                .execute(&mut conn)
                .map_err(|e| e.to_string())?;
        }
    }

    get_uye_by_id(state, tenant_id_param, uye_id)
}

#[tauri::command]
pub fn delete_uye(
    state: State<AppState>,
    tenant_id_param: String,
    uye_id: String,
) -> Result<(), String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Referans kontrolü: Aidat takip kayıtları
    let aidat_count: i64 = diesel::sql_query(
        "SELECT COUNT(*) as count FROM aidat_takip WHERE uye_id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&uye_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<CountResult>(&mut conn)
    .map(|r| r.count)
    .unwrap_or(0);

    if aidat_count > 0 {
        return Err(format!(
            "Bu üyeye ait {} aidat kaydı bulunmaktadır. Önce aidat kayıtlarını silmeniz gerekmektedir.",
            aidat_count
        ));
    }

    // Referans kontrolü: Aile üyeleri
    let aile_count: i64 = diesel::sql_query(
        "SELECT COUNT(*) as count FROM aile_uyeleri WHERE uye_id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&uye_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<CountResult>(&mut conn)
    .map(|r| r.count)
    .unwrap_or(0);

    if aile_count > 0 {
        return Err(format!(
            "Bu üyeye ait {} aile üyesi kaydı bulunmaktadır. Önce aile üyelerini silmeniz gerekmektedir.",
            aile_count
        ));
    }

    // Referans kontrolü: Gelir kayıtları
    let gelir_count: i64 = diesel::sql_query(
        "SELECT COUNT(*) as count FROM gelirler WHERE uye_id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&uye_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<CountResult>(&mut conn)
    .map(|r| r.count)
    .unwrap_or(0);

    if gelir_count > 0 {
        return Err(format!(
            "Bu üyeye ait {} gelir kaydı bulunmaktadır. Silme işlemi engellenmiştir.",
            gelir_count
        ));
    }

    // Referans kontrolü: Referans veren üyeler (bu üyeyi referans olarak gösteren)
    let referans_count: i64 = diesel::sql_query(
        "SELECT COUNT(*) as count FROM uyeler WHERE referans_uye_id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&uye_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result::<CountResult>(&mut conn)
    .map(|r| r.count)
    .unwrap_or(0);

    if referans_count > 0 {
        return Err(format!(
            "Bu üye {} başka üyenin referansı olarak gösterilmektedir. Önce referansları güncelleyin.",
            referans_count
        ));
    }

    diesel::sql_query("DELETE FROM uyeler WHERE id = ?1 AND tenant_id = ?2")
        .bind::<diesel::sql_types::Text, _>(&uye_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;

    diesel::sql_query(
        "INSERT INTO sync_changes (id, tenant_id, table_name, record_id, operation, data, created_at)
         VALUES (?1, ?2, 'uyeler', ?3, 'DELETE', '{}', ?4)"
    )
    .bind::<diesel::sql_types::Text, _>(Uuid::new_v4().to_string())
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Text, _>(&uye_id)
    .bind::<diesel::sql_types::Text, _>(Utc::now().format("%Y-%m-%d %H:%M:%S").to_string())
    .execute(&mut conn)
    .ok();

    Ok(())
}

#[tauri::command]
pub fn count_uyeler(
    state: State<AppState>,
    tenant_id_param: String,
    durum_filter: Option<String>,
) -> Result<i64, String> {
    // TENANT ISOLATION: Verify access
    state.verify_tenant_access(&tenant_id_param)?;
    
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    #[derive(diesel::QueryableByName)]
    struct CountResult {
        #[diesel(sql_type = diesel::sql_types::BigInt)]
        count: i64,
    }

    let result: CountResult = if let Some(d) = durum_filter {
        diesel::sql_query("SELECT COUNT(*) as count FROM uyeler WHERE tenant_id = ?1 AND durum = ?2")
            .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
            .bind::<diesel::sql_types::Text, _>(&d)
            .get_result::<CountResult>(&mut conn)
            .map_err(|e| e.to_string())?
    } else {
        diesel::sql_query("SELECT COUNT(*) as count FROM uyeler WHERE tenant_id = ?1")
            .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
            .get_result::<CountResult>(&mut conn)
            .map_err(|e| e.to_string())?
    };

    Ok(result.count)
}
