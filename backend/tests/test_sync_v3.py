"""
Birleşik /sync/sync endpoint'inin çatışma senaryoları.

Kapsanan garanti: hiçbir koşulda sessiz veri kaybı olmaz —
- eş zamanlı düzenleme (stale version) -> conflict + server_data
- silinmiş kaydın update ile dirilmesi -> conflict (deleted_on_server)
- tombstone delta'da taşınır
- push edilen kayıt aynı isteğin delta'sında geri yankılanmaz
"""
import os
import tempfile

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mkdtemp()}/test_sync.db"

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.db import create_db_and_tables
from app.api.auth import get_current_user
from app.models.base import User

TENANT_ID = "tenant-test-1"


class FakeUser:
    tenant_id = TENANT_ID
    is_superuser = False
    email = "test@test.local"


@pytest.fixture(scope="module")
def client():
    create_db_and_tables()
    app.dependency_overrides[get_current_user] = lambda: FakeUser()
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def sync(client, changes, last_sync_at=None):
    resp = client.post(
        "/api/v1/sync/sync",
        json={
            "tenant_id": TENANT_ID,
            "device_id": "test-device",
            "last_sync_at": last_sync_at,
            "changes": changes,
        },
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def uye_change(uye_id, version, op="update", **fields):
    data = {
        "id": uye_id,
        "tenant_id": TENANT_ID,
        "uye_no": "1",
        "tc_no": "11111111111",
        "ad": "Ali",
        "soyad": "Veli",
        "ad_soyad": "Ali Veli",
        "durum": "Aktif",
        "giris_tarihi": "2026-01-01",
        "version": version,
    }
    data.update(fields)
    return {
        "table": "uyeler",
        "id": uye_id,
        "operation": op,
        "data": data,
        "version": version,
        "change_id": f"chg-{uye_id}-{version}-{op}",
    }


def test_insert_ve_versiyon_artisi(client):
    r = sync(client, [uye_change("u1", 1, op="insert")])
    assert r["status"] == "ok"
    assert len(r["applied"]) == 1
    assert r["applied"][0]["version"] == 1
    assert r["applied"][0]["change_id"] == "chg-u1-1-insert"

    # Aynı base versiyonla update -> kabul, versiyon 2'ye çıkar
    r = sync(client, [uye_change("u1", 1, ad="Ahmet", ad_soyad="Ahmet Veli")])
    assert r["applied"][0]["version"] == 2


def test_stale_versiyon_conflict(client):
    # Sunucu u1'i v2'de tutuyor; eski v1 ile push eden cihaz conflict almalı
    r = sync(client, [uye_change("u1", 1, ad="Bayat", ad_soyad="Bayat Veri")])
    assert r["status"] == "partial"
    assert len(r["conflicts"]) == 1
    c = r["conflicts"][0]
    assert c["reason"] == "version_mismatch"
    assert c["server_version"] == 2
    # Sunucu kopyası istemciye dönüyor -> istemci sunucu-kazanır uygular
    assert c["server_data"]["ad"] == "Ahmet"
    # Bayat veri sunucuya YAZILMADI
    assert not r["applied"]


def test_tombstone_ve_dirilme_reddi(client):
    # v2 ile sil -> tombstone
    r = sync(client, [uye_change("u1", 2, op="delete")])
    assert r["applied"][0]["version"] == 3

    # Silinmiş kaydı update ile diriltme girişimi -> conflict
    r = sync(client, [uye_change("u1", 3, ad="Zombi", ad_soyad="Zombi Kayit")])
    assert len(r["conflicts"]) == 1
    assert r["conflicts"][0]["reason"] == "deleted_on_server"


def test_delta_tombstone_tasir(client):
    # last_sync_at çok eski -> u1 tombstone'u delta'da delete olarak gelmeli
    r = sync(client, [], last_sync_at="2000-01-01T00:00:00")
    u1 = [c for c in r["changes"] if c["table"] == "uyeler" and c["id"] == "u1"]
    assert len(u1) == 1
    assert u1[0]["operation"] == "delete"
    assert u1[0]["data"]["is_deleted"] == 1


def test_push_edilen_kayit_ayni_istekte_yankilanmaz(client):
    r = sync(client, [uye_change("u2", 1, op="insert")], last_sync_at="2000-01-01T00:00:00")
    assert r["applied"][0]["id"] == "u2"
    echoed = [c for c in r["changes"] if c["id"] == "u2"]
    assert echoed == []


def test_bilinmeyen_tablo_reddedilir(client):
    r = sync(client, [{
        "table": "koy_kasalar", "id": "x", "operation": "update",
        "data": {"id": "x"}, "version": 1,
    }])
    assert len(r["rejected"]) == 1


def test_baska_tenant_403(client):
    resp = client.post(
        "/api/v1/sync/sync",
        json={"tenant_id": "baska-tenant", "changes": []},
    )
    assert resp.status_code == 403


def test_kasa_turetilmis_alanlar_uygulanmaz(client):
    r = sync(client, [{
        "table": "kasalar", "id": "k1", "operation": "insert",
        "data": {
            "id": "k1", "tenant_id": TENANT_ID, "kasa_adi": "Ana Kasa",
            "para_birimi": "TRY", "devir_bakiye": 100.0,
            "bakiye": 99999.0,  # türetilmiş — uygulanmamalı
        },
        "version": 1,
    }])
    assert len(r["applied"]) == 1

    from app.core.db import engine
    from sqlmodel import Session, select
    from app.models.base import Kasa
    with Session(engine) as s:
        k = s.get(Kasa, "k1")
        assert k.devir_bakiye == 100.0
        assert k.bakiye == 0.0  # payload'daki 99999 uygulanmadı
