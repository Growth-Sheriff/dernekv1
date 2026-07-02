"""
Main application tests
"""
import pytest
from fastapi.testclient import TestClient


def test_health_check(base_client):
    """Test health check endpoint"""
    response = base_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_root_endpoint(base_client):
    """Test root endpoint"""
    response = base_client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data


def test_cors_headers(base_client):
    """Test CORS headers are present"""
    response = base_client.get("/health", headers={"Origin": "http://localhost:1420"})
    assert "access-control-allow-origin" in response.headers
