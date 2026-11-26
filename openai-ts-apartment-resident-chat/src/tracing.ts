import { Opik } from "opik";

export const PROJECT_NAME = "openai-ts-apartment-resident-chat";

// projectName pins every trace to one Opik project; without it traces go to "Default Project".
// The URL and workspace come from OPIK_URL_OVERRIDE / OPIK_WORKSPACE (loaded from .env before this runs).
export function createOpik(): Opik {
  return new Opik({ projectName: PROJECT_NAME });
}
