import fs from "node:fs/promises";
import { build } from "esbuild";
await fs.rm("dist", { recursive: true, force: true });
await fs.mkdir("dist/server", { recursive: true });
await fs.cp("web", "dist/client", { recursive: true });
await build({
  entryPoints: ["server/index.js"],
  outfile: "dist/server/index.js",
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
});
await fs.mkdir("dist/.openai", { recursive: true });
await fs.copyFile(".openai/hosting.json", "dist/.openai/hosting.json");
await fs.cp("drizzle", "dist/.openai/drizzle", { recursive: true });
console.log("TRAZVA: frontend, API and migrations ready.");
