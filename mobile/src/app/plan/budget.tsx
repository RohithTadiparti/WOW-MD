import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, apiMessage } from '@/lib/api';
import { rupees } from '@/lib/format';
import {
  categoryLabel,
  fetchWeddingDashboard,
  type WeddingDashboard,
} from '@/lib/wedding-plan';
import {
  Alert,
  Body,
  Button,
  Caption,
  Card,
  EmptyState,
  Field,
  Loading,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { rgb, space, useTheme } from '@/theme';

const FALLBACK_CATEGORIES = [
  'venue',
  'photography',
  'decor',
  'catering',
  'makeup',
  'other',
];

export default function PlanBudget() {
  const theme = useTheme();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const dashboard = useQuery({
    queryKey: ['wedding-dashboard'],
    queryFn: fetchWeddingDashboard,
    retry: false,
  });
  const events = useQuery({
    queryKey: ['events'],
    queryFn: async () => (await api.get('/events')).data,
    retry: false,
  });

  const update = useMutation({
    mutationFn: async () => {
      const rows = Array.isArray(events.data) ? events.data : (events.data?.data ?? []);
      const target = rows[0] as { id: string } | undefined;
      if (!target) throw new Error('Add an event before setting a budget.');
      await api.put(`/events/${target.id}`, { budget: amount });
    },
    onSuccess: async () => {
      setEditing(false);
      setNotice('Budget updated.');
      setError('');
      await qc.invalidateQueries({ queryKey: ['wedding-dashboard'] });
      await qc.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (err) => setError(apiMessage(err, 'That budget could not be updated.')),
  });

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
        <EmptyState title="Budget unavailable">
          {apiMessage(dashboard.error, 'Please try again shortly.')}
        </EmptyState>
      </Screen>
    );
  }

  const data = dashboard.data as WeddingDashboard;
  const budgeted = Number(data.budget.budgeted || 0);
  const committed = Number(data.budget.committed || 0);
  const remaining = Number(data.budget.remaining || 0);
  const usedPct = budgeted > 0 ? Math.min(100, Math.round((committed / budgeted) * 100)) : 0;
  const categories =
    data.budget.categories.length > 0
      ? data.budget.categories
      : FALLBACK_CATEGORIES.map((category) => ({
          category,
          budgeted: '0',
          committed: '0',
          remaining: '0',
        }));

  return (
    <Screen>
      <SectionTitle>Budget</SectionTitle>
      <Caption tone="muted">Track what you planned against what you have committed.</Caption>
      {notice ? <Alert tone="positive">{notice}</Alert> : null}
      {error ? <Alert tone="critical">{error}</Alert> : null}

      <Card style={{ gap: space(3), borderRadius: 16 }}>
        <Caption tone="faint">Total Budget</Caption>
        <Body style={{ fontSize: 28, fontWeight: '700', color: rgb(theme.brandStrong) }}>
          {rupees(budgeted)}
        </Body>
        <Caption tone="brand" style={{ fontWeight: '600' }}>
          {usedPct}% Used
        </Caption>
        <View style={{ flexDirection: 'row', gap: space(3) }}>
          <BudgetStat label="Spent" value={rupees(committed)} />
          <BudgetStat label="Remaining" value={rupees(remaining)} />
          <BudgetStat label="Categories" value={String(categories.length)} />
        </View>
      </Card>

      <View style={{ gap: space(2) }}>
        <SectionTitle>Budget Categories</SectionTitle>
        {categories.map((row) => {
          const allocated = Number(row.budgeted || 0);
          const spent = Number(row.committed || 0);
          const pct = allocated > 0 ? Math.min(100, (spent / allocated) * 100) : spent > 0 ? 100 : 0;
          return (
            <Card key={row.category} style={{ gap: space(2), borderRadius: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Body style={{ fontWeight: '600' }}>{categoryLabel(row.category)}</Body>
                <Caption tone="muted">{rupees(allocated || spent)}</Caption>
              </View>
              <View
                style={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: rgb(theme.brandSoft),
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    backgroundColor: rgb(theme.brand),
                  }}
                />
              </View>
              <Caption tone="faint">
                {rupees(spent)} spent · {rupees(Number(row.remaining || 0))} left
              </Caption>
            </Card>
          );
        })}
      </View>

      {editing ? (
        <Card style={{ gap: space(3) }}>
          <Field
            label="Total budget (₹)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            placeholder={String(budgeted || '')}
          />
          <Button
            label="Save budget"
            busy={update.isPending}
            disabled={!amount}
            onPress={() => update.mutate()}
          />
          <Button label="Cancel" variant="outline" onPress={() => setEditing(false)} />
        </Card>
      ) : (
        <Button
          label="Update Budget"
          onPress={() => {
            setAmount(budgeted ? String(budgeted) : '');
            setEditing(true);
            setNotice('');
          }}
        />
      )}
    </Screen>
  );
}

function BudgetStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Caption tone="faint">{label}</Caption>
      <Caption style={{ fontWeight: '700' }}>{value}</Caption>
    </View>
  );
}
