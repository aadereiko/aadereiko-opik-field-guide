import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { env: { OPIK_TRACK_DISABLE: "true" } },
});
