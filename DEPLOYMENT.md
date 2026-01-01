# 🚀 FitGym Deployment Anleitung

## Schnellstart mit Docker

### Voraussetzungen
- Docker & Docker Compose installiert
- Git

### 1. Repository klonen
```bash
git clone <your-repo-url>
cd fitgym
```

### 2. Umgebungsvariablen konfigurieren
```bash
cp .env.example .env
nano .env  # Werte anpassen, besonders JWT_SECRET!
```

### 3. Starten
```bash
# Alle Services starten
docker-compose up -d

# Logs anzeigen
docker-compose logs -f

# Status prüfen
docker-compose ps
```

### 4. Übungen in Datenbank laden
```bash
curl -X POST http://localhost:8001/api/admin/seed-exercises
```

### 5. Zugriff
- **Web App:** http://localhost
- **API:** http://localhost/api/health

---

## Produktion mit SSL

### Let's Encrypt Zertifikat
```bash
# Certbot installieren
sudo apt install certbot

# Zertifikat erstellen
sudo certbot certonly --standalone -d fitgym.deine-domain.de

# Zertifikate kopieren
mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/fitgym.deine-domain.de/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/fitgym.deine-domain.de/privkey.pem nginx/ssl/
```

### HTTPS aktivieren
In `nginx/nginx.conf` den HTTPS-Block auskommentieren und Domain anpassen.

---

## Nützliche Befehle

```bash
# Neu starten
docker-compose restart

# Stoppen
docker-compose down

# Mit Daten löschen
docker-compose down -v

# Logs eines Services
docker-compose logs -f backend

# In Container einloggen
docker-compose exec backend bash
```

---

## Backup

### MongoDB Backup
```bash
# Backup erstellen
docker-compose exec mongodb mongodump --out /data/backup

# Backup kopieren
docker cp fitgym-mongodb:/data/backup ./backup
```

### Restore
```bash
docker cp ./backup fitgym-mongodb:/data/backup
docker-compose exec mongodb mongorestore /data/backup
```
