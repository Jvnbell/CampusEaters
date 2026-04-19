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
  LayoutGrid,
  Map as MapIcon,
  MapPin,
  Package,
  Pause,
  PlugZap,
  RefreshCw,
  Truck,
  Wifi,
  WifiOff,
} from 'lucide-react';

import { FleetMap } from '@/components/FleetMap';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  IDLE: 'bg-white/[0.06] text-foreground',
  EN_ROUTE_PICKUP: 'bg-warning/20 text-warning',
  AT_RESTAURANT: 'bg-warning/20 text-warning',
  EN_ROUTE_DELIVERY: 'bg-primary/20 text-primary-foreground',
  AT_DROPOFF: 'bg-secondary/20 text-secondary',
  RETURNING: 'bg-secondary/20 text-secondary',
  CHARGING: 'bg-success/20 text-success',
  OFFLINE: 'bg-destructive/20 text-destructive',
  MAINTENANCE: 'bg-warning/20 text-warning',
};

const STATUS_ICON: Record<BotStatus, JSX.Element> = {
  IDLE: <Pause className="h-3.5 w-3.5" />,
  EN_ROUTE_PICKUP: <Truck className="h-3.5 w-3.5" />,
  AT_RESTAURANT: <Package className="h-3.5 w-3.5" />,
  EN_ROUTE_DELIVERY: <Truck className="h-3.5 w-3.5" />,
  AT_DROPOFF: <Package className="h-3.5 w-3.5" />,
  RETURNING: <Truck className="h-3.5 w-3.5" />,
  CHARGING: <PlugZap className="h-3.5 w-3.5" />,
  OFFLINE: <WifiOff className="h-3.5 w-3.5" />,
  MAINTENANCE: <Hammer className="h-3.5 w-3.5" />,
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
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Battery className="h-4 w-4" /> n/a
      </span>
    );
  }
  const Icon = charging ? BatteryCharging : level <= 20 ? BatteryLow : Battery;
  const color =
    charging || level > 50 ? 'text-success' : level > 20 ? 'text-warning' : 'text-destructive';
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
  const [highlightedBotId, setHighlightedBotId] = useState<string | null>(null);

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

  const patchBot = useCallback(
    async (
      botId: string,
      update: {
        status?: BotStatus;
        currentLocation?: string;
        batteryLevel?: number | null;
        positionX?: number | null;
        positionY?: number | null;
      },
      opts: { silent?: boolean } = {},
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
        if (!opts.silent) toast.success('Bot updated.');
        await fetchBots();
      } catch (error) {
        console.error('[OperationsConsole] patch failed', error);
        toast.error(error instanceof Error ? error.message : 'Unable to update bot.');
      } finally {
        setUpdatingBotId(null);
      }
    },
    [fetchBots],
  );

  const handleMapMove = useCallback(
    (botId: string, positionX: number, positionY: number) => {
      void patchBot(botId, { positionX, positionY }, { silent: true });
    },
    [patchBot],
  );

  if (profileLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full bg-white/5" />
        <Skeleton className="h-64 w-full bg-white/5" />
      </div>
    );
  }

  if (!profile || profile.role !== 'ADMIN') {
    return (
      <Card className="glass-panel-strong border-warning/20">
        <CardHeader>
          <CardTitle className="text-warning">Operations access required</CardTitle>
          <CardDescription className="text-warning/80">
            Only administrators can view the bot fleet. From the website folder, run{' '}
            <code className="rounded bg-white/[0.06] px-1 py-0.5 text-xs">
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
        <SummaryStat
          label="Total bots"
          value={counts.total}
          icon={<Wifi className="h-5 w-5" />}
        />
        <SummaryStat
          label="On a delivery"
          value={counts.active}
          icon={<Truck className="h-5 w-5" />}
          accent="text-secondary"
        />
        <SummaryStat
          label="Charging"
          value={counts.charging}
          icon={<PlugZap className="h-5 w-5" />}
          accent="text-success"
        />
        <SummaryStat
          label="Offline"
          value={counts.offline}
          icon={<WifiOff className="h-5 w-5" />}
          accent="text-destructive"
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">Fleet status</h2>
          <p className="text-sm text-muted-foreground">
            Auto-refreshing every 15 seconds. Drag bots on the map to update their live positions.
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-full border-white/10 bg-white/[0.03] text-foreground hover:bg-white/[0.07]"
          onClick={fetchBots}
          disabled={isFetching}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {bots.length === 0 ? (
        <Card className="glass-panel-strong border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-5 w-5 text-success" /> No bots registered
            </CardTitle>
            <CardDescription>
              From the website folder, run{' '}
              <code className="rounded bg-white/[0.06] px-1 py-0.5 text-xs">
                npm run db:seed:bots
              </code>{' '}
              to insert three demo robots.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Tabs defaultValue="map" className="space-y-6">
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="map" className="flex items-center gap-2">
              <MapIcon className="h-4 w-4" />
              Live map
            </TabsTrigger>
            <TabsTrigger value="cards" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Bot cards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="space-y-6">
            <FleetMap
              bots={bots}
              onMove={handleMapMove}
              highlightedBotId={highlightedBotId}
              onSelectBot={setHighlightedBotId}
            />
          </TabsContent>

          <TabsContent value="cards" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {bots.map((bot) => {
                const locationDraft = locationDrafts[bot.id] ?? bot.currentLocation;
                const batteryDraft =
                  batteryDrafts[bot.id] ??
                  (bot.batteryLevel === null ? '' : String(bot.batteryLevel));

                return (
                  <Card
                    key={bot.id}
                    className={`glass-panel border-0 transition-all ${
                      highlightedBotId === bot.id ? 'shadow-glow-sm ring-1 ring-primary/40' : ''
                    }`}
                    onMouseEnter={() => setHighlightedBotId(bot.id)}
                    onMouseLeave={() => setHighlightedBotId(null)}
                  >
                    <CardHeader className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-foreground">{bot.name}</CardTitle>
                          <Badge
                            className={`rounded-full border-0 px-2.5 py-1 ${STATUS_BADGE[bot.status]}`}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              {STATUS_ICON[bot.status]} {STATUS_LABEL[bot.status]}
                            </span>
                          </Badge>
                        </div>
                        <BatteryIndicator
                          level={bot.batteryLevel}
                          charging={bot.status === 'CHARGING'}
                        />
                      </div>
                      <CardDescription className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-muted-foreground/60" />
                          {bot.currentLocation}
                        </span>
                        <span className="text-muted-foreground/50">•</span>
                        <span className="text-xs text-muted-foreground">
                          Home: {bot.primaryLocation}
                        </span>
                        <span className="text-muted-foreground/50">•</span>
                        <span className="text-xs text-muted-foreground">
                          Heartbeat: {formatRelative(bot.lastHeartbeatAt)}
                        </span>
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-5">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Current assignment
                        </h3>
                        {bot.currentOrder ? (
                          <div className="mt-3 space-y-1.5 text-sm text-foreground/90">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                Order #{bot.currentOrder.orderNumber}
                              </span>
                              <Badge className="rounded-full border-0 bg-white/[0.06] text-xs text-muted-foreground">
                                {ORDER_STATUS_LABEL[bot.currentOrder.status] ??
                                  bot.currentOrder.status}
                              </Badge>
                            </div>
                            {bot.currentOrder.restaurant ? (
                              <p className="text-xs text-muted-foreground">
                                From{' '}
                                <span className="text-foreground">
                                  {bot.currentOrder.restaurant.name}
                                </span>{' '}
                                ({bot.currentOrder.restaurant.location})
                              </p>
                            ) : null}
                            <p className="text-xs text-muted-foreground">
                              Drop off:{' '}
                              <span className="text-foreground">
                                {bot.currentOrder.deliveryLocation}
                              </span>
                            </p>
                            {bot.currentOrder.customer ? (
                              <p className="text-xs text-muted-foreground">
                                Customer:{' '}
                                <span className="text-foreground">
                                  {bot.currentOrder.customer.firstName}{' '}
                                  {bot.currentOrder.customer.lastName}
                                </span>{' '}
                                ({bot.currentOrder.customer.email})
                              </p>
                            ) : null}
                            <p className="text-xs text-muted-foreground/80">
                              Placed {new Date(bot.currentOrder.placedAt).toLocaleString()}
                            </p>
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-muted-foreground">
                            No active order. Bot is available for dispatch.
                          </p>
                        )}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
                            Status
                          </Label>
                          <Select
                            value={bot.status}
                            onValueChange={(value) =>
                              patchBot(bot.id, { status: value as BotStatus })
                            }
                            disabled={updatingBotId === bot.id}
                          >
                            <SelectTrigger className="rounded-xl border-white/10 bg-white/[0.04] text-foreground">
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
                          <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
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
                              placeholder="e.g. Plant Hall South"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-white/10 bg-white/[0.03] text-foreground hover:bg-white/[0.07]"
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
                          <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
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
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-white/10 bg-white/[0.03] text-foreground hover:bg-white/[0.07]"
                              disabled={updatingBotId === bot.id}
                              onClick={() => {
                                const parsed =
                                  batteryDraft.trim() === '' ? null : Number(batteryDraft);
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
                          className="rounded-full text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
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
          </TabsContent>
        </Tabs>
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
