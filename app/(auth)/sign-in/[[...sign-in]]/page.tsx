import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)", flexDirection: "column", gap: 32,
    }}>
      <div style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 32, fontWeight: 900, letterSpacing: 3, color: "var(--amber)" }}>
        CUTSHEET
        <span style={{ fontSize: 14, fontWeight: 400, color: "var(--muted)", letterSpacing: 1, marginLeft: 10 }}>
          by CutSweet
        </span>
      </div>
      <SignIn />
    </div>
  );
}
