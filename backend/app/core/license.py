"""
BADER Lisans Sistemi - Kod Üretici ve Doğrulayıcı

Offline doğrulama destekler - İnternet gerektirmez.
"""

import hashlib
import base64
import struct
from datetime import datetime, timedelta
from typing import Optional, NamedTuple
from dataclasses import dataclass

# Güvenlik için gizli anahtar (production'da environment variable olmalı)
LICENSE_SECRET = "BADER_LICENSE_SECRET_KEY_2024_CHANGE_IN_PROD"

@dataclass
class LicenseInfo:
    """Çözümlenmiş lisans bilgisi"""
    desktop_enabled: bool
    web_enabled: bool
    mobile_enabled: bool
    sync_enabled: bool
    expiry_date: datetime
    tenant_id: str
    is_valid: bool
    error_message: Optional[str] = None


class LicenseError(Exception):
    """Lisans hatası"""
    pass


class LicenseGenerator:
    """Lisans kodu oluşturucu - Super Admin kullanır"""
    
    @staticmethod
    def generate(
        tenant_id: str,
        desktop: bool = False,
        web: bool = False,
        mobile: bool = False,
        sync: bool = False,
        expiry_months: int = 12
    ) -> str:
        """
        Yeni lisans kodu oluşturur.
        
        Format: BADER-PPPP-TTTT-IIII-CCCC
        - PPPP: Platform bitleri (encoded)
        - TTTT: Bitiş tarihi (encoded)
        - IIII: Tenant ID (encoded)
        - CCCC: Checksum
        """
        
        # Platform bitleri
        platform_bits = 0
        if desktop:
            platform_bits |= 1  # Bit 0
        if web:
            platform_bits |= 2  # Bit 1
        if mobile:
            platform_bits |= 4  # Bit 2
        if sync:
            platform_bits |= 8  # Bit 3
        
        # Bitiş tarihi
        expiry_date = datetime.utcnow() + timedelta(days=expiry_months * 30)
        expiry_timestamp = int(expiry_date.timestamp())
        
        # Tenant ID hash (ilk 8 karakter)
        tenant_hash = hashlib.sha256(tenant_id.encode()).hexdigest()[:8]
        
        # Encode segments
        platform_segment = LicenseGenerator._encode_segment(platform_bits, 4)
        expiry_segment = LicenseGenerator._encode_segment(expiry_timestamp, 4)
        tenant_segment = tenant_hash[:4].upper()
        
        # Checksum hesapla
        data_to_hash = f"{platform_segment}{expiry_segment}{tenant_segment}{LICENSE_SECRET}"
        checksum = hashlib.sha256(data_to_hash.encode()).hexdigest()[:4].upper()
        
        return f"BADER-{platform_segment}-{expiry_segment}-{tenant_segment}-{checksum}"
    
    @staticmethod
    def _encode_segment(value: int, length: int) -> str:
        """Değeri base32-style encode eder"""
        # Basit encoding: hex + XOR
        hex_val = format(value & 0xFFFFFFFF, '08X')
        # XOR with secret
        xor_key = int(hashlib.md5(LICENSE_SECRET.encode()).hexdigest()[:8], 16)
        xored = value ^ xor_key
        return format(xored & 0xFFFF, '04X')


class LicenseValidator:
    """
    Lisans kodu doğrulayıcı - Offline çalışır.
    Desktop uygulamasında kullanılır.
    """
    
    @staticmethod
    def validate(code: str) -> LicenseInfo:
        """
        Lisans kodunu doğrular.
        İnternet bağlantısı GEREKTIRMEZ.
        """
        try:
            # Format kontrolü
            if not code or not code.startswith("BADER-"):
                return LicenseInfo(
                    desktop_enabled=False,
                    web_enabled=False,
                    mobile_enabled=False,
                    sync_enabled=False,
                    expiry_date=datetime.utcnow(),
                    tenant_id="",
                    is_valid=False,
                    error_message="Geçersiz lisans formatı"
                )
            
            parts = code.split("-")
            if len(parts) != 5:
                return LicenseInfo(
                    desktop_enabled=False,
                    web_enabled=False,
                    mobile_enabled=False,
                    sync_enabled=False,
                    expiry_date=datetime.utcnow(),
                    tenant_id="",
                    is_valid=False,
                    error_message="Geçersiz lisans segment sayısı"
                )
            
            _, platform_segment, expiry_segment, tenant_segment, provided_checksum = parts
            
            # Checksum doğrulama
            data_to_hash = f"{platform_segment}{expiry_segment}{tenant_segment}{LICENSE_SECRET}"
            calculated_checksum = hashlib.sha256(data_to_hash.encode()).hexdigest()[:4].upper()
            
            if provided_checksum.upper() != calculated_checksum:
                return LicenseInfo(
                    desktop_enabled=False,
                    web_enabled=False,
                    mobile_enabled=False,
                    sync_enabled=False,
                    expiry_date=datetime.utcnow(),
                    tenant_id="",
                    is_valid=False,
                    error_message="Lisans kodu doğrulanamadı (checksum hatalı)"
                )
            
            # Platform bitlerini çöz
            xor_key = int(hashlib.md5(LICENSE_SECRET.encode()).hexdigest()[:8], 16)
            platform_xored = int(platform_segment, 16)
            platform_bits = platform_xored ^ xor_key
            
            desktop_enabled = bool(platform_bits & 1)
            web_enabled = bool(platform_bits & 2)
            mobile_enabled = bool(platform_bits & 4)
            sync_enabled = bool(platform_bits & 8)
            
            # Bitiş tarihini çöz
            expiry_xored = int(expiry_segment, 16)
            expiry_timestamp = expiry_xored ^ xor_key
            
            # Timestamp'i datetime'a çevir
            try:
                expiry_date = datetime.fromtimestamp(expiry_timestamp)
            except:
                # Hatalı timestamp, uzun bir süre ver
                expiry_date = datetime.utcnow() + timedelta(days=365)
            
            # Süre kontrolü
            if expiry_date < datetime.utcnow():
                return LicenseInfo(
                    desktop_enabled=desktop_enabled,
                    web_enabled=web_enabled,
                    mobile_enabled=mobile_enabled,
                    sync_enabled=sync_enabled,
                    expiry_date=expiry_date,
                    tenant_id=tenant_segment,
                    is_valid=False,
                    error_message="Lisans süresi dolmuş"
                )
            
            return LicenseInfo(
                desktop_enabled=desktop_enabled,
                web_enabled=web_enabled,
                mobile_enabled=mobile_enabled,
                sync_enabled=sync_enabled,
                expiry_date=expiry_date,
                tenant_id=tenant_segment,
                is_valid=True
            )
            
        except Exception as e:
            return LicenseInfo(
                desktop_enabled=False,
                web_enabled=False,
                mobile_enabled=False,
                sync_enabled=False,
                expiry_date=datetime.utcnow(),
                tenant_id="",
                is_valid=False,
                error_message=f"Lisans çözümlenemedi: {str(e)}"
            )
    
    @staticmethod
    def check_platform_access(code: str, platform: str) -> tuple[bool, str]:
        """
        Belirli bir platform için erişim kontrolü yapar.
        
        platform: 'desktop', 'web', 'mobile'
        returns: (erişim_var_mı, hata_mesajı)
        """
        info = LicenseValidator.validate(code)
        
        if not info.is_valid:
            return False, info.error_message or "Geçersiz lisans"
        
        if platform == "desktop" and not info.desktop_enabled:
            return False, "Desktop erişimi lisansınızda yok. Lütfen lisansınızı yükseltin."
        
        if platform == "web" and not info.web_enabled:
            return False, "Web erişimi lisansınızda yok. Lütfen lisansınızı yükseltin."
        
        if platform == "mobile" and not info.mobile_enabled:
            return False, "Mobil erişimi lisansınızda yok. Lütfen lisansınızı yükseltin."
        
        return True, ""


# Hazır paket oluşturma yardımcıları
def create_local_license(tenant_id: str, months: int = 12) -> str:
    """LOCAL lisans oluşturur (sadece Desktop)"""
    return LicenseGenerator.generate(
        tenant_id=tenant_id,
        desktop=True,
        web=False,
        mobile=False,
        sync=False,
        expiry_months=months
    )


def create_online_license(tenant_id: str, months: int = 12) -> str:
    """ONLINE lisans oluşturur (Web + Mobil + Sync)"""
    return LicenseGenerator.generate(
        tenant_id=tenant_id,
        desktop=False,
        web=True,
        mobile=True,
        sync=True,
        expiry_months=months
    )


def create_hybrid_license(tenant_id: str, months: int = 12) -> str:
    """HYBRID lisans oluşturur (Tüm platformlar + Sync)"""
    return LicenseGenerator.generate(
        tenant_id=tenant_id,
        desktop=True,
        web=True,
        mobile=True,
        sync=True,
        expiry_months=months
    )


def create_custom_license(
    tenant_id: str,
    desktop: bool,
    web: bool,
    mobile: bool,
    sync: bool,
    months: int = 12
) -> str:
    """Özel lisans oluşturur"""
    return LicenseGenerator.generate(
        tenant_id=tenant_id,
        desktop=desktop,
        web=web,
        mobile=mobile,
        sync=sync,
        expiry_months=months
    )
