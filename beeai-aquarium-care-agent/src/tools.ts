import { DynamicTool, JSONToolOutput } from "beeai-framework/tools/base";
import { z } from "zod";
import {
  SPECIES_KEYS,
  checkCompatibility,
  checkWater,
  computeDose,
} from "./aquarium.ts";

const speciesEnum = z.enum(SPECIES_KEYS);

export const waterCheckTool = new DynamicTool({
  name: "check_water_parameters",
  description:
    "Compare a tank's water test results with what a species needs. " +
    `Species keys: ${SPECIES_KEYS.join(", ")}. Omit readings you do not have. ` +
    "Returns status (ok, needs_attention, dangerous) and the list of problems.",
  inputSchema: z.object({
    species: speciesEnum,
    temperatureC: z.number().optional(),
    ph: z.number().optional(),
    ammoniaPpm: z.number().optional(),
    nitritePpm: z.number().optional(),
    nitratePpm: z.number().optional(),
  }),
  async handler(input) {
    const { species, ...reading } = input;
    return new JSONToolOutput(checkWater(species, reading));
  },
});

export const compatibilityTool = new DynamicTool({
  name: "check_compatibility",
  description:
    "Check whether two species can share a tank of a given size. " +
    `Species keys: ${SPECIES_KEYS.join(", ")}. Returns compatible (true/false) and the reasons.`,
  inputSchema: z.object({
    speciesA: speciesEnum,
    speciesB: speciesEnum,
    tankLiters: z.number().positive(),
  }),
  async handler(input) {
    return new JSONToolOutput(checkCompatibility(input.speciesA, input.speciesB, input.tankLiters));
  },
});

export const dosingTool = new DynamicTool({
  name: "compute_dose",
  description:
    "Compute how much of a treatment to add to a tank. " +
    "Treatments: water_conditioner, ammonia_detoxifier, salt, liquid_fertilizer. " +
    "Returns the amount, its unit and a safety note. Always use this instead of doing the arithmetic yourself.",
  inputSchema: z.object({
    treatment: z.enum(["water_conditioner", "ammonia_detoxifier", "salt", "liquid_fertilizer"]),
    tankLiters: z.number().positive(),
  }),
  async handler(input) {
    return new JSONToolOutput(computeDose(input.treatment, input.tankLiters));
  },
});

export const ALL_TOOLS = [waterCheckTool, compatibilityTool, dosingTool];
