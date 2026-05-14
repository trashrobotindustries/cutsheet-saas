"use client";

import { usePathname } from "next/navigation";
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";

const TABS = [
  { label: "Quote",     href: "/dashboard" },
  { label: "History",   href: "/history" },
  { label: "Customers", href: "/customers" },
  { label: "Suppliers", href: "/suppliers" },
  { label: "Vendors",   href: "/vendors" },
  { label: "Settings",  href: "/settings" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {/* TOPBAR */}
      <div style={{
        display: "flex", alignItems: "center",
        background: "var(--surf)", borderBottom: "2px solid var(--steel-dim)",
        height: 56, flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          padding: "0 24px",
          fontFamily: "var(--font-barlow), sans-serif",
          fontSize: 26, fontWeight: 700, letterSpacing: 2,
          color: "var(--amber)", whiteSpace: "nowrap",
          borderRight: "1px solid var(--border)",
          height: "100%", display: "flex", alignItems: "center", gap: 10,
        }}>
          CUTSHEET
          <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 13, letterSpacing: 1 }}>
            Pro
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", height: "100%", flex: 1 }}>
          {TABS.map((tab) => {
            const isActive = tab.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(tab.href);
            return (
              <a
                key={tab.href}
                href={tab.href}
                style={{
                  padding: "0 24px",
                  fontFamily: "var(--font-barlow), sans-serif",
                  fontSize: 17, fontWeight: 600, letterSpacing: 1,
                  color: isActive ? "var(--amber)" : "var(--muted)",
                  textDecoration: "none",
                  borderBottom: isActive ? "3px solid var(--amber)" : "3px solid transparent",
                  borderRight: "1px solid var(--border)",
                  display: "flex", alignItems: "center",
                  whiteSpace: "nowrap",
                  background: isActive ? "var(--surf-hi)" : "none",
                  transition: "all .15s",
                }}
              >
                {tab.label}
              </a>
            );
          })}
        </div>

        {/* Right: org switcher + user button */}
        <div style={{
          padding: "0 20px",
          marginLeft: "auto",
          borderLeft: "1px solid var(--border)",
          height: "100%",
          display: "flex", alignItems: "center", gap: 16,
          flexShrink: 0,
        }}>
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/dashboard"
            afterSelectOrganizationUrl="/dashboard"
          />
          <UserButton />
        </div>
      </div>

      {/* PAGE CONTENT */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {children}
      </div>
    </div>
  );
}
