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

def get_session():
    with Session(engine) as session:
        yield session

# Alias for backward compatibility with v1 API routes
get_db = get_session
