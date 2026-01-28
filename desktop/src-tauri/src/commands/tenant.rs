use tauri::State;
use serde::{Deserialize, Serialize};
use diesel::prelude::*;
use crate::state::AppState;
use uuid::Uuid;
use bcrypt::{hash, DEFAULT_COST};

// ============================================================================
// REQUEST/RESPONSE STRUCTS
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct ServerIds {
    pub tenant_id: String,
    pub user_id: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateTenantRequest {
    pub data: TenantData,
    pub server_ids: Option<ServerIds>,
}

#[derive(Debug, Deserialize)]
pub struct TenantData {
    pub name: String,
    pub slug: String,
    pub admin_name: String,
    pub admin_email: String,
    pub admin_password: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub license_key: String,
}

#[derive(Debug, Serialize)]
pub struct CreateTenantResponse {
    pub tenant_id: String,
    pub user_id: String,
    pub message: String,
}



#[derive(Debug, Serialize)]
pub struct TenantInfo {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub is_active: bool,
    pub created_at: String,
    pub user_count: i32,
    pub member_count: i32,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTenantRequest {
    pub name: Option<String>,
    pub slug: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct SlugCheckResponse {
    pub available: bool,
    pub suggestion: Option<String>,
}

// ============================================================================
// COMMANDS
// ============================================================================

/// Yeni tenant (dernek) oluştur
#[tauri::command]
pub fn create_tenant(
    request: CreateTenantRequest,
    state: State<AppState>,
) -> Result<CreateTenantResponse, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let data = request.data;
    let server_ids = request.server_ids;

    // 1. EMAIL VALİDASYONU
    if !data.admin_email.contains('@') || !data.admin_email.contains('.') {
        return Err("Geçerli bir email adresi girin".to_string());
    }

    // 2. PASSWORD VALİDASYONU
    if data.admin_password.len() < 6 {
        return Err("Şifre en az 6 karakter olmalıdır".to_string());
    }

    // 3. SLUG VALİDASYONU
    let slug = sanitize_slug(&data.slug);
    if slug.len() < 3 {
        return Err("Slug en az 3 karakter olmalıdır".to_string());
    }

    // 4. SLUG BENZERSİZLİK KONTROLÜ
    if !is_slug_available(&slug, &mut conn)? {
        return Err(format!("'{}' slug'ı zaten kullanılıyor. Farklı bir isim deneyin.", slug));
    }

    // 5. LİSANS KONTROLÜ - SADECE LOCAL MOD İÇİN
    // Eğer server_ids varsa, sunucu zaten lisansı doğruladı, tekrar kontrol etmeye gerek yok
    let license_key = data.license_key.to_uppercase();
    
    if server_ids.is_none() {
        // LOCAL MOD: Lisansı yerel veritabanında kontrol et
        #[derive(QueryableByName)]
        struct LicenseCheck {
            #[diesel(sql_type = diesel::sql_types::Integer)]
            count: i32,
        }
        
        let license_exists = diesel::sql_query(
            "SELECT COUNT(*) as count FROM licenses WHERE license_key = ?1 AND is_active = 1"
        )
        .bind::<diesel::sql_types::Text, _>(&license_key)
        .get_result::<LicenseCheck>(&mut conn)
        .map_err(|e| format!("Lisans kontrolü başarısız: {}", e))?;
        
        if license_exists.count == 0 {
            return Err("Geçersiz veya aktif olmayan lisans anahtarı".to_string());
        }

        // 6. LİSANS ZATEN BAŞKA TENANT'A BAĞLI MI?
        #[derive(QueryableByName)]
        struct TenantCheck {
            #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
            tenant_id: Option<String>,
        }
        
        let license_tenant = diesel::sql_query(
            "SELECT tenant_id FROM licenses WHERE license_key = ?1"
        )
        .bind::<diesel::sql_types::Text, _>(&license_key)
        .get_result::<TenantCheck>(&mut conn)
        .ok();
        
        if let Some(lt) = license_tenant {
            if lt.tenant_id.is_some() {
                return Err("Bu lisans zaten başka bir derneğe bağlı".to_string());
            }
        }
    } else {
        // HYBRID MOD: Sunucu lisansı zaten doğruladı, local tabloya lisans eklememiz gerek
        // Lisans tablosunda yoksa ekle
        let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let _ = diesel::sql_query(
            "INSERT OR IGNORE INTO licenses (id, tenant_id, license_key, plan, mode, is_active, created_at, updated_at)
             VALUES (?1, NULL, ?2, 'hybrid', 'hybrid', 1, ?3, ?4)"
        )
        .bind::<diesel::sql_types::Text, _>(&Uuid::new_v4().to_string())
        .bind::<diesel::sql_types::Text, _>(&license_key)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&now)
        .execute(&mut conn);
    }

    // ID BELİRLEME: Sunucudan geldiyse onları kullan, yoksa yeni üret
    let (tenant_id, user_id) = if let Some(ids) = server_ids {
        (ids.tenant_id, ids.user_id)
    } else {
        (Uuid::new_v4().to_string(), Uuid::new_v4().to_string())
    };
    
    let kasa_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // TRANSACTION BAŞLAT
    conn.transaction::<_, diesel::result::Error, _>(|conn| {
        // 7. TENANT OLUŞTUR
        diesel::sql_query(
            "INSERT INTO tenants (id, name, slug, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, 1, ?4, ?5)"
        )
        .bind::<diesel::sql_types::Text, _>(&tenant_id)
        .bind::<diesel::sql_types::Text, _>(&data.name)
        .bind::<diesel::sql_types::Text, _>(&slug)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&now)
        .execute(conn)?;

        // 8. LİSANSI TENANT'A BAĞLA
        diesel::sql_query(
            "UPDATE licenses SET tenant_id = ?1, updated_at = ?2 WHERE license_key = ?3"
        )
        .bind::<diesel::sql_types::Text, _>(&tenant_id)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&license_key)
        .execute(conn)?;

        // 9. ADMIN KULLANICI OLUŞTUR
        let username = data.admin_email.split('@').next().unwrap_or("admin").to_string();
        let password_hash = hash_password(&data.admin_password);
        
        diesel::sql_query(
            "INSERT INTO users (id, tenant_id, username, email, password_hash, full_name, role, phone, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'ADMIN', ?7, 1, ?8, ?9)"
        )
        .bind::<diesel::sql_types::Text, _>(&user_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id)
        .bind::<diesel::sql_types::Text, _>(&username)
        .bind::<diesel::sql_types::Text, _>(&data.admin_email)
        .bind::<diesel::sql_types::Text, _>(&password_hash)
        .bind::<diesel::sql_types::Text, _>(&data.admin_name)
        .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.phone)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&now)
        .execute(conn)?;

        // 10. VARSAYILAN KASA OLUŞTUR
        diesel::sql_query(
            "INSERT INTO kasalar (id, tenant_id, kasa_adi, bakiye, para_birimi, fiziksel_bakiye, serbest_bakiye, is_active, created_at, updated_at)
             VALUES (?1, ?2, 'Ana Kasa', 0, 'TRY', 0, 0, 1, ?3, ?4)"
        )
        .bind::<diesel::sql_types::Text, _>(&kasa_id)
        .bind::<diesel::sql_types::Text, _>(&tenant_id)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&now)
        .execute(conn)?;

        // 11. VARSAYILAN GELİR TÜRLERİ OLUŞTUR
        create_default_gelir_turleri(conn, &tenant_id, &now)?;

        // 12. VARSAYILAN GİDER TÜRLERİ OLUŞTUR
        create_default_gider_turleri(conn, &tenant_id, &now)?;

        Ok(())
    })
    .map_err(|e| format!("Kurulum başarısız: {}", e))?;

    Ok(CreateTenantResponse {
        tenant_id,
        user_id,
        message: "Dernek kurulumu başarıyla tamamlandı".to_string(),
    })
}

/// Slug müsait mi kontrol et
#[tauri::command]
pub fn check_slug_available(
    slug: String,
    state: State<AppState>,
) -> Result<SlugCheckResponse, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let sanitized = sanitize_slug(&slug);
    let available = is_slug_available(&sanitized, &mut conn)?;

    let suggestion = if !available {
        Some(format!("{}-{}", sanitized, &Uuid::new_v4().to_string()[..4]))
    } else {
        None
    };

    Ok(SlugCheckResponse { available, suggestion })
}

/// Tenant bilgilerini getir
#[tauri::command]
pub fn get_tenant(
    tenant_id: String,
    state: State<AppState>,
) -> Result<TenantInfo, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    #[derive(QueryableByName)]
    struct TenantRow {
        #[diesel(sql_type = diesel::sql_types::Text)]
        id: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        name: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        slug: String,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        is_active: i32,
        #[diesel(sql_type = diesel::sql_types::Text)]
        created_at: String,
    }

    let tenant = diesel::sql_query(
        "SELECT id, name, slug, is_active, created_at FROM tenants WHERE id = ?1"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id)
    .get_result::<TenantRow>(&mut conn)
    .map_err(|_| "Dernek bulunamadı".to_string())?;

    // Kullanıcı sayısı
    #[derive(QueryableByName)]
    struct CountRow {
        #[diesel(sql_type = diesel::sql_types::Integer)]
        count: i32,
    }

    let user_count = diesel::sql_query(
        "SELECT COUNT(*) as count FROM users WHERE tenant_id = ?1 AND is_active = 1"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id)
    .get_result::<CountRow>(&mut conn)
    .map(|r| r.count)
    .unwrap_or(0);

    // Üye sayısı
    let member_count = diesel::sql_query(
        "SELECT COUNT(*) as count FROM uyeler WHERE tenant_id = ?1 AND durum = 'Aktif'"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id)
    .get_result::<CountRow>(&mut conn)
    .map(|r| r.count)
    .unwrap_or(0);

    Ok(TenantInfo {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        is_active: tenant.is_active == 1,
        created_at: tenant.created_at,
        user_count,
        member_count,
    })
}

/// Tenant güncelle
#[tauri::command]
pub fn update_tenant(
    tenant_id: String,
    data: UpdateTenantRequest,
    state: State<AppState>,
) -> Result<String, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Slug değişiyorsa benzersizlik kontrolü
    if let Some(ref new_slug) = data.slug {
        let sanitized = sanitize_slug(new_slug);
        
        #[derive(QueryableByName)]
        struct SlugCheck {
            #[diesel(sql_type = diesel::sql_types::Integer)]
            count: i32,
        }
        
        let exists = diesel::sql_query(
            "SELECT COUNT(*) as count FROM tenants WHERE slug = ?1 AND id != ?2"
        )
        .bind::<diesel::sql_types::Text, _>(&sanitized)
        .bind::<diesel::sql_types::Text, _>(&tenant_id)
        .get_result::<SlugCheck>(&mut conn)
        .map(|r| r.count > 0)
        .unwrap_or(false);

        if exists {
            return Err("Bu slug zaten kullanılıyor".to_string());
        }
    }

    // Dinamik UPDATE oluştur
    let mut updates = vec!["updated_at = ?1".to_string()];
    let mut param_index = 2;

    if data.name.is_some() {
        updates.push(format!("name = ?{}", param_index));
        param_index += 1;
    }
    if data.slug.is_some() {
        updates.push(format!("slug = ?{}", param_index));
        param_index += 1;
    }
    if data.is_active.is_some() {
        updates.push(format!("is_active = ?{}", param_index));
    }

    let sql = format!(
        "UPDATE tenants SET {} WHERE id = ?{}",
        updates.join(", "),
        param_index
    );

    // Basit güncelleme (sadece name için örnek)
    if let Some(ref name) = data.name {
        diesel::sql_query(
            "UPDATE tenants SET name = ?1, updated_at = ?2 WHERE id = ?3"
        )
        .bind::<diesel::sql_types::Text, _>(name)
        .bind::<diesel::sql_types::Text, _>(&now)
        .bind::<diesel::sql_types::Text, _>(&tenant_id)
        .execute(&mut conn)
        .map_err(|e| format!("Güncelleme başarısız: {}", e))?;
    }

    Ok("Dernek bilgileri güncellendi".to_string())
}

/// Tüm tenant'ları listele (superadmin için)
#[tauri::command]
pub fn list_tenants(
    state: State<AppState>,
) -> Result<Vec<TenantInfo>, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    #[derive(QueryableByName)]
    struct TenantRow {
        #[diesel(sql_type = diesel::sql_types::Text)]
        id: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        name: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        slug: String,
        #[diesel(sql_type = diesel::sql_types::Integer)]
        is_active: i32,
        #[diesel(sql_type = diesel::sql_types::Text)]
        created_at: String,
    }

    let tenants = diesel::sql_query(
        "SELECT id, name, slug, is_active, created_at FROM tenants ORDER BY created_at DESC"
    )
    .load::<TenantRow>(&mut conn)
    .map_err(|e| format!("Listeleme başarısız: {}", e))?;

    let mut result = Vec::new();
    for t in tenants {
        result.push(TenantInfo {
            id: t.id,
            name: t.name,
            slug: t.slug,
            is_active: t.is_active == 1,
            created_at: t.created_at,
            user_count: 0,
            member_count: 0,
        });
    }

    Ok(result)
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/// Slug'ı temizle ve formatla
fn sanitize_slug(input: &str) -> String {
    input
        .to_lowercase()
        .replace('ğ', "g")
        .replace('ü', "u")
        .replace('ş', "s")
        .replace('ı', "i")
        .replace('ö', "o")
        .replace('ç', "c")
        .replace('Ğ', "g")
        .replace('Ü', "u")
        .replace('Ş', "s")
        .replace('İ', "i")
        .replace('Ö', "o")
        .replace('Ç', "c")
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

/// Slug müsait mi kontrol et
fn is_slug_available(slug: &str, conn: &mut diesel::sqlite::SqliteConnection) -> Result<bool, String> {
    #[derive(QueryableByName)]
    struct CountRow {
        #[diesel(sql_type = diesel::sql_types::Integer)]
        count: i32,
    }

    let result = diesel::sql_query(
        "SELECT COUNT(*) as count FROM tenants WHERE slug = ?1"
    )
    .bind::<diesel::sql_types::Text, _>(slug)
    .get_result::<CountRow>(conn)
    .map_err(|e| format!("Slug kontrolü başarısız: {}", e))?;

    Ok(result.count == 0)
}

/// Şifreyi bcrypt ile hashle
fn hash_password(password: &str) -> String {
    hash(password, DEFAULT_COST)
        .unwrap_or_else(|_| format!("HASH_ERROR_{}", password))
}

/// Varsayılan gelir türlerini oluştur
fn create_default_gelir_turleri(
    conn: &mut diesel::sqlite::SqliteConnection,
    tenant_id: &str,
    now: &str,
) -> Result<(), diesel::result::Error> {
    let turleri = vec![
        ("Aidat Geliri", "AIDAT", "Üye aidat ödemeleri"),
        ("Bağış", "BAGIS", "Bağış ve yardımlar"),
        ("Etkinlik Geliri", "ETKINLIK", "Etkinlik katılım ücretleri"),
        ("Faiz Geliri", "FAIZ", "Banka faiz gelirleri"),
        ("Diğer Gelirler", "DIGER", "Diğer gelir kalemleri"),
    ];

    for (ad, kod, aciklama) in turleri {
        let id = Uuid::new_v4().to_string();
        diesel::sql_query(
            "INSERT INTO gelir_turleri (id, tenant_id, ad, kod, aciklama, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7)"
        )
        .bind::<diesel::sql_types::Text, _>(&id)
        .bind::<diesel::sql_types::Text, _>(tenant_id)
        .bind::<diesel::sql_types::Text, _>(ad)
        .bind::<diesel::sql_types::Text, _>(kod)
        .bind::<diesel::sql_types::Text, _>(aciklama)
        .bind::<diesel::sql_types::Text, _>(now)
        .bind::<diesel::sql_types::Text, _>(now)
        .execute(conn)?;
    }

    Ok(())
}

/// Varsayılan gider türlerini oluştur
fn create_default_gider_turleri(
    conn: &mut diesel::sqlite::SqliteConnection,
    tenant_id: &str,
    now: &str,
) -> Result<(), diesel::result::Error> {
    let turleri = vec![
        ("Kira", "KIRA", "Ofis kira ödemeleri"),
        ("Elektrik", "ELEKTRIK", "Elektrik faturaları"),
        ("Su", "SU", "Su faturaları"),
        ("Doğalgaz", "DOGALGAZ", "Doğalgaz faturaları"),
        ("İnternet", "INTERNET", "İnternet faturaları"),
        ("Telefon", "TELEFON", "Telefon faturaları"),
        ("Personel Maaşı", "MAAS", "Personel maaş ödemeleri"),
        ("Kırtasiye", "KIRTASIYE", "Kırtasiye malzemeleri"),
        ("Etkinlik Gideri", "ETKINLIK", "Etkinlik masrafları"),
        ("Bakım Onarım", "BAKIM", "Bakım ve onarım giderleri"),
        ("Diğer Giderler", "DIGER", "Diğer gider kalemleri"),
    ];

    for (ad, kod, aciklama) in turleri {
        let id = Uuid::new_v4().to_string();
        diesel::sql_query(
            "INSERT INTO gider_turleri (id, tenant_id, ad, kod, aciklama, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7)"
        )
        .bind::<diesel::sql_types::Text, _>(&id)
        .bind::<diesel::sql_types::Text, _>(tenant_id)
        .bind::<diesel::sql_types::Text, _>(ad)
        .bind::<diesel::sql_types::Text, _>(kod)
        .bind::<diesel::sql_types::Text, _>(aciklama)
        .bind::<diesel::sql_types::Text, _>(now)
        .bind::<diesel::sql_types::Text, _>(now)
        .execute(conn)?;
    }

    Ok(())
}