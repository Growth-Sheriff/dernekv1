#!/bin/bash
# BADER V3 - Otomatik Güncelleme ve Çalıştırma Script'i
# Mac OS için hazırlanmıştır

set -e  # Hata durumunda dur

echo "🚀 BADER V3 Güncelleme ve Çalıştırma Başlıyor..."
echo ""

# Ana dizine git
cd ~/Desktop 2>/dev/null || cd ~

# Eski dernekv1 klasörünü sil
echo "🗑️  Eski dosyalar temizleniyor..."
if [ -d "dernekv1" ]; then
    rm -rf dernekv1
    echo "✅ Eski klasör silindi"
fi

# GitHub'dan en güncel versiyonu klonla
echo ""
echo "📥 GitHub'dan en güncel versiyon indiriliyor..."
git clone https://github.com/Growth-Sheriff/dernekv1.git
echo "✅ Proje indirildi"

# Desktop klasörüne git
cd dernekv1/desktop

# Dependencies kur
echo ""
echo "📦 Bağımlılıklar kuruluyor..."
npm install
echo "✅ Bağımlılıklar kuruldu"

# Rust dependencies (Cargo.toml güncellendi, fetch gerekebilir)
echo ""
echo "🦀 Rust bağımlılıkları kontrol ediliyor..."
cd src-tauri
cargo fetch
cd ..

# Uygulama başlatılıyor
echo ""
echo "🎯 BADER V3 başlatılıyor..."
echo "   📌 Migrationlar otomatik çalışacak"
echo "   📌 Uygulama penceresi açılacak"
echo ""
echo "───────────────────────────────────────────"
echo ""

# Development modda çalıştır
npm run tauri dev

# Eğer production build istersen:
# npm run tauri build
# open src-tauri/target/release/bundle/macos/BADER.app
