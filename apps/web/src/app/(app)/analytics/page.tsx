"use client";

import { format } from "date-fns";
import {
  Activity,
  ArrowUpRight,
  CircleDollarSign,
  CreditCard,
  ExternalLink,
  Hash,
  Layers,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/primitives";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import type { AnalyticsData } from "@/hooks";
import { useAnalytics } from "@/hooks";

function formatCost(value: string): string {
  const num = Number.parseFloat(value);
  if (num === 0) return "$0.00";
  if (num < 0.01) return `$${num.toFixed(6)}`;
  return `$${num.toFixed(4)}`;
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <Card className="border-border/40 bg-card/50">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="rounded-lg bg-accent/50 p-2.5">
            <Icon size={18} className="text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TokenBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{formatTokens(value)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-accent/50">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ModelBreakdownTable({
  models,
}: {
  models: AnalyticsData["modelBreakdown"];
}) {
  if (models.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No model usage data yet
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/40">
            <th className="pb-3 text-left text-xs font-medium text-muted-foreground">
              Model
            </th>
            <th className="pb-3 text-right text-xs font-medium text-muted-foreground">
              Requests
            </th>
            <th className="pb-3 text-right text-xs font-medium text-muted-foreground">
              Tokens
            </th>
            <th className="pb-3 text-right text-xs font-medium text-muted-foreground">
              Cost
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/20">
          {models.map((model) => (
            <tr key={model.model} className="group">
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[hsl(var(--chart-1))]" />
                  <span className="text-sm font-medium text-foreground">
                    {model.model}
                  </span>
                </div>
              </td>
              <td className="py-3 text-right font-mono text-sm text-muted-foreground">
                {model.requestCount}
              </td>
              <td className="py-3 text-right font-mono text-sm text-muted-foreground">
                {formatTokens(model.totalTokens)}
              </td>
              <td className="py-3 text-right font-mono text-sm text-foreground">
                {formatCost(model.totalCost)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentHistoryTable({
  payments,
}: {
  payments: AnalyticsData["payments"];
}) {
  if (payments.history.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No payment history yet
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/40">
            <th className="pb-3 text-left text-xs font-medium text-muted-foreground">
              Date
            </th>
            <th className="pb-3 text-right text-xs font-medium text-muted-foreground">
              Amount
            </th>
            <th className="pb-3 text-center text-xs font-medium text-muted-foreground">
              Status
            </th>
            <th className="pb-3 text-right text-xs font-medium text-muted-foreground">
              Tx Hash
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/20">
          {payments.history.map((payment) => (
            <tr key={payment.id}>
              <td className="py-3 text-sm text-muted-foreground">
                {format(new Date(payment.createdAt), "MMM d, yyyy HH:mm")}
              </td>
              <td className="py-3 text-right font-mono text-sm text-foreground">
                {formatCost(payment.amount)}
              </td>
              <td className="py-3 text-center">
                <Badge
                  variant={
                    payment.status === "SETTLED" ? "default" : "secondary"
                  }
                  className={
                    payment.status === "SETTLED"
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                  }
                >
                  {payment.status === "SETTLED" ? "Settled" : "Pending"}
                </Badge>
              </td>
              <td className="py-3 text-right">
                {payment.txHash ? (
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                    {payment.txHash.slice(0, 6)}...{payment.txHash.slice(-4)}
                    <ExternalLink size={12} />
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground/50">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data, isLoading, isError, refetch } = useAnalytics();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoadingState message="Loading analytics..." />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <ErrorState
          title="Failed to load analytics"
          message="Could not retrieve your usage data. Please try again."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const balance =
    Number.parseFloat(data.debt.totalSpent) -
    Number.parseFloat(data.payments.totalPaid);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
        {/* Page header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Your usage statistics and payment history
          </p>
        </div>

        {/* Overview stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Current Debt"
            value={formatCost(data.debt.currentDebt)}
            subtitle={`Threshold: ${formatCost(data.debt.paymentThreshold)}`}
            icon={CircleDollarSign}
          />
          <StatCard
            title="Total Spent"
            value={formatCost(data.debt.totalSpent)}
            icon={ArrowUpRight}
          />
          <StatCard
            title="Total Paid"
            value={formatCost(data.payments.totalPaid)}
            subtitle={
              balance > 0
                ? `Balance due: ${formatCost(balance.toString())}`
                : undefined
            }
            icon={CreditCard}
          />
          <StatCard
            title="Total Requests"
            value={data.usage.requestCount.toLocaleString()}
            icon={Activity}
          />
        </div>

        {/* Usage + Token breakdown */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Token usage */}
          <Card className="border-border/40 bg-card/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Zap size={16} className="text-muted-foreground" />
                Token Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  {formatTokens(data.usage.totalTokens)}
                </span>
                <span className="text-sm text-muted-foreground">
                  total tokens
                </span>
              </div>
              <TokenBar
                label="Prompt Tokens"
                value={data.usage.totalPromptTokens}
                total={data.usage.totalTokens}
                color="bg-[hsl(var(--chart-1))]"
              />
              <TokenBar
                label="Completion Tokens"
                value={data.usage.totalCompletionTokens}
                total={data.usage.totalTokens}
                color="bg-[hsl(var(--chart-2))]"
              />
              <div className="flex items-center justify-between rounded-lg bg-accent/30 px-3 py-2">
                <span className="text-xs text-muted-foreground">
                  Total Cost
                </span>
                <span className="font-mono text-sm font-semibold text-foreground">
                  {formatCost(data.usage.totalCost)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Model breakdown */}
          <Card className="border-border/40 bg-card/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Layers size={16} className="text-muted-foreground" />
                Model Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ModelBreakdownTable models={data.modelBreakdown} />
            </CardContent>
          </Card>
        </div>

        {/* Payment history */}
        <Card className="border-border/40 bg-card/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Hash size={16} className="text-muted-foreground" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentHistoryTable payments={data.payments} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
