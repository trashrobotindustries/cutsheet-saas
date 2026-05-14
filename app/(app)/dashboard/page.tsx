"use client";

import { useEffect, useState } from "react";
import QuoteForm from "@/components/QuoteForm";
import { Job } from "@/db/schema";

export default function DashboardPage() {
  const [initialJob, setInitialJob] = useState<Job | null | undefined>(undefined);

  useEffect(() => {
    const stored = sessionStorage.getItem("cutsheet_load_job");
    if (stored) {
      try {
        setInitialJob(JSON.parse(stored) as Job);
        sessionStorage.removeItem("cutsheet_load_job");
      } catch {
        setInitialJob(null);
      }
    } else {
      setInitialJob(null);
    }
  }, []);

  // Wait until we've checked sessionStorage before rendering
  if (initialJob === undefined) return null;

  return <QuoteForm initialJob={initialJob} />;
}
