from sqlmodel import Session, select, create_engine, SQLModel
from app.models.base import License
from app.core.db import DATABASE_URL
from datetime import datetime, timedelta
import uuid

def seed_license():
    print(f"Connecting to {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)
    
    # Tabloları oluştur (Model güncellemeleri için)
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        license_key = "BADER-HYBD-DEMO-2026"
        existing_license = session.exec(select(License).where(License.key == license_key)).first()
        
        if existing_license:
            print(f"Lisans zaten mevcut: {license_key}")
            # Resetlemek isterseniz:
            # existing_license.tenant_id = None
            # session.add(existing_license)
            # session.commit()
            return

        now = datetime.utcnow().isoformat()
        expires = (datetime.utcnow() + timedelta(days=365)).isoformat()

        print(f"Lisans ekleniyor: {license_key}")
        new_license = License(
            id=str(uuid.uuid4()),
            key=license_key,
            plan="hybrid",
            mode="hybrid",
            license_type="hybrid",
            features="ALL",
            is_active=True,
            start_date=now,
            end_date=expires,
            expires_at=expires,
            created_at=now,
            updated_at=now
        )
        session.add(new_license)
        session.commit()
        print("✅ Lisans başarıyla eklendi!")

if __name__ == "__main__":
    seed_license()
