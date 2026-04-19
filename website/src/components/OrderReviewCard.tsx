'use client';

import { useEffect, useState } from 'react';
import { Loader2, MessageSquare, Pencil, Star, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Review } from '@/types/db';

const formatRelativeDate = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs)) return '';
  const days = Math.floor(diffMs / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
};

type Props = {
  orderNumber: number;
  restaurantName: string;
  /** Optional callback fired after successful submit, in case parents want to refetch. */
  onSubmitted?: (review: Review) => void;
};

/**
 * Customer-facing rating widget for a single delivered order. Loads any
 * existing review on mount, lets the customer create or edit it, and submits
 * via POST /api/orders/<orderNumber>/review.
 */
export const OrderReviewCard = ({ orderNumber, restaurantName, onSubmitted }: Props) => {
  const [existing, setExisting] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/orders/${orderNumber}/review`, { cache: 'no-store' });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) return;
          throw new Error('Failed to load review');
        }
        const { review } = (await response.json()) as { review: Review | null };
        if (!mounted) return;
        setExisting(review);
        if (review) {
          setRating(review.rating);
          setComment(review.comment ?? '');
        }
      } catch (err) {
        console.error('[OrderReviewCard] load failed', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [orderNumber]);

  const submit = async () => {
    if (rating < 1 || rating > 5) {
      toast.error('Tap a star from 1 to 5 to rate this delivery.');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/orders/${orderNumber}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment.trim() || null }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((body as { error?: string }).error ?? 'Failed to submit review.');
      }
      const review = (body as { review: Review }).review;
      setExisting(review);
      setIsEditing(false);
      toast.success(existing ? 'Review updated.' : 'Thanks — your review is in!');
      onSubmitted?.(review);
    } catch (err) {
      console.error('[OrderReviewCard] submit failed', err);
      toast.error(err instanceof Error ? err.message : 'Could not save review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading your review…
      </div>
    );
  }

  if (existing && !isEditing) {
    return (
      <div className="space-y-3 rounded-2xl border border-success/20 bg-success/[0.06] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-success">
            <ThumbsUp className="h-3.5 w-3.5" />
            You rated this delivery
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 rounded-full px-2.5 text-xs text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="mr-1 h-3 w-3" />
            Edit
          </Button>
        </div>
        <Stars value={existing.rating} />
        {existing.comment ? (
          <p className="text-sm text-foreground/90">&ldquo;{existing.comment}&rdquo;</p>
        ) : null}
        <p className="text-[11px] text-muted-foreground">
          Posted {formatRelativeDate(existing.createdAt)} · helps {restaurantName} and other students.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
        <MessageSquare className="h-3.5 w-3.5" />
        {existing ? 'Update your review' : `Rate your ${restaurantName} delivery`}
      </div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= (hoveredRating || rating);
          return (
            <button
              key={n}
              type="button"
              aria-label={`Rate ${n} star${n === 1 ? '' : 's'}`}
              onMouseEnter={() => setHoveredRating(n)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(n)}
              className="rounded-md p-1 transition-transform hover:scale-110"
            >
              <Star
                className={`h-7 w-7 transition-colors ${
                  filled ? 'fill-secondary text-secondary' : 'text-muted-foreground/40'
                }`}
                strokeWidth={filled ? 0 : 1.5}
              />
            </button>
          );
        })}
        {rating > 0 ? (
          <span className="ml-2 text-xs text-muted-foreground">
            {['Bad', 'Meh', 'Good', 'Great', 'Amazing'][rating - 1]}
          </span>
        ) : null}
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={`How was your order from ${restaurantName}? (optional)`}
        rows={3}
        maxLength={1000}
        className="resize-none"
      />
      <div className="flex items-center justify-end gap-2">
        {existing ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
            onClick={() => {
              setIsEditing(false);
              setRating(existing.rating);
              setComment(existing.comment ?? '');
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          className="btn-aurora rounded-full font-semibold"
          onClick={submit}
          disabled={isSubmitting || rating < 1}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : existing ? (
            'Update review'
          ) : (
            'Submit review'
          )}
        </Button>
      </div>
    </div>
  );
};

const Stars = ({ value }: { value: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className={`h-5 w-5 ${
          n <= value ? 'fill-secondary text-secondary' : 'text-muted-foreground/40'
        }`}
        strokeWidth={n <= value ? 0 : 1.5}
      />
    ))}
  </div>
);
