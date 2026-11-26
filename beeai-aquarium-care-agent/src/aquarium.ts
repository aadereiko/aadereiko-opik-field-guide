export type Range = { min: number; max: number };

export type Species = {
  common: string;
  temperatureC: Range;
  ph: Range;
  temperament: "peaceful" | "semi-aggressive" | "aggressive";
  minTankLiters: number;
  tank: "freshwater" | "saltwater";
  nips_fins?: boolean;
};

export const SPECIES: Record<string, Species> = {
  neon_tetra: {
    common: "Neon tetra",
    temperatureC: { min: 22, max: 26 },
    ph: { min: 5.5, max: 7.0 },
    temperament: "peaceful",
    minTankLiters: 40,
    tank: "freshwater",
  },
  guppy: {
    common: "Guppy",
    temperatureC: { min: 22, max: 28 },
    ph: { min: 6.8, max: 7.8 },
    temperament: "peaceful",
    minTankLiters: 40,
    tank: "freshwater",
  },
  betta: {
    common: "Betta",
    temperatureC: { min: 24, max: 28 },
    ph: { min: 6.0, max: 7.5 },
    temperament: "semi-aggressive",
    minTankLiters: 20,
    tank: "freshwater",
  },
  tiger_barb: {
    common: "Tiger barb",
    temperatureC: { min: 22, max: 27 },
    ph: { min: 6.0, max: 7.5 },
    temperament: "semi-aggressive",
    minTankLiters: 75,
    tank: "freshwater",
    nips_fins: true,
  },
  oscar: {
    common: "Oscar",
    temperatureC: { min: 23, max: 28 },
    ph: { min: 6.0, max: 8.0 },
    temperament: "aggressive",
    minTankLiters: 300,
    tank: "freshwater",
  },
  clownfish: {
    common: "Ocellaris clownfish",
    temperatureC: { min: 24, max: 27 },
    ph: { min: 8.0, max: 8.4 },
    temperament: "semi-aggressive",
    minTankLiters: 75,
    tank: "saltwater",
  },
};

export const SPECIES_KEYS = Object.keys(SPECIES) as [string, ...string[]];

export const IDEAL_WATER = {
  ammoniaPpm: { min: 0, max: 0 },
  nitritePpm: { min: 0, max: 0 },
  nitratePpm: { min: 0, max: 40 },
} as const;

export type WaterReading = {
  temperatureC?: number;
  ph?: number;
  ammoniaPpm?: number;
  nitritePpm?: number;
  nitratePpm?: number;
};

export type WaterVerdict = {
  species: string;
  status: "ok" | "needs_attention" | "dangerous";
  issues: string[];
};

export function checkWater(speciesKey: string, reading: WaterReading): WaterVerdict {
  const species = SPECIES[speciesKey];
  if (!species) {
    throw new Error(`Unknown species "${speciesKey}". Known: ${SPECIES_KEYS.join(", ")}.`);
  }
  const issues: string[] = [];
  let dangerous = false;

  if (reading.ammoniaPpm !== undefined && reading.ammoniaPpm > IDEAL_WATER.ammoniaPpm.max) {
    issues.push(`ammonia is ${reading.ammoniaPpm} ppm (should be 0)`);
    dangerous = dangerous || reading.ammoniaPpm >= 0.5;
  }
  if (reading.nitritePpm !== undefined && reading.nitritePpm > IDEAL_WATER.nitritePpm.max) {
    issues.push(`nitrite is ${reading.nitritePpm} ppm (should be 0)`);
    dangerous = dangerous || reading.nitritePpm >= 0.5;
  }
  if (reading.nitratePpm !== undefined && reading.nitratePpm > IDEAL_WATER.nitratePpm.max) {
    issues.push(`nitrate is ${reading.nitratePpm} ppm (should be under ${IDEAL_WATER.nitratePpm.max})`);
  }
  if (reading.temperatureC !== undefined) {
    const { min, max } = species.temperatureC;
    if (reading.temperatureC < min || reading.temperatureC > max) {
      issues.push(`temperature ${reading.temperatureC} C is outside ${min}-${max} C for ${species.common}`);
    }
  }
  if (reading.ph !== undefined) {
    const { min, max } = species.ph;
    if (reading.ph < min || reading.ph > max) {
      issues.push(`pH ${reading.ph} is outside ${min}-${max} for ${species.common}`);
    }
  }

  const status = dangerous ? "dangerous" : issues.length > 0 ? "needs_attention" : "ok";
  return { species: species.common, status, issues };
}

export type CompatibilityVerdict = {
  compatible: boolean;
  reasons: string[];
};

function overlap(a: Range, b: Range): boolean {
  return Math.max(a.min, b.min) <= Math.min(a.max, b.max);
}

export function checkCompatibility(aKey: string, bKey: string, tankLiters: number): CompatibilityVerdict {
  const a = SPECIES[aKey];
  const b = SPECIES[bKey];
  if (!a || !b) {
    throw new Error(`Unknown species. Known: ${SPECIES_KEYS.join(", ")}.`);
  }
  const reasons: string[] = [];

  if (a.tank !== b.tank) {
    reasons.push(`${a.common} is ${a.tank} and ${b.common} is ${b.tank}`);
  }
  if (!overlap(a.temperatureC, b.temperatureC)) {
    reasons.push("their temperature ranges do not overlap");
  }
  if (!overlap(a.ph, b.ph)) {
    reasons.push("their pH ranges do not overlap");
  }
  for (const [x, y] of [[a, b], [b, a]] as const) {
    if (x.temperament === "aggressive" && y.temperament !== "aggressive") {
      reasons.push(`${x.common} is aggressive and will bully or eat ${y.common}`);
    }
    if (x.nips_fins && y.common === "Betta") {
      reasons.push(`${x.common} nips the long fins of ${y.common}`);
    }
  }
  const neededLiters = Math.max(a.minTankLiters, b.minTankLiters);
  if (tankLiters < neededLiters) {
    reasons.push(`a ${tankLiters} L tank is smaller than the ${neededLiters} L these two need`);
  }

  return { compatible: reasons.length === 0, reasons };
}

export type Treatment = "water_conditioner" | "ammonia_detoxifier" | "salt" | "liquid_fertilizer";

const DOSE_ML_PER_10_LITERS: Record<Exclude<Treatment, "salt">, number> = {
  water_conditioner: 0.5,
  ammonia_detoxifier: 1.0,
  liquid_fertilizer: 0.5,
};

const SALT_GRAMS_PER_LITER = 2;
const MAX_FRESHWATER_SALT_GRAMS_PER_LITER = 3;

export type DoseResult = {
  treatment: Treatment;
  amount: number;
  unit: "ml" | "g";
  note: string;
};

export function computeDose(treatment: Treatment, tankLiters: number): DoseResult {
  if (tankLiters <= 0) throw new Error("tankLiters must be positive");
  if (treatment === "salt") {
    const grams = Math.round(tankLiters * SALT_GRAMS_PER_LITER * 10) / 10;
    return {
      treatment,
      amount: grams,
      unit: "g",
      note: `Aquarium salt at ${SALT_GRAMS_PER_LITER} g/L. Never go above ${MAX_FRESHWATER_SALT_GRAMS_PER_LITER} g/L and skip it with scaleless fish or live plants.`,
    };
  }
  const ml = Math.round((tankLiters / 10) * DOSE_ML_PER_10_LITERS[treatment] * 100) / 100;
  return {
    treatment,
    amount: ml,
    unit: "ml",
    note: `${DOSE_ML_PER_10_LITERS[treatment]} ml per 10 L of tank water.`,
  };
}
