---
description: Sunucuya deployment yapmak için Git-based workflow
---

# Sunucu Deployment Workflow

## ⚠️ ÖNEMLİ KURALLAR
- **SCP YASAK!** Dosya transferi için SCP kullanılmayacak
- Tüm değişiklikler Git üzerinden push edilecek
- Sunucu Git'ten pull yaparak güncellenecek

## Deployment Adımları

### 1. Local'de Değişiklikleri Commit Et
```bash
cd /Users/adiguzel/Desktop/baderone
git add .
git commit -m "Açıklayıcı commit mesajı"
```

### 2. Remote'a Push Et
```bash
git push origin main
```

### 3. Sunucuda Pull Yap
```bash
ssh bader-app "cd /path/to/baderone && git pull origin main"
```

### 4. Backend Container'ı Yeniden Başlat
```bash
ssh bader-app "docker restart bader_backend"
```

### 5. Frontend Build ve Deploy (Gerekirse)
```bash
# Local'de build
cd web && npm run build

# Sunucuda frontend container'ı güncelle
ssh bader-app "cd /path/to/baderone && git pull && docker restart bader_frontend"
```

## Sunucu Bilgileri
- **SSH Alias:** `bader-app`
- **IP:** 157.90.154.48
- **Backend Container:** `bader_backend`
- **Frontend Container:** `bader_frontend`
- **Backend Port:** 8000
- **Frontend Port:** 80
