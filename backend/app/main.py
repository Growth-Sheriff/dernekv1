"""
BADER V3 - FastAPI Backend
Multi-Tenant SaaS Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="BADER API",
    description="Dernek Yönetim Sistemi - Multi-Tenant SaaS",
    version="3.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "BADER API v3.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
