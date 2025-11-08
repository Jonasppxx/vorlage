import type { NextConfig } from "next";

/**
 * Database Provider Typ
 * Wird beim Projekt-Setup (index.js) konfiguriert
 */
export type DatabaseProvider = "mongodb" | "postgresql";

/**
 * Konfigurierter Database Provider
 * Dieser Wert wird beim Setup automatisch gesetzt
 */
export const DATABASE_PROVIDER: DatabaseProvider = "mongodb";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
