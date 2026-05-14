"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import HistoryTab from "@/components/HistoryTab";
import { Job } from "@/db/schema";

export default function HistoryPage() {
  const router = useRouter();
  const [, setSelectedJob] = useState<Job | null>(null);

  const handleLoad = (job: Job) => {
    setSelectedJob(job);
    // Store job ID in sessionStorage so QuoteForm can pick it up
    sessionStorage.setItem("cutsheet_load_job", JSON.stringify(job));
    router.push("/dashboard");
  };

  const handleNew = () => {
    sessionStorage.removeItem("cutsheet_load_job");
    router.push("/dashboard");
  };

  return <HistoryTab onLoad={handleLoad} onNew={handleNew} />;
}
