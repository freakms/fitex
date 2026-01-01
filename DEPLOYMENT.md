# 🚀 Fitex Deployment auf fitex.masexitus.de

## Schnellstart

### 1. Repository auf Server klonen
```bash
git clone <your-repo-url> /opt/fitex
cd /opt/fitex
```

### 2. Umgebungsvariablen konfigurieren
```bash
cp .env.example .env
nano .env
```

**Wichtig:** `JWT_SECRET` mit einem sicheren Wert ersetzen:
```bash
# Sicheren Key generieren:
openssl rand -base64 32
```

### 3. SSL-Zertifikate prüfen
Die Zertifikate sollten hier liegen:
```
/etc/letsencrypt/live/fitex.masexitus.de/fullchain.pem
/etc/letsencrypt/live/fitex.masexitus.de/privkey.pem
```

Falls nicht vorhanden:
```bash
sudo certbot certonly --standalone -d fitex.masexitus.de
```

### 4. Docker Compose starten
```bash
docker-compose up -d
```

### 5. Übungen in Datenbank laden
```bash
curl -X POST https://fitex.masexitus.de/api/admin/seed-exercises
```

### 6. Fertig! 🎉
Öffne: **https://fitex.masexitus.de**

---

## Nützliche Befehle

```bash
# Status prüfen
docker-compose ps

# Logs anzeigen
docker-compose logs -f

# Nur Backend Logs
docker-compose logs -f backend

# Neustart
docker-compose restart

# Stoppen
docker-compose down

# Update & Neustart
git pull
docker-compose build
docker-compose up -d
```

---

## SSL-Zertifikat erneuern

Let's Encrypt Zertifikate laufen nach 90 Tagen ab.

### Automatische Erneuerung (Cronjob)
```bash
sudo crontab -e
# Hinzufügen:
0 3 * * * certbot renew --quiet && docker-compose -f /opt/fitex/docker-compose.yml restart nginx
```

### Manuelle Erneuerung
```bash
sudo certbot renew
docker-compose restart nginx
```

---

## Backup

### Datenbank sichern
```bash
docker-compose exec mongodb mongodump --out /data/backup
docker cp fitex-mongodb:/data/backup ./backup-$(date +%Y%m%d)
```

### Wiederherstellen
```bash
docker cp ./backup-YYYYMMDD fitex-mongodb:/data/backup
docker-compose exec mongodb mongorestore /data/backup
```

---

## Troubleshooting

### Nginx startet nicht
```bash
# SSL-Pfade prüfen
ls -la /etc/letsencrypt/live/fitex.masexitus.de/

# Nginx Config testen
docker-compose exec nginx nginx -t
```

### Backend Fehler
```bash
docker-compose logs backend
```

### MongoDB Verbindung
```bash
docker-compose exec mongodb mongosh
```
