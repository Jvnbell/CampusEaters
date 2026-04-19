import { useCallback, useEffect, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import { api, ApiError } from '@/lib/api';
import { colors } from '@/lib/theme';
import type { Review } from '@/lib/types';

import { Button } from './Button';
import { GlassCard } from './GlassCard';
import { Stars } from './Stars';

type Props = {
  orderNumber: number;
};

/**
 * "Did your delivery slap?" — fetches any existing review for the order and
 * either renders it in read-only mode or shows the star + comment editor.
 */
export function OrderReviewCard({ orderNumber }: Props) {
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ review: Review | null }>(
        `/api/orders/${orderNumber}/review`,
      );
      setReview(data.review);
      if (data.review) {
        setRating(data.review.rating);
        setComment(data.review.comment ?? '');
      }
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) {
        console.warn('[review] load failed', error);
      }
    } finally {
      setLoading(false);
    }
  }, [orderNumber]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submit = useCallback(async () => {
    setSubmitting(true);
    try {
      const payload: { rating: number; comment?: string | null } = { rating };
      if (comment.trim()) payload.comment = comment.trim();
      else payload.comment = null;

      const data = await api<{ review: Review }>(
        `/api/orders/${orderNumber}/review`,
        { method: 'POST', body: payload },
      );
      setReview(data.review);
      setEditing(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save your review.';
      Alert.alert('Heads up', message);
    } finally {
      setSubmitting(false);
    }
  }, [orderNumber, rating, comment]);

  if (loading) {
    return (
      <GlassCard compact>
        <Text className="text-sm text-muted-foreground">Loading review…</Text>
      </GlassCard>
    );
  }

  if (review && !editing) {
    return (
      <GlassCard compact>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xs uppercase tracking-wider text-muted-foreground">
              Your review
            </Text>
            <View className="mt-1.5">
              <Stars value={review.rating} />
            </View>
          </View>
          <Button label="Edit" variant="ghost" onPress={() => setEditing(true)} />
        </View>
        {review.comment ? (
          <Text className="mt-3 text-sm leading-snug text-foreground/90">
            “{review.comment}”
          </Text>
        ) : null}
      </GlassCard>
    );
  }

  return (
    <GlassCard compact>
      <Text className="text-xs uppercase tracking-wider text-muted-foreground">
        Rate this delivery
      </Text>
      <View className="mt-2 items-start">
        <Stars value={rating} onChange={setRating} size={28} />
      </View>
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder="Tell us about the food, the bot, or both…"
        placeholderTextColor={colors.mutedForeground}
        multiline
        maxLength={2000}
        className="mt-4 h-24 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-foreground"
        style={{ textAlignVertical: 'top' }}
      />
      <View className="mt-4 flex-row gap-2">
        <Button
          label={review ? 'Save changes' : 'Submit review'}
          onPress={submit}
          loading={submitting}
        />
        {review ? (
          <Button label="Cancel" variant="ghost" onPress={() => setEditing(false)} />
        ) : null}
      </View>
    </GlassCard>
  );
}
