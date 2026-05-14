import type { Metadata } from "next";
import { Barlow_Condensed, DM_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "CutSheet — Shop Estimating & Intelligence",
  description: "Job quoting and shop intelligence for CNC machine shops.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${barlowCondensed.variable} ${dmMono.variable}`} style={{ height: "100%" }}>
        <body style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
