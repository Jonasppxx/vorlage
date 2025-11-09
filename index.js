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
    'eslint.config.mjs',
    '.gitignore',
    'README.md',
    'DATABASE_SETUP.md',
    'DATABASE_CONFIG.md',
    'ADMIN_SETUP.md',
    'docker-compose.yml',
    'Dockerfile',
  ];

  // Dateien/Varianten, die wir beim Kopieren standardmäßig überspringen wollen
  // (keine generische `auth.ts` mehr - nur DB/provider-spezifische Varianten)
  const skipNames = ['auth.postgresql.ts', 'auth.mongodb.ts', 'schema.postgresql.prisma', 'schema.mongodb.prisma'];

  for (const file of filesToCopy) {
    const srcPath = path.join(templatePath, file);
    const destPath = path.join(projectPath, file);
    if (!fs.existsSync(srcPath)) continue;
    try {
      const stat = fs.statSync(srcPath);
      if (stat.isDirectory()) {
        copyRecursive(srcPath, destPath, { skipNames });
      } else {
        copyFileSync(srcPath, destPath);
      }
    } catch (err) {
      // ignore individual copy errors to keep output concise
    }
  }

  // Immer das schema.prisma aus der Vorlage kopieren (Quelle: src/prisma/schema.prisma)
  // Ziel im neuen Projekt: src/prisma/schema.prisma
  const schemaSrc = path.join(templatePath, 'src', 'prisma', 'schema.prisma');
  const schemaDest = path.join(projectPath, 'src', 'prisma', 'schema.prisma');

  if (fs.existsSync(schemaSrc)) {
    ensureDir(path.dirname(schemaDest));
    copyFileSync(schemaSrc, schemaDest);
  } else {
    // No warning for missing schema to keep output clean
  }

  // Ensure scripts folder is copied robustly (use fs.cpSync when available)
  try {
    const scriptsSrc = path.join(templatePath, 'scripts');
    const scriptsDest = path.join(projectPath, 'scripts');
    if (fs.existsSync(scriptsSrc)) {
      // Prefer fs.cpSync (Node 16+) for a robust recursive copy
      if (typeof fs.cpSync === 'function') {
        try {
          fs.cpSync(scriptsSrc, scriptsDest, { recursive: true });
        } catch (e) {
          // fallback to our copyRecursive
          copyRecursive(scriptsSrc, scriptsDest, { skipNames });
        }
      } else {
        copyRecursive(scriptsSrc, scriptsDest, { skipNames });
      }
    }
  } catch (e) {
    // keep quiet; copying will have been attempted above
  }
}

// ============================================================================
// Main Application
// ============================================================================

const projectName = process.argv[2] || ".";
const targetDir = path.resolve(process.cwd(), projectName);

async function main() {
  console.log(`Erstelle Projekt: ${projectName}`);

  const projectPath = targetDir;

  if (projectName !== "." && require('fs').existsSync(projectPath)) {
    console.error(`Error: Directory already exists: ${projectName}`);
    process.exit(1);
  }

  try {
    ensureDir(projectPath);
    // Template source directory
    const templatePath = __dirname;

    // Prioritized copy: ensure docker-compose and Dockerfile exist in the
    // target project immediately so attempts to run `docker compose` won't
    // fail due to file-not-found when we ask to start mongodb right after.
    const prioritized = ['docker-compose.yml', 'Dockerfile'];
    for (const f of prioritized) {
      try {
        const src = path.join(templatePath, f);
        const dest = path.join(projectPath, f);
        if (fs.existsSync(src)) {
          copyFileSync(src, dest);
          console.log(`Copied ${f} (priority).`);
        }
      } catch (e) {
        console.warn(`Could not copy prioritized file ${f}: ${e && e.message ? e.message : e}`);
      }
    }

    console.log('Copying templates...');

    // copy remaining templates
    copyTemplates(templatePath, projectPath);
  console.log('Templates copied.');

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

  console.log('Installing dependencies...');

    process.chdir(projectPath);

    // Ask about MongoDB first: use existing or start docker-compose MongoDB
    let dbUrl = null;
    try {
      const readline = require('readline');
      const rlDb = readline.createInterface({ input: process.stdin, output: process.stdout });
      const askDb = (q) => new Promise((resolve) => rlDb.question(q, resolve));
      const hasDbAns = (await askDb('Hast du bereits eine MongoDB? (j/N): ')).trim().toLowerCase();
      if (hasDbAns === 'j' || hasDbAns === 'y' || hasDbAns === 'yes') {
        const provided = (await askDb('DATABASE_URL (z.B. mongodb://user:pass@host:27017/db): ')).trim();
        if (provided) dbUrl = provided;
        rlDb.close();
      } else {
        rlDb.close();
        // Start mongodb via docker-compose if available
        try {
          console.log('Starting mongodb via docker compose...');
          let res = spawnSync('docker', ['compose', '-f', 'docker-compose.yml', 'up', '-d', 'mongodb'], { stdio: 'inherit' });
          if (res.status !== 0) {
            // fallback to docker-compose
            res = spawnSync('docker-compose', ['-f', 'docker-compose.yml', 'up', '-d', 'mongodb'], { stdio: 'inherit' });
          }
          if (res.status === 0) {
            // give container time to initialize
            await new Promise((r) => setTimeout(r, 3000));
            dbUrl = 'mongodb://admin:admin123@localhost:27017/vorlage?replicaSet=rs0&authSource=admin';
          } else {
            console.warn('Could not start mongodb via docker-compose. You can provide a DATABASE_URL manually later.');
          }
        } catch (e) {
          console.warn('Docker compose start failed:', e && e.message ? e.message : e);
        }
      }
    } catch (err) {
      // ignore prompt errors and continue
    }

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
  console.log('Merging .env.example into .env (if needed)');
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

        // If user provided a DB URL or docker-compose started DB, ensure DATABASE_URL is set/overwritten
        if (dbUrl) {
          if (/^\s*DATABASE_URL\s*=.*$/m.test(updated)) {
            updated = updated.replace(/^\s*DATABASE_URL\s*=.*$/m, `DATABASE_URL="${dbUrl}"`);
          } else {
            if (updated && !updated.endsWith('\n')) updated += '\n';
            updated += `DATABASE_URL="${dbUrl}"\n`;
          }
          changed = true;
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
          console.log('.env updated');
        } else {
          console.log('.env already complete');
        }
      } else {
        // Create new .env using .env.example as base and add BETTER_AUTH_SECRET
        let contents = '';
        if (fs.existsSync(examplePath)) {
          contents = fs.readFileSync(examplePath, 'utf8');
        }

        // Ensure DATABASE_URL from prompt/docker is set in new .env
        if (dbUrl) {
          if (/^\s*DATABASE_URL\s*=.*$/m.test(contents)) {
            contents = contents.replace(/^\s*DATABASE_URL\s*=.*$/m, `DATABASE_URL="${dbUrl}"`);
          } else {
            if (contents && !contents.endsWith('\n')) contents += '\n';
            contents += `DATABASE_URL="${dbUrl}"\n`;
          }
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
        console.log('.env created');
      }
    } catch (err) {
      console.warn('Could not create/update .env:', err && err.message ? err.message : err);
    }

    // Try to run Prisma generate/db push first. If Prisma CLI (npx) isn't available
    // because dependencies haven't been installed, run `npm install` and retry.
    try {
  console.log('Running Prisma generate & db push...');

      const schemaPath = path.join('src', 'prisma', 'schema.prisma');

      function runPrismaCommands() {
        // Always run prisma generate and prisma db push without passing a
        // specific schema path. Rely on Prisma's default discovery of
        // schema.prisma in the project (or the CLI's defaults).
        execSync('npx prisma generate', { stdio: 'inherit' });
        execSync('npx prisma db push', { stdio: 'inherit' });
      }

      try {
        runPrismaCommands();
      } catch (prismaErr) {
  console.log('Prisma failed; running npm install and retrying...');
        execSync('npm install', { stdio: 'inherit' });
        // retry
        try {
          runPrismaCommands();
        } catch (prismaErr2) {
          console.warn('Prisma commands failed after retry.');
        }
      }

      // Start dev server in background (detached) so we can continue and run the admin script.
      try {
        console.log('Starting dev server (background)...');
        let dev;
        if (process.platform === 'win32') {
          // On Windows use `start` to spawn an independent window/process that won't die with this script
          // start requires a title argument, provide empty title "" before the command
          dev = spawn('cmd', ['/c', 'start', '""', 'npm', 'run', 'dev'], { stdio: 'ignore', detached: true });
        } else {
          // POSIX: spawn detached child
          dev = spawn('npm', ['run', 'dev'], { stdio: 'ignore', detached: true });
        }
        if (dev && typeof dev.unref === 'function') dev.unref();
        // give the server a moment to boot so HTTP endpoints may be reachable
        await new Promise((resolve) => setTimeout(resolve, 2500));
      } catch (devErr) {
        console.warn('Failed to start dev server:', devErr && devErr.message ? devErr.message : devErr);
      }

      // Prompt for admin credentials and run create-admin-via-api.js in the newly created project
      const readline = require('readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

      const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

  console.log('Optional: create admin user (via scripts/create-admin-via-api.js)');
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
          console.warn('Admin script not found, skipping.');
        } else {
          console.log('Running admin script...');
          // Use spawnSync to avoid shell quoting issues and inherit stdio
          const args = [scriptPath, email, password, name || '', baseUrl];
          const node = process.execPath; // path to node binary
          const res = spawnSync(node, args, { stdio: 'inherit' });
          if (res.error) {
            console.error('Error running admin script:', res.error.message || res.error);
          } else if (res.status !== 0) {
            console.warn('Admin script exited with code', res.status);
          } else {
            console.log('Admin script finished.');
          }
        }
      }
    } catch (err) {
      console.warn('Prisma/admin steps failed:', err && err.message ? err.message : err);
    }

    console.log('Project created.');
    console.log(`Next: cd ${projectName} && npm run dev`);
  } catch (error) {
    console.error('Error:', error && error.message ? error.message : error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Error:', error && error.message ? error.message : error);
  process.exit(1);
});
