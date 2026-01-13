# BADER V3 - Dernek Yönetim Sistemi

Multi-tenant SaaS dernek yönetim sistemi.

## 🏗️ Proje Yapısı

```
bader-v3/
├── backend/          # FastAPI Backend (PostgreSQL)
├── desktop/          # Tauri Desktop App (SQLite + React)
├── web/              # Next.js Web App
├── shared/           # Shared types & utils
├── docs/             # Documentation
└── scripts/          # Utility scripts
```

## 🚀 Teknolojiler

### Backend
- FastAPI (Python 3.11+)
- PostgreSQL 16 (Row-Level Security)
- SQLAlchemy 2.0
- Alembic (migrations)

### Desktop
- Tauri 2.0 (Rust)
- React 19
- SQLite (offline-first)
- shadcn/ui + Tailwind CSS

### Web
- Next.js 15
- React 19
- shadcn/ui + Tailwind CSS

## 📦 Kurulum

```bash
# Tüm bileşenleri kur
./scripts/setup.sh

# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Desktop
cd desktop
npm install
npm run tauri dev

# Web
cd web
npm install
npm run dev
```

## 🗄️ Veritabanı

PostgreSQL şeması için: `.github/database-schema.sql`

```bash
# Server'da (bader-app)
psql -U bader_user -d bader_db -f database-schema.sql
```

## 📚 Dokümantasyon

- [Sistem Mimarisi](.github/yeni-sistem.md)
- [Dosya Dizini](.github/dosya-dizini.md)
- [API Endpoints](docs/api/endpoints.md)
- [Geliştirme Rehberi](docs/development/setup.md)

## 📝 Özellikler

- ✅ Multi-tenant SaaS
- ✅ Offline-first (Desktop)
- ✅ Delta sync (HYBRID mode)
- ✅ Row-Level Security
- ✅ License management
- ✅ Role-based permissions
- ✅ Üye yönetimi
- ✅ Aidat takibi
- ✅ Mali işlemler (Gelir/Gider/Kasa/Virman)
- ✅ Etkinlik & Toplantı
- ✅ Belgeler
- ✅ Bütçe planlama
- ✅ Yıl sonu devir
- ✅ Köy modülü
- ✅ Raporlar

## 🔐 Lisans Planları

1. **LOCAL** - Offline, tek dernek, SQLite
2. **ONLINE** - Web, PostgreSQL, tek kullanıcı
3. **HYBRID** - Desktop + Web + Sync, çoklu kullanıcı

## 👥 Geliştirme

### Backend
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### Desktop
```bash
cd desktop
npm run tauri dev
```

### Web
```bash
cd web
npm run dev
```

## 🚢 Deploy

### Backend
```bash
# Docker
docker build -t bader-backend ./backend
docker run -p 8000:8000 bader-backend
```

### Desktop
```bash
cd desktop
npm run tauri build
# Output: src-tauri/target/release/bundle/
```

### Web
```bash
cd web
npm run build
# Deploy to Vercel
vercel deploy
```

## 📄 Lisans

Proprietary - BADER Team © 2026

## 📞 İletişim

- Website: https://bader.app
- Email: info@bader.app
