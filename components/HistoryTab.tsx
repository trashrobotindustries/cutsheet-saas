"use client";

import { useEffect, useState, useCallback } from "react";
import { Job } from "@/db/schema";

interface HistoryTabProps {
  onLoad: (job: Job) => void;
  onNew: () => void;
  /** Refresh token — increment to trigger a re-fetch */
  refreshToken?: number;
}

type SortKey = "pn" | "customer" | "qty" | "sellPc" | "date" | "status";
type SortDir = "asc" | "desc";

const STATUS_COLOR: Record<string, string> = {
  draft: "var(--muted)",
  quoted: "var(--steel)",
  won: "var(--green)",
  lost: "var(--red)",
  archived: "var(--dim)",
};

const S = {
  page: {
    display: "flex",
    flexDirection: "column" as const,
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "14px 24px",
    background: "var(--surf)",
    borderBottom: "1px solid var(--border)",
    flexShrink: 0,
    flexWrap: "wrap" as const,
  },
  toolbarTitle: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 1,
    color: "var(--text)",
  },
  searchInput: {
    fontSize: 14,
    padding: "6px 12px",
    width: 280,
  },
  filterBtn: (active: boolean): React.CSSProperties => ({
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 1,
    padding: "5px 14px",
    background: active ? "rgba(92,143,181,.15)" : "none",
    border: `1px solid ${active ? "var(--steel)" : "var(--border)"}`,
    color: active ? "var(--steel)" : "var(--muted)",
    borderRadius: 3,
    cursor: "pointer",
  }),
  newBtn: {
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: 1,
    padding: "8px 20px",
    background: "var(--amber)",
    border: "none",
    color: "#000",
    borderRadius: 3,
    cursor: "pointer",
    marginLeft: "auto",
  },
  count: {
    fontSize: 13,
    color: "var(--muted)",
    whiteSpace: "nowrap" as const,
  },
  tableWrap: {
    flex: 1,
    overflowY: "auto" as const,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
  },
  th: (sortable: boolean): React.CSSProperties => ({
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 2,
    color: "var(--muted)",
    textAlign: "left",
    padding: "10px 18px",
    borderBottom: "2px solid var(--border)",
    background: "var(--surf)",
    cursor: sortable ? "pointer" : "default",
    userSelect: "none",
    whiteSpace: "nowrap" as const,
    position: "sticky" as const,
    top: 0,
  }),
  thRight: (sortable: boolean): React.CSSProperties => ({
    fontFamily: "var(--font-barlow), sans-serif",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 2,
    color: "var(--muted)",
    textAlign: "right",
    padding: "10px 18px",
    borderBottom: "2px solid var(--border)",
    background: "var(--surf)",
    cursor: sortable ? "pointer" : "default",
    userSelect: "none",
    whiteSpace: "nowrap" as const,
    position: "sticky" as const,
    top: 0,
  }),
  tr: (): React.CSSProperties => ({
    cursor: "pointer",
    borderBottom: "1px solid var(--border)",
    transition: "background .1s",
  }),
  td: {
    padding: "10px 18px",
    fontSize: 14,
    color: "var(--text)",
  },
  tdRight: {
    padding: "10px 18px",
    fontSize: 14,
    color: "var(--text)",
    textAlign: "right" as const,
  },
  tdPn: {
    padding: "10px 18px",
    fontSize: 15,
    fontFamily: "var(--font-barlow), sans-serif",
    fontWeight: 700,
    color: "var(--amber)",
    letterSpacing: 0.5,
    whiteSpace: "nowrap" as const,
  },
  emptyRow: {
    padding: "40px 18px",
    textAlign: "center" as const,
    color: "var(--dim)",
    fontStyle: "italic" as const,
    fontSize: 14,
  },
};

export default function HistoryTab({ onLoad, onNew, refreshToken }: HistoryTabProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "date",
    dir: "desc",
  });

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs, refreshToken]);

  const setSort2 = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "date" ? "desc" : "asc" }
    );
  };

  const getQty = (job: Job): number => {
    const qtys = job.quantities as number[];
    return Array.isArray(qtys) && qtys.length > 0 ? qtys[0] : 1;
  };

  const getSellPc = (job: Job): number | null => {
    const r = job.results as { sellPc?: number };
    return r?.sellPc ?? null;
  };

  const filtered = jobs
    .filter((j) => {
      if (statusFilter !== "all" && j.status !== statusFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        j.partNumber?.toLowerCase().includes(q) ||
        j.partName?.toLowerCase().includes(q) ||
        j.jobNumber?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "pn") {
        return dir * (a.partNumber ?? "").localeCompare(b.partNumber ?? "");
      }
      if (sort.key === "qty") return dir * (getQty(a) - getQty(b));
      if (sort.key === "sellPc") {
        return dir * ((getSellPc(a) ?? 0) - (getSellPc(b) ?? 0));
      }
      if (sort.key === "date") {
        return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
      if (sort.key === "status") {
        return dir * a.status.localeCompare(b.status);
      }
      return 0;
    });

  const arrow = (key: SortKey) =>
    sort.key === key ? (sort.dir === "asc" ? " ↑" : " ↓") : " ↕";

  return (
    <div style={S.page}>
      <div style={S.toolbar}>
        <span style={S.toolbarTitle}>Job History</span>
        <input
          type="text"
          style={S.searchInput}
          placeholder="Search part number, description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {(["all", "draft", "quoted", "won", "lost"] as const).map((f) => (
          <button
            key={f}
            style={S.filterBtn(statusFilter === f)}
            onClick={() => setStatusFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span style={S.count}>{filtered.length} job{filtered.length !== 1 ? "s" : ""}</span>
        <button style={S.newBtn} onClick={onNew}>
          + New Quote
        </button>
      </div>

      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th(true)} onClick={() => setSort2("pn")}>
                PART NO.{arrow("pn")}
              </th>
              <th style={S.th(false)}>REV</th>
              <th style={S.th(false)}>CUSTOMER</th>
              <th style={S.thRight(true)} onClick={() => setSort2("qty")}>
                PRIMARY QTY{arrow("qty")}
              </th>
              <th style={S.thRight(true)} onClick={() => setSort2("sellPc")}>
                SELL / PC{arrow("sellPc")}
              </th>
              <th style={S.thRight(true)} onClick={() => setSort2("date")}>
                DATE{arrow("date")}
              </th>
              <th style={S.th(true)} onClick={() => setSort2("status")}>
                STATUS{arrow("status")}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} style={S.emptyRow}>Loading...</td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={S.emptyRow}>
                  {search || statusFilter !== "all"
                    ? "No matching jobs"
                    : "No jobs yet — create your first quote"}
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((job) => {
                const sellPc = getSellPc(job);
                return (
                  <tr
                    key={job.id}
                    style={S.tr()}
                    onClick={() => onLoad(job)}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background =
                        "var(--surf-hi)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background = "";
                    }}
                  >
                    <td style={S.tdPn}>{job.partNumber || job.jobNumber}</td>
                    <td style={{ ...S.td, color: "var(--muted)" }}>
                      {job.revision || "—"}
                    </td>
                    <td style={S.td}>{job.customerId ? "—" : "—"}</td>
                    <td style={S.tdRight}>{getQty(job)}</td>
                    <td style={{ ...S.tdRight, color: "var(--amber)", fontWeight: 500 }}>
                      {sellPc != null ? `$${sellPc.toFixed(2)}` : "—"}
                    </td>
                    <td style={{ ...S.tdRight, color: "var(--muted)" }}>
                      {new Date(job.createdAt).toLocaleDateString()}
                    </td>
                    <td style={S.td}>
                      <span
                        style={{
                          fontFamily: "var(--font-barlow), sans-serif",
                          fontSize: 13,
                          fontWeight: 700,
                          letterSpacing: 1,
                          textTransform: "uppercase",
                          color: STATUS_COLOR[job.status] ?? "var(--muted)",
                        }}
                      >
                        {job.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
