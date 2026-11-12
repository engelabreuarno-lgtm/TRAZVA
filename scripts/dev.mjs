import { spawn, spawnSync } from "node:child_process";
const build = spawnSync(process.execPath, ["scripts/build.mjs"], { stdio: "inherit" });
if (build.status !== 0) process.exit(build.status || 1);
const args = process.argv.slice(2).filter((arg) => arg !== "--strictPort").map((arg) => arg === "--host" ? "--ip" : arg.replace(/^--host=/, "--ip="));
const child = spawn("node_modules/.bin/wrangler", ["dev", ...args], { stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code || 0));
