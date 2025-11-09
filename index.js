#!/usr/bin/env node
'use strict';
const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ============================================================================
// File System Utilities (from lib/fs-utils.js)
// ============================================================================

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFileSync(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeJsonFile(filePath, obj) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf8');
}
function copyRecursive(src, dest, options = {}) {
  const skipNames = options.skipNames || [];
  try {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      ensureDir(dest);
      for (const file of fs.readdirSync(src)) {
        if (skipNames.includes(file)) continue;
        copyRecursive(path.join(src, file), path.join(dest, file), options);
      }
    } else {
      copyFileSync(src, dest);
    }
  } catch (err) {
    // stille Warnung, damit Template-Kopierlauf nicht abbricht
    console.warn(`Warnung beim Kopieren ${src}: ${err.message}`);
  }
}

function copyTemplates(templatePath, projectPath) {
  const filesToCopy = [
    'src',
    'public',
    'scripts',
    '.env.example',
    'package.json',
    'tsconfig.json',
    'next.config.ts',
    'tailwind.config.ts',
    'postcss.config.mjs',
    'prisma.config.ts',
    'eslint.config.mjs',
    '.gitignore',
    'README.md',
    'DATABASE_SETUP.md',
    'DATABASE_CONFIG.md',
    'ADMIN_SETUP.md',
  ];

  // Beim rekursiven Kopieren bestimmte Dateien/Varianten überspringen
  const skipNames = ['auth.postgresql.ts', 'auth.mongodb.ts', 'schema.postgresql.prisma', 'schema.mongodb.prisma', 'auth.ts'];

  for (const file of filesToCopy) {
    const srcPath = path.join(templatePath, file);
    const destPath = path.join(projectPath, file);
    if (!fs.existsSync(srcPath)) continue;
    try {
      const stat = fs.statSync(srcPath);
      if (stat.isDirectory()) {
        console.log(`  Kopiere ${file}/`);
        copyRecursive(srcPath, destPath, { skipNames });
      } else {
        console.log(`  Kopiere ${file}`);
        copyFileSync(srcPath, destPath);
      }
    } catch (err) {
      console.warn(`  Ueberspringe ${file}: ${err.message}`);
    }
  }

  // Immer das schema.prisma aus der Vorlage kopieren (Quelle: src/prisma/schema.prisma)
  // Ziel im neuen Projekt: src/prisma/schema.prisma
  const schemaSrc = path.join(templatePath, 'src', 'prisma', 'schema.prisma');
  const schemaDest = path.join(projectPath, 'src', 'prisma', 'schema.prisma');

  if (fs.existsSync(schemaSrc)) {
    ensureDir(path.dirname(schemaDest));
    copyFileSync(schemaSrc, schemaDest);
    console.log('  OK: Schema kopiert nach src/prisma/schema.prisma');
  } else {
    console.warn('  WARN: src/prisma/schema.prisma in der Vorlage nicht gefunden.');
  }
}

// ============================================================================
// Main Application
// ============================================================================

const projectName = process.argv[2] || ".";
const targetDir = path.resolve(process.cwd(), projectName);

async function main() {
  console.log('');
  console.log(`Erstelle neues Projekt: ${projectName}`);
  console.log('');

  const projectPath = targetDir;

  if (projectName !== "." && require('fs').existsSync(projectPath)) {
    console.error(`Fehler: Der Ordner "${projectName}" existiert bereits!`);
    process.exit(1);
  }

  try {
    ensureDir(projectPath);
    console.log('Kopiere Template-Dateien...');

    const templatePath = __dirname;

    // Kopiere alle Templates (inkl. prisma/schema.prisma)s
    copyTemplates(templatePath, projectPath);

    // package.json anpassen
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = readJsonFile(packageJsonPath);
    if (packageJson) {
      packageJson.name = projectName;
      packageJson.version = '0.1.0';
      delete packageJson.bin;
      delete packageJson.files;
      writeJsonFile(packageJsonPath, packageJson);
    }

    console.log('');
    console.log('Installiere Dependencies...');
    console.log('');

    process.chdir(projectPath);
    execSync('npm install', { stdio: 'inherit' });

    // After installing dependencies, run Prisma generate and db push (if prisma schema exists)
    try {
      console.log('');
      console.log('Generiere Prisma Client und wende Schema an...');
      // generate client
      execSync('npx prisma generate', { stdio: 'inherit' });
      // push schema (explicit schema path inside project)
      const schemaPath = path.join('src', 'prisma', 'schema.prisma');
      if (fs.existsSync(schemaPath)) {
        execSync(`npx prisma db push --schema=${schemaPath}`, { stdio: 'inherit' });
      } else {
        // try without explicit schema if default setup
        execSync('npx prisma db push', { stdio: 'inherit' });
      }

      // Prompt for admin credentials and run create-admin-via-api.js in the newly created project
      const readline = require('readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

      const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

      (async () => {
        console.log('');
        console.log('Optional: Erstelle sofort einen Admin-Benutzer via scripts/create-admin-via-api.js');
        const email = (await ask('Admin E-Mail (leer = überspringen): ')).trim();
        if (!email) {
          rl.close();
          return;
        }
        const password = (await ask('Admin Passwort: ')).trim();
        const name = (await ask('Admin Name (optional): ')).trim();
        const baseUrlInput = (await ask('Base URL of running app (optional, default http://localhost:3000): ')).trim();
        const baseUrl = baseUrlInput || 'http://localhost:3000';
        rl.close();

        const scriptPath = path.join(projectPath, 'scripts', 'create-admin-via-api.js');
        if (!fs.existsSync(scriptPath)) {
          console.warn(`Skript nicht gefunden: ${scriptPath} — überspringe Admin-Erstellung.`);
          return;
        }

        console.log('Starte create-admin-via-api.js mit den angegebenen Parametern...');
        // Use spawnSync to avoid shell quoting issues and inherit stdio
        const args = [scriptPath, email, password, name || '', baseUrl];
        const node = process.execPath; // path to node binary
        const res = spawnSync(node, args, { stdio: 'inherit' });
        if (res.error) {
          console.error('Fehler beim Starten des Admin-Skripts:', res.error.message || res.error);
        } else if (res.status !== 0) {
          console.warn('create-admin-via-api.js beendete mit Exit-Code', res.status);
        } else {
          console.log('Admin-Skript erfolgreich ausgefuehrt.');
        }
      })();
    } catch (err) {
      console.warn('Prisma-Schritte u/o Admin-Erstellung schlugen fehl:', err && err.message ? err.message : err);
    }

    console.log('');
    console.log('Projekt erfolgreich erstellt!');
    console.log('');
    console.log('Naechste Schritte:');
    console.log(`  cd ${projectName}`);
    console.log('  npm run dev');
    console.log('');

  } catch (error) {
    console.error('Fehler: ' + error.message);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fehler: ' + error.message);
  process.exit(1);
});
