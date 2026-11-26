import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

export const PROJECT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function loadEnv(): string | undefined {
  let dir = PROJECT_DIR;
  for (;;) {
    const candidate = join(dir, ".env");
    if (existsSync(candidate)) {
      config({ path: candidate, quiet: true });
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}
