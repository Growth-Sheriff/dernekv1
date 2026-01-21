use diesel::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Queryable, Selectable)]
#[diesel(table_name = crate::db::schema::tenants)]
pub struct Tenant {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Queryable, Selectable)]
#[diesel(table_name = crate::db::schema::licenses)]
pub struct License {
    pub id: String,
    pub tenant_id: String,
    pub plan: String,
    pub mode: String,
    pub features: String,
    pub hardware_id: Option<String>,
    pub expires_at: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Queryable, Selectable)]
#[diesel(table_name = crate::db::schema::users)]
pub struct User {
    pub id: String,
    pub tenant_id: String,
    pub username: Option<String>,
    pub email: String,
    pub password_hash: String,
    pub full_name: String,
    pub role: Option<String>,
    pub phone: Option<String>,
    pub is_active: bool,
    pub is_superuser: Option<bool>,
    pub last_login: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, diesel::QueryableByName)]
pub struct Uye {
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub id: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub tenant_id: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub uye_no: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub tc_no: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub ad: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub soyad: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub ad_soyad: String,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub telefon: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub telefon2: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub email: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub cinsiyet: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub dogum_tarihi: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub dogum_yeri: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub kan_grubu: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub aile_durumu: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Integer>)]
    pub cocuk_sayisi: Option<i32>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub egitim_durumu: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub meslek: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub is_yeri: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub adres: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub il: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub ilce: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub mahalle: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub posta_kodu: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub uyelik_tipi: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
    pub ozel_aidat_tutari: Option<f64>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
    pub aidat_indirimi_yuzde: Option<f64>,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub giris_tarihi: String,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub cikis_tarihi: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub durum: String,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub referans_uye_id: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub ayrilma_nedeni: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub notlar: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub created_at: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Queryable, Selectable, Insertable)]
#[diesel(table_name = crate::db::schema::aidat_takip)]
pub struct AidatTakip {
    pub id: String,
    pub tenant_id: String,
    pub uye_id: String,
    pub yil: i32,
    pub ay: i32,
    pub tutar: f64,
    pub odenen: f64,
    pub kalan: Option<f64>,
    pub odeme_tarihi: Option<String>,
    pub durum: String,
    pub gecikme_gun: Option<i32>,
    pub gecikme_faiz: Option<f64>,
    pub tahsilat_turu: Option<String>,
    pub banka_sube: Option<String>,
    pub dekont_no: Option<String>,
    pub aciklama: Option<String>,
    pub notlar: Option<String>,
    pub gelir_id: Option<String>,
    pub aktarim_durumu: Option<String>,
    pub version: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Queryable, Selectable)]
#[diesel(table_name = crate::db::schema::kasalar)]
pub struct Kasa {
    pub id: String,
    pub tenant_id: String,
    pub kasa_adi: String,
    pub bakiye: f64,
    pub para_birimi: String,
    pub devir_bakiye: Option<f64>,
    pub toplam_gelir: Option<f64>,
    pub toplam_gider: Option<f64>,
    pub virman_giris: Option<f64>,
    pub virman_cikis: Option<f64>,
    pub fiziksel_bakiye: Option<f64>,
    pub tahakkuk_tutari: Option<f64>,
    pub serbest_bakiye: Option<f64>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Queryable, Selectable)]
#[diesel(table_name = crate::db::schema::gelir_turleri)]
pub struct GelirTuru {
    pub id: String,
    pub tenant_id: String,
    pub ad: String,
    pub kod: Option<String>,
    pub aciklama: Option<String>,
    pub varsayilan_makbuz_prefix: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Queryable, Selectable)]
#[diesel(table_name = crate::db::schema::gelirler)]
pub struct Gelir {
    pub id: String,
    pub tenant_id: String,
    pub kasa_id: String,
    pub gelir_turu: Option<String>,
    pub gelir_turu_id: Option<String>,
    pub alt_kategori: Option<String>,
    pub tarih: String,
    pub tutar: f64,
    pub aciklama: Option<String>,
    pub makbuz_no: Option<String>,
    pub belge_no: Option<String>,
    pub tahsil_eden: Option<String>,
    pub aidat_id: Option<String>,
    pub uye_id: Option<String>,
    pub ait_oldugu_yil: Option<i32>,
    pub tahakkuk_durumu: Option<String>,
    pub notlar: Option<String>,
    pub belge_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Queryable, Selectable)]
#[diesel(table_name = crate::db::schema::gider_turleri)]
pub struct GiderTuru {
    pub id: String,
    pub tenant_id: String,
    pub ad: String,
    pub kod: Option<String>,
    pub aciklama: Option<String>,
    pub varsayilan_fatura_prefix: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Queryable, Selectable)]
#[diesel(table_name = crate::db::schema::giderler)]
pub struct Gider {
    pub id: String,
    pub tenant_id: String,
    pub kasa_id: String,
    pub gider_turu: Option<String>,
    pub gider_turu_id: Option<String>,
    pub alt_kategori: Option<String>,
    pub tarih: String,
    pub tutar: f64,
    pub aciklama: Option<String>,
    pub fatura_no: Option<String>,
    pub islem_no: Option<String>,
    pub odeyen: Option<String>,
    pub notlar: Option<String>,
    pub belge_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Queryable, Selectable)]
#[diesel(table_name = crate::db::schema::uye_aile_uyeleri)]
pub struct AileUyesi {
    pub id: String,
    pub tenant_id: String,
    pub uye_id: String,
    pub yakinlik: Option<String>,
    pub ad_soyad: String,
    pub dogum_tarihi: Option<String>,
    pub telefon: Option<String>,
    pub meslek: Option<String>,
    pub egitim_durumu: Option<String>,
    pub notlar: Option<String>,
    pub sync_id: Option<String>,
    pub version: i32,
    pub is_deleted: i32,
    pub created_at: String,
    pub updated_at: String,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Queryable, Selectable)]
#[diesel(table_name = crate::db::schema::virmanlar)]
pub struct Virman {
    pub id: String,
    pub tenant_id: String,
    pub kaynak_kasa_id: String,
    pub hedef_kasa_id: String,
    pub tarih: String,
    pub tutar: f64,
    pub aciklama: Option<String>,
    pub kaynak_para_birimi: Option<String>,
    pub hedef_para_birimi: Option<String>,
    pub kaynak_tutar: Option<f64>,
    pub hedef_tutar: Option<f64>,
    pub uygulanan_kur: Option<f64>,
    pub kur_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Queryable, Selectable)]
#[diesel(table_name = crate::db::schema::sync_changes)]
pub struct SyncChange {
    pub id: String,
    pub tenant_id: String,
    pub table_name: String,
    pub record_id: String,
    pub operation: String,
    pub data: String,
    pub synced: bool,
    pub sync_version: i32,
    pub created_at: String,
}
