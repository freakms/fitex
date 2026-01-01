# 📱 Android APK Build Anleitung

## Methode 1: Expo EAS Build (Empfohlen)

Expo baut die APK in der Cloud - kein Android Studio nötig!

### Voraussetzungen
- Node.js 18+
- Expo Account (kostenlos: https://expo.dev/signup)

### Schritt 1: EAS CLI installieren
```bash
npm install -g eas-cli
```

### Schritt 2: Bei Expo einloggen
```bash
eas login
```

### Schritt 3: Projekt konfigurieren
```bash
cd frontend
eas build:configure
```

### Schritt 4: APK bauen (Preview Build)
```bash
# APK für direktes Installieren
eas build --platform android --profile preview
```

Der Build dauert ca. 10-15 Minuten. Du erhältst einen Download-Link!

### Schritt 5: APK herunterladen
Nach dem Build siehst du:
```
✔ Build finished
📦 APK: https://expo.dev/artifacts/eas/xxxxx.apk
```

---

## Methode 2: Lokaler Build (Android Studio)

Für lokale Builds ohne Expo Cloud.

### Voraussetzungen
- Android Studio mit SDK
- Java 17
- ~15 GB Speicherplatz

### Schritt 1: Native Projektdateien generieren
```bash
cd frontend
npx expo prebuild --platform android
```

### Schritt 2: APK bauen
```bash
cd android
./gradlew assembleRelease
```

### Schritt 3: APK finden
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## 🔧 Backend-URL für Produktion ändern

Vor dem Build muss die API-URL angepasst werden!

### In `frontend/store/authStore.ts`:
```typescript
const API_URL = 'https://deine-domain.de/api';
```

### In `frontend/utils/api.ts`:
```typescript
export const API_URL = 'https://deine-domain.de/api';
```

---

## 📲 APK auf Handy installieren

### Option A: Download-Link
1. Link auf Handy öffnen
2. APK herunterladen
3. "Aus unbekannten Quellen installieren" erlauben
4. Installieren

### Option B: USB-Kabel
```bash
adb install app-release.apk
```

### Option C: QR-Code
Expo zeigt nach dem Build einen QR-Code zum direkten Download.

---

## 🏪 Google Play Store Veröffentlichung

### 1. Google Play Console Account
- Einmalig 25$ Gebühr
- https://play.google.com/console

### 2. App Bundle bauen (nicht APK!)
```bash
eas build --platform android --profile production
```

### 3. Hochladen
- In Play Console neue App erstellen
- AAB-Datei hochladen
- Store-Listing ausfüllen
- Zur Überprüfung einreichen

---

## ⚠️ Wichtige Hinweise

### App Signing
Bei EAS Builds verwaltet Expo die Signatur-Keys automatisch.
Für Play Store brauchst du einen eigenen Keystore:

```bash
eas credentials
```

### Updates ohne Neubuild
Mit EAS Update kannst du JS-Änderungen ohne neuen Build pushen:
```bash
eas update --branch production
```

### Icons & Splash Screen
Anpassen in `app.json`:
```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png"
    }
  }
}
```

Icon-Größe: 1024x1024 PNG
