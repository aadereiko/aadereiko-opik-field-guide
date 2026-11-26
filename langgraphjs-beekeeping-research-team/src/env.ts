import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

export const PROJECT_NAME = "langgraphjs-beekeeping-research-team";

function findEnvFile(): string | undefined {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const candidate = join(dir, ".env");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

// Load .env before any Opik handler is created so OPIK_URL_OVERRIDE / OPIK_WORKSPACE are in place.
const envFile = findEnvFile();
if (envFile) dotenv.config({ path: envFile, quiet: true });
