'use client';

import { useEffect, useState } from 'react';
import { Clock, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { DeliveryEta } from '@/types/db';

type EtaResponse = {
  prediction: DeliveryEta;
  order: { id: string; status: string; placedAt: string };
  elapsedSeconds: number;
  remainingSeconds: number | null;
  delivered: boolean;
};

const ETA_REFRESH_MS = 60_000;

const formatRemaining = (seconds: number): string => {
  if (seconds <= 0) return 'arriving now';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remSeconds = Math.round(seconds % 60);
  if (minutes < 60) return `${minutes}m ${remSeconds.toString().padStart(2, '0')}s`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours}h ${remMinutes}m`;
};

/**
 * Live ETA chip backed by `predict_delivery_eta` (EWMA over the restaurant's
 * recent completed deliveries). The component refetches every minute and
 * counts down locally on each animation frame so the user sees the seconds
 * tick without hammering the server.
 */
export const OrderEta = ({ orderNumber }: { orderNumber: number }) => {
  const [eta, setEta] = useState<EtaResponse | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchEta = async () => {
      try {
        const response = await fetch(`/api/orders/${orderNumber}/eta`, { cache: 'no-store' });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? 'Failed to load ETA');
        }
        const data = (await response.json()) as EtaResponse;
        if (!cancelled) {
          setEta(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load ETA');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetchEta();
    const interval = window.setInterval(fetchEta, ETA_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [orderNumber]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (isLoading) {
    return (
      <Badge className="rounded-full border border-white/10 bg-white/[0.04] text-xs text-muted-foreground">
        <Clock className="mr-1.5 h-3.5 w-3.5 animate-pulse" /> Estimating…
      </Badge>
    );
  }

  if (error || !eta) {
    return null;
  }

  if (eta.delivered) {
    return (
      <Badge className="rounded-full border border-success/30 bg-success/10 text-xs text-success">
        Delivered
      </Badge>
    );
  }

  if (eta.prediction.seconds === null) {
    return (
      <Badge className="rounded-full border border-white/10 bg-white/[0.04] text-xs text-muted-foreground">
        <Sparkles className="mr-1.5 h-3.5 w-3.5" /> ETA unavailable
      </Badge>
    );
  }

  const elapsedNow = Math.max(0, Math.floor((now - Date.parse(eta.order.placedAt)) / 1000));
  const remaining = eta.prediction.seconds - elapsedNow;
  const isLate = remaining < 0;

  return (
    <Badge
      className={`rounded-full border text-xs ${
        isLate
          ? 'border-warning/40 bg-warning/10 text-warning'
          : 'border-primary/30 bg-primary/10 text-primary'
      }`}
    >
      <Clock className="mr-1.5 h-3.5 w-3.5" />
      {isLate
        ? `Running ${formatRemaining(Math.abs(remaining))} late`
        : `ETA ${formatRemaining(remaining)}`}
      <span className="ml-2 text-[10px] opacity-70">
        {eta.prediction.source === 'restaurant'
          ? `EWMA · n=${eta.prediction.sampleSize}`
          : eta.prediction.source === 'global'
          ? 'global avg'
          : ''}
      </span>
    </Badge>
  );
};
