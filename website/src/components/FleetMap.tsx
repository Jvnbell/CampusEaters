'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Battery, BatteryCharging, BatteryLow, MapPin, Move } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { BotStatus, BotWithCurrentOrder } from '@/types/db';

type Props = {
  bots: BotWithCurrentOrder[];
  /** Called when an admin drags a bot to a new (x, y) percentage on the map. */
  onMove?: (botId: string, positionX: number, positionY: number) => void;
  /** Optional id of a bot to highlight (e.g. when card is hovered). */
  highlightedBotId?: string | null;
  onSelectBot?: (botId: string) => void;
};

const STATUS_COLOR: Record<BotStatus, string> = {
  IDLE: '#94a3b8',
  EN_ROUTE_PICKUP: '#facc15',
  AT_RESTAURANT: '#fb923c',
  EN_ROUTE_DELIVERY: '#38bdf8',
  AT_DROPOFF: '#a78bfa',
  RETURNING: '#22d3ee',
  CHARGING: '#34d399',
  OFFLINE: '#ef4444',
  MAINTENANCE: '#f97316',
};

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

/**
 * Stylised UT-Tampa-inspired campus map zones. Coordinates are in the same
 * 0..100 % space as `bots.position_x` / `position_y` so the dot positions can
 * be persisted directly without a real geo projection.
 */
type Zone = { x: number; y: number; w: number; h: number; label: string };

const ZONES: Zone[] = [
  { x: 6, y: 8, w: 26, h: 18, label: 'Plant Hall' },
  { x: 38, y: 6, w: 22, h: 14, label: 'Vaughn Center' },
  { x: 66, y: 10, w: 26, h: 16, label: 'Sykes Chapel' },
  { x: 8, y: 32, w: 30, h: 22, label: 'Cathedral Hall' },
  { x: 44, y: 28, w: 22, h: 24, label: 'Lykes Gym' },
  { x: 70, y: 32, w: 22, h: 22, label: 'McKay Hall' },
  { x: 6, y: 60, w: 28, h: 24, label: 'Riverside Hall' },
  { x: 38, y: 58, w: 24, h: 26, label: 'Quad' },
  { x: 66, y: 60, w: 28, h: 22, label: 'Crescent Club' },
];

const PATHS: Array<{ d: string }> = [
  // Stylised pathways linking the zones — purely decorative.
  { d: 'M 20 25 C 30 30, 35 20, 50 22 S 70 30, 80 22' },
  { d: 'M 20 50 C 35 55, 50 40, 65 45 S 80 60, 85 50' },
  { d: 'M 22 75 C 40 70, 50 80, 60 75 S 75 65, 88 70' },
  { d: 'M 50 22 L 50 60 L 75 70' },
  { d: 'M 22 32 L 22 60' },
  { d: 'M 80 22 L 80 60' },
];

export const FleetMap = ({ bots, onMove, highlightedBotId, onSelectBot }: Props) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { x: number; y: number }>>({});

  // Keep local drafts in sync when the upstream bot positions change (e.g.
  // after a refresh). This avoids stale dot positions after an external edit.
  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, { x: number; y: number }> = { ...prev };
      for (const bot of bots) {
        if (next[bot.id] && draggingId !== bot.id) {
          delete next[bot.id];
        }
      }
      return next;
    });
  }, [bots, draggingId]);

  const positionFor = useCallback(
    (bot: BotWithCurrentOrder): { x: number; y: number } => {
      const draft = drafts[bot.id];
      if (draft) return draft;
      // Fallback: use a deterministic position derived from the id so dots
      // never collapse to (0, 0) when the column hasn't been backfilled.
      const fallback = (() => {
        let h = 0;
        for (let i = 0; i < bot.id.length; i += 1) h = (h * 31 + bot.id.charCodeAt(i)) | 0;
        return {
          x: 10 + Math.abs(h % 80),
          y: 10 + Math.abs((h >> 8) % 80),
        };
      })();
      return {
        x: bot.positionX ?? fallback.x,
        y: bot.positionY ?? fallback.y,
      };
    },
    [drafts],
  );

  const eventToPercent = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      return {
        x: Math.max(2, Math.min(98, x)),
        y: Math.max(2, Math.min(98, y)),
      };
    },
    [],
  );

  const handlePointerDown = (botId: string) => (event: React.PointerEvent<SVGGElement>) => {
    if (!onMove) return;
    event.preventDefault();
    event.stopPropagation();
    (event.target as Element).setPointerCapture?.(event.pointerId);
    setDraggingId(botId);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGGElement>) => {
    if (!draggingId) return;
    const pos = eventToPercent(event.clientX, event.clientY);
    if (!pos) return;
    setDrafts((prev) => ({ ...prev, [draggingId]: pos }));
  };

  const handlePointerUp = (event: React.PointerEvent<SVGGElement>) => {
    if (!draggingId) return;
    (event.target as Element).releasePointerCapture?.(event.pointerId);
    const pos = drafts[draggingId];
    const id = draggingId;
    setDraggingId(null);
    if (pos && onMove) {
      onMove(id, pos.x, pos.y);
    }
  };

  const dragHint = useMemo(
    () => (onMove ? 'Drag any robot to update its live position.' : 'Read-only fleet view.'),
    [onMove],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-secondary" />
          Stylised campus layout — positions stored as % coordinates.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Move className="h-3.5 w-3.5" />
          {dragHint}
        </span>
      </div>

      <div className="glass-panel-strong relative overflow-hidden p-2">
        <div
          className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
          style={{ aspectRatio: '16 / 9' }}
        >
          {/* Subtle ambient glow under the map */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-50 [background:radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(circle_at_75%_75%,rgba(34,211,238,0.18),transparent_55%)]"
          />

          <svg
            ref={svgRef}
            viewBox="0 0 100 56"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {/* Faint grid */}
            <defs>
              <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
                <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth="0.15" />
              </pattern>
              <radialGradient id="dotGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="white" stopOpacity="0.5" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect x="0" y="0" width="100" height="56" fill="url(#grid)" />

            {/* Zone outlines */}
            {ZONES.map((zone) => {
              // Map the 0..100 y in our coord system into the 0..56 svg viewBox so
              // the rendered map has a 16:9 feel without the dots squashing.
              const yScale = 56 / 100;
              return (
                <g key={zone.label}>
                  <rect
                    x={zone.x}
                    y={zone.y * yScale}
                    width={zone.w}
                    height={zone.h * yScale}
                    rx={1.6}
                    ry={1.6}
                    fill="rgba(148,163,184,0.05)"
                    stroke="rgba(148,163,184,0.18)"
                    strokeWidth="0.15"
                  />
                  <text
                    x={zone.x + zone.w / 2}
                    y={zone.y * yScale + (zone.h * yScale) / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="rgba(226,232,240,0.55)"
                    fontSize="1.6"
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                    style={{ pointerEvents: 'none', letterSpacing: '0.05em' }}
                  >
                    {zone.label.toUpperCase()}
                  </text>
                </g>
              );
            })}

            {/* Pathways */}
            {PATHS.map((path, idx) => {
              const yScale = 56 / 100;
              // Apply the same y-scale to the path data via SVG transform.
              return (
                <path
                  key={idx}
                  d={path.d}
                  fill="none"
                  stroke="rgba(148,163,184,0.18)"
                  strokeWidth="0.25"
                  strokeDasharray="0.8 0.8"
                  transform={`scale(1, ${yScale})`}
                />
              );
            })}

            {/* Bot dots */}
            {bots.map((bot) => {
              const pos = positionFor(bot);
              const yScale = 56 / 100;
              const cx = pos.x;
              const cy = pos.y * yScale;
              const color = STATUS_COLOR[bot.status];
              const isHighlighted = highlightedBotId === bot.id || draggingId === bot.id;
              const isActive = bot.currentOrder !== null;

              return (
                <g
                  key={bot.id}
                  onPointerDown={handlePointerDown(bot.id)}
                  onClick={() => onSelectBot?.(bot.id)}
                  className={onMove ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
                  style={{ touchAction: 'none' }}
                >
                  {/* Outer pulse */}
                  {isActive ? (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={3.4}
                      fill={color}
                      opacity={0.18}
                      className="animate-ping origin-center"
                      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                    />
                  ) : null}
                  <circle cx={cx} cy={cy} r={2.6} fill="url(#dotGlow)" opacity={0.9} />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHighlighted ? 1.6 : 1.2}
                    fill={color}
                    stroke="white"
                    strokeWidth={isHighlighted ? 0.4 : 0.25}
                    style={{ transition: 'r 150ms ease, stroke-width 150ms ease' }}
                  />
                  <text
                    x={cx}
                    y={cy - 2.4}
                    textAnchor="middle"
                    fill="rgba(248,250,252,0.95)"
                    fontSize="1.6"
                    fontWeight="600"
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                    style={{ pointerEvents: 'none', letterSpacing: '0.02em' }}
                  >
                    {bot.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-background/60 p-2 backdrop-blur-md">
            {(['EN_ROUTE_DELIVERY', 'CHARGING', 'IDLE', 'OFFLINE'] as BotStatus[]).map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground"
              >
                <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[s] }} />
                {STATUS_LABEL[s]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {bots.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {bots.map((bot) => (
            <button
              type="button"
              key={bot.id}
              onClick={() => onSelectBot?.(bot.id)}
              className={`group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition-colors hover:border-primary/40 hover:bg-white/[0.06] ${
                highlightedBotId === bot.id ? 'border-primary/40 bg-white/[0.08]' : ''
              }`}
            >
              <span
                className="h-3 w-3 rounded-full ring-2 ring-white/10"
                style={{ background: STATUS_COLOR[bot.status] }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{bot.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {STATUS_LABEL[bot.status]} · {bot.currentLocation}
                </p>
              </div>
              <BatteryGlyph level={bot.batteryLevel} charging={bot.status === 'CHARGING'} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const BatteryGlyph = ({ level, charging }: { level: number | null; charging: boolean }) => {
  if (level === null) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
        <Battery className="h-3.5 w-3.5" />
        n/a
      </span>
    );
  }
  const Icon = charging ? BatteryCharging : level <= 20 ? BatteryLow : Battery;
  const color =
    charging || level > 50 ? 'text-success' : level > 20 ? 'text-warning' : 'text-destructive';
  return (
    <Badge className={`rounded-full border-0 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium ${color}`}>
      <Icon className="mr-1 h-3 w-3" />
      {level}%
    </Badge>
  );
};
