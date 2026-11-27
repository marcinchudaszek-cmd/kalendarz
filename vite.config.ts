import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Numer wersji z build.gradle (versionName) — jedno źródło prawdy dla okienka „Co nowego”.
function readVersionName(): string {
  try {
    const gradle = fs.readFileSync(path.resolve(__dirname, "android/app/build.gradle"), "utf8");
    return gradle.match(/versionName\s*=?\s*"([^"]+)"/)?.[1] ?? "?";
  } catch {
    return "?";
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(readVersionName()),
  },
  // Aplikacja jest hostowana w podkatalogu (/apps/kalendarz/), wiec
  // wszystkie odwolania musza byc wzgledne.
  base: "./",
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
