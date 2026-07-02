import os
from sqlmodel import SQLModel, create_engine, Session
from app.models.base import * # Import models to register them
from app.models.device import * # Device tracking models
from app.models.notification import * # Notification and presence models

# Database path
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///database.db")

# Handle PostgreSQL specific connection args logic if needed (remove check_same_thread for postgres)
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    ensure_model_columns()


def ensure_model_columns():
    """Mevcut veritabanlarında model tanımına sonradan eklenen kolonları tamamlar.

    Alembic geçmişi olmadığı için şema takibi buradan yapılır: her SQLModel
    tablosu için DB'de eksik olan kolonlar ALTER TABLE ile eklenir. Yalnızca
    kolon EKLER; silme/tip değişikliği yapmaz.
    """
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        for table in SQLModel.metadata.sorted_tables:
            if table.name not in existing_tables:
                continue
            existing_cols = {c["name"] for c in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in existing_cols:
                    continue
                col_type = column.type.compile(engine.dialect)
                default_sql = ""
                if column.default is not None and getattr(column.default, "arg", None) is not None:
                    arg = column.default.arg
                    if isinstance(arg, (int, float)):
                        default_sql = f" DEFAULT {arg}"
                    elif isinstance(arg, str):
                        default_sql = f" DEFAULT '{arg}'"
                conn.execute(
                    text(
                        f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {col_type}{default_sql}'
                    )
                )

def get_session():
    with Session(engine) as session:
        yield session

# Alias for backward compatibility with v1 API routes
get_db = get_session
