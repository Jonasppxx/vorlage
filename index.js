#!/usr/bin/env node
'use strict';
const { execSync } = require('child_process');
const path = require('path');
const { copyTemplates } = require('./lib/copy-templates');
const { ensureDir, readJsonFile, writeJsonFile } = require('./lib/fs-utils');

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

    // Kopiere alle Templates (inkl. prisma/schema.prisma)
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
