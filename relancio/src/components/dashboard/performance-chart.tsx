"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const config = {
  sent: { label: "Devis envoyés", color: "var(--chart-2)" },
  accepted: { label: "Devis acceptés", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function PerformanceChart({ data }: { data: { label: string; sent: number; accepted: number }[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-[240px] w-full">
      <BarChart data={data} barGap={2} margin={{ left: -16, right: 4, top: 8 }} accessibilityLayer>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
        <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="sent" fill="var(--color-sent)" radius={[4, 4, 0, 0]} maxBarSize={22} />
        <Bar dataKey="accepted" fill="var(--color-accepted)" radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ChartContainer>
  );
}
