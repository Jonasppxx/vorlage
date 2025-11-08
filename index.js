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
