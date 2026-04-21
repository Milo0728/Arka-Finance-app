"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "./page-skeleton";

export const CashflowChart = dynamic(
  () => import("./charts").then((m) => m.CashflowChart),
  { ssr: false, loading: () => <ChartSkeleton height={280} /> }
);

export const SavingsTrendChart = dynamic(
  () => import("./charts").then((m) => m.SavingsTrendChart),
  { ssr: false, loading: () => <ChartSkeleton height={220} /> }
);

export const CategoryPieChart = dynamic(
  () => import("./charts").then((m) => m.CategoryPieChart),
  { ssr: false, loading: () => <ChartSkeleton height={240} /> }
);
