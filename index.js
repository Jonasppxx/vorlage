#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const projectName = process.argv[2];
if (!projectName) {
  console.error("Bitte Projektnamen angeben!");
  process.exit(1);
}

const projectPath = path.join(process.cwd(), projectName);
if (fs.existsSync(projectPath)) {
  console.error(`Der Ordner ${projectName} existiert bereits.`);
  process.exit(1);
}

fs.mkdirSync(projectPath);
console.log("🚀 Kopiere Template...");
fs.cpSync(path.join(process.cwd(), "template"), projectPath, { recursive: true });

console.log("📦 Installiere Dependencies...");
execSync("npm install", { cwd: projectPath, stdio: "inherit" });

console.log("✅ Fertig! Starte dein Projekt:");
console.log(`cd ${projectName}`);
console.log("npm run dev");
