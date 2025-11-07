#!/usr/bin/env node
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const args = process.argv.slice(2);
const projectName = args[0];

if (!projectName) {
  console.log('Next.js Template mit Prisma & Better-Auth');
  console.log('Usage: npx nexal <project-name>');
  console.log('Example: npx nexal my-app');
  process.exit(0);
}

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

  const projectPath = path.join(process.cwd(), projectName);

  if (fs.existsSync(projectPath)) {
    console.error('Fehler: Ordner ' + projectName + ' existiert bereits!');
    process.exit(1);
  }

  try {
    fs.mkdirSync(projectPath, { recursive: true });
    console.log('Kopiere Template-Dateien...');

    const templatePath = __dirname;
    const filesToCopy = [
      'src',
      'public',
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
    
    if (usePostgres) {
      const pgSchemaSrc = path.join(templatePath, 'src/prisma/schema.postgresql.prisma');
      const pgSchemaDest = path.join(projectPath, 'src/prisma/schema.prisma');
      const pgAuthSrc = path.join(templatePath, 'src/lib/auth.postgresql.ts');
      const pgAuthDest = path.join(projectPath, 'src/lib/auth.ts');

      // Kopiere nur schema + auth für PostgreSQL. Keine .env.postgresql mehr.
      if (fs.existsSync(pgSchemaSrc) && fs.existsSync(pgAuthSrc)) {
        fs.copyFileSync(pgSchemaSrc, pgSchemaDest);
        fs.copyFileSync(pgAuthSrc, pgAuthDest);
        console.log('  OK: PostgreSQL Dateien kopiert');
      }
    } else {
      const mongoSchemaSrc = path.join(templatePath, 'src/prisma/schema.mongodb.prisma');
      const mongoSchemaDest = path.join(projectPath, 'src/prisma/schema.prisma');
      const mongoAuthSrc = path.join(templatePath, 'src/lib/auth.mongodb.ts');
      const mongoAuthDest = path.join(projectPath, 'src/lib/auth.ts');

      // Kopiere nur schema + auth für MongoDB. Keine .env.mongodb mehr.
      if (fs.existsSync(mongoSchemaSrc) && fs.existsSync(mongoAuthSrc)) {
        fs.copyFileSync(mongoSchemaSrc, mongoSchemaDest);
        fs.copyFileSync(mongoAuthSrc, mongoAuthDest);
        console.log('  OK: MongoDB Dateien kopiert');
      }
    }

    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.name = projectName;
    packageJson.version = '0.1.0';
    delete packageJson.bin;
    delete packageJson.files;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    console.log('');
    console.log('Installiere Dependencies...');
    console.log('');

    process.chdir(projectPath);
    execSync('npm install', { stdio: 'inherit' });

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
