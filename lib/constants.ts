/**
 * lib/constants.ts
 * Shared constants ported exactly from cutsheet-v6.html.
 * Do not modify without cross-checking the reference.
 */

export const TIME_OPS = [
  { key: "setup",      label: "Setup",        perJob: true,  noOps: true, hasDesc: true,  hasBasis: false },
  { key: "program",    label: "Program",       perJob: true,  noOps: true, hasDesc: false, hasBasis: false },
  { key: "cycle",      label: "Cycle Time",    perJob: false, noOps: true, hasDesc: false, hasBasis: false },
  { key: "deburr",     label: "Deburr",        perJob: false, noOps: true, hasDesc: false, hasBasis: false },
  { key: "inspect",    label: "Inspection",    perJob: false, noOps: true, hasDesc: false, hasBasis: true  },
  { key: "packhandle", label: "Pack / Handle", perJob: false, noOps: true, hasDesc: false, hasBasis: true  },
] as const;

export const RISK_FLAGS = [
  { key: "first_art",   label: "First Article",              weight: 0.12 },
  { key: "tight_tol",   label: "Tight Tolerance (< .001\")", weight: 0.10 },
  { key: "exotic_mat",  label: "Exotic Material",            weight: 0.09 },
  { key: "no_history",  label: "No Prior History",           weight: 0.08 },
  { key: "complex_geo", label: "Complex Geometry",           weight: 0.07 },
  { key: "cfm",         label: "Customer-Furnished Material",weight: 0.06 },
  { key: "itar",        label: "ITAR Controlled",            weight: 0.05 },
  { key: "expedite",    label: "Expedite Required",          weight: 0.12 },
] as const;

export const OP_TYPES = [
  "Anodize", "Hard Anodize", "Chrome Plate", "Zinc Plate", "Nickel Plate",
  "Heat Treat", "Passivation", "Powder Coat", "NDT / Inspection", "Painting",
  "Black Oxide", "Chem Film (Alodine)", "Shot Peen", "Laser Mark", "Grinding", "Custom",
];

export const STOCK_TYPES = [
  "Per Piece", "Round Bar", "Square Bar", "Hex Bar", "Flat Bar",
  "Plate", "Sheet", "Tube (Round)", "Tube (Square)", "Structural", "Custom",
];

export const STOCK_DIMENSIONS: Record<string, string[]> = {
  "Round Bar":    ["1/4\"","3/8\"","1/2\"","5/8\"","3/4\"","1\"","1-1/4\"","1-1/2\"","2\"","2-1/2\"","3\"","4\""],
  "Square Bar":   ["1/4\"","3/8\"","1/2\"","5/8\"","3/4\"","1\"","1-1/4\"","1-1/2\"","2\"","2-1/2\"","3\"","4\""],
  "Hex Bar":      ["1/4\"","3/8\"","1/2\"","5/8\"","3/4\"","1\"","1-1/4\"","1-1/2\"","2\"","2-1/2\""],
  "Flat Bar":     ["1/4\"x1\"","1/4\"x2\"","1/4\"x3\"","3/8\"x1\"","3/8\"x2\"","1/2\"x1\"","1/2\"x2\"","3/4\"x2\"","1\"x2\"","1\"x3\""],
  "Plate":        ["1/16\"","1/8\"","3/16\"","1/4\"","3/8\"","1/2\"","3/4\"","1\""],
  "Sheet":        ["1/16\"","1/8\"","3/16\"","1/4\"","3/8\"","1/2\""],
  "Tube (Round)": ["1/4\"OD","3/8\"OD","1/2\"OD","3/4\"OD","1\"OD","1-1/4\"OD","1-1/2\"OD","2\"OD"],
  "Tube (Square)":["1/2\"","3/4\"","1\"","1-1/4\"","1-1/2\"","2\""],
  "Structural":   [],
  "Custom":       [],
};

export const BAR_LENGTHS = ["6ft", "12ft", "20ft", "24ft"];

export const BAR_FORM_TYPES = new Set(["Round Bar", "Square Bar", "Hex Bar", "Flat Bar"]);

export const MATERIAL_OPTIONS = [
  { value: "6061",    label: "6061-T6 Aluminum" },
  { value: "7075",    label: "7075-T6 Aluminum" },
  { value: "304ss",   label: "304 Stainless Steel" },
  { value: "316ss",   label: "316 Stainless Steel" },
  { value: "4140",    label: "4140 Steel" },
  { value: "ti6al4v", label: "Ti-6Al-4V (Grade 5)" },
  { value: "in718",   label: "Inconel 718" },
  { value: "a2tool",  label: "A2 Tool Steel" },
  { value: "in625",   label: "Inconel 625" },
  { value: "c360",    label: "C360 Brass" },
  { value: "2024",    label: "2024-T4 Aluminum" },
  { value: "custom",  label: "Custom / Other" },
];

export const COMMODITY_REF: Record<string, { name: string; ref: number | null }> = {
  "6061":    { name: "6061-T6 Aluminum",    ref: 1.40 },
  "7075":    { name: "7075-T6 Aluminum",    ref: 2.20 },
  "304ss":   { name: "304 Stainless Steel", ref: 2.80 },
  "316ss":   { name: "316 Stainless Steel", ref: 3.40 },
  "4140":    { name: "4140 Steel",          ref: 0.95 },
  "ti6al4v": { name: "Ti-6Al-4V Grade 5",   ref: 28.00 },
  "in718":   { name: "Inconel 718",         ref: 22.00 },
  "a2tool":  { name: "A2 Tool Steel",       ref: 4.50 },
  "in625":   { name: "Inconel 625",         ref: null },
  "c360":    { name: "C360 Brass",          ref: null },
  "2024":    { name: "2024-T4 Aluminum",    ref: null },
  "custom":  { name: "Custom / Other",      ref: null },
};

export const MAT_DISPLAY_ORDER = [
  { key: "6061",    spec: "Extruded / Plate / Bar" },
  { key: "7075",    spec: "Plate / Bar" },
  { key: "2024",    spec: "Plate" },
  { key: "304ss",   spec: "Bar / Sheet" },
  { key: "316ss",   spec: "Bar / Sheet" },
  { key: "4140",    spec: "Bar / Plate" },
  { key: "a2tool",  spec: "Bar / Ground Stock" },
  { key: "ti6al4v", spec: "Bar / Plate" },
  { key: "in718",   spec: "Bar / Billet" },
  { key: "in625",   spec: "Bar" },
  { key: "c360",    spec: "Rod / Hex" },
];

// ── FORMULA HELPERS (exact ports from v6) ────────────────────────────────────

export function stockUnit(stockType: string): string {
  if (!stockType) return "lb";
  if (stockType === "Per Piece") return "piece";
  if (BAR_FORM_TYPES.has(stockType)) return "bar";
  if (stockType === "Plate") return "plate";
  if (stockType === "Sheet") return "sheet";
  if (stockType.startsWith("Tube")) return "length";
  return "unit";
}

export function stockQtyLabel(st: string): string {
  const u = stockUnit(st);
  if (u === "lb") return "WEIGHT (lbs)";
  if (u === "piece") return "QTY (pcs)";
  return `QTY (${u}s)`;
}

export function stockCostLabel(st: string): string {
  const u = stockUnit(st);
  if (u === "lb") return "COST/LB ($)";
  if (u === "piece") return "COST/PC ($)";
  return `COST/${u.toUpperCase()} ($)`;
}

export function getRiskMultiplier(
  activeFlags: Set<string>,
  qty: number,
  riskWeights: Record<string, number> = {}
): number {
  let w = 0;
  RISK_FLAGS.forEach((f) => {
    if (activeFlags.has(f.key)) {
      const override = riskWeights[f.key];
      w += override !== undefined ? override / 100 : f.weight;
    }
  });
  return 1 + w * (1 / Math.sqrt(Math.max(1, qty)));
}

export function calcSellPrice(adjCost: number, marginPct: number): number {
  const margin = Math.min(95, marginPct) / 100;
  return margin >= 1 ? adjCost : adjCost / (1 - margin);
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function incRevision(rev: string): string {
  if (!rev) return "B";
  if (/^[A-Z]$/.test(rev) && rev !== "Z") return String.fromCharCode(rev.charCodeAt(0) + 1);
  if (/^\d+$/.test(rev)) return String(parseInt(rev) + 1);
  return rev + "-2";
}

export type TimeKey = "setup" | "program" | "cycle" | "deburr" | "inspect" | "packhandle";

export interface TimesMap {
  [key: string]: {
    est: number;
    act?: number | null;
    desc?: string;
    machine?: string;
  };
}

export interface OutsideProc {
  process: string;
  vendor: string;
  cost: number;
  lead: string;
  notes: string;
  basis: "EA" | "LOT";
}

export interface MaterialData {
  key: string;
  customName: string;
  weight: number;
  cplb: number;
  markup: number;
  supplier: string;
  lead: string;
  stockType: string;
  stockDimension: string;
  customDimension: string;
  barLength: string;
  customBarLength: string;
}

export interface NREData {
  engineering: number;
  tooling: number;
  fixtures: number;
  other: number;
  separate: boolean;
  total: number;
}

export interface LineItems {
  times?: TimesMap;
  mat?: Partial<MaterialData>;
  outsideProcs?: OutsideProc[];
  nre?: Partial<NREData>;
  shippingCarrier?: string;
  shippingCost?: number;
  asmHours?: number;
  opMarkup?: number;
  overhead?: number;
  packHandleLot?: boolean;
  inspectLot?: boolean;
  priceBreakQtys?: number[];
  drawingLink?: string;
  jobNumber?: string;
}

export interface QuoteResults {
  sellPc?: number;
  extended?: number;
  riskMult?: number;
  adjCost?: number;
  rawCost?: number;
  laborCost?: number;
  matCost?: number;
  opCost?: number;
  asmCost?: number;
  nrePc?: number;
}
