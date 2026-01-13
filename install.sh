#!/bin/bash

# =================================================================
# BADER Dernek Yönetim Sistemi - Otomatik Kurulum Scripti
# Desteklenen OS: macOS
# =================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     BADER - Dernek Yönetim Sistemi v3.0.0                ║${NC}"
echo -e "${BLUE}║     Otomatik Kurulum Başlatılıyor...                     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Çalışma dizini
INSTALL_DIR="$HOME/bader-dernek"

# Homebrew kontrolü ve kurulumu
install_homebrew() {
    if ! command -v brew &> /dev/null; then
        echo -e "${YELLOW}📦 Homebrew kuruluyor...${NC}"
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # Homebrew PATH'e ekle
        if [[ $(uname -m) == "arm64" ]]; then
            echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
            eval "$(/opt/homebrew/bin/brew shellenv)"
        else
            echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
            eval "$(/usr/local/bin/brew shellenv)"
        fi
        echo -e "${GREEN}✅ Homebrew kuruldu${NC}"
    else
        echo -e "${GREEN}✅ Homebrew zaten kurulu${NC}"
    fi
}

# Node.js kontrolü ve kurulumu
install_node() {
    if ! command -v node &> /dev/null; then
        echo -e "${YELLOW}📦 Node.js kuruluyor...${NC}"
        brew install node@20
        brew link node@20 --force
        echo -e "${GREEN}✅ Node.js kuruldu${NC}"
    else
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 18 ]; then
            echo -e "${YELLOW}📦 Node.js güncelleniyor...${NC}"
            brew install node@20
            brew link node@20 --force --overwrite
            echo -e "${GREEN}✅ Node.js güncellendi${NC}"
        else
            echo -e "${GREEN}✅ Node.js zaten kurulu (v$(node -v))${NC}"
        fi
    fi
}

# Rust kontrolü ve kurulumu
install_rust() {
    if ! command -v rustc &> /dev/null; then
        echo -e "${YELLOW}📦 Rust kuruluyor...${NC}"
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source "$HOME/.cargo/env"
        echo -e "${GREEN}✅ Rust kuruldu${NC}"
    else
        echo -e "${GREEN}✅ Rust zaten kurulu ($(rustc --version))${NC}"
    fi
    source "$HOME/.cargo/env" 2>/dev/null || true
}

# Tauri CLI kurulumu
install_tauri() {
    if ! cargo install --list | grep -q "tauri-cli"; then
        echo -e "${YELLOW}📦 Tauri CLI kuruluyor...${NC}"
        cargo install tauri-cli
        echo -e "${GREEN}✅ Tauri CLI kuruldu${NC}"
    else
        echo -e "${GREEN}✅ Tauri CLI zaten kurulu${NC}"
    fi
}

# Git kurulumu
install_git() {
    if ! command -v git &> /dev/null; then
        echo -e "${YELLOW}📦 Git kuruluyor...${NC}"
        brew install git
        echo -e "${GREEN}✅ Git kuruldu${NC}"
    else
        echo -e "${GREEN}✅ Git zaten kurulu${NC}"
    fi
}

# Projeyi klonla
clone_project() {
    echo ""
    echo -e "${BLUE}📥 Proje indiriliyor...${NC}"
    
    if [ -d "$INSTALL_DIR" ]; then
        echo -e "${YELLOW}⚠️  Mevcut kurulum bulundu, güncelleniyor...${NC}"
        cd "$INSTALL_DIR"
        git pull origin main
    else
        git clone https://github.com/Growth-Sheriff/dernekv1.git "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi
    
    echo -e "${GREEN}✅ Proje indirildi${NC}"
}

# Bağımlılıkları yükle
install_dependencies() {
    echo ""
    echo -e "${BLUE}📦 Bağımlılıklar yükleniyor (bu biraz zaman alabilir)...${NC}"
    
    cd "$INSTALL_DIR/desktop"
    npm install
    
    echo -e "${GREEN}✅ Bağımlılıklar yüklendi${NC}"
}

# Uygulamayı başlat
start_app() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     ✅ Kurulum Tamamlandı!                               ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}🚀 Uygulama başlatılıyor...${NC}"
    echo ""
    echo -e "${YELLOW}İpucu: Uygulamayı daha sonra başlatmak için:${NC}"
    echo -e "  cd $INSTALL_DIR/desktop && npm run tauri dev"
    echo ""
    
    cd "$INSTALL_DIR/desktop"
    npm run tauri dev
}

# Ana kurulum akışı
main() {
    echo -e "${BLUE}🔍 Sistem gereksinimleri kontrol ediliyor...${NC}"
    echo ""
    
    install_homebrew
    install_git
    install_node
    install_rust
    install_tauri
    clone_project
    install_dependencies
    start_app
}

# Scripti çalıştır
main
