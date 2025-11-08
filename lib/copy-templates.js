const fs = require('fs');
const path = require('path');
const { ensureDir, copyFileSync } = require('./fs-utils');

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

  // Beim rekursiven Kopieren bestimmte Dateien/Varianten überspringen, damit wir schema/auth gezielt kopieren können
  const skipNames = ['auth.postgresql.ts', 'auth.mongodb.ts', 'schema.postgresql.prisma', 'schema.mongodb.prisma', 'auth.ts', 'schema.prisma'];

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

  // Immer das MongoDB schema.prisma aus der Vorlage kopieren (Quelle: prisma/schema.prisma)
  // Ziel im neuen Projekt: src/prisma/schema.prisma
  const schemaSrc = path.join(templatePath, 'prisma', 'schema.prisma');
  const schemaDest = path.join(projectPath, 'src', 'prisma', 'schema.prisma');

  if (fs.existsSync(schemaSrc)) {
    ensureDir(path.dirname(schemaDest));
    copyFileSync(schemaSrc, schemaDest);
    console.log('  OK: MongoDB Schema kopiert nach src/prisma/schema.prisma');
  } else {
    console.warn('  WARN: prisma/schema.prisma in der Vorlage nicht gefunden.');
  }
}

module.exports = { copyTemplates };
