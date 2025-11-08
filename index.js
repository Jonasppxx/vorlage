#!/usr/bin/env node
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// allow using current directory when no argument provided
const projectName = process.argv[2] || ".";
const targetDir = path.resolve(process.cwd(), projectName);

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

async function main() {
  console.log('');
  console.log('Erstelle neues Projekt: ' + projectName);
  console.log('');

  console.log('Waehle deine Datenbank:');
  console.log('  1) MongoDB (mit Replica Set - empfohlen mit Atlas)');
  console.log('  2) PostgreSQL (empfohlen fuer Production)');
  console.log('');
  
  const dbChoice = await askQuestion('Deine Wahl (1 oder 2): ');
  const usePostgres = dbChoice.trim() === '2';
  
  const dbType = usePostgres ? 'PostgreSQL' : 'MongoDB';
  console.log('');
  console.log('Ausgewaehlt: ' + dbType);
  console.log('');

  const projectPath = targetDir;
  
  // only block if user requested a named directory that already exists
  if (projectName !== "." && fs.existsSync(projectPath)) {
    console.error(`Fehler: Der Ordner "${projectName}" existiert bereits!`);
    process.exit(1);
  }

  try {
    fs.mkdirSync(projectPath, { recursive: true });
    console.log('Kopiere Template-Dateien...');

    const templatePath = __dirname;
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

    function copyRecursive(src, dest) {
      try {
        if (fs.statSync(src).isDirectory()) {
          fs.mkdirSync(dest, { recursive: true });
          fs.readdirSync(src).forEach(file => {
            if (
              file === 'auth.postgresql.ts' || 
              file === 'auth.mongodb.ts' ||
              file === 'schema.postgresql.prisma' ||
              file === 'schema.mongodb.prisma'
            ) {
              return;
            }
            copyRecursive(path.join(src, file), path.join(dest, file));
          });
        } else {
          fs.copyFileSync(src, dest);
        }
      } catch (error) {
        console.warn('Warnung: ' + error.message);
      }
    }

    filesToCopy.forEach(file => {
      const srcPath = path.join(templatePath, file);
      const destPath = path.join(projectPath, file);
      
      if (fs.existsSync(srcPath)) {
        try {
          const stat = fs.statSync(srcPath);
          if (stat.isDirectory()) {
            console.log('  Kopiere ' + file + '/');
            copyRecursive(srcPath, destPath);
          } else {
            console.log('  Kopiere ' + file);
            const destDir = path.dirname(destPath);
            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true });
            }
            fs.copyFileSync(srcPath, destPath);
          }
        } catch (error) {
          console.warn('  Ueberspringe ' + file + ': ' + error.message);
        }
      }
    });

    console.log('  Kopiere datenbankspezifische Dateien...');
    
    // Kopiere das passende Schema basierend auf der Auswahl
    const schemaTemplatePath = path.join(templatePath, 'prisma');
    const schemaSrc = usePostgres 
      ? path.join(schemaTemplatePath, 'schema.postgresql.prisma')
      : path.join(schemaTemplatePath, 'schema.mongodb.prisma');
    const schemaDest = path.join(projectPath, 'prisma', 'schema.prisma');

    if (fs.existsSync(schemaSrc)) {
      fs.mkdirSync(path.join(projectPath, 'prisma'), { recursive: true });
      fs.copyFileSync(schemaSrc, schemaDest);
      console.log('  OK: ' + (usePostgres ? 'PostgreSQL' : 'MongoDB') + ' Schema kopiert');
    }

    // Aktualisiere next.config.ts mit dem ausgewählten Provider
    const nextConfigPath = path.join(projectPath, 'next.config.ts');
    if (fs.existsSync(nextConfigPath)) {
      let nextConfigContent = fs.readFileSync(nextConfigPath, 'utf-8');
      const providerValue = usePostgres ? 'postgresql' : 'mongodb';
      
      // Ersetze die DATABASE_PROVIDER Zeile
      nextConfigContent = nextConfigContent.replace(
        /export const DATABASE_PROVIDER: DatabaseProvider = ["'](?:mongodb|postgresql)["'];/,
        `export const DATABASE_PROVIDER: DatabaseProvider = "${providerValue}";`
      );
      
      fs.writeFileSync(nextConfigPath, nextConfigContent);
      console.log('  OK: next.config.ts aktualisiert mit DATABASE_PROVIDER=' + providerValue);
    }

    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.name = projectName;
    packageJson.version = '0.1.0';
    delete packageJson.bin;
    delete packageJson.files;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    // Install dependencies (can be skipped with --no-install or SKIP_INSTALL=1)
    const skipInstall = process.argv.includes('--no-install') || process.env.SKIP_INSTALL === '1';

    console.log('');
    if (skipInstall) {
      console.log('Überspringe Installation der Dependencies (--no-install gesetzt)');
    } else {
      console.log('Installiere Dependencies (dies kann einige Minuten dauern)...');
    }
    console.log('');

    process.chdir(projectPath);

    if (!skipInstall) {
      // Use spawnSync to avoid potential interactive hangups and pass safe flags
      const { spawnSync } = require('child_process');
      const os = require('os');
      
      // First attempt: Try with optimized flags
      const installArgs = [
        'install',
        '--no-audit',
        '--no-fund',
        '--prefer-offline',
        '--ignore-scripts'  // Use --ignore-scripts to skip postinstall initially
      ];
      
      console.log('Führe npm install aus (bitte warten)...\n');
      
      // On Windows, use shell: true to access npm via PATH
      // On other systems, shell: false is more efficient
      const isWindows = process.platform === 'win32';
      
      let res = spawnSync(isWindows ? 'npm.cmd' : 'npm', installArgs, {
        stdio: 'inherit',
        shell: isWindows,
        timeout: 5 * 60 * 1000, // 5 Minuten Timeout
        env: { 
          ...process.env, 
          npm_config_loglevel: 'warn',
          npm_config_maxsockets: '1'  // Limit parallel downloads
        }
      });
      
      if (res.error) {
        if (res.error.code === 'ENOENT') {
          console.error('\n❌ npm nicht gefunden! Bitte stelle sicher, dass Node.js installiert ist.');
        } else {
          console.error('\n❌ Fehler beim Ausführen von npm install:', res.error.message);
        }
        console.log('\nTip: Du kannst "npm install" später manuell ausführen oder --no-install nutzen');
        process.exit(1);
      }
      
      if (res.signal === 'SIGTERM') {
        console.error('\n❌ npm install Timeout (>5 Minuten) - zu lange!');
        console.log('Tip: Versuche später "npm install --verbose" für mehr Debug-Info');
        process.exit(1);
      }
      
      if (res.status !== 0 && res.status !== null) {
        console.error(`\n⚠️  npm install Fehler - versuche mit Retry...\n`);
        
        // Second attempt: Rebuild with postinstall scripts enabled
        console.log('Starte postinstall scripts...\n');
        res = spawnSync(isWindows ? 'npm.cmd' : 'npm', ['run', 'prisma:generate'], {
          stdio: 'inherit',
          shell: isWindows,
          timeout: 3 * 60 * 1000,
          env: { ...process.env, npm_config_loglevel: 'warn' }
        });
        
        if (res.status !== 0 && res.status !== null) {
          console.error(`\n❌ npm install fehlgeschlagen mit Exit-Code ${res.status}`);
          console.log('\nLösung: Versuche folgende Befehle manuell:');
          console.log('  cd ' + projectName);
          console.log('  npm install --force');
          console.log('  npm run prisma:generate');
          process.exit(res.status);
        }
      }
      
      console.log('\n✅ Dependencies erfolgreich installiert!');
    }

    console.log('');
    console.log('Projekt erfolgreich erstellt!');
    console.log('');
    console.log('Naechste Schritte:');
    console.log('  cd ' + projectName);
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
