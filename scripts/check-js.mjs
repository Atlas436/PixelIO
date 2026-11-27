import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const directory = new URL("../js/", import.meta.url);
const files = readdirSync(directory, { recursive: true })
  .filter((name) => name.endsWith(".js"))
  .sort();
for (const file of files) {
  const result = spawnSync(
    process.execPath,
    ["--check", fileURLToPath(new URL(file, directory))],
    { stdio: "inherit" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`${files.length} módulos JavaScript verificados.`);
