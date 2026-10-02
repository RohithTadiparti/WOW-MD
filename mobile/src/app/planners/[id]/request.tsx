import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api, apiMessage } from '@/lib/api';
import { todayIso } from '@/components/calendar';
import { DateField, Textarea } from '@/components/form';
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
import { useCanRequestPlanner, usePlannerProfile } from '@/components/planner/data';
import { ServicesPicker } from '@/components/planner/services-picker';
import { PLANNER_SERVICES } from '@/shared/planner-profile';
import { usePlannerRequest } from '@/store/planner-request';
import { space } from '@/theme';

/**
 * Sending a planner a request.
 *
 * Opens prefilled from the profile: the date picked on its calendar and the
 * services ticked in its grid (store/planner-request), both still editable
 * here, because the review step is where a couple notices they meant the
 * Saturday. Whatever is changed here is changed in the store too, so stepping
 * back to the profile shows the same choices.
 *
 * The request is `POST /bookings` with the planner as provider. The server
 * keeps one live request per couple and planner; a second answers 409
 * DUPLICATE_BOOKING_REQUEST with the id of the one already open, and the
 * couple is pointed at it rather than shown an error.
 */

const MAX_REQUIREMENTS = 4000;
/** The server's floor when requirements are sent at all. */
const MIN_REQUIREMENTS = 10;
const MAX_SERVICES = 16;

export default function PlannerRequestScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const canRequest = useCanRequestPlanner();
  const query = usePlannerProfile(id);

  const date = usePlannerRequest((s) => s.date);
  const setDate = usePlannerRequest((s) => s.setDate);
  const services = usePlannerRequest((s) => s.services);
  const toggleService = usePlannerRequest((s) => s.toggleService);
  const beginFor = usePlannerRequest((s) => s.beginFor);
  const reset = usePlannerRequest((s) => s.reset);
  const storeFor = usePlannerRequest((s) => s.plannerId);

  const [requirements, setRequirements] = useState('');
  const [budget, setBudget] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState('');
  const [existing, setExisting] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  // Reached directly (a deep link) rather than from the profile: start clean.
  useEffect(() => {
    if (id && storeFor !== id) beginFor(id);
  }, [id, storeFor, beginFor]);

  const trimmed = requirements.trim();
  const requirementsError =
    trimmed.length > 0 && trimmed.length < MIN_REQUIREMENTS
      ? 'Tell the planner what you need, at least a sentence'
      : undefined;
  const budgetError =
    budget.trim() && !/^\d{1,12}$/.test(budget.trim()) ? 'Enter the budget in whole rupees' : undefined;

  const send = useMutation({
    mutationFn: async () => {
      const res = await api.post('/bookings', {
        providerType: 'planner',
        providerId: id,
        ...(date ? { eventDate: date } : {}),
        ...(services.length ? { requestedServices: services.slice(0, MAX_SERVICES) } : {}),
        ...(trimmed ? { requirements: trimmed } : {}),
        ...(budget.trim() ? { expectedBudget: Number(budget.trim()) } : {}),
      });
      return res.data as { id: string };
    },
    onSuccess: async (data) => {
      setSent(data.id);
      reset();
      await qc.invalidateQueries({ queryKey: ['my-bookings'] });
      await qc.invalidateQueries({ queryKey: ['wedding-dashboard'] });
    },
    onError: (err) => {
      const body = (err as { response?: { data?: { error?: { code?: string; bookingId?: string } } } })
        .response?.data?.error;
      if (body?.code === 'DUPLICATE_BOOKING_REQUEST') {
        setExisting(body.bookingId ?? '');
        return;
      }
      setError(apiMessage(err, 'That request could not be sent.'));
    },
  });

  const submit = () => {
    setShowErrors(true);
    setError('');
    setExisting(null);
    if (requirementsError || budgetError) return;
    send.mutate();
  };

  const openBookings = (highlight?: string | null) =>
    router.replace(
      highlight
        ? { pathname: '/plan/bookings', params: { highlight } }
        : { pathname: '/plan/bookings' },
    );

  if (query.isPending) {
    return (
      <Screen>
        <Loading rows={4} />
      </Screen>
    );
  }

  if (query.error || !query.data) {
    return (
      <Screen>
        <EmptyState title="Planner unavailable">
          {apiMessage(query.error, 'This listing may no longer be available.')}
        </EmptyState>
      </Screen>
    );
  }

  const planner = query.data;

  if (!canRequest) {
    return (
      <Screen>
        <EmptyState title="Requests are not available">
          This account cannot send planner requests.
        </EmptyState>
      </Screen>
    );
  }

  if (sent) {
    return (
      <Screen>
        <Card style={{ padding: space(5), gap: space(3) }}>
          <SectionTitle style={{ fontSize: 20 }}>Request sent</SectionTitle>
          <Body tone="muted">
            {planner.agencyName} has your request. Their reply, and any quotation, will appear in
            your bookings.
          </Body>
          <Button label="View my bookings" onPress={() => openBookings(sent)} />
          <Button label="Back to the planner" variant="outline" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  const serviceKeys: string[] = planner.services?.length
    ? planner.services
    : PLANNER_SERVICES.map((s) => s.key);
  // A service picked on an older version of the listing stays visible, so it
  // can be unticked rather than sent unseen.
  const shownKeys = [...serviceKeys, ...services.filter((k) => !serviceKeys.includes(k))];

  return (
    <Screen>
      <Card style={{ padding: space(4), gap: space(4) }}>
        <SectionTitle style={{ fontSize: 18 }}>Request this planner</SectionTitle>

        <Field label="Planner" value={planner.agencyName} editable={false} />

        <DateField
          label="Selected wedding date"
          value={date}
          onChange={setDate}
          from={todayIso()}
          placeholder="Pick your wedding date"
          hint="Optional. Leave it open if the date is not fixed yet."
        />

        <View style={{ gap: space(2) }}>
          <Body style={{ fontWeight: '600' }}>Selected services</Body>
          <Caption>
            Select the services you are interested in. These will be shared with the planner when
            you send a request.
          </Caption>
          <ServicesPicker options={shownKeys} selected={services} onToggle={toggleService} />
          <Caption tone={services.length ? 'brand' : 'faint'}>
            {services.length
              ? `${services.length} ${services.length === 1 ? 'service' : 'services'} selected`
              : 'None selected. The planner will ask what you need.'}
          </Caption>
        </View>

        <Textarea
          label="Additional wedding requirements"
          value={requirements}
          onChange={setRequirements}
          placeholder="Guest count, venue ideas, events you are planning, anything the planner should know"
          maxLength={MAX_REQUIREMENTS}
          rows={5}
          error={showErrors ? requirementsError : undefined}
          hint={`${requirements.length} of ${MAX_REQUIREMENTS}`}
        />

        <Field
          label="Expected budget (optional)"
          value={budget}
          onChangeText={(v) => setBudget(v.replace(/[^\d]/g, ''))}
          keyboardType="number-pad"
          placeholder="Leave blank to ask for a quote"
          error={showErrors ? budgetError : undefined}
          hint="In rupees."
        />

        {existing !== null ? (
          <View style={{ gap: space(2) }}>
            <Alert tone="caution">
              You already have an open request with this planner. Follow it up from your bookings.
            </Alert>
            <Button label="Open my bookings" variant="outline" onPress={() => openBookings(existing)} />
          </View>
        ) : null}
        {error ? <Alert tone="critical">{error}</Alert> : null}

        <Button label="Send Planner Request" busy={send.isPending} onPress={submit} />
      </Card>
    </Screen>
  );
}
