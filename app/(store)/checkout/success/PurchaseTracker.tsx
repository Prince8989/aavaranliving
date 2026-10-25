"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

export function PurchaseTracker({ currency, value }: { currency: string; value: number }) {
  useEffect(() => {
    track("purchase", { currency, value });
  }, [currency, value]);
  return null;
}
