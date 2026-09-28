import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PencilSimple, Wallet } from 'phosphor-react-native';

import { api, apiMessage } from '@/lib/api';
import { money } from '@/lib/format';
import { fetchWeddingDashboard } from '@/lib/wedding-plan';
import { SuggestedVendors, useBudgetVendors } from '@/components/plan/suggested-vendors';
import { Alert, Body, Button, Caption, Card, EmptyState, Field, Loading, Screen } from '@/components/ui';
import { rgb, space, useTheme } from '@/theme';
import type { Channels } from '@/theme/tokens';

type EventRow = { id: string; expectedGuests?: number | null };

/**
 * The couple's overall wedding budget, what their bookings have committed
 * against it, and vendors whose prices fit what is left.
 *
 * The total is `wedding_plans.budget` (PUT /planner/budget); committed is the
 * server's sum of live bookings. Events are not budget categories.
 */
export default function PlanBudget() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const dashboard = useQuery({ queryKey: ['wedding-dashboard'], queryFn: fetchWeddingDashboard, retry: false });
  // Only for the guest count a per-guest price is estimated with.
  const events = useQuery({
    queryKey: ['events'],
    queryFn: async () => (await api.get('/events')).data,
    retry: false,
  });

  useFocusEffect(
    useCallback(() => {
      void qc.invalidateQueries({ queryKey: ['wedding-dashboard'] });
    }, [qc]),
  );

  const total = dashboard.data?.budget.total ? Number(dashboard.data.budget.total) : null;
  const committed = Number(dashboard.data?.budget.committed ?? 0);
  const remaining = total === null ? 0 : Number(dashboard.data?.budget.remaining ?? 0);
  const pricing = useBudgetVendors(Math.max(remaining, 0));
  const eventRows: EventRow[] = Array.isArray(events.data) ? events.data : (events.data?.data ?? []);
  const guests = Math.max(0, ...eventRows.map((e) => e.expectedGuests ?? 0)) || null;

  if (dashboard.isPending) {
    return (
      <Screen>
        <Loading rows={4} />
      </Screen>
    );
  }

  if (dashboard.error || !dashboard.data) {
    return (
      <Screen>
        <EmptyState title="Budget unavailable">{apiMessage(dashboard.error, 'Please try again shortly.')}</EmptyState>
      </Screen>
    );
  }

  const blocked =
    total === null
      ? 'Set your overall wedding budget to see vendors that fit.'
      : remaining < 0
        ? `Over budget by ${money(-remaining)}`
        : remaining === 0
          ? 'No remaining budget'
          : null;

  return (
    <Screen onRefresh={() => void dashboard.refetch()} refreshing={dashboard.isRefetching}>
      <BudgetHeader
        total={total}
        committed={committed}
        remaining={remaining}
        onEdit={editing ? undefined : () => setEditing(true)}
      >
        {editing ? (
          <BudgetEditor total={total} onDone={() => setEditing(false)} />
        ) : total === null ? (
          <Button small label="Set Budget" onPress={() => setEditing(true)} />
        ) : null}
      </BudgetHeader>

      <SuggestedVendors
        fits={pricing.evaluate(remaining, guests)}
        loading={pricing.loading}
        error={pricing.error}
        blocked={blocked}
      />
    </Screen>
  );
}

function BudgetHeader({
  total,
  committed,
  remaining,
  onEdit,
  children,
}: {
  total: number | null;
  committed: number;
  remaining: number;
  onEdit?: () => void;
  children?: ReactNode;
}) {
  const theme = useTheme();
  const over = total !== null && remaining < 0;
  return (
    <Card style={{ backgroundColor: rgb(theme.brandSoft), gap: space(4) }}>
      <View style={{ flexDirection: 'row', gap: space(3) }}>
        <View
          style={{
            width: 48,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: rgb(theme.surface),
          }}
        >
          <Wallet size={24} color={rgb(theme.brand)} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Caption style={{ fontWeight: '600', color: rgb(theme.ink[900]) }}>Total Wedding Budget</Caption>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
            <Body style={{ fontSize: 28, lineHeight: 34, fontWeight: '700', color: rgb(theme.brandStrong) }}>
              {total !== null ? money(total) : 'Not set'}
            </Body>
            {onEdit && total !== null ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit Budget"
                onPress={onEdit}
                hitSlop={8}
                style={{
                  width: 30,
                  height: 30,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: rgb(theme.surface),
                }}
              >
                <PencilSimple size={16} color={rgb(theme.brand)} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <Stat first label="Committed" value={money(committed)} />
        <Stat
          label={over ? 'Over budget by' : 'Remaining'}
          value={total !== null ? money(Math.abs(remaining)) : '—'}
          color={total === null ? undefined : over ? theme.criticalFg : remaining > 0 ? theme.positiveFg : undefined}
        />
      </View>
      {over ? (
        <Caption tone="critical">Your current bookings have exceeded your overall wedding budget.</Caption>
      ) : null}
      {children}
    </Card>
  );
}

function Stat({ label, value, color, first }: { label: string; value: string; color?: Channels; first?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        gap: space(1),
        paddingLeft: first ? 0 : space(3),
        borderLeftWidth: first ? 0 : StyleSheet.hairlineWidth,
        borderColor: rgb(theme.borderStrong),
      }}
    >
      <Caption tone="muted" numberOfLines={1}>
        {label}
      </Caption>
      <Body numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: rgb(color ?? theme.ink[900]) }}>
        {value}
      </Body>
    </View>
  );
}

function BudgetEditor({ total, onDone }: { total: number | null; onDone: () => void }) {
  const qc = useQueryClient();
  const [value, setValue] = useState(total !== null ? String(total) : '');
  const [error, setError] = useState('');

  const save = useMutation({
    mutationFn: () => api.put('/planner/budget', { budget: value ? Number(value) : null }),
    onSuccess: async () => {
      setError('');
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['wedding-dashboard'] }),
        qc.invalidateQueries({ queryKey: ['plans'] }),
      ]);
      onDone();
    },
    onError: (err) => setError(apiMessage(err, 'That budget could not be saved.')),
  });

  return (
    <View style={{ gap: space(2) }}>
      {error ? <Alert tone="critical">{error}</Alert> : null}
      <Field
        label="Total wedding budget (₹)"
        value={value}
        onChangeText={(v) => setValue(v.replace(/\D/g, ''))}
        keyboardType="number-pad"
        placeholder="e.g. 1500000"
        hint={total !== null ? 'Leave blank to clear the budget.' : undefined}
      />
      <View style={{ flexDirection: 'row', gap: space(2) }}>
        <Button style={{ flex: 1 }} small variant="outline" label="Cancel" disabled={save.isPending} onPress={onDone} />
        <Button style={{ flex: 1 }} small label="Save Budget" busy={save.isPending} onPress={() => save.mutate()} />
      </View>
    </View>
  );
}
