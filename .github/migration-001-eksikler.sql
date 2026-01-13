-- Migration 001: Eksik Kolonlar ve Tablolar
-- Tarih: 2026-01-08
-- Amaç: Karşılaştırma raporunda tespit edilen eksiklikleri tamamlama

-- ============================================================================
-- 1. gelirler tablosuna notlar kolonu ekle
-- ============================================================================

ALTER TABLE gelirler ADD COLUMN IF NOT EXISTS notlar TEXT;

COMMENT ON COLUMN gelirler.notlar IS 'Gelir ile ilgili ek notlar ve açıklamalar';

-- ============================================================================
-- 2. roles tablosu - Rol yönetimi için
-- ============================================================================

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_roles_active ON roles(is_active);

COMMENT ON TABLE roles IS 'Rol tanımları - her tenant için özelleştirilebilir roller';
COMMENT ON COLUMN roles.permissions IS 'Rol için izin kodları array - ["uyeler.ekle", "uyeler.duzenle", "mali.goruntule"]';
COMMENT ON COLUMN roles.is_system IS 'Sistem rolü mü (ADMIN, MUHASEBECI vb.) - silinemeyen roller';

-- RLS policy
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY roles_tenant_isolation ON roles
    USING (tenant_id::text = current_setting('app.current_tenant', TRUE));

-- Trigger
CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. user_roles tablosu - Kullanıcı-Rol ilişkisi
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

COMMENT ON TABLE user_roles IS 'Kullanıcı-Rol ilişkileri - bir kullanıcı birden fazla rol alabilir';

-- RLS policy (user_id üzerinden tenant'a bağlı)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_roles_tenant_isolation ON user_roles
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = user_roles.user_id 
            AND users.tenant_id::text = current_setting('app.current_tenant', TRUE)
        )
    );

-- ============================================================================
-- 4. permissions tablosu - İzin tanımları (global - tenant'a bağlı değil)
-- ============================================================================

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);

COMMENT ON TABLE permissions IS 'Sistem izinleri - global tanımlar (tenant''a bağlı değil)';
COMMENT ON COLUMN permissions.code IS 'Benzersiz izin kodu - örn: "uyeler.ekle", "mali.goruntule"';

-- ============================================================================
-- 5. Varsayılan izinleri ekle
-- ============================================================================

INSERT INTO permissions (code, module, name, description, category) VALUES
-- Üye yönetimi
('uyeler.goruntule', 'uyeler', 'Üyeleri Görüntüle', 'Üye listesini ve detaylarını görüntüleme', 'uyeler'),
('uyeler.ekle', 'uyeler', 'Üye Ekle', 'Yeni üye ekleme', 'uyeler'),
('uyeler.duzenle', 'uyeler', 'Üye Düzenle', 'Üye bilgilerini güncelleme', 'uyeler'),
('uyeler.sil', 'uyeler', 'Üye Sil', 'Üye silme/arşivleme', 'uyeler'),
('uyeler.export', 'uyeler', 'Üye Export', 'Üye listesini Excel/PDF olarak dışa aktarma', 'uyeler'),

-- Aidat yönetimi
('aidat.goruntule', 'aidat', 'Aidat Görüntüle', 'Aidat kayıtlarını görüntüleme', 'aidat'),
('aidat.ekle', 'aidat', 'Aidat Ekle', 'Aidat ödeme kaydı ekleme', 'aidat'),
('aidat.duzenle', 'aidat', 'Aidat Düzenle', 'Aidat kaydını düzenleme', 'aidat'),
('aidat.sil', 'aidat', 'Aidat Sil', 'Aidat kaydını silme', 'aidat'),
('aidat.toplu_olustur', 'aidat', 'Toplu Aidat Oluştur', 'Tüm üyeler için yıllık aidat oluşturma', 'aidat'),

-- Mali işlemler
('mali.goruntule', 'mali', 'Mali İşlemleri Görüntüle', 'Gelir/gider/kasa görüntüleme', 'mali'),
('gelir.ekle', 'mali', 'Gelir Ekle', 'Gelir kaydı ekleme', 'mali'),
('gelir.duzenle', 'mali', 'Gelir Düzenle', 'Gelir kaydı düzenleme', 'mali'),
('gelir.sil', 'mali', 'Gelir Sil', 'Gelir kaydı silme', 'mali'),
('gider.ekle', 'mali', 'Gider Ekle', 'Gider kaydı ekleme', 'mali'),
('gider.duzenle', 'mali', 'Gider Düzenle', 'Gider kaydı düzenleme', 'mali'),
('gider.sil', 'mali', 'Gider Sil', 'Gider kaydı silme', 'mali'),
('kasa.goruntule', 'mali', 'Kasa Görüntüle', 'Kasa bakiyelerini görüntüleme', 'mali'),
('kasa.yonet', 'mali', 'Kasa Yönet', 'Kasa ekleme/düzenleme/silme', 'mali'),
('virman.ekle', 'mali', 'Virman Ekle', 'Kasalar arası transfer yapma', 'mali'),

-- Raporlar
('raporlar.goruntule', 'raporlar', 'Raporları Görüntüle', 'Tüm raporları görüntüleme', 'raporlar'),
('raporlar.export', 'raporlar', 'Rapor Export', 'Raporları Excel/PDF olarak dışa aktarma', 'raporlar'),

-- Etkinlik ve Toplantı
('etkinlik.goruntule', 'etkinlik', 'Etkinlik Görüntüle', 'Etkinlikleri görüntüleme', 'etkinlik'),
('etkinlik.ekle', 'etkinlik', 'Etkinlik Ekle', 'Yeni etkinlik oluşturma', 'etkinlik'),
('etkinlik.duzenle', 'etkinlik', 'Etkinlik Düzenle', 'Etkinlik düzenleme', 'etkinlik'),
('etkinlik.sil', 'etkinlik', 'Etkinlik Sil', 'Etkinlik silme', 'etkinlik'),
('toplanti.goruntule', 'toplanti', 'Toplantı Görüntüle', 'Toplantıları görüntüleme', 'toplanti'),
('toplanti.ekle', 'toplanti', 'Toplantı Ekle', 'Yeni toplantı oluşturma', 'toplanti'),
('toplanti.duzenle', 'toplanti', 'Toplantı Düzenle', 'Toplantı düzenleme', 'toplanti'),
('toplanti.sil', 'toplanti', 'Toplantı Sil', 'Toplantı silme', 'toplanti'),

-- Belgeler
('belge.goruntule', 'belge', 'Belge Görüntüle', 'Belgeleri görüntüleme', 'belge'),
('belge.ekle', 'belge', 'Belge Ekle', 'Belge yükleme', 'belge'),
('belge.duzenle', 'belge', 'Belge Düzenle', 'Belge bilgilerini düzenleme', 'belge'),
('belge.sil', 'belge', 'Belge Sil', 'Belge silme', 'belge'),

-- Bütçe
('butce.goruntule', 'butce', 'Bütçe Görüntüle', 'Bütçe planlarını görüntüleme', 'butce'),
('butce.yonet', 'butce', 'Bütçe Yönet', 'Bütçe planlama ve düzenleme', 'butce'),

-- Devir işlemleri
('devir.goruntule', 'devir', 'Devir Görüntüle', 'Devir kayıtlarını görüntüleme', 'devir'),
('devir.uygula', 'devir', 'Devir Uygula', 'Yıl sonu devir işlemini uygulama', 'devir'),

-- Köy modülü
('koy.goruntule', 'koy', 'Köy Modülü Görüntüle', 'Köy işlemlerini görüntüleme', 'koy'),
('koy.yonet', 'koy', 'Köy Modülü Yönet', 'Köy işlemlerini yönetme', 'koy'),

-- Kullanıcı yönetimi
('kullanici.goruntule', 'kullanici', 'Kullanıcı Görüntüle', 'Kullanıcı listesini görüntüleme', 'kullanici'),
('kullanici.ekle', 'kullanici', 'Kullanıcı Ekle', 'Yeni kullanıcı ekleme', 'kullanici'),
('kullanici.duzenle', 'kullanici', 'Kullanıcı Düzenle', 'Kullanıcı bilgilerini güncelleme', 'kullanici'),
('kullanici.sil', 'kullanici', 'Kullanıcı Sil', 'Kullanıcı silme/devre dışı bırakma', 'kullanici'),
('rol.yonet', 'kullanici', 'Rol Yönet', 'Rol atama/kaldırma', 'kullanici'),

-- Ayarlar
('ayarlar.goruntule', 'ayarlar', 'Ayarları Görüntüle', 'Sistem ayarlarını görüntüleme', 'ayarlar'),
('ayarlar.duzenle', 'ayarlar', 'Ayarları Düzenle', 'Sistem ayarlarını değiştirme', 'ayarlar'),

-- Sistem
('sistem.yedekleme', 'sistem', 'Yedekleme', 'Veritabanı yedeği alma/geri yükleme', 'sistem'),
('sistem.loglari_goruntule', 'sistem', 'Logları Görüntüle', 'Sistem loglarını görüntüleme', 'sistem'),
('sistem.admin', 'sistem', 'Sistem Yönetimi', 'Tam sistem yönetimi yetkisi', 'sistem')

ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 6. Varsayılan sistem rollerini oluştur (şablon - tenant_id manuel eklenecek)
-- ============================================================================

-- NOT: Bu INSERT'ler tenant_id gerektirdiği için yorum satırı olarak bırakılmıştır.
-- Her tenant için bu roller application layer'da (FastAPI) oluşturulacaktır.

/*
-- ADMIN rolü - Tam yetki
INSERT INTO roles (tenant_id, name, display_name, description, permissions, is_system) VALUES
('TENANT_ID_BURAYA', 'ADMIN', 'Yönetici', 'Tam yetki - tüm işlemler', 
'["sistem.admin"]'::jsonb, TRUE);

-- MUHASEBECI rolü - Mali işlemler
INSERT INTO roles (tenant_id, name, display_name, description, permissions, is_system) VALUES
('TENANT_ID_BURAYA', 'MUHASEBECI', 'Muhasebeci', 'Mali işlemler ve raporlar', 
'["mali.goruntule", "gelir.ekle", "gelir.duzenle", "gider.ekle", "gider.duzenle", "kasa.goruntule", "virman.ekle", "aidat.goruntule", "aidat.ekle", "raporlar.goruntule", "raporlar.export", "butce.goruntule", "butce.yonet"]'::jsonb, TRUE);

-- SEKRETER rolü - Üye ve etkinlik yönetimi
INSERT INTO roles (tenant_id, name, display_name, description, permissions, is_system) VALUES
('TENANT_ID_BURAYA', 'SEKRETER', 'Sekreter', 'Üye ve etkinlik yönetimi', 
'["uyeler.goruntule", "uyeler.ekle", "uyeler.duzenle", "etkinlik.goruntule", "etkinlik.ekle", "etkinlik.duzenle", "toplanti.goruntule", "toplanti.ekle", "toplanti.duzenle", "belge.goruntule", "belge.ekle", "aidat.goruntule"]'::jsonb, TRUE);

-- GORUNTULEYICI rolü - Sadece görüntüleme
INSERT INTO roles (tenant_id, name, display_name, description, permissions, is_system) VALUES
('TENANT_ID_BURAYA', 'GORUNTULEYICI', 'Görüntüleyici', 'Sadece görüntüleme yetkisi', 
'["uyeler.goruntule", "aidat.goruntule", "mali.goruntule", "raporlar.goruntule", "etkinlik.goruntule", "toplanti.goruntule", "belge.goruntule", "butce.goruntule"]'::jsonb, TRUE);
*/

-- ============================================================================
-- 7. Schema version güncelle
-- ============================================================================

INSERT INTO schema_version (version, description) VALUES
(2, 'Eksik kolonlar ve tablolar eklendi: gelirler.notlar, roles, user_roles, permissions')
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- Migration tamamlandı!
-- ============================================================================

SELECT 'Migration 001 başarıyla tamamlandı!' AS status;
