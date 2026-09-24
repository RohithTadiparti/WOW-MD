import { useState, type ComponentType } from 'react';
import { Alert as NativeAlert, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  CalendarBlank,
  CaretRight,
  CurrencyInr,
  Sparkle,
  UsersThree,
  type IconProps,
} from 'phosphor-react-native';

import { api, apiMessage } from '@/lib/api';
import { shortDate } from '@/lib/format';
import {
  fetchPlans,
  fetchWeddingDashboard,
  type WeddingDashboard,
  type WeddingPlanRow,
} from '@/lib/wedding-plan';
import { DateField } from '@/components/form';
import {
  Alert,
  Body,
  Button,
  Caption,
  Card,
  EmptyState,
  Loading,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { rgb, space, useTheme } from '@/theme';

type Section = {
  title: string;
  hint: string;
  icon: ComponentType<IconProps>;
  to: string;
};

export default function MyWeddingPlan() {
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [editingDate, setEditingDate] = useState(false);
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const dashboard = useQuery({
    queryKey: ['wedding-dashboard'],
    queryFn: fetchWeddingDashboard,
    retry: false,
  });
  const plans = useQuery({
    queryKey: ['plans'],
    queryFn: fetchPlans,
    retry: false,
  });
  const events = useQuery({
    queryKey: ['events'],
    queryFn: async () => (await api.get('/events')).data,
    retry: false,
  });

  const create = useMutation({
    mutationFn: async () =>
      (await api.post('/planner/plan', { weddingDate: date })).data as WeddingPlanRow,
    onSuccess: async (plan) => {
      await qc.invalidateQueries({ queryKey: ['plans'] });
      await qc.invalidateQueries({ queryKey: ['wedding-dashboard'] });
      setEditingDate(false);
      setNotice('Plan created.');
      router.replace({ pathname: '/plan/[id]', params: { id: plan.id } });
    },
    onError: (err) => setError(apiMessage(err, 'That plan could not be created.')),
  });

  if (dashboard.isPending || plans.isPending) {
    return (
      <Screen>
        <Loading rows={4} />
      </Screen>
    );
  }

  if (dashboard.error) {
    return (
      <Screen>
        <EmptyState title="Plan unavailable">
          {apiMessage(dashboard.error, 'Please try again shortly.')}
        </EmptyState>
      </Screen>
    );
  }

  const data = dashboard.data as WeddingDashboard;
  const plan = plans.data?.find((p) => p.id === id) ?? plans.data?.[0];
  const eventRows = Array.isArray(events.data) ? events.data : (events.data?.data ?? []);
  const primary = eventRows.find((e: { category?: string | null }) => e.category) ?? eventRows[0];
  const location =
    data.upcoming.find((e) => e.venue)?.venue ??
    primary?.city ??
    primary?.venue ??
    null;
  const guestCount = data.guests.expectedHeadcount || data.guests.onList || 0;
  const weddingType = primary?.category
    ? String(primary.category).replace(/_/g, ' ')
    : 'Wedding';

  const sections: Section[] = [
    { title: 'Budget', hint: 'Track spending by category', icon: CurrencyInr, to: '/plan/budget' },
    { title: 'Guest List', hint: 'Who is invited and who replied', icon: UsersThree, to: '/plan/guests' },
    { title: 'Vendors', hint: 'Find and shortlist vendors', icon: Briefcase, to: '/vendors' },
    { title: 'Events', hint: 'Ceremony days and venues', icon: CalendarBlank, to: '/events' },
    {
      title: 'Additional Services',
      hint: 'Makeup, mehendi, music and more',
      icon: Sparkle,
      to: '/plan/services',
    },
  ];

  if (!plan && !editingDate) {
    return (
      <Screen>
        <SectionTitle>My Wedding Plan</SectionTitle>
        <Caption tone="muted">
          Everything for your wedding — budget, guests, vendors and events — in one place.
        </Caption>
        {error ? <Alert tone="critical">{error}</Alert> : null}
        <EmptyState title="No plan yet">Set your wedding date to generate a checklist.</EmptyState>
        <Button label="Create plan" onPress={() => setEditingDate(true)} />
      </Screen>
    );
  }

  if (!plan && editingDate) {
    return (
      <Screen>
        <SectionTitle>Create plan</SectionTitle>
        {error ? <Alert tone="critical">{error}</Alert> : null}
        <DateField
          label="Wedding Date"
          value={date}
          onChange={setDate}
          from={new Date().toISOString().slice(0, 10)}
        />
        <Button
          label="Create"
          busy={create.isPending}
          disabled={!date}
          onPress={() => create.mutate()}
        />
        <Button label="Cancel" variant="outline" onPress={() => setEditingDate(false)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionTitle>My Wedding Plan</SectionTitle>
      <Caption tone="muted">
        Everything for your wedding — budget, guests, vendors and events — in one place.
      </Caption>
      {notice ? <Alert tone="positive">{notice}</Alert> : null}
      {error ? <Alert tone="critical">{error}</Alert> : null}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <DetailRow label="Wedding Type" value={weddingType} />
        <DetailRow
          label="Wedding Date"
          value={data.countdown.weddingDate ? shortDate(data.countdown.weddingDate) : 'Not set'}
          action="Edit"
          onAction={() =>
            NativeAlert.alert(
              'Wedding date',
              'The wedding date is set when the plan is created. Update event dates under Events, or create a new plan from Plan Home if you need a different wedding day.',
            )
          }
        />
        <DetailRow
          label="Location"
          value={location ?? 'Not set'}
          action="Edit"
          onAction={() => router.push('/events')}
        />
        <DetailRow
          label="Guest Count"
          value={guestCount ? String(guestCount) : 'Not set'}
          action="View"
          onAction={() => router.push('/plan/guests')}
        />
        <DetailRow
          label="Planner Status"
          value={plan?.plannerUserId ? 'Planner engaged' : 'No planner yet'}
          action="View"
          onAction={() => router.push('/planners')}
          last
        />
      </Card>

      <View style={{ gap: space(2) }}>
        <Caption tone="faint" style={{ letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 11 }}>
          Plan Sections
        </Caption>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {sections.map((section, index) => (
            <Pressable
              key={section.title}
              onPress={() => router.push(section.to as never)}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space(3),
                  paddingHorizontal: space(4),
                  paddingVertical: space(3.5),
                  borderBottomWidth: index === sections.length - 1 ? 0 : 1,
                  borderBottomColor: rgb(theme.border),
                },
                pressed && { backgroundColor: rgb(theme.surfaceSunken) },
              ]}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: rgb(theme.brandSoft),
                }}
              >
                <section.icon size={18} color={rgb(theme.brandStrong)} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Body style={{ fontWeight: '600' }}>{section.title}</Body>
                <Caption tone="faint">{section.hint}</Caption>
              </View>
              <CaretRight size={16} color={rgb(theme.ink[400])} />
            </Pressable>
          ))}
        </Card>
      </View>
    </Screen>
  );
}

function DetailRow({
  label,
  value,
  action,
  onAction,
  last = false,
}: {
  label: string;
  value: string;
  action?: string;
  onAction?: () => void;
  last?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space(3),
        paddingHorizontal: space(4),
        paddingVertical: space(3.5),
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: rgb(theme.border),
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Caption tone="faint">{label}</Caption>
        <Body style={{ fontWeight: '600' }}>{value}</Body>
      </View>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Caption tone="brand" style={{ fontWeight: '700' }}>
            {action}
          </Caption>
        </Pressable>
      ) : null}
    </View>
  );
}
