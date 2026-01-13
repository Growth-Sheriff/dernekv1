# Eksik Backend Komutları - Detaylı Liste

Bu dosya, frontend'in kullandığı ancak backend'de bulunmayan veya eksik olan komutların tam listesini içerir.

---

## 🔴 KRİTİK EKSİKLER

### 1. KULLANICI YÖNETİMİ (`kullanici.rs`)

#### Mevcut Durum:
```rust
// ✅ VAR
create_user(tenant_id: String, data: CreateUserRequest) -> Result<User, String>
delete_user(tenant_id: String, user_id: String) -> Result<(), String>
get_current_user(tenant_id: String) -> Result<User, String>
```

#### ❌ EKSİK KOMUTLAR:

```rust
// 1. Kullanıcı listesi
#[tauri::command]
pub async fn get_users(
    state: State<'_, AppState>,
    tenant_id: String,
    role: Option<String>,
    is_active: Option<bool>,
    skip: i64,
    limit: i64,
) -> Result<Vec<User>, String> {
    // Kullanıcı listesi, rol ve durum filtreleme ile
}

// 2. Kullanıcı güncelleme
#[tauri::command]
pub async fn update_user(
    state: State<'_, AppState>,
    tenant_id: String,
    user_id: String,
    data: UpdateUserRequest,
) -> Result<User, String> {
    // Ad, email, rol, şifre güncelleme
}

// 3. Şifre değiştirme (opsiyonel)
#[tauri::command]
pub async fn change_password(
    state: State<'_, AppState>,
    tenant_id: String,
    user_id: String,
    old_password: String,
    new_password: String,
) -> Result<(), String> {
    // Eski şifre kontrolü + yeni şifre kaydetme
}

// 4. Kullanıcı rolü değiştirme
#[tauri::command]
pub async fn update_user_role(
    state: State<'_, AppState>,
    tenant_id: String,
    user_id: String,
    new_role: String,
) -> Result<User, String> {
    // Rol güncelleme
}
```

**UpdateUserRequest struct:**
```rust
#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub ad: Option<String>,
    pub email: Option<String>,
    pub role: Option<String>,
    pub is_active: Option<bool>,
    pub telefon: Option<String>,
}
```

---

### 2. AİLE ÜYELERİ (`aile_uyeleri.rs`)

#### Mevcut Durum:
```rust
// ✅ VAR
get_aile_uyeleri(uye_id: String) -> Result<Vec<AileUyesi>, String>
create_aile_uyesi(data: CreateAileUyesiRequest) -> Result<AileUyesi, String>
delete_aile_uyesi(id: String) -> Result<(), String>
```

#### ❌ EKSİK KOMUT:

```rust
// Update aile üyesi
#[tauri::command]
pub async fn update_aile_uyesi(
    state: State<'_, AppState>,
    tenant_id: String,
    aile_uyesi_id: String,
    data: UpdateAileUyesiRequest,
) -> Result<AileUyesi, String> {
    // TENANT ISOLATION
    state.verify_tenant_access(&tenant_id)?;
    
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    diesel::sql_query(
        "UPDATE aile_uyeleri 
         SET ad = COALESCE(?1, ad),
             soyad = COALESCE(?2, soyad),
             yakinlik = COALESCE(?3, yakinlik),
             dogum_tarihi = COALESCE(?4, dogum_tarihi),
             telefon = COALESCE(?5, telefon),
             notlar = COALESCE(?6, notlar),
             updated_at = ?7
         WHERE id = ?8 AND tenant_id = ?9"
    )
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.ad)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.soyad)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.yakinlik)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.dogum_tarihi)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.telefon)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(&data.notlar)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&aile_uyesi_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    // Return updated record
    diesel::sql_query("SELECT * FROM aile_uyeleri WHERE id = ?1")
        .bind::<diesel::sql_types::Text, _>(&aile_uyesi_id)
        .get_result::<AileUyesi>(&mut conn)
        .map_err(|e| e.to_string())
}
```

**UpdateAileUyesiRequest struct:**
```rust
#[derive(Debug, Deserialize)]
pub struct UpdateAileUyesiRequest {
    pub ad: Option<String>,
    pub soyad: Option<String>,
    pub yakinlik: Option<String>,
    pub dogum_tarihi: Option<String>,
    pub telefon: Option<String>,
    pub notlar: Option<String>,
}
```

---

### 3. GELİR TÜRLERİ (`gelir_turleri.rs`)

#### Mevcut Durum:
```rust
// ✅ VAR
get_gelir_turleri(tenant_id: String) -> Result<Vec<GelirTuru>, String>
create_gelir_turu(tenant_id: String, data: CreateGelirTuruRequest) -> Result<GelirTuru, String>
delete_gelir_turu(tenant_id: String, id: String) -> Result<(), String>
```

#### ❌ EKSİK KOMUT:

```rust
// Update gelir türü
#[tauri::command]
pub async fn update_gelir_turu(
    state: State<'_, AppState>,
    tenant_id: String,
    gelir_turu_id: String,
    data: UpdateGelirTuruRequest,
) -> Result<GelirTuru, String> {
    state.verify_tenant_access(&tenant_id)?;
    
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Get current record
    let current = diesel::sql_query(
        "SELECT * FROM gelir_turleri WHERE id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&gelir_turu_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id)
    .get_result::<GelirTuru>(&mut conn)
    .map_err(|e| e.to_string())?;

    diesel::sql_query(
        "UPDATE gelir_turleri 
         SET ad = ?1, aciklama = ?2, is_active = ?3, updated_at = ?4
         WHERE id = ?5 AND tenant_id = ?6"
    )
    .bind::<diesel::sql_types::Text, _>(data.ad.unwrap_or(current.ad))
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(data.aciklama.or(current.aciklama))
    .bind::<diesel::sql_types::Bool, _>(data.is_active.unwrap_or(current.is_active))
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&gelir_turu_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    diesel::sql_query("SELECT * FROM gelir_turleri WHERE id = ?1")
        .bind::<diesel::sql_types::Text, _>(&gelir_turu_id)
        .get_result::<GelirTuru>(&mut conn)
        .map_err(|e| e.to_string())
}
```

**UpdateGelirTuruRequest struct:**
```rust
#[derive(Debug, Deserialize)]
pub struct UpdateGelirTuruRequest {
    pub ad: Option<String>,
    pub aciklama: Option<String>,
    pub is_active: Option<bool>,
}
```

---

### 4. GİDER TÜRLERİ (`gider_turleri.rs`)

#### Mevcut Durum:
```rust
// ✅ VAR
get_gider_turleri(tenant_id: String) -> Result<Vec<GiderTuru>, String>
create_gider_turu(tenant_id: String, data: CreateGiderTuruRequest) -> Result<GiderTuru, String>
delete_gider_turu(tenant_id: String, id: String) -> Result<(), String>
```

#### ❌ EKSİK KOMUT:

```rust
// Update gider türü
#[tauri::command]
pub async fn update_gider_turu(
    state: State<'_, AppState>,
    tenant_id: String,
    gider_turu_id: String,
    data: UpdateGiderTuruRequest,
) -> Result<GiderTuru, String> {
    state.verify_tenant_access(&tenant_id)?;
    
    let pool = state.db.lock().unwrap();
    let pool = pool.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Get current record
    let current = diesel::sql_query(
        "SELECT * FROM gider_turleri WHERE id = ?1 AND tenant_id = ?2"
    )
    .bind::<diesel::sql_types::Text, _>(&gider_turu_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id)
    .get_result::<GiderTuru>(&mut conn)
    .map_err(|e| e.to_string())?;

    diesel::sql_query(
        "UPDATE gider_turleri 
         SET ad = ?1, aciklama = ?2, is_active = ?3, updated_at = ?4
         WHERE id = ?5 AND tenant_id = ?6"
    )
    .bind::<diesel::sql_types::Text, _>(data.ad.unwrap_or(current.ad))
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(data.aciklama.or(current.aciklama))
    .bind::<diesel::sql_types::Bool, _>(data.is_active.unwrap_or(current.is_active))
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&gider_turu_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    diesel::sql_query("SELECT * FROM gider_turleri WHERE id = ?1")
        .bind::<diesel::sql_types::Text, _>(&gider_turu_id)
        .get_result::<GiderTuru>(&mut conn)
        .map_err(|e| e.to_string())
}
```

**UpdateGiderTuruRequest struct:**
```rust
#[derive(Debug, Deserialize)]
pub struct UpdateGiderTuruRequest {
    pub ad: Option<String>,
    pub aciklama: Option<String>,
    pub is_active: Option<bool>,
}
```

---

## ⚠️ SCHEMA HATALARI

### BÜTÇE TABLOSU (`butce` table)

#### Mevcut Schema:
```sql
CREATE TABLE butce (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    yil INTEGER NOT NULL,
    donem TEXT NOT NULL,
    gelir_hedefi REAL NOT NULL,
    gider_hedefi REAL NOT NULL,
    notlar TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

#### ❌ EKSİK KOLONLAR:

```sql
-- Migration gerekli:
ALTER TABLE butce ADD COLUMN gerceklesen_gelir REAL DEFAULT 0.0;
ALTER TABLE butce ADD COLUMN gerceklesen_gider REAL DEFAULT 0.0;
```

#### Güncellenmesi Gereken Komut:

```rust
// Şu anki update_butce_gerceklesen düzeltilmeli:
#[tauri::command]
pub fn update_butce_gerceklesen(
    state: State<AppState>,
    tenant_id: String,
    butce_id: String,
    request: UpdateButceGerceklesenRequest,
) -> Result<Butce, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();

    diesel::sql_query(
        "UPDATE butce 
         SET gerceklesen_gelir = COALESCE(?1, gerceklesen_gelir),
             gerceklesen_gider = COALESCE(?2, gerceklesen_gider),
             updated_at = ?3
         WHERE id = ?4 AND tenant_id = ?5"
    )
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Double>, _>(&request.gerceklesen_gelir)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Double>, _>(&request.gerceklesen_gider)
    .bind::<diesel::sql_types::Text, _>(&now)
    .bind::<diesel::sql_types::Text, _>(&butce_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id)
    .execute(&mut conn)
    .map_err(|e| e.to_string())?;

    diesel::sql_query("SELECT * FROM butce WHERE id = ?1")
        .bind::<diesel::sql_types::Text, _>(&butce_id)
        .get_result::<Butce>(&mut conn)
        .map_err(|e| e.to_string())
}
```

---

## 🟡 ORTA ÖNCELİKLİ İYİLEŞTİRMELER

### 1. BELGE İNDİRME (`belgeler.rs`)

#### Şu anki `download_belge` komutu:
```rust
// Sadece dosya yolu döndürüyor, gerçek indirme yok
pub fn download_belge(
    state: State<AppState>,
    tenant_id: String,
    belge_id: String,
) -> Result<String, String> {
    // ... dosya yolu döndürüyor
    Ok(result.dosya_yolu)
}
```

#### İYİLEŞTİRİLMİŞ VERSİYON:

```rust
use tauri::api::dialog;

#[tauri::command]
pub async fn download_belge_with_dialog(
    state: State<'_, AppState>,
    tenant_id: String,
    belge_id: String,
    window: tauri::Window,
) -> Result<String, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    // Belge bilgisini getir
    #[derive(QueryableByName)]
    struct BelgeInfo {
        #[diesel(sql_type = diesel::sql_types::Text)]
        dosya_yolu: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        dosya_adi: String,
    }

    let belge = diesel::sql_query(
        "SELECT dosya_yolu, dosya_adi FROM belgeler WHERE id = ?1 AND tenant_id = ?2 AND is_active = 1"
    )
    .bind::<diesel::sql_types::Text, _>(&belge_id)
    .bind::<diesel::sql_types::Text, _>(&tenant_id)
    .get_result::<BelgeInfo>(&mut conn)
    .map_err(|e| format!("Belge bulunamadı: {}", e))?;

    // Tauri file dialog ile kaydetme yeri seç
    use tauri::api::dialog::blocking::FileDialogBuilder;
    
    let save_path = FileDialogBuilder::new()
        .set_file_name(&belge.dosya_adi)
        .save_file();

    if let Some(destination) = save_path {
        // Dosyayı kopyala
        std::fs::copy(&belge.dosya_yolu, &destination)
            .map_err(|e| format!("Dosya kopyalanamadı: {}", e))?;
        
        Ok(destination.to_string_lossy().to_string())
    } else {
        Err("Kaydetme iptal edildi".to_string())
    }
}
```

---

### 2. DASHBOARD İSTATİSTİKLERİ EKSİKLERİ

#### Mevcut `get_aidat_stats` sorunu:
```rust
// "odeme_durumu" kolonu yok, "durum" kullanılmalı
let odenen_adet: i64 = diesel::sql_query(
    "SELECT COUNT(*) as count FROM aidat_takip WHERE tenant_id = ?1 AND yil = ?2 AND odeme_durumu = 'Ödendi'"
)
```

#### DÜZELTİLMİŞ VERSİYON:
```rust
#[tauri::command]
pub fn get_aidat_stats(
    state: State<AppState>,
    tenant_id: String,
    yil: Option<i32>,
) -> Result<AidatStats, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let mut conn = pool.get().map_err(|e| e.to_string())?;

    let current_year = chrono::Utc::now().year();
    let target_year = yil.unwrap_or(current_year);

    // Ödenen adet (durum = 'odendi')
    let odenen_adet: i64 = diesel::sql_query(
        "SELECT COUNT(*) as count FROM aidat_takip WHERE tenant_id = ?1 AND yil = ?2 AND durum = 'odendi'"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id)
    .bind::<diesel::sql_types::Integer, _>(target_year)
    .get_result::<CountResult>(&mut conn)
    .map(|r| r.count)
    .unwrap_or(0);

    // Geciken adet (durum = 'gecikti')
    let geciken_adet: i64 = diesel::sql_query(
        "SELECT COUNT(*) as count FROM aidat_takip WHERE tenant_id = ?1 AND yil = ?2 AND durum = 'gecikti'"
    )
    .bind::<diesel::sql_types::Text, _>(&tenant_id)
    .bind::<diesel::sql_types::Integer, _>(target_year)
    .get_result::<CountResult>(&mut conn)
    .map(|r| r.count)
    .unwrap_or(0);

    // ... rest of the code
}
```

---

## 📋 ÖNLEM ALINAN MODÜLLER (✅ Tamamlanmış)

### Köy Modülü - ÖRNEK ALINMALI ✅

Köy modülü tüm CRUD işlemlerini eksiksiz tamamlamış:

```rust
// ✅ Köy Kasalar
get_koy_kasalar, create_koy_kasa, update_koy_kasa, delete_koy_kasa

// ✅ Köy Gelirler  
get_koy_gelirler, create_koy_gelir, update_koy_gelir, delete_koy_gelir

// ✅ Köy Giderler
get_koy_giderler, create_koy_gider, update_koy_gider, delete_koy_gider

// ✅ Köy Virmanlar
get_koy_virmanlar, create_koy_virman, delete_koy_virman
```

**Not:** Köy modülündeki update fonksiyonları transaction kullanıyor ve kasa güncellemelerini doğru yapıyor. Diğer modüller için örnek alınabilir.

---

## 🎯 UYGULAMA PLANI

### Gün 1: Kullanıcı Yönetimi
- [ ] `get_users` komutunu ekle
- [ ] `update_user` komutunu ekle
- [ ] Frontend `/ayarlar/kullanicilar` sayfasını güncelle

### Gün 2: Aile Üyeleri + Türler
- [ ] `update_aile_uyesi` komutunu ekle
- [ ] `update_gelir_turu` komutunu ekle
- [ ] `update_gider_turu` komutunu ekle

### Gün 3: Bütçe Modülü
- [ ] Migration yap (gerceklesen alanları ekle)
- [ ] `update_butce_gerceklesen` komutunu düzelt
- [ ] Frontend `/butce/detail` sayfasını güncelle

### Gün 4: Dashboard + Belge İyileştirmeleri
- [ ] `get_aidat_stats` komutunu düzelt
- [ ] `download_belge_with_dialog` ekle
- [ ] Dashboard entegrasyonunu tamamla

---

**Toplam Tahmini Süre:** 4 iş günü  
**Kritik Seviye:** 🔴 Yüksek  
**Etki:** Sistem kullanılabilirliğini %95'e çıkaracak
