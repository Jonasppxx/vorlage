/**
 * Database Setup Script
 * Konfiguriert die Prisma Schema basierend auf dem ausgewählten Database Provider
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const SCHEMA_PATH = path.join(__dirname, '../prisma/schema.prisma');
const NEXT_CONFIG_PATH = path.join(__dirname, '../next.config.ts');

const MONGODB_SCHEMA = `// MongoDB Schema for Better-Auth
// This is your Prisma schema file for MongoDB
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

// Better-Auth User Model
model User {
  id            String    @id @default(cuid()) @map("_id")
  name          String?
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  posts         Post[]
  sessions      Session[]
  accounts      Account[]
}

model Session {
  id        String   @id @default(cuid()) @map("_id")
  userId    String
  expiresAt DateTime
  token     String   @unique
  ipAddress String?
  userAgent String?
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Account {
  id                String   @id @default(cuid()) @map("_id")
  userId            String
  accountId         String
  providerId        String
  accessToken       String?
  refreshToken      String?
  idToken           String?
  expiresAt         DateTime?
  password          String?
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([providerId, accountId])
}

model Verification {
  id         String   @id @default(cuid()) @map("_id")
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

// Example Post Model
model Post {
  id        String   @id @default(cuid()) @map("_id")
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`;

const POSTGRESQL_SCHEMA = `// PostgreSQL Schema for Better-Auth
// This is your Prisma schema file for PostgreSQL
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Better-Auth User Model
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  posts         Post[]
  sessions      Session[]
  accounts      Account[]
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  expiresAt DateTime
  token     String   @unique
  ipAddress String?
  userAgent String?
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Account {
  id                String   @id @default(cuid())
  userId            String
  accountId         String
  providerId        String
  accessToken       String?
  refreshToken      String?
  idToken           String?
  expiresAt         DateTime?
  password          String?
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([providerId, accountId])
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

// Example Post Model
model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`;

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

function updateNextConfig(provider) {
  let configContent = fs.readFileSync(NEXT_CONFIG_PATH, 'utf-8');

  // Update DATABASE_PROVIDER export
  const providerRegex = /export const DATABASE_PROVIDER: DatabaseProvider = ["'](?:mongodb|postgresql)["'];/;
  if (providerRegex.test(configContent)) {
    configContent = configContent.replace(
      providerRegex,
      `export const DATABASE_PROVIDER: DatabaseProvider = "${provider}";`
    );
  }

  fs.writeFileSync(NEXT_CONFIG_PATH, configContent);
  console.log(`✅ next.config.ts aktualisiert mit DATABASE_PROVIDER="${provider}"`);
}

async function main() {
  console.log('🗄️  Database Setup für Better-Auth\n');
  console.log('Wähle deinen Database Provider:');
  console.log('1) MongoDB');
  console.log('2) PostgreSQL\n');

  const choice = await question('Deine Wahl (1 oder 2): ');

  let provider;
  let schema;

  switch (choice.trim()) {
    case '1':
      provider = 'mongodb';
      schema = MONGODB_SCHEMA;
      console.log('\n📦 MongoDB ausgewählt');
      break;
    case '2':
      provider = 'postgresql';
      schema = POSTGRESQL_SCHEMA;
      console.log('\n🐘 PostgreSQL ausgewählt');
      break;
    default:
      console.log('\n❌ Ungültige Auswahl');
      rl.close();
      process.exit(1);
  }

  // Schreibe Schema
  fs.writeFileSync(SCHEMA_PATH, schema);
  console.log(`✅ schema.prisma aktualisiert für ${provider}`);

  // Update next.config.ts
  updateNextConfig(provider);

  console.log('\n✨ Setup abgeschlossen!\n');
  console.log('Nächste Schritte:');
  console.log('1. Stelle sicher, dass DATABASE_URL in deiner .env gesetzt ist');
  console.log('2. Führe `npx prisma generate` aus');
  console.log('3. Führe `npx prisma db push` aus (für Development)');
  console.log('   oder `npx prisma migrate dev` (für Production-ready Migrations)\n');

  rl.close();
}

main().catch((error) => {
  console.error('❌ Fehler:', error);
  rl.close();
  process.exit(1);
});
