"use client";

import { useEffect, useState, useCallback } from "react";
import { RISK_FLAGS } from "@/lib/constants";

interface MachineRow {
  id: string;
  name: string;
  rate: number;
}

interface SettingsData {
  shopName: string;
  shopRate: number;
  defaultMargin: number;
  machines: MachineRow[];
  riskWeights: Record<string, number>;
}

const S = {
  page: {
    display: "flex",
    flexDirection: "column" as const,
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  body: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "32px 40px",
    maxWidth: 720,
  },
  pageHeader: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: 1,
    color: "var(--steel)",
    borderBottom: "1px solid var(--border)",
    paddingBottom: 10,
    marginBottom: 28,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 1,
    color: "var(--text)",
    marginBottom: 14,
  },
  fieldGroup: {
    marginBottom: 16,
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  },
  label: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 2,
    color: "var(--muted)",
    textTransform: "uppercase" as const,
  },
  hint: {
    fontSize: 12,
    color: "var(--dim)",
    fontStyle: "italic" as const,
    marginTop: 3,
  },
  inputNarrow: {
    maxWidth: 200,
    fontSize: 20,
  },
  machineRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  riskRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 14px",
    background: "var(--surf)",
    border: "1px solid var(--border)",
    borderRadius: 3,
    marginBottom: 8,
  },
  riskLabel: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 15,
    fontWeight: 600,
    color: "var(--text)",
    flex: 1,
  },
  btnGhost: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: 1,
    padding: "7px 16px",
    background: "none",
    border: "1px solid var(--border)",
    color: "var(--muted)",
    borderRadius: 3,
    cursor: "pointer",
  },
  btnAmber: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: 1,
    padding: "10px 28px",
    background: "var(--amber)",
    border: "none",
    color: "#000",
    borderRadius: 3,
    cursor: "pointer",
  },
  btnDanger: {
    background: "none",
    border: "none",
    color: "var(--dim)",
    cursor: "pointer",
    fontSize: 18,
    padding: "0 4px",
    lineHeight: 1,
  },
  saveRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginTop: 8,
  },
  savedMsg: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: 1,
    color: "var(--green)",
  },
  errorMsg: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 14,
    fontWeight: 600,
    color: "var(--red)",
  },
};

export default function SettingsTab() {
  const [data, setData] = useState<SettingsData>({
    shopName: "",
    shopRate: 125,
    defaultMargin: 40,
    machines: [],
    riskWeights: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setData({
          shopName: d.shopName ?? "",
          shopRate: d.shopRate ?? 125,
          defaultMargin: Math.round((d.defaultMargin ?? 0.4) * 100),
          machines: d.machines ?? [],
          riskWeights: d.riskWeights ?? {},
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const addMachine = useCallback(() => {
    setData((prev) => ({
      ...prev,
      machines: [
        ...prev.machines,
        { id: `mach_${Date.now()}`, name: "", rate: prev.shopRate },
      ],
    }));
  }, []);

  const removeMachine = useCallback((idx: number) => {
    setData((prev) => ({
      ...prev,
      machines: prev.machines.filter((_, i) => i !== idx),
    }));
  }, []);

  const updateMachine = useCallback(
    (idx: number, field: "name" | "rate", val: string) => {
      setData((prev) => ({
        ...prev,
        machines: prev.machines.map((m, i) =>
          i === idx
            ? { ...m, [field]: field === "rate" ? parseFloat(val) || 0 : val }
            : m
        ),
      }));
    },
    []
  );

  const updateRiskWeight = useCallback((key: string, val: string) => {
    setData((prev) => ({
      ...prev,
      riskWeights: {
        ...prev.riskWeights,
        [key]: parseFloat(val) || 0,
      },
    }));
  }, []);

  const save = async () => {
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName: data.shopName,
          shopRate: data.shopRate,
          defaultMargin: data.defaultMargin / 100,
          machineList: data.machines,
          riskWeightMap: data.riskWeights,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ ...S.page, justifyContent: "center", alignItems: "center" }}>
        <span style={{ color: "var(--muted)", fontFamily: "var(--font-barlow), sans-serif", fontSize: 18 }}>
          Loading settings...
        </span>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.body}>
        <div style={S.pageHeader}>Shop Settings</div>

        {/* Shop Info */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Shop Information</div>
          <div style={S.fieldGroup}>
            <label style={S.label}>Shop Name</label>
            <input
              type="text"
              value={data.shopName}
              placeholder="Your shop name"
              onChange={(e) => setData((p) => ({ ...p, shopName: e.target.value }))}
              style={{ maxWidth: 360, fontSize: 18 }}
            />
            <div style={S.hint}>Appears in the header and on printed quotes</div>
          </div>
        </div>

        {/* Rate */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Shop Rate</div>
          <div style={S.fieldGroup}>
            <label style={S.label}>Default Rate $/hr</label>
            <input
              type="number"
              value={data.shopRate}
              min={1}
              step={1}
              onChange={(e) =>
                setData((p) => ({ ...p, shopRate: parseFloat(e.target.value) || 0 }))
              }
              style={S.inputNarrow}
            />
            <div style={S.hint}>Applied to all time stack rows unless a machine overrides it</div>
          </div>
        </div>

        {/* Margins */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Defaults</div>
          <div style={S.fieldGroup}>
            <label style={S.label}>Default Margin %</label>
            <input
              type="number"
              value={data.defaultMargin}
              min={0}
              max={95}
              step={1}
              onChange={(e) =>
                setData((p) => ({ ...p, defaultMargin: parseFloat(e.target.value) || 0 }))
              }
              style={S.inputNarrow}
            />
            <div style={S.hint}>Pre-fills the margin field on every new quote</div>
          </div>
        </div>

        {/* Machines */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Machines</div>
          <div style={{ ...S.hint, marginBottom: 14 }}>
            Each machine can have its own hourly rate. Select a machine per time stack row.
            Falls back to shop rate if none selected.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {data.machines.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--dim)", fontStyle: "italic", marginBottom: 12 }}>
                No machines added yet — using shop rate for all rows.
              </div>
            )}
            {data.machines.map((m, i) => (
              <div key={m.id} style={S.machineRow}>
                <input
                  type="text"
                  value={m.name}
                  placeholder="Machine name"
                  onChange={(e) => updateMachine(i, "name", e.target.value)}
                  style={{ flex: 1, fontSize: 14, padding: "6px 10px" }}
                />
                <span style={{ fontSize: 13, color: "var(--muted)" }}>$</span>
                <input
                  type="number"
                  value={m.rate}
                  min={1}
                  step={1}
                  onChange={(e) => updateMachine(i, "rate", e.target.value)}
                  style={{ width: 90, fontSize: 14, padding: "6px 8px" }}
                />
                <span style={{ fontSize: 12, color: "var(--dim)" }}>/hr</span>
                <button
                  style={S.btnDanger}
                  onClick={() => removeMachine(i)}
                  title="Remove machine"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button style={S.btnGhost} onClick={addMachine}>
            + Add Machine
          </button>
        </div>

        {/* Risk Engine Weights */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Risk Engine — Flag Weights</div>
          <div style={{ ...S.hint, marginBottom: 14 }}>
            Customize how much each risk flag affects pricing. Default weights shown.
            0–100%.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {RISK_FLAGS.map((f) => {
              const cur =
                data.riskWeights[f.key] !== undefined
                  ? data.riskWeights[f.key]
                  : Math.round(f.weight * 100);
              return (
                <div key={f.key} style={S.riskRow}>
                  <span style={S.riskLabel}>{f.label}</span>
                  <input
                    type="number"
                    value={cur}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(e) => updateRiskWeight(f.key, e.target.value)}
                    style={{ width: 70, textAlign: "center", fontSize: 14, padding: "4px 8px" }}
                  />
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Save */}
        <div style={S.saveRow}>
          <button style={S.btnAmber} onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
          {status === "saved" && <span style={S.savedMsg}>✓ SAVED</span>}
          {status === "error" && <span style={S.errorMsg}>Save failed — try again</span>}
        </div>
      </div>
    </div>
  );
}
