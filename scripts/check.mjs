import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "../web");
function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)],
    );
}
const source = files(root).filter(
  (p) => !p.includes("/vendor/") && /\.(js|css|html)$/.test(p),
);
for (const file of source) {
  const text = fs.readFileSync(file, "utf8");
  if (file.endsWith(".js"))
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  const pattern = file.endsWith(".js")
    ? /(?:from\s+|import\s*\()["']([^"']+)["']/g
    : file.endsWith(".css")
      ? /@import\s+url\(["']([^"']+)["']/g
      : /(?:src|href)=["']([^"']+)["']/g;
  for (const match of text.matchAll(pattern)) {
    const ref = match[1];
    if (ref.startsWith("#") || /^[a-z][a-z\d+.-]*:/i.test(ref)) continue;
    const target = path.resolve(path.dirname(file), ref.split(/[?#]/)[0]);
    if (!fs.existsSync(target)) throw Error(`Missing asset: ${file} → ${ref}`);
  }
}
for (const file of files(path.resolve(import.meta.dirname, "../server")).filter((p) =>
  p.endsWith(".js"),
))
  execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
console.log(
  `OK: ${source.length} source files; JavaScript syntax and local file references.`,
);
