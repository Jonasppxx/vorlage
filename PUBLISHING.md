# 📋 Anleitung: npm Paket veröffentlichen

## Voraussetzungen

1. **npm Account erstellen**
   - Gehe zu https://www.npmjs.com/signup
   - Erstelle einen kostenlosen Account

2. **npm Login im Terminal**
   ```powershell
   npm login
   ```
   - Gib Username, Password und Email ein

## Schritt-für-Schritt: Paket veröffentlichen

### 1. Projekt testen

```powershell
# Development Server starten
npm run dev

# Production Build testen
npm run build
npm start
```

### 2. Git Repository einrichten

```powershell
# Git initialisieren (falls noch nicht geschehen)
git init

# Alle Dateien hinzufügen
git add .

# Commit erstellen
git commit -m "Initial commit: Next.js Template"

# Remote Repository hinzufügen
git remote add origin https://github.com/Jonasppxx/vorlage.git

# Push zu GitHub
git push -u origin main
```

### 3. Package Name prüfen

In `package.json` ist der Name: `@jonasppxx/vorlage`

- `@jonasppxx` = Dein npm Username (Scoped Package)
- `vorlage` = Package Name

**Wichtig:** Ändere `@jonasppxx` zu deinem npm Username!

### 4. Paket veröffentlichen

```powershell
# Ersten Release veröffentlichen
npm publish --access public
```

Bei Scoped Packages (@username/package) musst du `--access public` verwenden!

### 5. Updates veröffentlichen

Wenn du Änderungen machst:

```powershell
# Version erhöhen (wähle eine):
npm version patch   # 1.0.0 -> 1.0.1 (Bugfixes)
npm version minor   # 1.0.0 -> 1.1.0 (Neue Features)
npm version major   # 1.0.0 -> 2.0.0 (Breaking Changes)

# Dann veröffentlichen
npm publish
```

## Installation für Nutzer

Nach der Veröffentlichung können andere dein Paket so nutzen:

### Option 1: Mit npx (Kein Install nötig)

```bash
npx @jonasppxx/vorlage mein-projekt
cd mein-projekt
npm run dev
```

### Option 2: Global installieren

```bash
npm install -g @jonasppxx/vorlage
create-vorlage mein-projekt
cd mein-projekt
npm run dev
```

## Troubleshooting

### "Package name already exists"
- Ändere den Namen in `package.json` zu etwas Einzigartigem
- Oder nutze einen Scoped Name: `@deinusername/vorlage`

### "You need to authenticate"
```powershell
npm login
```

### "403 Forbidden"
- Prüfe ob du Besitzer des Pakets bist
- Bei Scoped Packages: Nutze `--access public`

### Package löschen (Vorsicht!)
```powershell
npm unpublish @jonasppxx/vorlage --force
```
**Achtung:** Kann nur innerhalb von 72h nach Veröffentlichung durchgeführt werden!

## Best Practices

1. **Semantic Versioning**
   - MAJOR.MINOR.PATCH (z.B. 1.2.3)
   - MAJOR: Breaking Changes
   - MINOR: Neue Features (abwärtskompatibel)
   - PATCH: Bugfixes

2. **Changelog führen**
   - Dokumentiere alle Änderungen
   - Erstelle CHANGELOG.md

3. **Tests schreiben**
   - Stelle sicher, dass alles funktioniert
   - Automatisiere Tests vor Publishing

4. **README aktualisieren**
   - Halte Dokumentation aktuell
   - Füge Beispiele hinzu

## Nützliche npm Commands

```powershell
# Package Info anzeigen
npm view @jonasppxx/vorlage

# Alle deine Packages anzeigen
npm access list packages

# Package Statistiken
npm info @jonasppxx/vorlage

# Specific Version veröffentlichen
npm publish --tag beta
```

## Resources

- [npm Documentation](https://docs.npmjs.com/)
- [npm Package erstellen](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages)
- [Semantic Versioning](https://semver.org/)
- [npm Best Practices](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)

---

**Viel Erfolg mit deinem npm Package! 🎉**
