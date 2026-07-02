use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

use crate::db::outbox::{self, TxError};

#[derive(Debug, Serialize, Deserialize, Queryable, diesel::QueryableByName)]
#[diesel(table_name = crate::db::schema::etkinlikler)]
pub struct Etkinlik {
    pub id: String,
    pub tenant_id: String,
    pub baslik: String,
    pub aciklama: Option<String>,
    pub baslangic_tarihi: String,
    pub bitis_tarihi: Option<String>,
    pub yer: Option<String>,
    pub etkinlik_tipi: Option<String>,
    pub durum: Option<String>,
    pub katilimci_sayisi: Option<i32>,
    pub tahmini_butce: Option<f64>,
    pub gerceklesen_butce: Option<f64>,
    pub sorumlu_uye_id: Option<String>,
    pub notlar: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub created_by: Option<String>,
    pub is_deleted: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct CreateEtkinlikRequest {
    pub baslik: String,
    pub aciklama: Option<String>,
    pub baslangic_tarihi: String,
    pub bitis_tarihi: Option<String>,
    pub yer: Option<String>,
    pub etkinlik_tipi: Option<String>,
    pub durum: Option<String>,
    pub tahmini_butce: Option<f64>,
    pub katilimci_sayisi: Option<i32>,
    pub sorumlu_uye_id: Option<String>,
    pub notlar: Option<String>,
}

#[tauri::command]
pub async fn get_etkinlikler(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    durum: Option<String>,
    skip: Option<i64>,
    limit: Option<i64>,
) -> Result<Vec<Etkinlik>, String> {
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let mut query = format!(
        "SELECT * FROM etkinlikler WHERE tenant_id = '{}' AND (is_deleted IS NULL OR is_deleted = 0)",
        tenant_id_param
    );

    if let Some(d) = durum {
        query.push_str(&format!(" AND durum = '{}'", d));
    }

    query.push_str(" ORDER BY baslangic_tarihi DESC");
    
    if let Some(l) = limit {
        query.push_str(&format!(" LIMIT {} OFFSET {}", l, skip.unwrap_or(0)));
    }

    let results: Vec<Etkinlik> = diesel::sql_query(&query)
        .load(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(results)
}

#[tauri::command]
pub async fn get_etkinlik(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    etkinlik_id: String,
) -> Result<Etkinlik, String> {
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let result: Etkinlik = diesel::sql_query(
        "SELECT * FROM etkinlikler WHERE id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&etkinlik_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .get_result(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(result)
}

#[tauri::command]
pub async fn create_etkinlik(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    data: CreateEtkinlikRequest,
) -> Result<Etkinlik, String> {
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let new_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Yazım + outbox kaydı aynı transaction'da
    conn.transaction::<_, TxError, _>(|conn| {
        diesel::sql_query(
            "INSERT INTO etkinlikler (id, tenant_id, baslik, aciklama, baslangic_tarihi, bitis_tarihi, yer, etkinlik_tipi, durum, tahmini_butce, katilimci_sayisi, sorumlu_uye_id, notlar, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)"
        )
        .bind::<diesel::sql_types::Text, _>(&new_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .bind::<diesel::sql_types::Text, _>(&data.baslik)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.aciklama)
        .bind::<diesel::sql_types::Text, _>(&data.baslangic_tarihi)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.bitis_tarihi)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.yer)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.etkinlik_tipi)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.durum)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Double>, _>(&data.tahmini_butce)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Integer>, _>(&data.katilimci_sayisi)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.sorumlu_uye_id)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.notlar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&now)
        .execute(conn)?;

        outbox::queue_change(conn, &tenant_id_param, "etkinlikler", &new_id, "create")
            .map_err(TxError::Msg)?;
        Ok(())
    })
    .map_err(|e| e.to_string())?;

    let result: Etkinlik = diesel::sql_query(&format!(
        "SELECT * FROM etkinlikler WHERE id = '{}'",
        new_id
    ))
    .get_result(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(result)
}

#[tauri::command]
pub async fn update_etkinlik(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    etkinlik_id: String,
    data: CreateEtkinlikRequest,
) -> Result<Etkinlik, String> {
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Update + outbox kaydı aynı transaction'da
    conn.transaction::<_, TxError, _>(|conn| {
        let affected = diesel::sql_query(
            "UPDATE etkinlikler SET baslik = ?1, aciklama = ?2, baslangic_tarihi = ?3, yer = ?4, durum = ?5, tahmini_butce = ?6, notlar = ?7, updated_at = ?8 WHERE id = ?9 AND tenant_id = ?10"
        )
        .bind::<diesel::sql_types::Text, _>(&data.baslik)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.aciklama)
        .bind::<diesel::sql_types::Text, _>(&data.baslangic_tarihi)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.yer)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.durum)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Double>, _>(&data.tahmini_butce)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.notlar)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&etkinlik_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
        .execute(conn)?;

        if affected > 0 {
            outbox::queue_change(conn, &tenant_id_param, "etkinlikler", &etkinlik_id, "update")
                .map_err(TxError::Msg)?;
        }
        Ok(())
    })
    .map_err(|e| e.to_string())?;

    let result: Etkinlik = diesel::sql_query(&format!(
        "SELECT * FROM etkinlikler WHERE id = '{}'",
        etkinlik_id
    ))
    .get_result(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(result)
}

#[tauri::command]
pub async fn delete_etkinlik(
    state: State<'_, crate::AppState>,
    tenant_id_param: String,
    etkinlik_id: String,
) -> Result<(), String> {
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // DELETE + outbox tombstone kaydı aynı transaction'da
    conn.transaction::<_, TxError, _>(|conn| {
        let affected = diesel::sql_query(&format!(
            "DELETE FROM etkinlikler WHERE id = '{}' AND tenant_id = '{}'",
            etkinlik_id, tenant_id_param
        ))
        .execute(conn)?;

        if affected > 0 {
            outbox::queue_change(conn, &tenant_id_param, "etkinlikler", &etkinlik_id, "delete")
                .map_err(TxError::Msg)?;
        }
        Ok(())
    })
    .map_err(|e| e.to_string())?;

    Ok(())
}

// ============================================================================
// ETKİNLİK ↔ MUHASEBE KOMPOZİSYONU
// Gerçekleşen gelir/gider, etkinliğe bağlı baz kayıtlardan hesaplanır
// (türetilmiş değer — sync edilmez, her cihazda yeniden hesaplanır).
// ============================================================================

#[derive(Debug, serde::Serialize)]
pub struct EtkinlikMaliOzet {
    pub etkinlik_id: String,
    pub toplam_gelir: f64,
    pub toplam_gider: f64,
    pub net: f64,
    pub gelir_sayisi: i64,
    pub gider_sayisi: i64,
}

#[derive(diesel::QueryableByName)]
struct MaliOzetRow {
    #[diesel(sql_type = diesel::sql_types::Double)]
    toplam: f64,
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    adet: i64,
}

#[tauri::command]
pub async fn get_etkinlik_mali_ozet(
    state: tauri::State<'_, crate::AppState>,
    tenant_id_param: String,
    etkinlik_id_param: String,
) -> Result<EtkinlikMaliOzet, String> {
    state.verify_tenant_access(&tenant_id_param)?;

    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let gelir: MaliOzetRow = diesel::sql_query(
        "SELECT COALESCE(SUM(tutar), 0.0) AS toplam, COUNT(*) AS adet FROM gelirler \
         WHERE tenant_id = ?1 AND etkinlik_id = ?2 AND (is_deleted IS NULL OR is_deleted = 0)",
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Text, _>(&etkinlik_id_param)
    .get_result(&mut conn)
    .map_err(|e| e.to_string())?;

    let gider: MaliOzetRow = diesel::sql_query(
        "SELECT COALESCE(SUM(tutar), 0.0) AS toplam, COUNT(*) AS adet FROM giderler \
         WHERE tenant_id = ?1 AND etkinlik_id = ?2 AND (is_deleted IS NULL OR is_deleted = 0)",
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id_param)
    .bind::<diesel::sql_types::Text, _>(&etkinlik_id_param)
    .get_result(&mut conn)
    .map_err(|e| e.to_string())?;

    Ok(EtkinlikMaliOzet {
        etkinlik_id: etkinlik_id_param,
        toplam_gelir: gelir.toplam,
        toplam_gider: gider.toplam,
        net: gelir.toplam - gider.toplam,
        gelir_sayisi: gelir.adet,
        gider_sayisi: gider.adet,
    })
}
