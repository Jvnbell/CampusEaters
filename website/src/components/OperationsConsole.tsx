'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Battery,
  BatteryCharging,
  BatteryLow,
  CheckCircle2,
  Hammer,
  MapPin,
  Package,
  Pause,
  PlugZap,
  RefreshCw,
  Truck,
  Wifi,
  WifiOff,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentProfile } from '@/hooks/use-current-profile';
import { BOT_STATUSES, type BotStatus, type BotWithCurrentOrder } from '@/types/db';

const STATUS_LABEL: Record<BotStatus, string> = {
  IDLE: 'Idle',
  EN_ROUTE_PICKUP: 'En route — pickup',
  AT_RESTAURANT: 'At restaurant',
  EN_ROUTE_DELIVERY: 'En route — dropoff',
  AT_DROPOFF: 'At dropoff',
  RETURNING: 'Returning to base',
  CHARGING: 'Charging',
  OFFLINE: 'Offline',
  MAINTENANCE: 'Maintenance',
};

const STATUS_BADGE: Record<BotStatus, string> = {
  IDLE: 'bg-slate-700 text-slate-100',
  EN_ROUTE_PICKUP: 'bg-amber-500 text-slate-950',
  AT_RESTAURANT: 'bg-amber-400 text-slate-950',
  EN_ROUTE_DELIVERY: 'bg-blue-500 text-white',
  AT_DROPOFF: 'bg-indigo-500 text-white',
  RETURNING: 'bg-cyan-500 text-slate-950',
  CHARGING: 'bg-emerald-600 text-white',
  OFFLINE: 'bg-red-600 text-white',
  MAINTENANCE: 'bg-orange-600 text-white',
};

const STATUS_ICON: Record<BotStatus, JSX.Element> = {
  IDLE: <Pause className="h-4 w-4" />,
  EN_ROUTE_PICKUP: <Truck className="h-4 w-4" />,
  AT_RESTAURANT: <Package className="h-4 w-4" />,
  EN_ROUTE_DELIVERY: <Truck className="h-4 w-4" />,
  AT_DROPOFF: <Package className="h-4 w-4" />,
  RETURNING: <Truck className="h-4 w-4" />,
  CHARGING: <PlugZap className="h-4 w-4" />,
  OFFLINE: <WifiOff className="h-4 w-4" />,
  MAINTENANCE: <Hammer className="h-4 w-4" />,
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  SENT: 'Order received',
  RECEIVED: 'Preparing',
  SHIPPING: 'Out for delivery',
  DELIVERED: 'Delivered',
};

const formatRelative = (iso: string | null): string => {
  if (!iso) return 'never';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs)) return 'unknown';
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const BatteryIndicator = ({
  level,
  charging,
}: {
  level: number | null;
  charging: boolean;
}) => {
  if (level === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
        <Battery className="h-4 w-4" /> n/a
      </span>
    );
  }
  const Icon = charging ? BatteryCharging : level <= 20 ? BatteryLow : Battery;
  const color =
    charging || level > 50
      ? 'text-emerald-400'
      : level > 20
        ? 'text-amber-400'
        : 'text-red-400';
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${color}`}>
      <Icon className="h-4 w-4" /> {level}%
    </span>
  );
};

export const OperationsConsole = () => {
  const { profile, isLoading: profileLoading } = useCurrentProfile();
  const [bots, setBots] = useState<BotWithCurrentOrder[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [updatingBotId, setUpdatingBotId] = useState<string | null>(null);
  const [locationDrafts, setLocationDrafts] = useState<Record<string, string>>({});
  const [batteryDrafts, setBatteryDrafts] = useState<Record<string, string>>({});

  const fetchBots = useCallback(async () => {
    setIsFetching(true);
    try {
      const response = await fetch(`/api/bots?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to load bots.');
      }
      const data = (await response.json()) as { bots: BotWithCurrentOrder[] };
      setBots(data.bots);
    } catch (error) {
      console.error('[OperationsConsole] fetch failed', error);
      toast.error(error instanceof Error ? error.message : 'Unable to load bots.');
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!profile || profile.role !== 'ADMIN') return;
    void fetchBots();
    const interval = window.setInterval(fetchBots, 15_000);
    return () => window.clearInterval(interval);
  }, [profile, fetchBots]);

  const counts = useMemo(() => {
    const total = bots.length;
    const active = bots.filter((b) => b.currentOrder).length;
    const offline = bots.filter((b) => b.status === 'OFFLINE').length;
    const charging = bots.filter((b) => b.status === 'CHARGING').length;
    return { total, active, offline, charging };
  }, [bots]);

  const patchBot = async (
    botId: string,
    update: { status?: BotStatus; currentLocation?: string; batteryLevel?: number | null },
  ) => {
    setUpdatingBotId(botId);
    try {
      const response = await fetch(`/api/bots/${botId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to update bot.');
      }
      toast.success('Bot updated.');
      await fetchBots();
    } catch (error) {
      console.error('[OperationsConsole] patch failed', error);
      toast.error(error instanceof Error ? error.message : 'Unable to update bot.');
    } finally {
      setUpdatingBotId(null);
    }
  };

  if (profileLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!profile || profile.role !== 'ADMIN') {
    return (
      <Card className="border border-amber-500/30 bg-amber-500/10">
        <CardHeader>
          <CardTitle className="text-amber-100">Operations access required</CardTitle>
          <CardDescription className="text-amber-200/80">
            Only administrators can view the bot fleet. From the website folder, run{' '}
            <code className="rounded bg-slate-900/60 px-1 py-0.5 text-xs">
              GRANT_EMAIL=&lt;your email&gt; npm run script:grant-admin
            </code>{' '}
            to promote your account.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryStat label="Total bots" value={counts.total} icon={<Wifi className="h-5 w-5" />} />
        <SummaryStat
          label="On a delivery"
          value={counts.active}
          icon={<Truck className="h-5 w-5" />}
          accent="text-blue-300"
        />
        <SummaryStat
          label="Charging"
          value={counts.charging}
          icon={<PlugZap className="h-5 w-5" />}
          accent="text-emerald-300"
        />
        <SummaryStat
          label="Offline"
          value={counts.offline}
          icon={<WifiOff className="h-5 w-5" />}
          accent="text-red-300"
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Fleet status</h2>
          <p className="text-sm text-slate-400">
            Auto-refreshing every 15 seconds. Update status and location as bots move.
          </p>
        </div>
        <Button
          variant="outline"
          className="border-slate-700 text-slate-100"
          onClick={fetchBots}
          disabled={isFetching}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {bots.length === 0 ? (
        <Card className="border border-slate-800/60 bg-slate-900/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" /> No bots registered
            </CardTitle>
            <CardDescription className="text-slate-300">
              From the website folder, run{' '}
              <code className="rounded bg-slate-900/60 px-1 py-0.5 text-xs">
                npm run db:seed:bots
              </code>{' '}
              to insert three demo robots.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {bots.map((bot) => {
            const locationDraft = locationDrafts[bot.id] ?? bot.currentLocation;
            const batteryDraft =
              batteryDrafts[bot.id] ?? (bot.batteryLevel === null ? '' : String(bot.batteryLevel));

            return (
              <Card
                key={bot.id}
                className="border border-slate-800/60 bg-slate-900/70 shadow-lg shadow-blue-500/10"
              >
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-white">{bot.name}</CardTitle>
                      <Badge className={STATUS_BADGE[bot.status]}>
                        <span className="inline-flex items-center gap-1">
                          {STATUS_ICON[bot.status]} {STATUS_LABEL[bot.status]}
                        </span>
                      </Badge>
                    </div>
                    <BatteryIndicator
                      level={bot.batteryLevel}
                      charging={bot.status === 'CHARGING'}
                    />
                  </div>
                  <CardDescription className="flex flex-wrap items-center gap-3 text-slate-300">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-slate-500" />
                      {bot.currentLocation}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-xs text-slate-400">
                      Home base: {bot.primaryLocation}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-xs text-slate-400">
                      Heartbeat: {formatRelative(bot.lastHeartbeatAt)}
                    </span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                    <h3 className="text-sm font-semibold text-white">Current assignment</h3>
                    {bot.currentOrder ? (
                      <div className="mt-2 space-y-1 text-sm text-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Order #{bot.currentOrder.orderNumber}</span>
                          <Badge className="bg-slate-800 text-slate-200">
                            {ORDER_STATUS_LABEL[bot.currentOrder.status] ??
                              bot.currentOrder.status}
                          </Badge>
                        </div>
                        {bot.currentOrder.restaurant ? (
                          <p className="text-xs text-slate-400">
                            From{' '}
                            <span className="text-slate-200">
                              {bot.currentOrder.restaurant.name}
                            </span>{' '}
                            ({bot.currentOrder.restaurant.location})
                          </p>
                        ) : null}
                        <p className="text-xs text-slate-400">
                          Drop off:{' '}
                          <span className="text-slate-200">
                            {bot.currentOrder.deliveryLocation}
                          </span>
                        </p>
                        {bot.currentOrder.customer ? (
                          <p className="text-xs text-slate-400">
                            Customer:{' '}
                            <span className="text-slate-200">
                              {bot.currentOrder.customer.firstName}{' '}
                              {bot.currentOrder.customer.lastName}
                            </span>{' '}
                            ({bot.currentOrder.customer.email})
                          </p>
                        ) : null}
                        <p className="text-xs text-slate-500">
                          Placed {new Date(bot.currentOrder.placedAt).toLocaleString()}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-400">
                        No active order. Bot is available for dispatch.
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-slate-400">
                        Status
                      </Label>
                      <Select
                        value={bot.status}
                        onValueChange={(value) =>
                          patchBot(bot.id, { status: value as BotStatus })
                        }
                        disabled={updatingBotId === bot.id}
                      >
                        <SelectTrigger className="border-slate-700 bg-slate-950/40 text-slate-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BOT_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {STATUS_LABEL[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-slate-400">
                        Current location
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          value={locationDraft}
                          onChange={(event) =>
                            setLocationDrafts((prev) => ({
                              ...prev,
                              [bot.id]: event.target.value,
                            }))
                          }
                          className="border-slate-700 bg-slate-950/40 text-slate-100"
                          placeholder="e.g. Plant Hall South"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-700 text-slate-100"
                          disabled={
                            updatingBotId === bot.id ||
                            !locationDraft.trim() ||
                            locationDraft === bot.currentLocation
                          }
                          onClick={() =>
                            patchBot(bot.id, { currentLocation: locationDraft.trim() })
                          }
                        >
                          Save
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs uppercase tracking-wider text-slate-400">
                        Battery level (0–100)
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={batteryDraft}
                          onChange={(event) =>
                            setBatteryDrafts((prev) => ({
                              ...prev,
                              [bot.id]: event.target.value,
                            }))
                          }
                          className="border-slate-700 bg-slate-950/40 text-slate-100"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-700 text-slate-100"
                          disabled={updatingBotId === bot.id}
                          onClick={() => {
                            const parsed = batteryDraft.trim() === '' ? null : Number(batteryDraft);
                            patchBot(bot.id, { batteryLevel: parsed });
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>

                  {bot.currentOrder ? (
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="text-slate-300 hover:bg-slate-800/60 hover:text-white"
                    >
                      <Link href={`/track-package?order=${bot.currentOrder.orderNumber}` as any}>
                        View customer tracking
                      </Link>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SummaryStat = ({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: JSX.Element;
  accent?: string;
}) => (
  <Card className="border border-slate-800/60 bg-slate-900/70">
    <CardContent className="flex items-center justify-between p-5">
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
        <p className={`text-3xl font-semibold ${accent ?? 'text-white'}`}>{value}</p>
      </div>
      <div className="rounded-full bg-slate-800/60 p-3 text-slate-200">{icon}</div>
    </CardContent>
  </Card>
);
