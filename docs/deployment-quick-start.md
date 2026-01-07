# 🚀 Quick Deployment Guide

Gyors áttekintő a különböző deployment opciókról.

## 🎯 Legjobb Opció: Render.com (AJÁNLOTT)

**Költség**: INGYENES kezdéshez  
**Setup idő**: ~10 perc  
**HTTPS**: ✅ Automatikus  
**Nehézség**: ⭐ Könnyű

```bash
# Nincs szükség előkészítésre, csak GitHub push
git push origin main
```

👉 [Részletes Render.com Útmutató](deployment-render.md)

---

## 🐳 Docker Compose (Helyi vagy VPS)

**Költség**: VPS esetén ~€4-5/hó  
**Setup idő**: ~5 perc  
**HTTPS**: ⚠️ Manuális (Nginx + Certbot)  
**Nehézség**: ⭐⭐ Közepes

### Gyors Start

```bash
# 1. Másold az env példát
cp env.example .env

# 2. Szerkeszd a .env fájlt
nano .env

# 3. Indítsd el
docker-compose up -d

# 4. Ellenőrizd
docker-compose ps
docker-compose logs -f
```

### Első Seed Adat

```bash
docker-compose exec api sh -c "cd /app/apps/api && pnpm prisma db seed"
```

### HTTPS Setup (VPS-en)

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## ☁️ Egyéb Cloud Opciók

### Railway.app

**Költség**: $5 credit/hó (utána fizetős)  
**HTTPS**: ✅ Automatikus  
**Nehézség**: ⭐ Könnyű

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### Fly.io

**Költség**: $0-5/hó  
**HTTPS**: ✅ Automatikus  
**Nehézség**: ⭐⭐ Közepes

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch app
fly launch

# Deploy
fly deploy
```

### Vercel (Csak Frontend)

**Költség**: INGYENES  
**HTTPS**: ✅ Automatikus  
**Nehézség**: ⭐ Könnyű  
**Figyelem**: Backend-et külön kell hosztolni!

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy frontend
cd apps/web
vercel
```

---

## 📊 Összehasonlítás

| Platform | Költség/hó | Setup | HTTPS | Nehézség | PostgreSQL |
|----------|------------|-------|-------|----------|------------|
| **Render.com** | **€0** | 10 min | ✅ Auto | ⭐ | ✅ Ingyen |
| Railway.app | €5+ | 5 min | ✅ Auto | ⭐ | ✅ Ingyen |
| Fly.io | €0-5 | 15 min | ✅ Auto | ⭐⭐ | ✅ Fizetős |
| Docker (VPS) | €4-5 | 20 min | ⚠️ Manual | ⭐⭐ | ✅ Helyi |
| Vercel | €0 | 5 min | ✅ Auto | ⭐ | ❌ Külön |

---

## 🔐 HTTPS Beállítás Különböző Platformokon

### Automatikus HTTPS (Render, Railway, Fly, Vercel)
✅ Nincs teendő - a platform automatikusan beállítja

### Manuális HTTPS (VPS + Nginx)

#### 1. Install Nginx
```bash
sudo apt-get install nginx
```

#### 2. Nginx Config (`/etc/nginx/sites-available/hellolocal`)
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 3. Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/hellolocal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 4. Install Certbot & Get Certificate
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### 5. Auto-Renewal
```bash
sudo certbot renew --dry-run
```

---

## 🌐 Domain Setup

### 1. DNS Beállítások

**Render.com / Railway.app / Fly.io:**
```
Type: CNAME
Name: www (vagy @)
Value: your-app.onrender.com (vagy railway.app/fly.dev)
TTL: Auto
```

**VPS (DigitalOcean, Hetzner, etc.):**
```
Type: A
Name: @
Value: YOUR_VPS_IP
TTL: 3600

Type: A
Name: www
Value: YOUR_VPS_IP
TTL: 3600
```

### 2. Platform Custom Domain Hozzáadás

**Render.com:**
1. Service Settings → Custom Domain
2. Add Custom Domain → `www.yourdomain.com`
3. Follow instructions

**Railway.app:**
1. Settings → Domains
2. Add Domain → `yourdomain.com`

**Fly.io:**
```bash
fly certs add yourdomain.com
fly certs add www.yourdomain.com
```

---

## 🛠️ Environment Variables

### Production Checklist

```bash
# KRITIKUS - Változtasd meg ezeket!
JWT_SECRET=<generált-64-karakter-random-string>
DB_PASSWORD=<erős-jelszó>

# Frontend URL (HTTPS!)
FRONTEND_URL=https://yourdomain.com

# API URL Frontend-ről (HTTPS!)
VITE_API_URL=https://api.yourdomain.com

# Web Push (Opcionális)
VAPID_PUBLIC_KEY=<public-key>
VAPID_PRIVATE_KEY=<private-key>
VAPID_SUBJECT=mailto:admin@yourdomain.com
```

### Secrets Generálás

```bash
# JWT Secret (64 karakter)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Database Password (32 karakter)
node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"

# VAPID Keys
npx web-push generate-vapid-keys
```

---

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Git repository létrehozva és pushed
- [ ] Environment variables készítve
- [ ] Database connection string kész
- [ ] JWT secrets generálva
- [ ] (Opcionális) Domain megvásárolva

### Deployment
- [ ] PostgreSQL adatbázis létrehozva
- [ ] Backend deploy-olva és elérhető
- [ ] Frontend deploy-olva és elérhető
- [ ] Environment variables beállítva
- [ ] Database migráció lefutott
- [ ] Seed adat betöltve (opcionális)

### Post-Deployment
- [ ] Health check működik (`/health`)
- [ ] Admin login működik
- [ ] Frontend API kommunikáció működik
- [ ] HTTPS enabled és működik
- [ ] Admin jelszavak megváltoztatva!
- [ ] Monitoring beállítva (opcionális)
- [ ] Backup stratégia kész (opcionális)

---

## 🆘 Gyors Hibaelhárítás

### "Cannot connect to database"
```bash
# Ellenőrizd a DATABASE_URL-t
echo $DATABASE_URL

# Teszteld a connection-t
psql $DATABASE_URL -c "SELECT 1"
```

### "CORS error"
```bash
# Ellenőrizd a FRONTEND_URL-t a backend-en
# Formátum: https://yourdomain.com (nincs trailing slash!)
```

### "Prisma migration failed"
```bash
# Reset és újra migráció
pnpm prisma migrate reset
pnpm prisma migrate deploy
```

### "502 Bad Gateway"
```bash
# Ellenőrizd a backend logs-ot
docker-compose logs -f api
# vagy
render logs -f
```

---

## 📞 Támogatás

- Render: https://render.com/docs
- Railway: https://docs.railway.app
- Fly.io: https://fly.io/docs
- Docker: https://docs.docker.com

---

**Választott a platformot?** → [Részletes Render Útmutató](deployment-render.md)

