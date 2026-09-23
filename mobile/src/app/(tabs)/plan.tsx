import { Alert as NativeAlert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, CalendarBlank, Camera, Heart, Suitcase } from 'phosphor-react-native';

import { api, apiMessage } from '@/lib/api';
import { rupees } from '@/lib/format';
import { Card, Caption, EmptyState, Loading, PageSubtitle, PageTitle, Screen, SectionTitle } from '@/components/ui';
import { rgb, space, useTheme } from '@/theme';

type Dashboard = { journey: { total: number; done: number; percent: number }; budget: { budgeted: string; committed: string }; countdown: { weddingDate: string | null; daysAway: number | null } };
type Plan = { id: string };
// Bookings is null on purpose: /bookings is the seller incoming queue, not a
// couple's own bookings. Until a buyer bookings screen exists, the tile must
// not dump couples onto a vendor console.
const actions = [
  ['Vendors', 'Find trusted vendors', Briefcase, '/vendors'],
  ['Hire a Planner', 'Get expert guidance', Heart, null],
  ['Bookings', 'Manage your bookings', CalendarBlank, null],
  ['Events', 'Create and track events', CalendarBlank, '/events'],
  ['Honeymoon', 'Plan your dream trip', Suitcase, null],
  ['Media', 'Save your memories', Camera, null],
] as const;

export default function PlanOverview() {
  const theme = useTheme(); const router = useRouter();
  const dashboard = useQuery({ queryKey: ['wedding-dashboard'], queryFn: async () => (await api.get('/planner/dashboard')).data as Dashboard, retry: false });
  const plans = useQuery({ queryKey: ['plans'], queryFn: async () => (await api.get('/planner/plans')).data as Plan[], retry: false });
  if (dashboard.isPending || plans.isPending) return <Screen><Loading rows={5} /></Screen>;
  if (dashboard.error || plans.error) return <Screen><EmptyState title="Your plan could not be loaded">{apiMessage(dashboard.error ?? plans.error, 'Please try again shortly.')}</EmptyState></Screen>;
  const data = dashboard.data; const plan = plans.data?.[0]; const percent = data?.journey.percent ?? 0; const remaining = Math.max(0, (data?.journey.total ?? 0) - (data?.journey.done ?? 0));
  return <Screen><View style={{ gap: space(1) }}><PageTitle>My Wedding Plan</PageTitle><PageSubtitle>Turn your dream wedding into reality</PageSubtitle></View><Pressable disabled={!plan} onPress={() => plan && router.push({ pathname: '/plan/[id]', params: { id: plan.id } })}><Card style={{ gap: space(3), borderRadius: 16 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><SectionTitle>Overall Progress</SectionTitle><SectionTitle style={{ color: rgb(theme.brand) }}>{percent}%</SectionTitle></View><View style={{ height: 7, borderRadius: 4, backgroundColor: rgb(theme.surfaceSunken) }}><View style={{ height: 7, borderRadius: 4, width: `${percent}%`, backgroundColor: rgb(theme.brand) }} /></View><Caption>{remaining} task{remaining === 1 ? '' : 's'} left to tick off</Caption></Card></Pressable><Card style={{ borderRadius: 16, backgroundColor: rgb(theme.brandSoft) }}><SectionTitle style={{ color: rgb(theme.brandStrong) }}>A well-planned wedding is a happy beginning</SectionTitle><Caption>{data?.countdown.weddingDate ? `${data.countdown.daysAway ?? 0} days to your celebration` : 'Start by setting your wedding date and checklist.'}</Caption></Card><View style={{ gap: space(2) }}><SectionTitle>Plan Your Wedding</SectionTitle><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>{actions.map(([title, hint, Icon, route]) => <Pressable key={title} disabled={!route} onPress={() => route && router.push(route as never)} style={{ width: '48.7%', opacity: route ? 1 : 0.5 }}><Card style={{ minHeight: 100, padding: space(3), borderRadius: 14 }}><Icon size={22} color={rgb(theme.brand)} /><Caption style={{ fontWeight: '700', color: rgb(theme.ink[800]) }}>{title}</Caption><Caption tone="faint" style={{ fontSize: 11 }}>{hint}</Caption></Card></Pressable>)}</View></View>{data?.budget.budgeted ? <Card><Caption>Total wedding budget</Caption><SectionTitle>{rupees(data.budget.budgeted)}</SectionTitle><Caption>{rupees(data.budget.committed)} committed so far</Caption></Card> : null}{!plan ? <EmptyState title="Start your wedding plan">Create your first plan on the web to add tasks and a wedding date.</EmptyState> : null}</Screen>;
}
