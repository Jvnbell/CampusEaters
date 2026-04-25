'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Gauge,
  RefreshCw,
  Star,
  Timer,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentProfile } from '@/hooks/use-current-profile';
import type { DispatchResult, FleetAnalytics } from '@/types/db';

const WINDOW_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

const FLEET_COLORS: Record<string, string> = {
  IDLE: '#94a3b8',
  EN_ROUTE_PICKUP: '#facc15',
  AT_RESTAURANT: '#f59e0b',
  EN_ROUTE_DELIVERY: '#60a5fa',
  AT_DROPOFF: '#a78bfa',
  RETURNING: '#22d3ee',
  CHARGING: '#4ade80',
  OFFLINE: '#f87171',
  MAINTENANCE: '#fb923c',
};

const formatDuration = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes.toFixed(1)} min`;
  const hours = minutes / 60;
  return `${hours.toFixed(1)} h`;
};

const formatDay = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const AnalyticsDashboard = () => {
  const { profile, isLoading: profileLoading } = useCurrentProfile();
  const [windowDays, setWindowDays] = useState<string>('30');
  const [data, setData] = useState<FleetAnalytics | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [lastDispatch, setLastDispatch] = useState<DispatchResult | null>(null);

  const fetchAnalytics = useCallback(
    async (silent = false) => {
      if (!silent) setIsFetching(true);
      try {
        const response = await fetch(`/api/admin/analytics?days=${windowDays}&t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? 'Failed to load analytics');
        }
        const json = (await response.json()) as FleetAnalytics;
        setData(json);
      } catch (error) {
        console.error('[AnalyticsDashboard] fetch failed', error);
        toast.error(error instanceof Error ? error.message : 'Unable to load analytics.');
      } finally {
        if (!silent) setIsFetching(false);
      }
    },
    [windowDays],
  );

  useEffect(() => {
    if (!profile || profile.role !== 'ADMIN') return;
    void fetchAnalytics();
    const interval = window.setInterval(() => fetchAnalytics(true), 30_000);
    return () => window.clearInterval(interval);
  }, [profile, fetchAnalytics]);

  const handleDispatch = useCallback(async () => {
    setIsDispatching(true);
    try {
      const response = await fetch('/api/admin/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minBattery: 20 }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? 'Dispatch failed');
      }
      const result = (await response.json()) as DispatchResult;
      setLastDispatch(result);
      if (result.assigned === 0 && result.unassigned === 0) {
        toast.info('No pending orders to dispatch.');
      } else {
        toast.success(
          `Dispatched ${result.assigned} order${result.assigned === 1 ? '' : 's'}. ${
            result.unassigned
          } still waiting.`,
        );
      }
      await fetchAnalytics(true);
    } catch (error) {
      console.error('[AnalyticsDashboard] dispatch failed', error);
      toast.error(error instanceof Error ? error.message : 'Dispatch failed.');
    } finally {
      setIsDispatching(false);
    }
  }, [fetchAnalytics]);

  const totals = data?.totals;
  const percentiles = data?.percentiles;
  const daily = useMemo(() => data?.daily ?? [], [data]);
  const top = useMemo(() => data?.topRestaurants ?? [], [data]);
  const fleet = useMemo(() => data?.fleetStatus ?? [], [data]);

  const percentileBars = useMemo(() => {
    if (!percentiles) return [];
    return [
      { label: 'p50', value: percentiles.p50 ?? 0 },
      { label: 'p90', value: percentiles.p90 ?? 0 },
      { label: 'p95', value: percentiles.p95 ?? 0 },
      { label: 'p99', value: percentiles.p99 ?? 0 },
    ];
  }, [percentiles]);

  if (profileLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full bg-white/5" />
        <Skeleton className="h-80 w-full bg-white/5" />
      </div>
    );
  }

  if (!profile || profile.role !== 'ADMIN') {
    return (
      <Card className="glass-panel-strong border-warning/20">
        <CardHeader>
          <CardTitle className="text-warning">Admin access required</CardTitle>
          <CardDescription className="text-warning/80">
            Only administrators can view fleet analytics.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">Fleet analytics</h2>
          <p className="text-sm text-muted-foreground">
            Live SQL view of throughput, delivery-time percentiles, and dispatcher health.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={windowDays} onValueChange={setWindowDays}>
            <SelectTrigger className="w-[160px] rounded-full border-white/10 bg-white/[0.04] text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WINDOW_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-white/10 bg-white/[0.03] text-foreground hover:bg-white/[0.07]"
            onClick={() => fetchAnalytics()}
            disabled={isFetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            className="btn-aurora rounded-full font-semibold"
            onClick={handleDispatch}
            disabled={isDispatching}
          >
            <Zap className={`mr-2 h-4 w-4 ${isDispatching ? 'animate-pulse' : ''}`} />
            {isDispatching ? 'Dispatching…' : 'Run dispatcher'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Orders placed"
          value={totals?.ordersPlaced ?? 0}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Orders delivered"
          value={totals?.ordersDelivered ?? 0}
          icon={<Activity className="h-5 w-5" />}
          accent="text-secondary"
        />
        <StatCard
          label="Avg delivery"
          value={formatDuration(totals?.avgDeliverySeconds ?? null)}
          icon={<Timer className="h-5 w-5" />}
          accent="text-primary"
        />
        <StatCard
          label="Active bots"
          value={totals?.activeBots ?? 0}
          icon={<Gauge className="h-5 w-5" />}
          accent="text-success"
        />
      </div>

      {lastDispatch && lastDispatch.assignments.length > 0 ? (
        <Card className="glass-panel border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Zap className="h-4 w-4 text-primary" /> Last dispatch cycle
            </CardTitle>
            <CardDescription>
              Considered {lastDispatch.consideredOrders} order
              {lastDispatch.consideredOrders === 1 ? '' : 's'} · Assigned{' '}
              <span className="font-semibold text-foreground">{lastDispatch.assigned}</span> ·
              Still unassigned{' '}
              <span className="font-semibold text-foreground">{lastDispatch.unassigned}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {lastDispatch.assignments.slice(0, 5).map((a) => (
              <div
                key={a.orderId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2"
              >
                <span className="font-mono text-xs text-muted-foreground">#{a.orderNumber}</span>
                <span className="text-foreground">{a.botName}</span>
                <span className="text-xs text-muted-foreground">
                  score {a.score.toFixed(2)} · battery {a.battery ?? '—'}%
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass-panel border-0 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <BarChart3 className="h-4 w-4 text-primary" /> Daily throughput
            </CardTitle>
            <CardDescription>
              Orders placed vs. delivered over the last {data?.windowDays ?? windowDays} days.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="placedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="deliveredFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickFormatter={formatDay}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickMargin={8}
                />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    color: '#e2e8f0',
                    fontSize: 12,
                  }}
                  labelFormatter={(label) => formatDay(String(label))}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#cbd5f5' }} />
                <Area
                  type="monotone"
                  dataKey="ordersPlaced"
                  name="Placed"
                  stroke="#60a5fa"
                  fill="url(#placedFill)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="ordersDelivered"
                  name="Delivered"
                  stroke="#4ade80"
                  fill="url(#deliveredFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-panel border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Timer className="h-4 w-4 text-primary" /> Delivery-time percentiles
            </CardTitle>
            <CardDescription>
              Computed with <code className="text-xs text-foreground/80">PERCENTILE_CONT</code> over{' '}
              {percentiles?.samples ?? 0} deliveries.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={percentileBars} margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(v) => formatDuration(Number(v))}
                />
                <Tooltip
                  formatter={(value: number) => formatDuration(value)}
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    color: '#e2e8f0',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {percentileBars.map((entry, index) => (
                    <Cell
                      key={entry.label}
                      fill={['#60a5fa', '#a78bfa', '#f59e0b', '#f87171'][index] ?? '#60a5fa'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass-panel border-0 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Timer className="h-4 w-4 text-primary" /> Average delivery time (daily)
            </CardTitle>
            <CardDescription>Mean time from placed to delivered, per day.</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily} margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickFormatter={formatDay}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickMargin={8}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(v) => formatDuration(Number(v))}
                />
                <Tooltip
                  formatter={(value: number) => formatDuration(value)}
                  labelFormatter={(label) => formatDay(String(label))}
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    color: '#e2e8f0',
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="avgDeliverySeconds"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-panel border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Gauge className="h-4 w-4 text-primary" /> Fleet state
            </CardTitle>
            <CardDescription>Real-time distribution of bot statuses.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {fleet.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bots registered.</p>
            ) : (
              fleet.map((row) => (
                <div
                  key={row.status}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2 text-foreground">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: FLEET_COLORS[row.status] ?? '#94a3b8' }}
                    />
                    {row.status.replace(/_/g, ' ').toLowerCase()}
                  </span>
                  <Badge className="rounded-full border-0 bg-white/[0.06] text-xs text-muted-foreground">
                    {row.count}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Star className="h-4 w-4 text-primary" /> Top restaurants by completed orders
          </CardTitle>
          <CardDescription>
            Joined against <code className="text-xs text-foreground/80">restaurant_ratings</code>{' '}
            for live average rating.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {top.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed deliveries yet.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {top.slice(0, 10).map((row, idx) => (
                <div
                  key={row.restaurantId}
                  className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 py-3 text-sm"
                >
                  <span className="w-6 font-mono text-xs text-muted-foreground">#{idx + 1}</span>
                  <span className="truncate text-foreground">{row.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.avgRating.toFixed(2)} ★ ({row.reviewCount})
                  </span>
                  <Badge className="rounded-full border-0 bg-white/[0.06] text-xs text-muted-foreground">
                    {row.orders} orders
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {data ? (
        <p className="text-right text-[11px] text-muted-foreground">
          Updated {new Date(data.generatedAt).toLocaleTimeString()}
        </p>
      ) : null}
    </div>
  );
};

const StatCard = ({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent?: string;
}) => (
  <Card className="glass-panel border-0">
    <CardContent className="flex items-center justify-between p-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">{label}</p>
        <p className={`font-display text-3xl font-semibold ${accent ?? 'text-foreground'}`}>
          {value}
        </p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-foreground">
        {icon}
      </div>
    </CardContent>
  </Card>
);
