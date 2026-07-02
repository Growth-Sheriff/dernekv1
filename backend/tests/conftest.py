"""
Pytest Configuration and Fixtures

Not: Uygulama SQLModel kullanır (app.core.db). Test DB'si geçici dosyaya
yönlendirilir; testler kendi client fixture'larını kurar.
"""
import os
import tempfile

# Uygulama import edilmeden ÖNCE test veritabanına yönlendir.
os.environ.setdefault(
    "DATABASE_URL", f"sqlite:///{tempfile.mkdtemp()}/bader_test.db"
)

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def base_client():
    """Uygulama genel test client'ı (auth override'sız)."""
    from app.main import app
    from app.core.db import create_db_and_tables

    create_db_and_tables()
    with TestClient(app) as test_client:
        yield test_client
