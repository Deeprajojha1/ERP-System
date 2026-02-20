export const PROGRAM_ENUM = [
  "btech",
  "mtech",
  "bca",
  "mca",
  "bba",
  "mba",
  "bsc",
  "msc",
  "bpharma",
  "mpharma",
  "dpharma",
  "phd",
  "bcom"
];

const PROGRAM_CANONICAL_MAP = PROGRAM_ENUM.reduce((acc, key) => {
  acc[key] = key;
  return acc;
}, {});

const PROGRAM_ALIASES = {
  bpharm: "bpharma",
  mpharm: "mpharma",
};

export const normalizeProgramValue = (value) => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");

  return PROGRAM_ALIASES[normalized] || PROGRAM_CANONICAL_MAP[normalized] || normalized;
};

export const normalizeProgramList = (program) => {
  if (Array.isArray(program)) {
    return program.map((p) => normalizeProgramValue(p)).filter((p) => PROGRAM_ENUM.includes(p));
  }

  if (typeof program === "string") {
    const value = normalizeProgramValue(program);
    return PROGRAM_ENUM.includes(value) ? [value] : [];
  }

  return [];
};
