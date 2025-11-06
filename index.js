#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const args = process.argv.slice(2);
const projectName = args[0];

if (!projectName) {
  console.log(`
🚀 Next.js Template mit Prisma & Better-Auth

Usage:
  npx @jonastest/vorlage <project-name>

Example:
  npx @jonastest/vorlage my-app
  
📦 Das erstellt:
  ✅ Next.js 16 + TypeScript
  ✅ Tailwind CSS 4
  ✅ Prisma (MongoDB oder PostgreSQL)
  ✅ Better-Auth Authentication
  ✅ API Routes
  ✅ src/ directory Struktur
  `);
  process.exit(0);
}

// Funktion für interaktive Eingabe
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

// PostgreSQL Schema Template
const POSTGRES_SCHEMA = `// This is your Prisma schema file,
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

// MongoDB Schema Template
const MONGODB_SCHEMA = `// This is your Prisma schema file,
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

// Auth.ts für PostgreSQL
const POSTGRES_AUTH = `import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
  },
  secret: process.env.BETTER_AUTH_SECRET || "default-secret-change-in-production",
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});
`;

// Auth.ts für MongoDB
const MONGODB_AUTH = `import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "mongodb",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
  },
  secret: process.env.BETTER_AUTH_SECRET || "default-secret-change-in-production",
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});
`;

// .env Templates
const POSTGRES_ENV = `# PostgreSQL Database Connection
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"

# Better-Auth Configuration
BETTER_AUTH_SECRET="your-secret-key-here-replace-with-random-string"
BETTER_AUTH_URL="http://localhost:3000"

# Next.js Public URL (for auth callbacks)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# GitHub OAuth (optional - for social login)
GITHUB_CLIENT_ID="your-github-oauth-client-id"
GITHUB_CLIENT_SECRET="your-github-oauth-client-secret"

# Google OAuth (optional - for social login)
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
`;

const MONGODB_ENV = `# MongoDB Database Connection
# WICHTIG: Better-Auth benötigt MongoDB Replica Set für Transactions!
#
# Option 1: MongoDB Atlas (Kostenlos - EMPFOHLEN)
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/vorlage?retryWrites=true&w=majority"
#
# Option 2: Docker MongoDB Replica Set
DATABASE_URL="mongodb://localhost:27017/vorlage?replicaSet=rs0"

# Better-Auth Configuration
BETTER_AUTH_SECRET="your-secret-key-here-replace-with-random-string"
BETTER_AUTH_URL="http://localhost:3000"

# Next.js Public URL (for auth callbacks)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# GitHub OAuth (optional - for social login)
GITHUB_CLIENT_ID="your-github-oauth-client-id"
GITHUB_CLIENT_SECRET="your-github-oauth-client-secret"

# Google OAuth (optional - for social login)
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
`;

async function main() {
  console.log(`\\n🚀 Erstelle neues Projekt: ${projectName}\\n`);

  // Datenbank-Auswahl
  console.log('📊 Wähle deine Datenbank:\\n');
  console.log('  1) MongoDB (mit Replica Set - empfohlen mit Atlas)');
  console.log('  2) PostgreSQL (empfohlen für Production)\\n');
  
  const dbChoice = await askQuestion('Deine Wahl (1 oder 2): ');
  const usePostgres = dbChoice.trim() === '2';
  
  console.log(usePostgres ? '\\n✅ PostgreSQL ausgewählt\\n' : '\\n✅ MongoDB ausgewählt\\n');

  // Erstelle Projektverzeichnis
  const projectPath = path.join(process.cwd(), projectName);

  if (fs.existsSync(projectPath)) {
    console.error(`❌ Ordner ${projectName} existiert bereits!`);
    process.exit(1);
  }

  try {
    fs.mkdirSync(projectPath, { recursive: true });
    
    console.log('📦 Kopiere Template-Dateien...');

    // Kopiere alle Template-Dateien
    const templatePath = __dirname;
    const filesToCopy = [
      'src',
      'public',
      'package.json',
      'tsconfig.json',
      'next.config.ts',
      'tailwind.config.ts',
      'postcss.config.mjs',
      'prisma.config.ts',
      'eslint.config.mjs',
      '.gitignore',
      'README.md',
    ];

    function copyRecursive(src, dest, skipFiles = []) {
      try {
        if (fs.statSync(src).isDirectory()) {
          fs.mkdirSync(dest, { recursive: true });
          fs.readdirSync(src).forEach(file => {
            const srcPath = path.join(src, file);
            const destPath = path.join(dest, file);
            
            // Skip bestimmte Dateien die wir später ersetzen
            const relPath = path.relative(templatePath, srcPath).replace(/\\\\/g, '/');
            if (skipFiles.some(skip => relPath.includes(skip))) {
              return;
            }
            
            copyRecursive(srcPath, destPath, skipFiles);
          });
        } else {
          fs.copyFileSync(src, dest);
        }
      } catch (error) {
        console.warn(`⚠️  Warnung beim Kopieren von ${src}: ${error.message}`);
      }
    }

    // Skip Dateien die wir datenbankspezifisch ersetzen
    const skipFiles = [
      'src/prisma/schema.prisma',
      'src/lib/auth.ts',
    ];

    filesToCopy.forEach(file => {
      const srcPath = path.join(templatePath, file);
      const destPath = path.join(projectPath, file);
      
      if (fs.existsSync(srcPath)) {
        try {
          const stat = fs.statSync(srcPath);
          if (stat.isDirectory()) {
            console.log(`  📁 Kopiere ${file}/`);
            copyRecursive(srcPath, destPath, skipFiles);
          } else {
            console.log(`  📄 Kopiere ${file}`);
            const destDir = path.dirname(destPath);
            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true });
            }
            fs.copyFileSync(srcPath, destPath);
          }
        } catch (error) {
          console.warn(`⚠️  Überspringe ${file}: ${error.message}`);
        }
      }
    });

    // Erstelle datenbankspezifische Dateien
    console.log('  📝 Erstelle datenbankspezifische Konfiguration...');
    
    // Prisma Schema
    const schemaPath = path.join(projectPath, 'src', 'prisma', 'schema.prisma');
    fs.mkdirSync(path.dirname(schemaPath), { recursive: true });
    fs.writeFileSync(schemaPath, usePostgres ? POSTGRES_SCHEMA : MONGODB_SCHEMA);
    
    // Auth.ts
    const authPath = path.join(projectPath, 'src', 'lib', 'auth.ts');
    fs.mkdirSync(path.dirname(authPath), { recursive: true });
    fs.writeFileSync(authPath, usePostgres ? POSTGRES_AUTH : MONGODB_AUTH);
    
    // .env
    const envPath = path.join(projectPath, '.env');
    fs.writeFileSync(envPath, usePostgres ? POSTGRES_ENV : MONGODB_ENV);
    console.log('✅ .env Datei erstellt');

    // Update package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.name = projectName;
    packageJson.version = '0.1.0';
    delete packageJson.bin;
    delete packageJson.files;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    console.log('\\n📥 Installiere Dependencies...\\n');

    // Wechsle ins Projektverzeichnis und installiere Dependencies
    process.chdir(projectPath);
    execSync('npm install', { stdio: 'inherit' });

    // Setup Anleitung
    if (usePostgres) {
      console.log(`
✅ Projekt erfolgreich erstellt mit PostgreSQL!

📁 Nächste Schritte:
  cd ${projectName}
  
📝 PostgreSQL Setup:
  1. Installiere PostgreSQL: https://www.postgresql.org/download/
     Oder nutze Docker:
     docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16
  
  2. Erstelle eine Datenbank:
     psql -U postgres
     CREATE DATABASE ${projectName};
  
  3. Update .env mit deiner Connection:
     DATABASE_URL="postgresql://postgres:postgres@localhost:5432/${projectName}?schema=public"
  
  4. Push Schema zur Datenbank:
     npx prisma db push
  
🚀 Starte das Projekt:
  npm run dev
  
🗄️ Prisma Commands:
  npx prisma studio        # Öffne Prisma Studio
  npx prisma db push       # Push Schema zur DB
  npx prisma generate      # Generiere Prisma Client
  
🎉 Viel Erfolg mit deinem Projekt!
`);
    } else {
      console.log(`
✅ Projekt erfolgreich erstellt mit MongoDB!

📁 Nächste Schritte:
  cd ${projectName}
  
📝 MongoDB Setup (WICHTIG - Replica Set benötigt!):
  
  Option 1 - MongoDB Atlas (Empfohlen, kostenlos):
    1. Gehe zu https://www.mongodb.com/cloud/atlas
    2. Erstelle kostenlosen M0 Cluster
    3. Kopiere Connection String
    4. Update .env mit dem Connection String
  
  Option 2 - Docker (Schnell):
    docker run -d --name mongodb -p 27017:27017 mongo:7.0 --replSet rs0 --bind_ip_all
    timeout /t 5
    docker exec mongodb mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"
    
    Dann in .env:
    DATABASE_URL="mongodb://localhost:27017/${projectName}?replicaSet=rs0"
  
  Mehr Info: Siehe MONGODB_REPLICA_SET.md und QUICK_START.md
  
🚀 Nach DB Setup:
  npx prisma db push       # Push Schema zur DB
  npm run dev              # Start Dev Server
  
🗄️ Prisma Commands:
  npx prisma studio        # Öffne Prisma Studio
  npx prisma generate      # Generiere Prisma Client
  
🎉 Viel Erfolg mit deinem Projekt!
`);
    }

  } catch (error) {
    console.error(`\\n❌ Fehler beim Erstellen des Projekts: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Starte den Installer
main().catch(error => {
  console.error(`\\n❌ Fehler: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
