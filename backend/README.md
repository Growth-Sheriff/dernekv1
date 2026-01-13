# BADER Backend (FastAPI)

FastAPI backend with PostgreSQL, multi-tenant architecture, and Row-Level Security.

## Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

## API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
