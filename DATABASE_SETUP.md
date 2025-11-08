# Database Setup

Dieses Projekt unterstützt sowohl **MongoDB** als auch **PostgreSQL**. 

Der Database Provider wird in `next.config.ts` konfiguriert und beim Projekt-Setup automatisch gesetzt.

## Initiales Setup (beim Erstellen eines neuen Projekts)

Wenn du ein neues Projekt mit `npx create-nexal` erstellst, wirst du nach dem Database Provider gefragt. Die Auswahl wird automatisch in `next.config.ts` gespeichert.

## Provider nachträglich ändern

### Option 1: Setup-Script verwenden

Führe das Setup-Script aus, um deinen Database Provider zu ändern:

```bash
npm run setup:db
```

Das Script wird:
- Dich nach dem gewünschten Provider fragen (MongoDB oder PostgreSQL)
- Die `prisma/schema.prisma` entsprechend anpassen
- Die `next.config.ts` mit dem neuen `DATABASE_PROVIDER` aktualisieren

### Option 2: Manuelle Konfiguration

1. Öffne `next.config.ts` und ändere den `DATABASE_PROVIDER`:
```typescript
export const DATABASE_PROVIDER: DatabaseProvider = "postgresql"; // oder "mongodb"
```

2. Kopiere das entsprechende Schema:
```bash
# Für MongoDB
cp prisma/schema.mongodb.prisma prisma/schema.prisma

# Für PostgreSQL
cp prisma/schema.postgresql.prisma prisma/schema.prisma
```

## Database URL konfigurieren

Stelle sicher, dass deine `.env` Datei die korrekte `DATABASE_URL` enthält:

**Für MongoDB:**
```env
DATABASE_URL="mongodb://localhost:27017/mydb"
# oder für MongoDB Atlas:
DATABASE_URL="mongodb+srv://user:password@cluster.mongodb.net/mydb"
```

**Für PostgreSQL:**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

## Prisma Client generieren & Database initialisieren

Nach dem Ändern des Providers:

```bash
# 1. Prisma Client generieren
npx prisma generate

# 2. Database initialisieren (Development)
npx prisma db push

# Oder für Production (mit Migrations)
npx prisma migrate dev --name init
```

## Unterschiede zwischen den Providern

Die wichtigsten Unterschiede in der Schema-Konfiguration:

### MongoDB
- IDs verwenden `@map("_id")` Annotation
- Provider: `"mongodb"` in `datasource db`

### PostgreSQL
- IDs verwenden keine `@map` Annotation
- Provider: `"postgresql"` in `datasource db`

## Wichtig

⚠️ **Achtung:** Das Wechseln des Providers in einem bestehenden Projekt mit Daten erfordert eine Migration der Daten! Der Database Provider wird zur Build-Zeit aus `next.config.ts` gelesen und ist Teil der Anwendungskonfiguration.

