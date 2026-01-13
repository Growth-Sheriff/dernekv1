# 🔐 Lisans-Modül Entegrasyonu ve Personel Sistemi

## 📊 Modül-Lisans Matrisi

### Lisans Planlarına Göre Modül Erişimi

| Modül | LOCAL | ONLINE | HYBRID | Açıklama |
|-------|-------|--------|--------|----------|
| **👥 Üye Yönetimi** | ✅ | ✅ | ✅ | Tüm planlarda var |
| **💰 Aidat Takip** | ✅ | ✅ | ✅ | Tüm planlarda var |
| **💵 Gelir/Gider** | ✅ | ✅ | ✅ | Tüm planlarda var |
| **🏦 Kasa Yönetimi** | ✅ (Max 2) | ✅ (Max 10) | ✅ (Sınırsız) | Kasa sayısı sınırlı |
| **📄 Dekont/Fatura** | ✅ | ✅ | ✅ | Tüm planlarda var |
| **📊 Raporlar** | ✅ (PDF) | ✅ (PDF+Excel) | ✅ (Hepsi) | Export sınırlaması |
| **👨‍👩‍👧 Aile Modülü** | ❌ | ✅ | ✅ | LOCAL'da yok |
| **🏘️ Köy Modülü** | ❌ | ❌ | ✅ | Sadece HYBRID |
| **📸 OCR (Dekont)** | ❌ | ❌ | ✅ | Sadece HYBRID |
| **📱 Mobil Erişim** | ❌ | ✅ | ✅ | LOCAL offline |
| **🌐 Web Erişim** | ❌ | ✅ | ✅ | LOCAL offline |
| **🔄 Senkronizasyon** | ❌ | ❌ | ✅ | Sadece HYBRID |
| **📧 Email/SMS** | ❌ | ✅ | ✅ | API access |
| **🔗 API Access** | ❌ | ❌ | ✅ | External API |
| **📋 Toplantı Yönetimi** | ✅ | ✅ | ✅ | Tüm planlarda |
| **👔 Personel Yönetimi** | ❌ (1 user) | ✅ (5 user) | ✅ (10 user) | Kullanıcı limiti |

---

## 👥 Personel/Kullanıcı Yönetimi Sistemi

### 1. Kullanıcı Modeli

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    
    -- Auth bilgileri
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(200),
    password_hash VARCHAR(255),
    
    -- Kişisel bilgiler
    ad_soyad VARCHAR(200),
    telefon VARCHAR(20),
    profil_foto VARCHAR(500),
    
    -- Roller ve yetkiler
    role VARCHAR(50),  -- ADMIN, MUHASEBECI, SEKRETER, GORUNTULEYICI
    permissions JSONB,  -- Custom permissions
    
    -- Durum
    is_active BOOLEAN DEFAULT true,
    is_superuser BOOLEAN DEFAULT false,  -- System admin only
    
    -- Çalışma saatleri
    baslangic_tarihi DATE,
    bitis_tarihi DATE,
    
    -- Sync & Audit
    sync_id UUID DEFAULT gen_random_uuid() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER,
    updated_by INTEGER,
    
    UNIQUE(tenant_id, username),
    CONSTRAINT check_user_limit CHECK (
        (SELECT COUNT(*) FROM users WHERE tenant_id = users.tenant_id AND is_active = true) <= 
        (SELECT max_users FROM licenses WHERE tenant_id = users.tenant_id)
    )
);

-- Indexes
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_active ON users(tenant_id, is_active);
```

---

### 2. Rol Sistemi (RBAC)

#### Varsayılan Roller

| Rol | Açıklama | Modül Erişimi |
|-----|----------|---------------|
| **ADMIN** | Tam yetkili yönetici | Tüm modüllere tam erişim |
| **MUHASEBECI** | Mali işlemler sorumlusu | Üye, Aidat, Gelir, Gider, Kasa, Raporlar (düzenleyebilir) |
| **SEKRETER** | Genel işlemler | Üye, Aidat, Toplantı (düzenleyebilir), Raporlar (görüntüleme) |
| **GORUNTULEYICI** | Sadece okuma | Tüm modüller (sadece görüntüleme) |
| **CUSTOM** | Özel yetkilendirme | İzinler manuel seçilir |

#### Permission Matrisi

```typescript
interface Permissions {
  // Üye Yönetimi
  "uye:read": boolean;
  "uye:create": boolean;
  "uye:update": boolean;
  "uye:delete": boolean;
  "uye:export": boolean;
  
  // Aidat
  "aidat:read": boolean;
  "aidat:create": boolean;
  "aidat:update": boolean;
  "aidat:delete": boolean;
  "aidat:tahakkuk": boolean;  // Toplu tahakkuk
  
  // Mali İşlemler
  "gelir:read": boolean;
  "gelir:create": boolean;
  "gelir:update": boolean;
  "gelir:delete": boolean;
  
  "gider:read": boolean;
  "gider:create": boolean;
  "gider:update": boolean;
  "gider:delete": boolean;
  
  "kasa:read": boolean;
  "kasa:create": boolean;
  "kasa:update": boolean;
  "kasa:virman": boolean;  // Virman işlemi
  
  // Raporlar
  "rapor:read": boolean;
  "rapor:export_pdf": boolean;
  "rapor:export_excel": boolean;
  
  // Köy Modülü
  "koy:read": boolean;
  "koy:create": boolean;
  "koy:update": boolean;
  
  // Sistem
  "user:read": boolean;
  "user:create": boolean;
  "user:update": boolean;
  "user:delete": boolean;
  
  "ayarlar:read": boolean;
  "ayarlar:update": boolean;
}
```

---

### 3. Kullanıcı CRUD API

```python
# Backend
@router.post("/api/users")
@require_permission("user:create")
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_user),
    license: License = Depends(get_license)
):
    # Kullanıcı limiti kontrolü
    active_users = db.query(User).filter_by(
        tenant_id=current_user.tenant_id,
        is_active=True
    ).count()
    
    if active_users >= license.max_users:
        raise HTTPException(
            403,
            f"Kullanıcı limiti aşıldı. Max {license.max_users} kullanıcı."
        )
    
    # Şifre hash
    hashed_password = hash_password(user_data.password)
    
    # Kullanıcı oluştur
    user = User(
        tenant_id=current_user.tenant_id,
        username=user_data.username,
        email=user_data.email,
        password_hash=hashed_password,
        ad_soyad=user_data.ad_soyad,
        role=user_data.role,
        permissions=get_default_permissions(user_data.role),
        created_by=current_user.id
    )
    
    db.add(user)
    db.commit()
    
    return {"success": True, "user_id": user.id}


@router.get("/api/users")
@require_permission("user:read")
async def list_users(
    current_user: User = Depends(get_current_user)
):
    users = db.query(User).filter_by(
        tenant_id=current_user.tenant_id,
        is_deleted=False
    ).all()
    
    return {"users": users}
```

---

### 4. Permission Decorator

```python
from functools import wraps
from fastapi import HTTPException

def require_permission(permission: str):
    """
    Endpoint'leri permission ile koru
    @require_permission("uye:create")
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: User, **kwargs):
            # Admin her şeyi yapabilir
            if current_user.role == "ADMIN":
                return await func(*args, current_user=current_user, **kwargs)
            
            # Permission kontrolü
            user_permissions = current_user.permissions or {}
            if not user_permissions.get(permission, False):
                raise HTTPException(
                    403,
                    f"Bu işlem için '{permission}' yetkisi gerekli"
                )
            
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator


# Kullanım
@router.post("/api/uyeler")
@require_permission("uye:create")
async def create_uye(uye_data: UyeCreate, current_user: User):
    # ...
    pass
```

---

### 5. UI'da Role-Based Menü

```tsx
// React - Sidebar component
import { useUser } from '@/hooks/useAuth';
import { hasPermission } from '@/lib/permissions';

export function Sidebar() {
  const { user, license } = useUser();
  
  const menuItems = [
    {
      label: 'Dashboard',
      icon: Home,
      path: '/',
      permission: null  // Herkes görebilir
    },
    {
      label: 'Üye Yönetimi',
      icon: Users,
      path: '/uyeler',
      permission: 'uye:read'
    },
    {
      label: 'Aidat Takip',
      icon: Receipt,
      path: '/aidat',
      permission: 'aidat:read'
    },
    {
      label: 'Mali İşlemler',
      icon: DollarSign,
      path: '/mali',
      permission: 'gelir:read',
      children: [
        { label: 'Gelirler', path: '/gelirler', permission: 'gelir:read' },
        { label: 'Giderler', path: '/giderler', permission: 'gider:read' },
        { label: 'Kasalar', path: '/kasalar', permission: 'kasa:read' }
      ]
    },
    {
      label: 'Köy Modülü',
      icon: Mountain,
      path: '/koy',
      permission: 'koy:read',
      requiresFeature: 'koy_modulu',  // License check
      badge: 'HYBRID'
    },
    {
      label: 'Personel',
      icon: UserCog,
      path: '/personel',
      permission: 'user:read',
      adminOnly: true
    },
    {
      label: 'Raporlar',
      icon: FileText,
      path: '/raporlar',
      permission: 'rapor:read'
    },
    {
      label: 'Ayarlar',
      icon: Settings,
      path: '/ayarlar',
      permission: 'ayarlar:read'
    }
  ];
  
  // Menü filtering
  const visibleMenuItems = menuItems.filter(item => {
    // Admin check
    if (item.adminOnly && user.role !== 'ADMIN') {
      return false;
    }
    
    // Permission check
    if (item.permission && !hasPermission(user, item.permission)) {
      return false;
    }
    
    // License feature check
    if (item.requiresFeature && !license.features.modules[item.requiresFeature]) {
      return false;
    }
    
    return true;
  });
  
  return (
    <aside className="sidebar">
      {visibleMenuItems.map(item => (
        <SidebarItem key={item.path} {...item} />
      ))}
    </aside>
  );
}
```

---

### 6. Feature Gate Component

```tsx
// Modül erişim kontrolü
import { useFeature } from '@/hooks/useLicense';
import { usePermission } from '@/hooks/useAuth';

export function FeatureGate({ 
  feature, 
  permission, 
  children,
  fallback 
}) {
  const { hasFeature, loading: featureLoading } = useFeature(feature);
  const { hasPermission: hasPerm, loading: permLoading } = usePermission(permission);
  
  if (featureLoading || permLoading) {
    return <Skeleton />;
  }
  
  // Feature check (license)
  if (feature && !hasFeature) {
    return fallback || (
      <UpgradePrompt 
        title="Bu Özellik Mevcut Değil"
        description={`${feature} modülü için HYBRID plan gerekli`}
        requiredPlan="HYBRID"
      />
    );
  }
  
  // Permission check (user role)
  if (permission && !hasPerm) {
    return fallback || (
      <Alert variant="warning">
        Bu işlem için yetkiniz yok. Yönetici ile iletişime geçin.
      </Alert>
    );
  }
  
  return <>{children}</>;
}

// Kullanım
export function KoyModulePage() {
  return (
    <FeatureGate feature="koy_modulu" permission="koy:read">
      <KoyDashboard />
    </FeatureGate>
  );
}

export function YeniUyeButton() {
  return (
    <FeatureGate permission="uye:create">
      <Button onClick={openCreateModal}>
        Yeni Üye Ekle
      </Button>
    </FeatureGate>
  );
}
```

---

## 🔄 Senkronizasyon ve Modüller

### 1. Modül Bazında Sync Kontrolü

```typescript
// Desktop (Tauri)
class SyncEngine {
  private syncableModules = {
    uyeler: true,
    aidat_takip: true,
    gelirler: true,
    giderler: true,
    kasalar: true,
    virmanlar: true,
    koy_gelirler: false,  // Sadece HYBRID'de sync
    koy_giderler: false   // Sadece HYBRID'de sync
  };
  
  async sync() {
    const license = await this.getLicense();
    
    // HYBRID modda tüm modüller sync edilir
    if (license.plan === 'HYBRID') {
      this.syncableModules.koy_gelirler = true;
      this.syncableModules.koy_giderler = true;
    }
    
    // Her modül için sync
    for (const [module, enabled] of Object.entries(this.syncableModules)) {
      if (enabled) {
        await this.syncModule(module);
      }
    }
  }
  
  async syncModule(moduleName: string) {
    const lastSync = await db.getLastSyncTime(moduleName);
    
    // Pull: Server'dan değişiklikleri al
    const serverChanges = await api.sync.pull({
      module: moduleName,
      since: lastSync
    });
    
    await this.applyChanges(moduleName, serverChanges);
    
    // Push: Local değişiklikleri gönder
    const localChanges = await db.getUnsyncedChanges(moduleName);
    await api.sync.push({
      module: moduleName,
      changes: localChanges
    });
  }
}
```

---

### 2. Offline Modül Davranışı

| Modül | LOCAL (Offline) | ONLINE (Always Online) | HYBRID (Sync) |
|-------|-----------------|------------------------|---------------|
| Üye Yönetimi | ✅ SQLite | ✅ PostgreSQL | ✅ SQLite + Sync |
| Aidat Takip | ✅ SQLite | ✅ PostgreSQL | ✅ SQLite + Sync |
| Gelir/Gider | ✅ SQLite | ✅ PostgreSQL | ✅ SQLite + Sync |
| Kasa | ✅ SQLite | ✅ PostgreSQL | ✅ SQLite + Sync |
| Köy Modülü | ❌ Yok | ❌ Yok | ✅ SQLite + Sync |
| Raporlar | ✅ PDF Export | ✅ PDF+Excel | ✅ Hepsi |
| Email/SMS | ❌ | ✅ API | ✅ API |

---

## 🎯 Kullanıcı Limit ve Kontrol

### 1. Kullanıcı Ekleme Limiti

```tsx
// Yeni Personel Ekleme Sayfası
export function YeniPersonelPage() {
  const { license } = useLicense();
  const { data: users } = useQuery('/api/users');
  
  const activeUsers = users?.filter(u => u.is_active).length || 0;
  const maxUsers = license.max_users;
  const canAddUser = activeUsers < maxUsers;
  
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Personel Ekle</CardTitle>
          <p className="text-sm text-muted">
            {activeUsers} / {maxUsers} kullanıcı aktif
          </p>
          {!canAddUser && (
            <Alert variant="destructive">
              Kullanıcı limiti doldu. Upgrade yapın veya bir kullanıcıyı deaktive edin.
              <Button onClick={() => navigate('/upgrade')}>
                Upgrade Yap
              </Button>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          {canAddUser ? (
            <PersonelForm />
          ) : (
            <UserLimitReached currentUsers={activeUsers} maxUsers={maxUsers} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### 2. Rol Değiştirme UI

```tsx
export function PersonelListPage() {
  const { user: currentUser } = useAuth();
  const { data: users, refetch } = useQuery('/api/users');
  
  async function updateUserRole(userId: number, newRole: string) {
    await api.put(`/api/users/${userId}`, { role: newRole });
    refetch();
  }
  
  return (
    <Table>
      <thead>
        <tr>
          <th>Ad Soyad</th>
          <th>Kullanıcı Adı</th>
          <th>Rol</th>
          <th>Durum</th>
          <th>İşlemler</th>
        </tr>
      </thead>
      <tbody>
        {users?.map(user => (
          <tr key={user.id}>
            <td>{user.ad_soyad}</td>
            <td>{user.username}</td>
            <td>
              <Select
                value={user.role}
                onChange={(e) => updateUserRole(user.id, e.target.value)}
                disabled={user.id === currentUser.id || user.is_superuser}
              >
                <option value="ADMIN">Yönetici</option>
                <option value="MUHASEBECI">Muhasebeci</option>
                <option value="SEKRETER">Sekreter</option>
                <option value="GORUNTULEYICI">Görüntüleyici</option>
              </Select>
            </td>
            <td>
              <Badge variant={user.is_active ? 'success' : 'secondary'}>
                {user.is_active ? 'Aktif' : 'Pasif'}
              </Badge>
            </td>
            <td>
              <Button size="sm" onClick={() => editUser(user)}>
                Düzenle
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
```

---

## ✅ Entegrasyon Özeti

### Lisans → Modül Kontrolü
```
LICENSE (JSONB features)
    ↓
Feature Gate Middleware
    ↓
Module Availability Check
    ↓
UI Menu Filtering
```

### User → Permission Kontrolü
```
USER (role + permissions JSONB)
    ↓
Permission Decorator (@require_permission)
    ↓
Endpoint Access Control
    ↓
UI Button/Action Visibility
```

### Sync → Modül Davranışı
```
LICENSE (plan: LOCAL/ONLINE/HYBRID)
    ↓
Sync Engine Activation
    ↓
Module-specific Sync Rules
    ↓
SQLite ↔ PostgreSQL
```

---

## 🚀 Sonuç

**✅ Modüller Uyumlu:**
- Her modül license plan'ına göre açılır/kapanır
- Feature gating otomatik çalışır
- UI dinamik olarak adapte olur

**✅ Personel Sistemi Tam:**
- RBAC (Role-Based Access Control)
- Custom permissions
- Kullanıcı limiti kontrolü
- Rol bazlı menü

**✅ Sync Entegrasyonu:**
- Modül bazında sync kontrolü
- Offline/Online davranış farkı
- Conflict resolution

**Tüm sistem birbirine entegre ve tutarlı çalışıyor!** 🎉
