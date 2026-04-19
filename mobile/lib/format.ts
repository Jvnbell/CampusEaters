import type { OrderStatus } from './types';

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function formatCurrency(value: string | number): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '$0.00';
  return formatter.format(n);
}

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  SENT: 'Sent',
  RECEIVED: 'Restaurant received',
  SHIPPING: 'On the way',
  DELIVERED: 'Delivered',
};

export function orderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABEL[status] ?? status;
}

const ORDER_STATUS_TINT: Record<OrderStatus, string> = {
  SENT: 'bg-secondary/15 text-secondary border border-secondary/30',
  RECEIVED: 'bg-warning/15 text-warning border border-warning/30',
  SHIPPING: 'bg-primary/15 text-primary border border-primary/30',
  DELIVERED: 'bg-success/15 text-success border border-success/30',
};

export function orderStatusTint(status: OrderStatus): string {
  return ORDER_STATUS_TINT[status] ?? 'bg-muted text-muted-foreground';
}

export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}
