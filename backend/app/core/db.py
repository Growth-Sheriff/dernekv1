from sqlmodel import SQLModel, create_engine, Session
from app.models.base import * # Import models to register them

DATABASE_URL = "sqlite:///./database.db"
# PRODUCTION: DATABASE_URL = "postgresql://user:password@localhost/bader_db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
