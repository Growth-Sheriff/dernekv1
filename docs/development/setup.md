# Development Setup

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 16+
- Rust (for Tauri)

## Backend Setup

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

## Desktop Setup

```bash
cd desktop
npm install
npm run tauri dev
```

## Web Setup

```bash
cd web
npm install
npm run dev
```
