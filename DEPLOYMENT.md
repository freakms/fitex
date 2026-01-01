# 🚀 Fitex Deployment mit Nginx Proxy Manager

## 1. Repository auf Server klonen
```bash
git clone <your-repo-url> /opt/fitex
cd /opt/fitex
```

## 2. Environment konfigurieren
```bash
cp .env.example .env
nano .env
```

JWT_SECRET generieren:
```bash
openssl rand -base64 32
```

## 3. Docker starten
```bash
docker-compose up -d
```

## 4. Nginx Proxy Manager konfigurieren

### Proxy Host erstellen:

| Feld | Wert |
|------|------|
| **Domain Names** | `fitex.masexitus.de` |
| **Scheme** | `http` |
| **Forward Hostname/IP** | `host.docker.internal` oder Server-IP |
| **Forward Port** | `3000` |

### Custom Locations hinzufügen:

Klicke auf "Custom Locations" → "Add Location":

| Location | Scheme | Forward Host | Forward Port |
|----------|--------|--------------|--------------|
| `/api` | `http` | `host.docker.internal` | `8001` |

### SSL aktivieren:
- Tab "SSL" → Let's Encrypt Zertifikat anfordern
- "Force SSL" aktivieren
- "HTTP/2 Support" aktivieren

---

## 5. Übungen laden
```bash
curl -X POST https://fitex.masexitus.de/api/admin/seed-exercises
```

## 6. Fertig! 🎉
Öffne: **https://fitex.masexitus.de**

---

## NPM Konfiguration (Screenshot-Referenz)

```
┌─────────────────────────────────────────────────┐
│ Proxy Host: fitex.masexitus.de                  │
├─────────────────────────────────────────────────┤
│ Details:                                        │
│   Forward: http://[SERVER-IP]:3000              │
│                                                 │
│ Custom Locations:                               │
│   /api → http://[SERVER-IP]:8001                │
│                                                 │
│ SSL:                                            │
│   ✅ Force SSL                                  │
│   ✅ HTTP/2 Support                             │
│   ✅ Let's Encrypt                              │
└─────────────────────────────────────────────────┘
```

---

## Alternative: Zwei separate Proxy Hosts

Falls Custom Locations nicht funktionieren:

### Host 1: Frontend
- Domain: `fitex.masexitus.de`
- Forward: `http://[IP]:3000`

### Host 2: API
- Domain: `api.fitex.masexitus.de`
- Forward: `http://[IP]:8001`

Dann in den Frontend-Dateien die API-URL ändern auf:
`https://api.fitex.masexitus.de`

---

## Nützliche Befehle

```bash
# Status
docker-compose ps

# Logs
docker-compose logs -f

# Neustart
docker-compose restart

# Update
git pull && docker-compose build && docker-compose up -d
```

---

## Backup

```bash
# Datenbank sichern
docker-compose exec mongodb mongodump --out /data/backup
docker cp fitex-mongodb:/data/backup ./backup-$(date +%Y%m%d)
```
