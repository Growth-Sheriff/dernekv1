#!/bin/bash

echo "🚀 BADER V3 Setup"
echo "================="

# Backend
echo "📦 Setting up Backend..."
cd backend
pip install -r requirements.txt
cd ..

# Desktop
echo "📦 Setting up Desktop..."
cd desktop
npm install
cd ..

# Web
echo "📦 Setting up Web..."
cd web
npm install
cd ..

echo "✅ Setup complete!"
