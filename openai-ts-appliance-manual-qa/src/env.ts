import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

export const PROJECT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(): void {
  let dir = PROJECT_DIR;
  for (;;) {
    const candidate = join(dir, ".env");
    if (existsSync(candidate)) {
      config({ path: candidate, quiet: true });
      return;
    }
    const parent = dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}

// Opik reads OPIK_URL_OVERRIDE and OPIK_WORKSPACE when its client is first created, so the
// .env has to be loaded as a side effect of importing this module, before any Opik import runs.
loadEnv();

export const OPIK_PROJECT = process.env.OPIK_PROJECT_NAME ?? "openai-ts-appliance-manual-qa";
