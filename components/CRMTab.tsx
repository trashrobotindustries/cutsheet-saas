"use client";

import { useEffect, useState, useCallback } from "react";

export interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "email" | "tel" | "textarea";
  placeholder?: string;
}

interface CRMTabProps {
  entity: "customers" | "suppliers" | "vendors";
  fields: FieldDef[];
}

type CRMRecord = { id: string; name: string; [key: string]: unknown };

const S = {
  container: {
    display: "flex",
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  sidebar: {
    width: 260,
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
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 0.5,
    color: "var(--text)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  searchWrap: {
    padding: "10px 12px",
    borderBottom: "1px solid var(--border)",
  },
  searchInput: {
    width: "100%",
    fontSize: 13,
    padding: "6px 10px",
  },
  list: {
    flex: 1,
    overflowY: "auto" as const,
  },
  listItem: (active: boolean): React.CSSProperties => ({
    padding: "12px 16px",
    cursor: "pointer",
    borderLeft: `3px solid ${active ? "var(--amber)" : "transparent"}`,
    background: active ? "var(--surf-hi)" : "none",
    borderBottom: "1px solid rgba(37,48,64,.5)",
    transition: "all .12s",
  }),
  itemName: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 16,
    fontWeight: 700,
    color: "var(--amber)",
    letterSpacing: 0.5,
  },
  itemSub: {
    fontSize: 12,
    color: "var(--muted)",
    marginTop: 2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  main: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column" as const,
  },
  emptyState: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--dim)",
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 20,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
  },
  detail: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "28px 36px",
    maxWidth: 640,
  },
  detailHeader: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 24,
    fontWeight: 700,
    color: "var(--text)",
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  fieldGroup: {
    marginBottom: 18,
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  },
  label: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 2,
    color: "var(--muted)",
    textTransform: "uppercase" as const,
  },
  actions: {
    display: "flex",
    gap: 10,
    marginTop: 8,
    paddingTop: 20,
    borderTop: "1px solid var(--border)",
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
  btnGhost: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: 1,
    padding: "8px 18px",
    background: "none",
    border: "1px solid var(--border)",
    color: "var(--muted)",
    borderRadius: 3,
    cursor: "pointer",
  },
  btnDanger: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: 1,
    padding: "8px 18px",
    background: "none",
    border: "1px solid var(--red)",
    color: "var(--red)",
    borderRadius: 3,
    cursor: "pointer",
    marginLeft: "auto",
  },
  newBtn: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 1,
    padding: "4px 12px",
    background: "none",
    border: "1px solid var(--border)",
    color: "var(--muted)",
    borderRadius: 3,
    cursor: "pointer",
  },
  savedMsg: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 1,
    color: "var(--green)",
    padding: "6px 0",
  },
  errorMsg: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 13,
    color: "var(--red)",
    padding: "6px 0",
  },
};

function blankRecord(fields: FieldDef[]): CRMRecord {
  const r: CRMRecord = { id: "", name: "" };
  fields.forEach((f) => { r[f.key] = ""; });
  return r;
}

export default function CRMTab({ entity, fields }: CRMTabProps) {
  const [records, setRecords] = useState<CRMRecord[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CRMRecord | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [loading, setLoading] = useState(true);

  const entityLabel =
    entity === "customers"
      ? "Customer"
      : entity === "suppliers"
      ? "Supplier"
      : "Vendor";

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch(`/api/${entity}`);
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [entity]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filtered = records.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectRecord = (r: CRMRecord) => {
    setSelectedId(r.id);
    setDraft({ ...r });
    setIsNew(false);
    setStatus("idle");
  };

  const startNew = () => {
    const blank = blankRecord(fields);
    setSelectedId(null);
    setDraft(blank);
    setIsNew(true);
    setStatus("idle");
  };

  const setField = (key: string, val: string) => {
    setDraft((prev) => (prev ? { ...prev, [key]: val } : prev));
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setStatus("idle");
    try {
      let res: Response;
      if (isNew) {
        res = await fetch(`/api/${entity}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
      } else {
        res = await fetch(`/api/${entity}/${selectedId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
      }
      if (!res.ok) throw new Error("Save failed");
      const saved = await res.json();
      if (isNew) {
        setRecords((prev) => [saved, ...prev]);
        setSelectedId(saved.id);
        setDraft(saved);
        setIsNew(false);
      } else {
        setRecords((prev) =>
          prev.map((r) => (r.id === saved.id ? saved : r))
        );
        setDraft(saved);
      }
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async () => {
    if (!selectedId || isNew) return;
    if (!confirm(`Delete this ${entityLabel.toLowerCase()}? This cannot be undone.`)) return;
    try {
      await fetch(`/api/${entity}/${selectedId}`, { method: "DELETE" });
      setRecords((prev) => prev.filter((r) => r.id !== selectedId));
      setSelectedId(null);
      setDraft(null);
      setIsNew(false);
    } catch {
      alert("Delete failed");
    }
  };

  const getSubLine = (r: CRMRecord): string => {
    const contact = r.contact as string | undefined;
    const email = r.email as string | undefined;
    return contact || email || "";
  };

  return (
    <div style={S.container}>
      {/* Sidebar */}
      <div style={S.sidebar}>
        <div style={S.sidebarHeader}>
          {entity.charAt(0).toUpperCase() + entity.slice(1)}
          <button style={S.newBtn} onClick={startNew}>
            + New
          </button>
        </div>
        <div style={S.searchWrap}>
          <input
            type="text"
            style={S.searchInput}
            placeholder={`Search ${entity}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={S.list}>
          {loading && (
            <div style={{ padding: 16, fontSize: 13, color: "var(--dim)" }}>
              Loading...
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: 16, fontSize: 13, color: "var(--dim)", fontStyle: "italic" }}>
              {search ? "No matches" : `No ${entity} yet`}
            </div>
          )}
          {filtered.map((r) => (
            <div
              key={r.id}
              style={S.listItem(r.id === selectedId)}
              onClick={() => selectRecord(r)}
            >
              <div style={S.itemName}>{r.name || "—"}</div>
              {getSubLine(r) && (
                <div style={S.itemSub}>{getSubLine(r)}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main panel */}
      <div style={S.main}>
        {!draft ? (
          <div style={S.emptyState}>
            Select a {entityLabel.toLowerCase()}
          </div>
        ) : (
          <div style={S.detail}>
            <div style={S.detailHeader}>
              {isNew ? `New ${entityLabel}` : draft.name || entityLabel}
            </div>

            {fields.map((f) => (
              <div key={f.key} style={S.fieldGroup}>
                <label style={S.label}>{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea
                    value={(draft[f.key] as string) ?? ""}
                    placeholder={f.placeholder ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    style={{ minHeight: 80, fontSize: 14 }}
                  />
                ) : (
                  <input
                    type={f.type ?? "text"}
                    value={(draft[f.key] as string) ?? ""}
                    placeholder={f.placeholder ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    style={{ maxWidth: 400, fontSize: 15 }}
                  />
                )}
              </div>
            ))}

            {status === "saved" && (
              <div style={S.savedMsg}>✓ SAVED</div>
            )}
            {status === "error" && (
              <div style={S.errorMsg}>Save failed — try again</div>
            )}

            <div style={S.actions}>
              <button style={S.btnAmber} onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                style={S.btnGhost}
                onClick={() => {
                  setDraft(null);
                  setSelectedId(null);
                  setIsNew(false);
                  setStatus("idle");
                }}
              >
                Cancel
              </button>
              {!isNew && (
                <button style={S.btnDanger} onClick={deleteRecord}>
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
