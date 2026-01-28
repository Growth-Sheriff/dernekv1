from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from app.core.db import get_session
from app.models.base import User, Tenant, License
from app.core.security import verify_password, create_access_token
from datetime import timedelta
from typing import Optional

router = APIRouter()

@router.post("/token")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    session: Session = Depends(get_session),
    x_platform: Optional[str] = Header(None, alias="X-Platform")  # web, desktop, mobile
):
    # Kullanıcıyı bul
    user = session.exec(select(User).where(User.email == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Hatalı e-posta veya şifre",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Tenant ve Lisans bilgisini al
    tenant_info = None
    license_info = None
    
    if user.tenant_id:
        tenant = session.get(Tenant, user.tenant_id)
        if tenant:
            tenant_info = {"id": tenant.id, "name": tenant.name, "slug": tenant.slug}
        
        # Aktif lisansı bul
        license_obj = session.exec(
            select(License)
            .where(License.tenant_id == user.tenant_id)
            .where(License.is_active == True)
        ).first()
        
        if license_obj:
            license_info = {
                "key": license_obj.key,
                "desktop_enabled": license_obj.desktop_enabled,
                "web_enabled": license_obj.web_enabled,
                "mobile_enabled": license_obj.mobile_enabled,
                "sync_enabled": license_obj.sync_enabled,
                "type": license_obj.get_license_type_name(),
                "end_date": license_obj.end_date
            }
            
            # Platform erişim kontrolü
            platform = (x_platform or "web").lower()
            
            if platform == "web" and not license_obj.web_enabled:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Web erişimi lisansınızda yok. Lütfen lisansınızı yükseltin.",
                )
            
            if platform == "desktop" and not license_obj.desktop_enabled:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Desktop erişimi lisansınızda yok. Lütfen lisansınızı yükseltin.",
                )
            
            if platform == "mobile" and not license_obj.mobile_enabled:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Mobil erişimi lisansınızda yok. Lütfen lisansınızı yükseltin.",
                )
    
    # Token oluştur
    access_token_expires = timedelta(minutes=60 * 24)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role if isinstance(user.role, str) else user.role.value, "tenant_id": user.tenant_id},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "tenant_id": user.tenant_id
        },
        "tenant": tenant_info,
        "license": license_info
    }

from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from app.core.security import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

async def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Kimlik doğrulanamadı",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = session.exec(select(User).where(User.email == email)).first()
    if user is None:
        raise credentials_exception
    return user

@router.get("/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "tenant_id": current_user.tenant_id
    }

from pydantic import BaseModel, EmailStr
from app.models.base import License, UserRole
from app.core.security import get_password_hash
import uuid
import datetime

class HybridRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str = "Admin"
    tenant_name: str
    license_key: str
    slug: str
    phone: str | None = None
    address: str | None = None

@router.post("/register-hybrid")
async def register_hybrid_tenant(
    data: HybridRegisterRequest,
    session: Session = Depends(get_session)
):
    """
    Masaüstü uygulaması kurulumu için hibrit kayıt endpoint'i.
    Lisans anahtarını doğrular ve yeni bir tenant + admin kullanıcısı oluşturur.
    """
    # 1. Lisans Kontrolü
    license_key = data.license_key.upper().strip()
    license_obj = session.exec(select(License).where(License.key == license_key)).first()
    
    # 2. Lisans kontrolleri
    if not license_obj:
        raise HTTPException(status_code=400, detail="Geçersiz lisans anahtarı")
    
    if license_obj.tenant_id:
        raise HTTPException(status_code=400, detail="Bu lisans zaten başka bir organizasyon tarafından kullanılıyor")
        
    if not license_obj.is_active:
        raise HTTPException(status_code=400, detail="Bu lisans aktif değil")

    # 3. Slug Kontrolü
    existing_slug = session.exec(select(Tenant).where(Tenant.slug == data.slug)).first()
    if existing_slug:
        raise HTTPException(status_code=400, detail="Bu kısa ad (URL) zaten kullanımda, lütfen başka bir tane seçin")

    # 4. Email Kontrolü
    existing_user = session.exec(select(User).where(User.email == data.email)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Bu e-posta adresi zaten kayıtlı")

    try:
        # Transaction başlat
        now = datetime.datetime.utcnow().isoformat()
        
        # 5. Tenant Oluştur
        tenant_id = str(uuid.uuid4())
        new_tenant = Tenant(
            id=tenant_id,
            name=data.tenant_name,
            slug=data.slug,
            created_at=now,
            updated_at=now,
            status="active",
            is_active=True
        )
        session.add(new_tenant)
        session.flush() # ID almak için flush

        # 6. Lisansı Tenant'a Bağla
        license_obj.tenant_id = tenant_id
        license_obj.updated_at = now
        session.add(license_obj)

        # 7. Admin Kullanıcı Oluştur
        user_id = str(uuid.uuid4())
        new_user = User(
            id=user_id,
            tenant_id=tenant_id,
            email=data.email,
            full_name=data.name,
            hashed_password=get_password_hash(data.password),
            role="admin",
            is_active=True,
            created_at=now,
            updated_at=now
        )
        session.add(new_user)

        session.commit()
        session.refresh(new_tenant)
        session.refresh(new_user)

        # 8. Yanıt Dön
        return {
            "success": True,
            "message": "Kurulum başarıyla tamamlandı",
            "tenant_id": tenant_id,
            "user_id": user_id,
            "tenant_slug": new_tenant.slug
        }

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Kurulum sırasında bir hata oluştu: {str(e)}")
