"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  TIME_OPS,
  RISK_FLAGS,
  OP_TYPES,
  MATERIAL_OPTIONS,
  STOCK_TYPES,
  STOCK_DIMENSIONS,
  BAR_LENGTHS,
  BAR_FORM_TYPES,
  COMMODITY_REF,
  stockQtyLabel,
  stockCostLabel,
  stockUnit,
  getRiskMultiplier,
  calcSellPrice,
  todayStr,
} from "@/lib/constants";
import { Job } from "@/db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimeRow {
  est: number;
  act: number | null;
  desc?: string;
  machine?: string;
  basisLot?: boolean; // for inspect / packhandle
}

interface OpRow {
  id: string;
  process: string;
  vendor: string;
  cost: number;
  lead: string;
  notes: string;
  basis: "ea" | "lot";
}

interface MatState {
  key: string;
  customName: string;
  stockType: string;
  stockDimension: string;
  customDimension: string;
  barLength: string;
  customBarLength: string;
  weight: number;
  cplb: number;
  markup: number;
  supplier: string;
  lead: string;
}

interface NREState {
  engineering: number;
  tooling: number;
  fixtures: number;
  other: number;
  separate: boolean;
}

interface QuoteState {
  jobId: string | null;
  partNumber: string;
  partName: string;
  revision: string;
  customerId: string;
  paymentTerms: string;
  status: string;
  date: string;
  jobNumber: string;
  drawingLink: string;
  quantities: number[];
  currentQty: number;
  times: Record<string, TimeRow>;
  mat: MatState;
  ops: OpRow[];
  nre: NREState;
  shippingCarrier: string;
  shippingCost: number;
  riskFlags: Set<string>;
  riskWeights: Record<string, number>;
  margin: number;
  overhead: number;
  opMarkup: number;
  asmOpen: boolean;
  asmHours: number;
  nreOpen: boolean;
  notes: string;
  internalNotes: string;
  shopRate: number;
  machines: { id: string; name: string; rate: number }[];
}

interface Machine {
  id: string;
  name: string;
  rate: number;
}

interface CustomerRecord {
  id: string;
  name: string;
  paymentTerms?: string | null;
  preferredCarrier?: string | null;
}
interface SupplierRecord { id: string; name: string }
interface VendorRecord { id: string; name: string }

interface QuoteFormProps {
  initialJob?: Job | null;
  onSaved?: (job: Job) => void;
}

// ─── Default state ─────────────────────────────────────────────────────────

function defaultTimes(): Record<string, TimeRow> {
  const t: Record<string, TimeRow> = {};
  TIME_OPS.forEach((op) => {
    t[op.key] = { est: 0, act: null, basisLot: false };
    if (op.key === "setup") t[op.key].desc = "";
  });
  return t;
}

function defaultMat(): MatState {
  return {
    key: "",
    customName: "",
    stockType: "",
    stockDimension: "",
    customDimension: "",
    barLength: "",
    customBarLength: "",
    weight: 0,
    cplb: 0,
    markup: 20,
    supplier: "",
    lead: "",
  };
}

function defaultNRE(): NREState {
  return { engineering: 0, tooling: 0, fixtures: 0, other: 0, separate: false };
}

function blankQuote(shopRate = 125, defaultMargin = 40): QuoteState {
  return {
    jobId: null,
    partNumber: "",
    partName: "",
    revision: "",
    customerId: "",
    paymentTerms: "",
    status: "draft",
    date: todayStr(),
    jobNumber: "",
    drawingLink: "",
    quantities: [1],
    currentQty: 1,
    times: defaultTimes(),
    mat: defaultMat(),
    ops: [],
    nre: defaultNRE(),
    shippingCarrier: "",
    shippingCost: 0,
    riskFlags: new Set(),
    riskWeights: {},
    margin: defaultMargin,
    overhead: 0,
    opMarkup: 0,
    asmOpen: false,
    asmHours: 0,
    nreOpen: false,
    notes: "",
    internalNotes: "",
    shopRate,
    machines: [],
  };
}

// ─── Calc helpers ──────────────────────────────────────────────────────────

function getMachineRate(
  machineId: string | undefined,
  machines: Machine[],
  shopRate: number
): number {
  if (!machineId) return shopRate;
  const m = machines.find((m) => m.id === machineId);
  return m ? m.rate : shopRate;
}

function calcForQty(q: number, s: QuoteState): number {
  let labor = 0;
  let laborMins = 0;
  TIME_OPS.forEach((op) => {
    const row = s.times[op.key];
    const mins = row?.est ?? 0;
    const rate = getMachineRate(row?.machine, s.machines, s.shopRate);
    const isPerJob = op.hasBasis ? (row?.basisLot ?? false) : op.perJob;
    if (isPerJob) {
      labor += (mins / 60) * rate / Math.max(1, q);
      laborMins += mins / Math.max(1, q);
    } else {
      labor += (mins / 60) * rate;
      laborMins += mins;
    }
  });
  const overhead = (laborMins / 60) * s.overhead;
  const isPerPiece = s.mat.stockType === "Per Piece";
  const matRaw = isPerPiece ? s.mat.cplb : s.mat.weight * s.mat.cplb;
  const matCustomer = matRaw * (1 + s.mat.markup / 100);
  const opRaw = s.ops.reduce((acc, op) => {
    const cost = op.basis === "lot" ? op.cost / Math.max(1, q) : op.cost;
    return acc + cost;
  }, 0);
  const opTotal = opRaw * (1 + s.opMarkup / 100);
  const asm = s.asmHours * s.shopRate;
  const nreTotal = s.nre.engineering + s.nre.tooling + s.nre.fixtures + s.nre.other;
  const nrePc = !s.nre.separate && nreTotal > 0 ? nreTotal / Math.max(1, q) : 0;
  const raw = labor + overhead + matCustomer + opTotal + asm + nrePc;
  const mult = getRiskMultiplier(s.riskFlags, q, s.riskWeights);
  const adj = raw * mult;
  return calcSellPrice(adj, s.margin);
}

// ─── Styles ────────────────────────────────────────────────────────────────

const S = {
  shell: {
    display: "flex",
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    flexDirection: "row" as const,
  },
  sidebar: {
    width: 240,
    flexShrink: 0,
    background: "var(--surf)",
    borderRight: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  },
  sidebarHeader: {
    padding: "14px 16px",
    borderBottom: "1px solid var(--border)",
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: 0.5,
    color: "var(--text)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  jobList: {
    flex: 1,
    overflowY: "auto" as const,
  },
  jobItem: (active: boolean): React.CSSProperties => ({
    padding: "10px 14px",
    cursor: "pointer",
    borderLeft: `3px solid ${active ? "var(--amber)" : "transparent"}`,
    background: active ? "var(--surf-hi)" : "none",
    borderBottom: "1px solid rgba(37,48,64,.5)",
    transition: "all .12s",
  }),
  jobPn: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 15,
    fontWeight: 700,
    color: "var(--amber)",
    letterSpacing: 0.5,
  },
  jobMeta: {
    fontSize: 11,
    color: "var(--dim)",
    marginTop: 2,
  },
  rightPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    minHeight: 0,
    overflow: "hidden",
  },
  main: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "24px 28px",
  },
  sectionHeader: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: 1,
    color: "var(--steel)",
    borderBottom: "1px solid var(--border)",
    paddingBottom: 8,
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLabel: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 3,
    textTransform: "uppercase" as const,
    color: "var(--muted)",
    marginBottom: 6,
  },
  label: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 0.5,
    color: "var(--muted)",
    display: "block",
    marginBottom: 4,
  },
  row: {
    display: "flex",
    gap: 16,
    alignItems: "flex-start",
    marginBottom: 16,
    flexWrap: "wrap" as const,
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column" as const,
  },
  hr: {
    border: "none",
    borderTop: "1px solid var(--border)",
    margin: "20px 0",
  },
  btnGhost: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 1,
    padding: "6px 14px",
    background: "none",
    border: "1px solid var(--border)",
    color: "var(--muted)",
    borderRadius: 3,
    cursor: "pointer",
  },
  btnGhostSm: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 1,
    padding: "4px 10px",
    background: "none",
    border: "1px solid var(--border)",
    color: "var(--muted)",
    borderRadius: 3,
    cursor: "pointer",
  },
  btnAmber: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 1,
    padding: "9px 22px",
    background: "var(--amber)",
    border: "none",
    color: "#000",
    borderRadius: 3,
    cursor: "pointer",
  },
  saveBar: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: "14px 24px",
    borderTop: "2px solid var(--border)",
    background: "var(--surf)",
    flexShrink: 0,
  },
  autosaveDot: (saved: boolean): React.CSSProperties => ({
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: saved ? "var(--green)" : "var(--dim)",
    display: "inline-block",
    transition: "background .3s",
    flexShrink: 0,
  }),
  // Price summary
  costSummary: {
    background: "var(--surf-hi)",
    border: "1px solid var(--border-hi)",
    borderRadius: 4,
    overflow: "hidden",
  },
  costRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 18px",
    borderBottom: "1px solid var(--border)",
    fontSize: 15,
  },
  costLabel: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 16,
    fontWeight: 600,
    color: "var(--muted)",
    letterSpacing: 0.3,
  },
  grandTotalLabel: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 20,
    fontWeight: 700,
    color: "var(--text)",
  },
  grandTotalVal: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 30,
    fontWeight: 700,
    color: "var(--amber)",
  },
  marginRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "12px 18px",
    borderBottom: "1px solid var(--border)",
  },
  marginDisplay: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 20,
    fontWeight: 700,
    color: "var(--green)",
    marginLeft: "auto",
  },
  // Price breaks table
  pbTable: {
    width: "100%",
    borderCollapse: "collapse" as const,
  },
  pbTh: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 2,
    color: "var(--dim)",
    padding: "6px 18px",
    borderBottom: "1px solid var(--border)",
    textAlign: "right" as const,
    background: "var(--surf)",
  },
  pbThLeft: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 2,
    color: "var(--dim)",
    padding: "6px 18px",
    borderBottom: "1px solid var(--border)",
    textAlign: "left" as const,
    background: "var(--surf)",
  },
  // Time stack
  tsTable: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: 15,
  },
  tsTh: (align?: string): React.CSSProperties => ({
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 2,
    color: "var(--muted)",
    textAlign: (align ?? "right") as "left" | "right" | "center",
    padding: "6px 10px",
    borderBottom: "1px solid var(--border)",
  }),
  // Risk
  riskFlag: (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 14px",
    background: active ? "rgba(232,160,32,.06)" : "var(--surf)",
    border: `1px solid ${active ? "var(--amber)" : "var(--border)"}`,
    borderRadius: 3,
    cursor: "pointer",
    transition: "all .15s",
    marginBottom: 8,
  }),
  riskCheck: (active: boolean): React.CSSProperties => ({
    width: 20,
    height: 20,
    border: `2px solid ${active ? "var(--amber)" : "var(--border-hi)"}`,
    background: active ? "var(--amber)" : "none",
    borderRadius: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    color: "#000",
    flexShrink: 0,
  }),
  riskLabel: (active: boolean): React.CSSProperties => ({
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 16,
    fontWeight: 600,
    color: active ? "var(--text)" : "var(--muted)",
    flex: 1,
    letterSpacing: 0.3,
  }),
  riskWeight: (active: boolean): React.CSSProperties => ({
    fontSize: 13,
    color: active ? "var(--amber-dim)" : "var(--dim)",
    fontFamily: "var(--font-barlow), sans-serif",
    letterSpacing: 0.5,
  }),
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function opId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function jobToState(job: Job, shopRate: number, machines: Machine[]): QuoteState {
  const li = (job.lineItems ?? {}) as Record<string, unknown>;
  const flags = (job.riskFlags ?? {}) as Record<string, boolean>;
  const activeFlags = new Set<string>(
    Object.entries(flags).filter(([, v]) => v).map(([k]) => k)
  );
  const rawTimes = (li.times ?? {}) as Record<string, {
    est?: number; act?: number | null; desc?: string; machine?: string; basisLot?: boolean
  }>;
  const times: Record<string, TimeRow> = {};
  TIME_OPS.forEach((op) => {
    const r = rawTimes[op.key] ?? {};
    times[op.key] = {
      est: r.est ?? 0,
      act: r.act ?? null,
      desc: r.desc ?? "",
      machine: r.machine ?? "",
      basisLot: r.basisLot ?? false,
    };
  });
  const rawMat = (li.mat ?? {}) as Partial<MatState>;
  const rawOps = (li.outsideProcs ?? []) as Array<Record<string, unknown>>;
  const rawNre = (li.nre ?? {}) as Partial<NREState>;
  const qtys = (job.quantities ?? [1]) as number[];
  return {
    jobId: job.id,
    partNumber: job.partNumber ?? "",
    partName: job.partName ?? "",
    revision: job.revision ?? "",
    customerId: job.customerId ?? "",
    paymentTerms: job.paymentTerms ?? "",
    status: job.status ?? "draft",
    date: job.createdAt ? new Date(job.createdAt).toISOString().slice(0, 10) : todayStr(),
    jobNumber: job.jobNumber ?? "",
    drawingLink: (li.drawingLink as string) ?? "",
    quantities: qtys.length > 0 ? qtys : [1],
    currentQty: qtys[0] ?? 1,
    times,
    mat: {
      key: rawMat.key ?? "",
      customName: rawMat.customName ?? "",
      stockType: rawMat.stockType ?? "",
      stockDimension: rawMat.stockDimension ?? "",
      customDimension: rawMat.customDimension ?? "",
      barLength: rawMat.barLength ?? "",
      customBarLength: rawMat.customBarLength ?? "",
      weight: rawMat.weight ?? 0,
      cplb: rawMat.cplb ?? 0,
      markup: rawMat.markup ?? 20,
      supplier: rawMat.supplier ?? "",
      lead: rawMat.lead ?? "",
    },
    ops: rawOps.map((o) => ({
      id: opId(),
      process: (o.process as string) ?? "",
      vendor: (o.vendor as string) ?? "",
      cost: (o.cost as number) ?? 0,
      lead: (o.lead as string) ?? "",
      notes: (o.notes as string) ?? "",
      basis: ((o.basis as string) ?? "ea") as "ea" | "lot",
    })),
    nre: {
      engineering: rawNre.engineering ?? 0,
      tooling: rawNre.tooling ?? 0,
      fixtures: rawNre.fixtures ?? 0,
      other: rawNre.other ?? 0,
      separate: rawNre.separate ?? false,
    },
    shippingCarrier: (li.shippingCarrier as string) ?? "",
    shippingCost: (li.shippingCost as number) ?? 0,
    riskFlags: activeFlags,
    riskWeights: {},
    margin: Math.round((job.margin ?? 0.4) * 100),
    overhead: (li.overhead as number) ?? 0,
    opMarkup: (li.opMarkup as number) ?? 0,
    asmOpen: (li.asmHours as number) > 0,
    asmHours: (li.asmHours as number) ?? 0,
    nreOpen:
      (rawNre.engineering ?? 0) +
        (rawNre.tooling ?? 0) +
        (rawNre.fixtures ?? 0) +
        (rawNre.other ?? 0) >
      0,
    notes: job.notes ?? "",
    internalNotes: job.internalNotes ?? "",
    shopRate,
    machines,
  };
}

function stateToPayload(s: QuoteState) {
  const flags: Record<string, boolean> = {};
  RISK_FLAGS.forEach((f) => { flags[f.key] = s.riskFlags.has(f.key); });
  const times: Record<string, object> = {};
  TIME_OPS.forEach((op) => {
    const r = s.times[op.key];
    times[op.key] = {
      est: r.est,
      act: r.act,
      ...(r.desc !== undefined ? { desc: r.desc } : {}),
      ...(r.machine ? { machine: r.machine } : {}),
      ...(op.hasBasis ? { basisLot: r.basisLot } : {}),
    };
  });
  const sellPc = calcSellPrice(
    (() => {
      const q = s.currentQty;
      let labor = 0, laborMins = 0;
      TIME_OPS.forEach((op) => {
        const row = s.times[op.key];
        const mins = row?.est ?? 0;
        const rate = getMachineRate(row?.machine, s.machines, s.shopRate);
        const isPerJob = op.hasBasis ? (row?.basisLot ?? false) : op.perJob;
        if (isPerJob) { labor += (mins / 60) * rate / Math.max(1, q); laborMins += mins / Math.max(1, q); }
        else { labor += (mins / 60) * rate; laborMins += mins; }
      });
      const overhead = (laborMins / 60) * s.overhead;
      const isPerPiece = s.mat.stockType === "Per Piece";
      const matRaw = isPerPiece ? s.mat.cplb : s.mat.weight * s.mat.cplb;
      const matCustomer = matRaw * (1 + s.mat.markup / 100);
      const opRaw = s.ops.reduce((acc, op) => acc + (op.basis === "lot" ? op.cost / Math.max(1, q) : op.cost), 0);
      const opTotal = opRaw * (1 + s.opMarkup / 100);
      const asm = s.asmHours * s.shopRate;
      const nreTotal = s.nre.engineering + s.nre.tooling + s.nre.fixtures + s.nre.other;
      const nrePc = !s.nre.separate && nreTotal > 0 ? nreTotal / Math.max(1, q) : 0;
      const raw = labor + overhead + matCustomer + opTotal + asm + nrePc;
      return raw * getRiskMultiplier(s.riskFlags, q, s.riskWeights);
    })(),
    s.margin
  );
  return {
    partNumber: s.partNumber || null,
    partName: s.partName || null,
    revision: s.revision || null,
    customerId: s.customerId || null,
    status: s.status,
    paymentTerms: s.paymentTerms || null,
    margin: s.margin / 100,
    quantities: s.quantities,
    riskFlags: flags,
    notes: s.notes || null,
    internalNotes: s.internalNotes || null,
    results: { sellPc },
    lineItems: {
      drawingLink: s.drawingLink,
      times,
      mat: s.mat,
      outsideProcs: s.ops.map(({ id: _id, ...rest }) => rest),
      nre: s.nre,
      shippingCarrier: s.shippingCarrier,
      shippingCost: s.shippingCost,
      overhead: s.overhead,
      opMarkup: s.opMarkup,
      asmHours: s.asmHours,
    },
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuoteForm({ initialJob, onSaved }: QuoteFormProps) {
  const [settings, setSettings] = useState<{
    shopRate: number;
    defaultMargin: number;
    machines: Machine[];
    riskWeights: Record<string, number>;
  }>({ shopRate: 125, defaultMargin: 40, machines: [], riskWeights: {} });

  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [vendors, setVendors] = useState<VendorRecord[]>([]);

  const [s, setS] = useState<QuoteState>(() =>
    blankQuote(125, 40)
  );

  const [autoSaved, setAutoSaved] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(false);

  // ── Fetch settings + jobs + CRM on mount
  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/jobs").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/suppliers").then((r) => r.json()),
      fetch("/api/vendors").then((r) => r.json()),
    ]).then(([sett, jobsData, custsData, suppsData, vendsData]) => {
      const shopRate = sett?.shopRate ?? 125;
      const defaultMarginPct = Math.round((sett?.defaultMargin ?? 0.4) * 100);
      const machines = sett?.machines ?? [];
      const riskWeights = sett?.riskWeights ?? {};
      setSettings({ shopRate, defaultMargin: defaultMarginPct, machines, riskWeights });
      setJobs(Array.isArray(jobsData) ? jobsData : []);
      setCustomers(Array.isArray(custsData) ? custsData : []);
      setSuppliers(Array.isArray(suppsData) ? suppsData : []);
      setVendors(Array.isArray(vendsData) ? vendsData : []);

      if (initialJob) {
        setS(jobToState(initialJob, shopRate, machines));
      } else {
        setS(blankQuote(shopRate, defaultMarginPct));
      }
      isMounted.current = true;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When initialJob prop changes (user clicks history row)
  useEffect(() => {
    if (!isMounted.current) return;
    if (initialJob) {
      setS(jobToState(initialJob, settings.shopRate, settings.machines));
    } else {
      setS(blankQuote(settings.shopRate, settings.defaultMargin));
    }
  }, [initialJob]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived calc
  const calc = useMemo(() => {
    const q = s.currentQty;
    let labor = 0, laborMins = 0;
    TIME_OPS.forEach((op) => {
      const row = s.times[op.key];
      const mins = row?.est ?? 0;
      const rate = getMachineRate(row?.machine, s.machines, s.shopRate);
      const isPerJob = op.hasBasis ? (row?.basisLot ?? false) : op.perJob;
      if (isPerJob) { labor += (mins / 60) * rate / Math.max(1, q); laborMins += mins / Math.max(1, q); }
      else { labor += (mins / 60) * rate; laborMins += mins; }
    });
    const timeCosts: Record<string, number> = {};
    TIME_OPS.forEach((op) => {
      const row = s.times[op.key];
      const mins = row?.est ?? 0;
      const rate = getMachineRate(row?.machine, s.machines, s.shopRate);
      const isPerJob = op.hasBasis ? (row?.basisLot ?? false) : op.perJob;
      timeCosts[op.key] = isPerJob
        ? (mins / 60) * rate / Math.max(1, q)
        : (mins / 60) * rate;
    });
    const overhead = (laborMins / 60) * s.overhead;
    const isPerPiece = s.mat.stockType === "Per Piece";
    const matRaw = isPerPiece ? s.mat.cplb : s.mat.weight * s.mat.cplb;
    const matMarkupAmt = matRaw * (s.mat.markup / 100);
    const matCustomer = matRaw + matMarkupAmt;
    const opRaw = s.ops.reduce((acc, op) => acc + (op.basis === "lot" ? op.cost / Math.max(1, q) : op.cost), 0);
    const opMarkupAmt = opRaw * (s.opMarkup / 100);
    const opTotal = opRaw + opMarkupAmt;
    const asm = s.asmHours * s.shopRate;
    const nreTotal = s.nre.engineering + s.nre.tooling + s.nre.fixtures + s.nre.other;
    const nrePc = !s.nre.separate && nreTotal > 0 ? nreTotal / Math.max(1, q) : 0;
    const raw = labor + overhead + matCustomer + opTotal + asm + nrePc;
    const mult = getRiskMultiplier(s.riskFlags, q, s.riskWeights);
    const adj = raw * mult;
    const sell = calcSellPrice(adj, s.margin);
    return {
      labor, overhead, matRaw, matMarkupAmt, matCustomer,
      opRaw, opMarkupAmt, opTotal, asm, nrePc, nreTotal,
      raw, mult, adj, sell, timeCosts, laborMins,
    };
  }, [s]);

  // ── Autosave
  const persist = useCallback(
    async (state: QuoteState) => {
      const payload = stateToPayload(state);
      try {
        let res: Response;
        if (state.jobId) {
          res = await fetch(`/api/jobs/${state.jobId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          res = await fetch("/api/jobs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
        if (!res.ok) return;
        const saved: Job = await res.json();
        if (!state.jobId) {
          setS((prev) => ({ ...prev, jobId: saved.id, jobNumber: saved.jobNumber }));
          setJobs((prev) => [saved, ...prev]);
        } else {
          setJobs((prev) => prev.map((j) => (j.id === saved.id ? saved : j)));
        }
        setAutoSaved(true);
        setTimeout(() => setAutoSaved(false), 2000);
        if (onSaved) onSaved(saved);
      } catch {
        // silent autosave failure
      }
    },
    [onSaved]
  );

  const scheduleAutosave = useCallback(
    (state: QuoteState) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => persist(state), 1000);
    },
    [persist]
  );

  const update = useCallback(
    (updater: (prev: QuoteState) => QuoteState) => {
      setS((prev) => {
        const next = updater(prev);
        if (isMounted.current) scheduleAutosave(next);
        return next;
      });
    },
    [scheduleAutosave]
  );

  // ── Manual save
  const manualSave = async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveStatus("idle");
    try {
      await persist(s);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
    }
  };

  const newQuote = () => {
    update(() => blankQuote(settings.shopRate, settings.defaultMargin));
  };

  const loadJob = (job: Job) => {
    setS(jobToState(job, settings.shopRate, settings.machines));
  };

  // ── Customer select → populate payment terms + carrier
  const selectCustomer = (id: string) => {
    const cust = customers.find((c) => c.id === id);
    update((prev) => ({
      ...prev,
      customerId: id,
      paymentTerms: cust?.paymentTerms ?? prev.paymentTerms,
      shippingCarrier: cust?.preferredCarrier ?? prev.shippingCarrier,
    }));
  };

  // ── Qty breaks
  const addQty = (qty: number) => {
    const q = Math.max(1, Math.round(qty));
    update((prev) => {
      if (prev.quantities.includes(q)) return prev;
      const next = [...prev.quantities, q].sort((a, b) => a - b);
      return { ...prev, quantities: next };
    });
  };

  const removeQty = (q: number) => {
    update((prev) => {
      if (prev.quantities.length <= 1) return prev;
      const next = prev.quantities.filter((x) => x !== q);
      return {
        ...prev,
        quantities: next,
        currentQty: prev.currentQty === q ? next[0] : prev.currentQty,
      };
    });
  };

  const setCurrentQty = (q: number) => {
    update((prev) => ({ ...prev, currentQty: q }));
  };

  // ── Add qty input state
  const [addQtyVal, setAddQtyVal] = useState("");

  // ─────── Render ───────────────────────────────────────────────────────────

  const dimOptions = STOCK_DIMENSIONS[s.mat.stockType] ?? [];
  const isBarForm = BAR_FORM_TYPES.has(s.mat.stockType);
  const isPerPieceMat = s.mat.stockType === "Per Piece";
  const commodityRef = COMMODITY_REF[s.mat.key];

  return (
    <div style={S.shell}>
      {/* ── Sidebar: job list ─────────────────────────────────────────────── */}
      <div style={S.sidebar}>
        <div style={S.sidebarHeader}>
          Quotes
          <button style={{ ...S.btnGhostSm, fontSize: 12 }} onClick={newQuote}>
            + New
          </button>
        </div>
        <div style={S.jobList}>
          {jobs.map((job) => (
            <div
              key={job.id}
              style={S.jobItem(job.id === s.jobId)}
              onClick={() => loadJob(job)}
            >
              <div style={S.jobPn}>{job.partNumber || job.jobNumber}</div>
              <div style={S.jobMeta}>
                {job.revision ? `Rev ${job.revision} · ` : ""}
                {new Date(job.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ───────────────────────────────────────────────────── */}
      <div style={S.rightPanel}>
        <div style={S.main}>

          {/* PART IDENTIFICATION */}
          <div style={S.sectionHeader}>Part Identification</div>
          <div style={S.row}>
            <div style={{ ...S.fieldGroup, flex: 2 }}>
              <label style={S.label}>PART NUMBER</label>
              <input
                type="text"
                value={s.partNumber}
                placeholder="e.g. TI-4472"
                onChange={(e) => update((p) => ({ ...p, partNumber: e.target.value }))}
                style={{ fontSize: 18, letterSpacing: 2, fontWeight: 500 }}
              />
            </div>
            <div style={{ ...S.fieldGroup, width: 80 }}>
              <label style={S.label}>REV</label>
              <input
                type="text"
                value={s.revision}
                placeholder="A"
                maxLength={8}
                onChange={(e) => update((p) => ({ ...p, revision: e.target.value }))}
                style={{ fontSize: 18, textAlign: "center", fontWeight: 700, letterSpacing: 2 }}
              />
            </div>
            <div style={{ ...S.fieldGroup, flex: 2 }}>
              <label style={S.label}>DESCRIPTION</label>
              <input
                type="text"
                value={s.partName}
                placeholder="Part description"
                onChange={(e) => update((p) => ({ ...p, partName: e.target.value }))}
              />
            </div>
            <div style={{ ...S.fieldGroup, flex: 1.5 }}>
              <label style={S.label}>CUSTOMER</label>
              <select
                value={s.customerId}
                onChange={(e) => selectCustomer(e.target.value)}
              >
                <option value="">— Select Customer —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={S.row}>
            <div style={{ ...S.fieldGroup, width: 180 }}>
              <label style={S.label}>JOB NUMBER</label>
              <input
                type="text"
                value={s.jobNumber}
                placeholder="Auto-assign"
                onChange={(e) => update((p) => ({ ...p, jobNumber: e.target.value }))}
                style={{ fontSize: 15, letterSpacing: 1 }}
              />
            </div>
            <div style={{ ...S.fieldGroup, flex: 2 }}>
              <label style={S.label}>DRAWING / MODEL</label>
              <input
                type="text"
                value={s.drawingLink}
                placeholder="URL, file path, or reference"
                onChange={(e) => update((p) => ({ ...p, drawingLink: e.target.value }))}
              />
            </div>
            <div style={{ ...S.fieldGroup, width: 200 }}>
              <label style={S.label}>PAYMENT TERMS</label>
              <select
                value={s.paymentTerms}
                onChange={(e) => update((p) => ({ ...p, paymentTerms: e.target.value }))}
                style={{ fontSize: 15 }}
              >
                <option value="">— Select —</option>
                {["COD", "Net 10", "Net 30", "Net 60", "Net 90", "Custom"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div style={{ ...S.fieldGroup, width: 120 }}>
              <label style={S.label}>STATUS</label>
              <select
                value={s.status}
                onChange={(e) => update((p) => ({ ...p, status: e.target.value }))}
                style={{ fontSize: 14 }}
              >
                {["draft", "quoted", "won", "lost", "archived"].map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>

          <hr style={S.hr} />

          {/* QTY BREAKS */}
          <div style={{ marginBottom: 16 }}>
            <div style={S.sectionLabel}>QTY BREAKS</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {s.quantities.map((q) => (
                <span
                  key={q}
                  style={{ display: "inline-flex", alignItems: "center", gap: 0 }}
                >
                  <button
                    onClick={() => setCurrentQty(q)}
                    style={{
                      fontFamily: "var(--font-barlow), sans-serif",
                      fontSize: 15,
                      fontWeight: 700,
                      padding: "6px 14px",
                      background:
                        q === s.currentQty
                          ? "rgba(92,143,181,.15)"
                          : "var(--surf)",
                      border: `1px solid ${q === s.currentQty ? "var(--steel)" : "var(--border)"}`,
                      color: q === s.currentQty ? "var(--steel)" : "var(--muted)",
                      cursor: "pointer",
                      borderRadius: 3,
                      transition: "all .12s",
                    }}
                  >
                    {q}
                  </button>
                  {s.quantities.length > 1 && (
                    <button
                      onClick={() => removeQty(q)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--dim)",
                        cursor: "pointer",
                        fontSize: 16,
                        padding: "0 4px",
                        lineHeight: 1,
                      }}
                      title="Remove"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
              <input
                type="number"
                value={addQtyVal}
                placeholder="+ qty"
                min={1}
                step={1}
                onChange={(e) => setAddQtyVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && addQtyVal) {
                    addQty(parseInt(addQtyVal));
                    setAddQtyVal("");
                  }
                }}
                style={{
                  width: 72,
                  textAlign: "center",
                  fontSize: 13,
                  padding: "4px 6px",
                  color: "var(--muted)",
                }}
              />
              <button
                style={S.btnGhostSm}
                onClick={() => {
                  if (addQtyVal) { addQty(parseInt(addQtyVal)); setAddQtyVal(""); }
                }}
              >
                Add
              </button>
            </div>
          </div>

          <hr style={S.hr} />

          {/* TIME STACK */}
          <div style={S.sectionHeader}>
            Time Stack
            <span style={{ fontSize: 14, fontWeight: 400, color: "var(--muted)" }}>
              All times in minutes
            </span>
          </div>
          <table style={S.tsTable}>
            <thead>
              <tr>
                <th style={{ ...S.tsTh("left"), width: 140 }}>Operation</th>
                <th style={{ ...S.tsTh("right"), width: 110 }}>Time (min)</th>
                <th style={{ ...S.tsTh("left"), width: 200 }}></th>
                <th style={{ ...S.tsTh("right"), width: 90 }}>Cost/Pc</th>
                <th style={{ ...S.tsTh("right"), width: 90, color: "var(--dim)", fontStyle: "italic" }}>
                  Actual
                </th>
              </tr>
            </thead>
            <tbody>
              {TIME_OPS.map((op) => {
                const row = s.times[op.key];
                const basisLot = op.hasBasis ? (row?.basisLot ?? false) : false;
                const isPerJob = op.hasBasis ? basisLot : op.perJob;
                const costPc = calc.timeCosts[op.key] ?? 0;
                return (
                  <tr key={op.key} style={{ borderBottom: "1px solid rgba(37,48,64,.4)" }}>
                    <td
                      style={{
                        fontFamily: "var(--font-barlow), sans-serif",
                        fontSize: 16,
                        fontWeight: 600,
                        color: "var(--text)",
                        paddingLeft: 4,
                        paddingTop: 6,
                        paddingBottom: 6,
                      }}
                    >
                      {op.label}
                    </td>
                    <td style={{ textAlign: "right", paddingTop: 6, paddingBottom: 6 }}>
                      <input
                        type="number"
                        value={row?.est ?? 0}
                        min={0}
                        step={isPerJob ? 1 : 0.5}
                        onChange={(e) =>
                          update((p) => ({
                            ...p,
                            times: {
                              ...p.times,
                              [op.key]: { ...p.times[op.key], est: parseFloat(e.target.value) || 0 },
                            },
                          }))
                        }
                        style={{ width: 80, padding: "5px 7px", fontSize: 14 }}
                      />
                      <span style={{ fontSize: 11, color: "var(--dim)", display: "block", textAlign: "right", marginTop: 2 }}>
                        {isPerJob ? "per job" : "per piece"}
                      </span>
                    </td>
                    <td style={{ minWidth: 160, padding: "4px 8px" }}>
                      {op.hasDesc && (
                        <input
                          type="text"
                          value={row?.desc ?? ""}
                          placeholder="Description…"
                          onChange={(e) =>
                            update((p) => ({
                              ...p,
                              times: {
                                ...p.times,
                                [op.key]: { ...p.times[op.key], desc: e.target.value },
                              },
                            }))
                          }
                          style={{
                            width: "100%",
                            fontSize: 12,
                            padding: "3px 6px",
                            color: "var(--muted)",
                            marginBottom: 4,
                          }}
                        />
                      )}
                      {op.hasBasis && (
                        <button
                          onClick={() =>
                            update((p) => ({
                              ...p,
                              times: {
                                ...p.times,
                                [op.key]: {
                                  ...p.times[op.key],
                                  basisLot: !p.times[op.key].basisLot,
                                },
                              },
                            }))
                          }
                          style={{
                            fontFamily: "var(--font-barlow), sans-serif",
                            fontSize: 13,
                            fontWeight: 700,
                            letterSpacing: 1,
                            padding: "3px 10px",
                            cursor: "pointer",
                            border: "2px solid var(--border-hi)",
                            borderRadius: 3,
                            background: "var(--surf-hi)",
                            color: basisLot ? "var(--amber)" : "var(--muted)",
                            marginBottom: 4,
                          }}
                        >
                          {basisLot ? "LOT" : "EA"}
                        </button>
                      )}
                      <select
                        value={row?.machine ?? ""}
                        onChange={(e) =>
                          update((p) => ({
                            ...p,
                            times: {
                              ...p.times,
                              [op.key]: { ...p.times[op.key], machine: e.target.value },
                            },
                          }))
                        }
                        style={{
                          fontSize: 12,
                          padding: "3px 6px",
                          color: "var(--muted)",
                          width: "100%",
                        }}
                      >
                        <option value="">Shop Rate (${settings.shopRate}/hr)</option>
                        {settings.machines.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} — ${m.rate}/hr
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ textAlign: "right", color: "var(--steel)", fontSize: 14, paddingRight: 10 }}>
                      ${costPc.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right", paddingTop: 6, paddingBottom: 6 }}>
                      <input
                        type="number"
                        value={row?.act ?? ""}
                        placeholder="—"
                        min={0}
                        step={0.5}
                        onChange={(e) =>
                          update((p) => ({
                            ...p,
                            times: {
                              ...p.times,
                              [op.key]: {
                                ...p.times[op.key],
                                act: e.target.value ? parseFloat(e.target.value) : null,
                              },
                            },
                          }))
                        }
                        style={{
                          width: 72,
                          padding: "5px 7px",
                          fontSize: 13,
                          color: "var(--muted)",
                          borderColor: "var(--border)",
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: "2px solid var(--border-hi)" }}>
                <td
                  colSpan={2}
                  style={{
                    fontFamily: "var(--font-barlow), sans-serif",
                    fontSize: 15,
                    color: "var(--muted)",
                    paddingTop: 10,
                  }}
                >
                  TOTAL LABOR
                </td>
                <td></td>
                <td
                  style={{
                    textAlign: "right",
                    color: "var(--amber)",
                    fontSize: 16,
                    fontWeight: 500,
                    paddingRight: 10,
                    paddingTop: 10,
                  }}
                >
                  ${calc.labor.toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 6, marginBottom: 4 }}>
            Setup amortized over qty · Rate:{" "}
            <span style={{ color: "var(--amber)" }}>${settings.shopRate}/hr</span> ·{" "}
            <span style={{ fontStyle: "italic" }}>
              Record actuals after the job runs
            </span>
          </div>

          <hr style={S.hr} />

          {/* MATERIAL */}
          <div style={S.sectionHeader}>Material</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 12, alignItems: "start" }}>
            <div style={S.fieldGroup}>
              <label style={S.label}>MATERIAL</label>
              <select
                value={s.mat.key}
                onChange={(e) => {
                  const key = e.target.value;
                  const ref = COMMODITY_REF[key];
                  update((p) => ({
                    ...p,
                    mat: {
                      ...p.mat,
                      key,
                      cplb: ref?.ref ?? p.mat.cplb,
                    },
                  }));
                }}
              >
                <option value="">-- Select Material --</option>
                {MATERIAL_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              {s.mat.key === "custom" && (
                <input
                  type="text"
                  value={s.mat.customName}
                  placeholder="Specify material…"
                  onChange={(e) =>
                    update((p) => ({ ...p, mat: { ...p.mat, customName: e.target.value } }))
                  }
                  style={{ marginTop: 6, fontSize: 14 }}
                />
              )}
              {commodityRef?.ref && (
                <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 3 }}>
                  Commodity ref: ${commodityRef.ref.toFixed(2)}/lb
                </div>
              )}
            </div>
            <div style={S.fieldGroup}>
              <label style={S.label}>{stockQtyLabel(s.mat.stockType)}</label>
              <input
                type="number"
                value={s.mat.weight || ""}
                placeholder="0.00"
                step={0.01}
                min={0}
                onChange={(e) =>
                  update((p) => ({ ...p, mat: { ...p.mat, weight: parseFloat(e.target.value) || 0 } }))
                }
              />
            </div>
            <div style={S.fieldGroup}>
              <label style={S.label}>{stockCostLabel(s.mat.stockType)}</label>
              <input
                type="number"
                value={s.mat.cplb || ""}
                placeholder="0.00"
                step={0.01}
                min={0}
                onChange={(e) =>
                  update((p) => ({ ...p, mat: { ...p.mat, cplb: parseFloat(e.target.value) || 0 } }))
                }
              />
            </div>
            <div style={S.fieldGroup}>
              <label style={S.label}>MARKUP %</label>
              <input
                type="number"
                value={s.mat.markup}
                min={0}
                max={200}
                step={1}
                onChange={(e) =>
                  update((p) => ({ ...p, mat: { ...p.mat, markup: parseFloat(e.target.value) || 0 } }))
                }
              />
            </div>
            <div style={S.fieldGroup}>
              <label style={S.label}>MATERIAL COST/PC</label>
              <div
                style={{
                  background: "var(--surf-hi)",
                  border: "1px solid var(--border)",
                  borderRadius: 3,
                  padding: "8px 12px",
                  fontSize: 18,
                  fontWeight: 500,
                  color: "var(--amber)",
                  textAlign: "right",
                }}
              >
                ${calc.matCustomer.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Stock type + dimension */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isBarForm ? "1fr 1fr 1fr" : "1fr 1fr",
              gap: 12,
              marginTop: 12,
            }}
          >
            <div style={S.fieldGroup}>
              <label style={S.label}>STOCK TYPE</label>
              <select
                value={s.mat.stockType}
                onChange={(e) =>
                  update((p) => ({
                    ...p,
                    mat: {
                      ...p.mat,
                      stockType: e.target.value,
                      stockDimension: "",
                      customDimension: "",
                    },
                  }))
                }
              >
                <option value="">-- Select --</option>
                {STOCK_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            {!isPerPieceMat && (
              <div style={S.fieldGroup}>
                <label style={S.label}>DIMENSION</label>
                <select
                  value={s.mat.stockDimension}
                  onChange={(e) =>
                    update((p) => ({
                      ...p,
                      mat: { ...p.mat, stockDimension: e.target.value, customDimension: "" },
                    }))
                  }
                >
                  <option value="">-- Select --</option>
                  {dimOptions.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                  <option value="Custom">Custom</option>
                </select>
                {s.mat.stockDimension === "Custom" && (
                  <input
                    type="text"
                    value={s.mat.customDimension}
                    placeholder='e.g. 2.5"'
                    onChange={(e) =>
                      update((p) => ({ ...p, mat: { ...p.mat, customDimension: e.target.value } }))
                    }
                    style={{ marginTop: 4 }}
                  />
                )}
              </div>
            )}
            {isBarForm && (
              <div style={S.fieldGroup}>
                <label style={S.label}>BAR LENGTH</label>
                <select
                  value={s.mat.barLength}
                  onChange={(e) =>
                    update((p) => ({ ...p, mat: { ...p.mat, barLength: e.target.value, customBarLength: "" } }))
                  }
                >
                  <option value="">-- Select --</option>
                  {BAR_LENGTHS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                  <option value="Custom">Custom</option>
                </select>
                {s.mat.barLength === "Custom" && (
                  <input
                    type="text"
                    value={s.mat.customBarLength}
                    placeholder="e.g. 18ft"
                    onChange={(e) =>
                      update((p) => ({ ...p, mat: { ...p.mat, customBarLength: e.target.value } }))
                    }
                    style={{ marginTop: 4 }}
                  />
                )}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginTop: 12 }}>
            <div style={S.fieldGroup}>
              <label style={S.label}>SUPPLIER</label>
              <select
                value={s.mat.supplier}
                onChange={(e) =>
                  update((p) => ({ ...p, mat: { ...p.mat, supplier: e.target.value } }))
                }
              >
                <option value="">— Select Supplier —</option>
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>
            </div>
            <div style={S.fieldGroup}>
              <label style={S.label}>MATERIAL LEAD TIME</label>
              <input
                type="text"
                value={s.mat.lead}
                placeholder="e.g. 3–5 days"
                onChange={(e) =>
                  update((p) => ({ ...p, mat: { ...p.mat, lead: e.target.value } }))
                }
              />
            </div>
          </div>

          <hr style={S.hr} />

          {/* OUTSIDE PROCESSES */}
          <div style={S.sectionHeader}>
            Outside Processes
            <button
              style={S.btnGhostSm}
              onClick={() =>
                update((p) => ({
                  ...p,
                  ops: [
                    ...p.ops,
                    { id: opId(), process: "", vendor: "", cost: 0, lead: "", notes: "", basis: "ea" },
                  ],
                }))
              }
            >
              + Add Process
            </button>
          </div>
          {s.ops.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginBottom: 8 }}>
              <thead>
                <tr>
                  {["PROCESS", "VENDOR", "BASIS", "COST", "LEAD TIME", "NOTES", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        fontFamily: "var(--font-barlow), sans-serif",
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: 2,
                        color: "var(--muted)",
                        textAlign: "left",
                        padding: "6px 8px",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.ops.map((op, i) => (
                  <tr key={op.id} style={{ borderBottom: "1px solid rgba(37,48,64,.4)" }}>
                    <td style={{ padding: "5px 6px", width: 160 }}>
                      <select
                        value={op.process}
                        onChange={(e) =>
                          update((p) => ({
                            ...p,
                            ops: p.ops.map((o, j) =>
                              j === i ? { ...o, process: e.target.value } : o
                            ),
                          }))
                        }
                        style={{ width: "100%", fontSize: 13, padding: "5px 7px" }}
                      >
                        <option value="">— Select —</option>
                        {OP_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "5px 6px", width: 140 }}>
                      <select
                        value={op.vendor}
                        onChange={(e) =>
                          update((p) => ({
                            ...p,
                            ops: p.ops.map((o, j) =>
                              j === i ? { ...o, vendor: e.target.value } : o
                            ),
                          }))
                        }
                        style={{ width: "100%", fontSize: 13, padding: "5px 7px" }}
                      >
                        <option value="">— Vendor —</option>
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "5px 6px", width: 60 }}>
                      <button
                        onClick={() =>
                          update((p) => ({
                            ...p,
                            ops: p.ops.map((o, j) =>
                              j === i
                                ? { ...o, basis: o.basis === "ea" ? "lot" : "ea" }
                                : o
                            ),
                          }))
                        }
                        style={{
                          fontFamily: "var(--font-barlow), sans-serif",
                          fontSize: 13,
                          fontWeight: 700,
                          letterSpacing: 1,
                          padding: "4px 10px",
                          cursor: "pointer",
                          border: "2px solid var(--border-hi)",
                          borderRadius: 3,
                          background: "var(--surf-hi)",
                          color: op.basis === "lot" ? "var(--amber)" : "var(--muted)",
                          minWidth: 48,
                          textAlign: "center",
                        }}
                      >
                        {op.basis === "lot" ? "LOT" : "EA"}
                      </button>
                    </td>
                    <td style={{ padding: "5px 6px", width: 90 }}>
                      <input
                        type="number"
                        value={op.cost || ""}
                        placeholder="0.00"
                        step={0.01}
                        min={0}
                        onChange={(e) =>
                          update((p) => ({
                            ...p,
                            ops: p.ops.map((o, j) =>
                              j === i ? { ...o, cost: parseFloat(e.target.value) || 0 } : o
                            ),
                          }))
                        }
                        style={{ width: "100%", fontSize: 13, padding: "5px 7px" }}
                      />
                    </td>
                    <td style={{ padding: "5px 6px", width: 100 }}>
                      <input
                        type="text"
                        value={op.lead}
                        placeholder="days"
                        onChange={(e) =>
                          update((p) => ({
                            ...p,
                            ops: p.ops.map((o, j) =>
                              j === i ? { ...o, lead: e.target.value } : o
                            ),
                          }))
                        }
                        style={{ width: "100%", fontSize: 13, padding: "5px 7px" }}
                      />
                    </td>
                    <td style={{ padding: "5px 6px" }}>
                      <input
                        type="text"
                        value={op.notes}
                        placeholder="Notes…"
                        onChange={(e) =>
                          update((p) => ({
                            ...p,
                            ops: p.ops.map((o, j) =>
                              j === i ? { ...o, notes: e.target.value } : o
                            ),
                          }))
                        }
                        style={{ width: "100%", fontSize: 13, padding: "5px 7px" }}
                      />
                    </td>
                    <td style={{ padding: "5px 6px", width: 36, textAlign: "center" }}>
                      <button
                        onClick={() =>
                          update((p) => ({ ...p, ops: p.ops.filter((_, j) => j !== i) }))
                        }
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--dim)",
                          cursor: "pointer",
                          fontSize: 18,
                          padding: "0 4px",
                          lineHeight: 1,
                        }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 15, fontWeight: 700, color: "var(--amber)", textAlign: "right", padding: 8 }}>
                    OUTSIDE PROCESS / PC
                  </td>
                  <td style={{ color: "var(--amber)", fontFamily: "var(--font-barlow), sans-serif", fontSize: 15, fontWeight: 700, padding: 8 }}>
                    ${calc.opRaw.toFixed(2)}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tbody>
            </table>
          )}

          <hr style={S.hr} />

          {/* ASSEMBLY STUB */}
          <div style={S.sectionHeader}>
            Assembly
            <button
              style={S.btnGhostSm}
              onClick={() => update((p) => ({ ...p, asmOpen: !p.asmOpen }))}
            >
              {s.asmOpen ? "− Remove Assembly" : "+ Add Assembly"}
            </button>
          </div>
          {s.asmOpen && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div style={S.fieldGroup}>
                <label style={S.label}>ASSEMBLY HOURS</label>
                <input
                  type="number"
                  value={s.asmHours}
                  min={0}
                  step={0.25}
                  onChange={(e) =>
                    update((p) => ({ ...p, asmHours: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>RATE (SHOP $/HR)</label>
                <div style={{ fontSize: 16, color: "var(--steel)", fontWeight: 500, padding: "9px 0" }}>
                  ${settings.shopRate}/hr
                </div>
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>ASSEMBLY COST</label>
                <div style={{ fontSize: 18, color: "var(--green)", fontWeight: 500, padding: "8px 0" }}>
                  ${calc.asm.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          <hr style={S.hr} />

          {/* NRE */}
          <div style={S.sectionHeader}>
            NRE
            <span style={{ fontSize: 12, fontWeight: 400, color: "var(--dim)", letterSpacing: 0.5 }}>
              Non-Recurring Engineering
            </span>
            <button
              style={S.btnGhostSm}
              onClick={() => update((p) => ({ ...p, nreOpen: !p.nreOpen }))}
            >
              {s.nreOpen ? "− Remove NRE" : "+ Add NRE"}
            </button>
          </div>
          {s.nreOpen && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                {(["engineering", "tooling", "fixtures", "other"] as const).map((k) => (
                  <div key={k} style={S.fieldGroup}>
                    <label style={S.label}>{k.toUpperCase()} ($)</label>
                    <input
                      type="number"
                      value={s.nre[k] || ""}
                      placeholder="0.00"
                      step={0.01}
                      min={0}
                      onChange={(e) =>
                        update((p) => ({
                          ...p,
                          nre: { ...p.nre, [k]: parseFloat(e.target.value) || 0 },
                        }))
                      }
                    />
                  </div>
                ))}
                <div style={S.fieldGroup}>
                  <label style={S.label}>NRE TOTAL</label>
                  <div
                    style={{
                      background: "var(--surf-hi)",
                      border: "1px solid var(--border)",
                      borderRadius: 3,
                      padding: "8px 12px",
                      fontSize: 16,
                      fontWeight: 500,
                      color: "var(--amber)",
                      textAlign: "right",
                    }}
                  >
                    ${calc.nreTotal.toFixed(2)}
                  </div>
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--muted)", cursor: "pointer", marginBottom: 12 }}>
                <input
                  type="checkbox"
                  checked={s.nre.separate}
                  onChange={(e) =>
                    update((p) => ({ ...p, nre: { ...p.nre, separate: e.target.checked } }))
                  }
                />
                Show separate on customer quote
              </label>
              <div style={{ fontSize: 12, color: "var(--dim)", fontStyle: "italic", marginBottom: 12 }}>
                {s.nre.separate
                  ? "Shown as separate one-time charge on customer quote"
                  : calc.nreTotal > 0
                  ? `Amortized: $${(calc.nreTotal / Math.max(1, s.currentQty)).toFixed(2)}/pc at qty ${s.currentQty}`
                  : "Baked in — amortized into unit price by quantity"}
              </div>
            </>
          )}

          <hr style={S.hr} />

          {/* SHIPPING */}
          <div style={S.sectionHeader}>Shipping</div>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginBottom: 16 }}>
            <div style={{ ...S.fieldGroup, flex: 2 }}>
              <label style={S.label}>CARRIER</label>
              <input
                type="text"
                value={s.shippingCarrier}
                placeholder="e.g. FedEx, UPS, customer pickup"
                onChange={(e) =>
                  update((p) => ({ ...p, shippingCarrier: e.target.value }))
                }
              />
            </div>
            <div style={{ ...S.fieldGroup, flex: 1 }}>
              <label style={S.label}>SHIPPING COST ($)</label>
              <input
                type="number"
                value={s.shippingCost || ""}
                placeholder="0.00"
                step={0.01}
                min={0}
                onChange={(e) =>
                  update((p) => ({ ...p, shippingCost: parseFloat(e.target.value) || 0 }))
                }
              />
            </div>
            <div
              style={{
                fontFamily: "var(--font-barlow), sans-serif",
                fontSize: 22,
                fontWeight: 700,
                color: "var(--steel)",
                padding: "6px 0",
                flexShrink: 0,
              }}
            >
              ${s.shippingCost.toFixed(2)}
            </div>
          </div>

          <hr style={S.hr} />

          {/* RISK ENGINE */}
          <div style={S.sectionHeader}>Risk Engine</div>
          <div
            style={{
              background: "var(--surf-hi)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: 20,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 20,
              alignItems: "start",
            }}
          >
            <div>
              <div style={{ ...S.sectionLabel, marginBottom: 12 }}>Risk Flags — click to toggle</div>
              {RISK_FLAGS.map((f) => {
                const active = s.riskFlags.has(f.key);
                return (
                  <div
                    key={f.key}
                    style={S.riskFlag(active)}
                    onClick={() =>
                      update((p) => {
                        const next = new Set(p.riskFlags);
                        if (next.has(f.key)) next.delete(f.key);
                        else next.add(f.key);
                        return { ...p, riskFlags: next };
                      })
                    }
                  >
                    <div style={S.riskCheck(active)}>{active ? "✓" : ""}</div>
                    <div style={S.riskLabel(active)}>{f.label}</div>
                    <div style={S.riskWeight(active)}>
                      +{(s.riskWeights[f.key] !== undefined
                        ? s.riskWeights[f.key]
                        : Math.round(f.weight * 100)
                      )}%
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 180, gap: 12 }}>
              <div style={S.sectionLabel}>Risk Multiplier</div>
              <div
                style={{
                  fontFamily: "var(--font-barlow), sans-serif",
                  fontSize: 80,
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: -2,
                  color:
                    calc.mult < 1.1
                      ? "var(--green)"
                      : calc.mult < 1.25
                      ? "var(--amber)"
                      : "var(--red)",
                }}
              >
                {calc.mult.toFixed(2)}×
              </div>
              <div
                style={{
                  width: "100%",
                  height: 10,
                  background: "var(--surf)",
                  borderRadius: 5,
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 5,
                    width: `${Math.min(100, ((calc.mult - 1) / 0.6) * 100)}%`,
                    background:
                      calc.mult < 1.1
                        ? "var(--green)"
                        : calc.mult < 1.25
                        ? "var(--amber)"
                        : "var(--red)",
                    transition: "width .3s, background .3s",
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: "var(--font-barlow), sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: 2,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                }}
              >
                {calc.mult < 1.1 ? "LOW RISK" : calc.mult < 1.25 ? "MODERATE" : "HIGH RISK"}
              </div>
            </div>
          </div>

          <hr style={S.hr} />

          {/* COST SUMMARY */}
          <div style={S.sectionHeader}>Cost Summary</div>

          {/* Per-job overrides */}
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 14 }}>
            <div style={S.fieldGroup}>
              <label style={S.label}>OVERHEAD $/HR</label>
              <input
                type="number"
                value={s.overhead || ""}
                placeholder="0"
                min={0}
                step={1}
                onChange={(e) =>
                  update((p) => ({ ...p, overhead: parseFloat(e.target.value) || 0 }))
                }
                style={{ width: 100 }}
              />
            </div>
            <div style={S.fieldGroup}>
              <label style={S.label}>OP MARKUP %</label>
              <input
                type="number"
                value={s.opMarkup || ""}
                placeholder="0"
                min={0}
                max={200}
                step={1}
                onChange={(e) =>
                  update((p) => ({ ...p, opMarkup: parseFloat(e.target.value) || 0 }))
                }
                style={{ width: 100 }}
              />
            </div>
            <span style={{ fontSize: 12, color: "var(--dim)", fontStyle: "italic", marginTop: 16 }}>
              Defaults from Settings · override per job
            </span>
          </div>

          <div style={S.costSummary}>
            <div style={S.costRow}>
              <span style={S.costLabel}>Labor (per piece)</span>
              <span style={{ fontSize: 15 }}>${calc.labor.toFixed(2)}</span>
            </div>
            {calc.overhead > 0 && (
              <div style={S.costRow}>
                <span style={{ ...S.costLabel, color: "var(--dim)", paddingLeft: 16 }}>+ Overhead</span>
                <span style={{ fontSize: 15 }}>${calc.overhead.toFixed(2)}</span>
              </div>
            )}
            <div style={S.costRow}>
              <span style={S.costLabel}>Material (raw)</span>
              <span style={{ fontSize: 15 }}>${calc.matRaw.toFixed(2)}</span>
            </div>
            {calc.matMarkupAmt > 0 && (
              <div style={S.costRow}>
                <span style={{ ...S.costLabel, color: "var(--dim)", paddingLeft: 16 }}>+ Material Markup</span>
                <span style={{ fontSize: 15 }}>+${calc.matMarkupAmt.toFixed(2)}</span>
              </div>
            )}
            <div style={S.costRow}>
              <span style={S.costLabel}>Outside Processes (raw)</span>
              <span style={{ fontSize: 15 }}>${calc.opRaw.toFixed(2)}</span>
            </div>
            {calc.opMarkupAmt > 0 && (
              <div style={S.costRow}>
                <span style={{ ...S.costLabel, color: "var(--dim)", paddingLeft: 16 }}>+ OP Markup</span>
                <span style={{ fontSize: 15 }}>+${calc.opMarkupAmt.toFixed(2)}</span>
              </div>
            )}
            {calc.asm > 0 && (
              <div style={S.costRow}>
                <span style={S.costLabel}>Assembly</span>
                <span style={{ fontSize: 15 }}>${calc.asm.toFixed(2)}</span>
              </div>
            )}
            {calc.nrePc > 0 && (
              <div style={S.costRow}>
                <span style={S.costLabel}>NRE (per piece)</span>
                <span style={{ fontSize: 15 }}>${calc.nrePc.toFixed(2)}</span>
              </div>
            )}
            <div style={{ ...S.costRow, background: "rgba(37,48,64,.4)" }}>
              <span style={S.costLabel}>Raw Cost / Piece</span>
              <span style={{ fontSize: 15, color: "var(--amber)" }}>${calc.raw.toFixed(2)}</span>
            </div>
            <div style={S.costRow}>
              <span style={S.costLabel}>Risk Multiplier</span>
              <span style={{ fontSize: 15 }}>{calc.mult.toFixed(2)}×</span>
            </div>
            <div style={{ ...S.costRow, background: "rgba(37,48,64,.4)" }}>
              <span style={S.costLabel}>Adjusted Cost / Piece</span>
              <span style={{ fontSize: 15, color: "var(--amber)" }}>${calc.adj.toFixed(2)}</span>
            </div>
            <div style={S.marginRow}>
              <label style={S.label}>MARGIN %</label>
              <input
                type="number"
                value={s.margin}
                min={0}
                max={95}
                step={1}
                onChange={(e) =>
                  update((p) => ({ ...p, margin: parseFloat(e.target.value) || 0 }))
                }
                style={{ width: 80 }}
              />
              <div style={S.marginDisplay}>{Math.round(s.margin)}% GM</div>
            </div>
            <div
              style={{
                ...S.costRow,
                background: "rgba(92,143,181,.1)",
                borderTop: "2px solid var(--steel)",
                padding: "14px 18px",
              }}
            >
              <span style={S.grandTotalLabel}>SELL PRICE / PIECE</span>
              <span style={S.grandTotalVal}>${calc.sell.toFixed(2)}</span>
            </div>

            {/* Price breaks table */}
            <table style={S.pbTable}>
              <thead>
                <tr>
                  <th style={S.pbThLeft}>QTY</th>
                  <th style={S.pbTh}>PRICE / PC</th>
                  <th style={S.pbTh}>EXTENDED</th>
                  <th style={{ ...S.pbTh, width: 32 }}></th>
                </tr>
              </thead>
              <tbody>
                {s.quantities.map((q, i) => {
                  const sp = calcForQty(q, s);
                  const ext = sp * q;
                  const isActive = q === s.currentQty;
                  return (
                    <tr
                      key={q}
                      onClick={() => setCurrentQty(q)}
                      style={{
                        cursor: "pointer",
                        background: isActive ? "rgba(232,160,32,.07)" : "transparent",
                        borderBottom: "1px solid rgba(37,48,64,.4)",
                      }}
                    >
                      <td
                        style={{
                          padding: "7px 18px",
                          textAlign: "left",
                          fontFamily: "var(--font-barlow), sans-serif",
                          fontSize: 15,
                          fontWeight: 600,
                          letterSpacing: 0.5,
                          color: isActive ? "var(--amber)" : "var(--muted)",
                        }}
                      >
                        {q}
                      </td>
                      <td
                        style={{
                          padding: "7px 18px",
                          textAlign: "right",
                          fontSize: 14,
                          color: isActive ? "var(--text)" : "var(--muted)",
                        }}
                      >
                        ${sp.toFixed(2)}
                      </td>
                      <td
                        style={{
                          padding: "7px 18px",
                          textAlign: "right",
                          fontSize: 14,
                          color: isActive ? "var(--green)" : "var(--muted)",
                          fontWeight: isActive ? 500 : 400,
                        }}
                      >
                        ${ext.toFixed(2)}
                      </td>
                      <td style={{ padding: "4px 6px", textAlign: "center" }}>
                        {s.quantities.length > 1 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); removeQty(q); }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--dim)",
                              cursor: "pointer",
                              fontSize: 16,
                              padding: "2px 6px",
                              lineHeight: 1,
                              borderRadius: 2,
                            }}
                          >
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={4} style={{ padding: "8px 18px", borderTop: "1px solid var(--border-hi)" }}>
                    <input
                      type="number"
                      value={addQtyVal}
                      placeholder="Add qty…"
                      min={1}
                      step={1}
                      onChange={(e) => setAddQtyVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && addQtyVal) {
                          addQty(parseInt(addQtyVal));
                          setAddQtyVal("");
                        }
                      }}
                      style={{ width: 72, padding: "4px 8px", fontSize: 13, textAlign: "center", marginRight: 6 }}
                    />
                    <button
                      style={S.btnGhostSm}
                      onClick={() => {
                        if (addQtyVal) { addQty(parseInt(addQtyVal)); setAddQtyVal(""); }
                      }}
                    >
                      + Add
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Notes */}
            <div style={{ padding: 16, borderTop: "1px solid var(--border)" }}>
              <label style={S.label}>ESTIMATOR NOTES</label>
              <textarea
                value={s.notes}
                placeholder="Material certs required · Tolerance stack on bore dia · Confirm anodize spec..."
                onChange={(e) => update((p) => ({ ...p, notes: e.target.value }))}
                style={{ width: "100%", minHeight: 80, fontSize: 14, marginTop: 4 }}
              />
            </div>
          </div>

          <div style={{ height: 40 }} />
        </div>

        {/* SAVE BAR */}
        <div style={S.saveBar}>
          <button style={S.btnAmber} onClick={manualSave}>
            Save Quote
          </button>
          <div style={S.autosaveDot(autoSaved)} title={autoSaved ? "Auto-saved" : "Pending"} />
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            {autoSaved ? "Saved" : "Auto-saves in 1s"}
          </span>
          {saveStatus === "saved" && (
            <span style={{ fontSize: 13, color: "var(--green)", fontFamily: "var(--font-barlow), sans-serif", fontWeight: 600, letterSpacing: 1 }}>
              ✓ SAVED
            </span>
          )}
          {saveStatus === "error" && (
            <span style={{ fontSize: 13, color: "var(--red)", fontFamily: "var(--font-barlow), sans-serif" }}>
              Save failed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
