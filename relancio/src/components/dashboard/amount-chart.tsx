"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatCents, formatCentsCompact } from "@/lib/domain/money";

const config = { acceptedAmountCents: { label: "Montant accepté HT", color: "var(--chart-1)" } } satisfies ChartConfig;

export function AmountChart({ data }: { data: { label: string; acceptedAmountCents: number }[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-[240px] w-full">
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }} accessibilityLayer>
        <defs>
          <linearGradient id="fillAmount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-acceptedAmountCents)" stopOpacity={0.18} />
            <stop offset="95%" stopColor="var(--color-acceptedAmountCents)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => formatCentsCompact(v)} />
        <ChartTooltip
          cursor={{ stroke: "var(--border)" }}
          content={<ChartTooltipContent formatter={(value) => <span className="font-medium tabular-nums">{formatCents(Number(value))}</span>} />}
        />
        <Area dataKey="acceptedAmountCents" type="monotone" stroke="var(--color-acceptedAmountCents)" strokeWidth={2} fill="url(#fillAmount)" dot={{ r: 3, strokeWidth: 2, fill: "var(--card)" }} />
      </AreaChart>
    </ChartContainer>
  );
}
