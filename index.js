#!/usr/bin/env node
'use strict';
const { execSync, spawnSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

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

    // Create a .env file with a randomized BETTER_AUTH_SECRET if one doesn't already exist.
    try {
      const envPath = path.join(projectPath, '.env');
      const examplePath = path.join(projectPath, '.env.example');

      function parseEnv(content) {
        const map = {};
        if (!content) return map;
        content.split(/\r?\n/).forEach((line) => {
          const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
          if (m) {
            map[m[1]] = m[2];
          }
        });
        return map;
      }

      if (fs.existsSync(envPath)) {
        // Merge missing keys from .env.example into existing .env (do not overwrite existing values)
        console.log('.env existiert — gleiche fehlende Eintraege aus .env.example ab.');
        const envContents = fs.readFileSync(envPath, 'utf8');
        const exampleContents = fs.existsSync(examplePath) ? fs.readFileSync(examplePath, 'utf8') : '';

        const envMap = parseEnv(envContents);
        const exMap = parseEnv(exampleContents);

        let updated = envContents;
        let changed = false;

        for (const key of Object.keys(exMap)) {
          if (!(key in envMap)) {
            if (updated && !updated.endsWith('\n')) updated += '\n';
            updated += `${key}=${exMap[key]}\n`;
            changed = true;
          }
        }

        // Ensure BETTER_AUTH_SECRET exists
        if (!/^\s*BETTER_AUTH_SECRET\s*=.*$/m.test(updated)) {
          const secret = crypto.randomBytes(32).toString('base64');
          if (updated && !updated.endsWith('\n')) updated += '\n';
          updated += `BETTER_AUTH_SECRET="${secret}"\n`;
          changed = true;
        }

        if (changed) {
          fs.writeFileSync(envPath, updated, 'utf8');
          console.log('Aktualisiert .env: fehlende Keys aus .env.example hinzugefuegt und BETTER_AUTH_SECRET generiert (falls noetig).');
        } else {
          console.log('.env bereits komplett — keine Aenderungen notwendig.');
        }
      } else {
        // Create new .env using .env.example as base and add BETTER_AUTH_SECRET
        let contents = '';
        if (fs.existsSync(examplePath)) {
          contents = fs.readFileSync(examplePath, 'utf8');
        }

        // Generate a secure random secret (base64) and insert or append it to the .env contents
        const secret = crypto.randomBytes(32).toString('base64');
        const secretLine = `BETTER_AUTH_SECRET="${secret}"`;

        if (/^\s*BETTER_AUTH_SECRET\s*=.*$/m.test(contents)) {
          contents = contents.replace(/^\s*BETTER_AUTH_SECRET\s*=.*$/m, secretLine);
        } else {
          if (contents && !contents.endsWith('\n')) contents += '\n';
          contents += `${secretLine}\n`;
        }

        fs.writeFileSync(envPath, contents, 'utf8');
        console.log('Erstellt .env mit Inhalten aus .env.example und generiertem BETTER_AUTH_SECRET.');
      }
    } catch (err) {
      console.warn('Konnte .env nicht automatisch anlegen/aktualisieren:', err && err.message ? err.message : err);
    }

    // Try to run Prisma generate/db push first. If Prisma CLI (npx) isn't available
    // because dependencies haven't been installed, run `npm install` and retry.
    try {
      console.log('');
      console.log('Versuche Prisma Client zu generieren und das Schema anzuwenden...');

      const schemaPath = path.join('src', 'prisma', 'schema.prisma');

      function runPrismaCommands() {
        execSync('npx prisma generate', { stdio: 'inherit' });
        if (fs.existsSync(schemaPath)) {
          execSync(`npx prisma db push --schema=${schemaPath}`, { stdio: 'inherit' });
        } else {
          execSync('npx prisma db push', { stdio: 'inherit' });
        }
      }

      try {
        runPrismaCommands();
      } catch (prismaErr) {
        console.log('Prisma-CLI oder Abhaengigkeiten evtl. nicht vorhanden. Installiere Abhaengigkeiten und erneut versuchen...');
        execSync('npm install', { stdio: 'inherit' });
        // retry
        try {
          runPrismaCommands();
        } catch (prismaErr2) {
          console.warn('Prisma-Befehle schlugen nach der Installation weiterhin fehl:', prismaErr2 && prismaErr2.message ? prismaErr2.message : prismaErr2);
        }
      }

      // Start dev server in background (detached) so we can continue and run the admin script.
      try {
        console.log('Starte dev-Server (npm run dev) im Hintergrund...');
        const dev = spawn('npm', ['run', 'dev'], { stdio: 'ignore', shell: true, detached: true });
        dev.unref();
        // give the server a moment to boot so HTTP endpoints may be reachable
        await new Promise((resolve) => setTimeout(resolve, 2500));
      } catch (devErr) {
        console.warn('Fehler beim Starten von npm run dev (im Hintergrund):', devErr && devErr.message ? devErr.message : devErr);
      }

      // Prompt for admin credentials and run create-admin-via-api.js in the newly created project
      const readline = require('readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

      const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

      console.log('');
      console.log('Optional: Erstelle sofort einen Admin-Benutzer via scripts/create-admin-via-api.js');
      const email = (await ask('Admin E-Mail (leer = überspringen): ')).trim();
      if (!email) {
        rl.close();
      } else {
        const password = (await ask('Admin Passwort: ')).trim();
        const name = (await ask('Admin Name (optional): ')).trim();
        const baseUrlInput = (await ask('Base URL of running app (optional, default http://localhost:3000): ')).trim();
        const baseUrl = baseUrlInput || 'http://localhost:3000';
        rl.close();

        const scriptPath = path.join(projectPath, 'scripts', 'create-admin-via-api.js');
        if (!fs.existsSync(scriptPath)) {
          console.warn(`Skript nicht gefunden: ${scriptPath} — überspringe Admin-Erstellung.`);
        } else {
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
        }
      }
    } catch (err) {
      console.warn('Prisma-Schritte u/o Admin-Erstellung schlugen fehl:', err && err.message ? err.message : err);
    }

    console.log('');
    console.log('Projekt erfolgreich erstellt!');
  } catch (error) {
    console.error('Fehler: ' + error.message);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fehler: ' + error.message);
  process.exit(1);
});
