import { useState } from 'react';
import { Linking, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { FileText } from 'phosphor-react-native';

import { api, apiMessage } from '@/lib/api';
import { isChartImage } from '@/shared/horoscope';
import { DetailGrid, DetailRow } from '@/components/chrome';
import { PhotoPicker } from '@/components/uploader';
import { Alert, Body, Button, Caption, Card, Field, SectionTitle } from '@/components/ui';
import { SelectField } from '@/components/form';
import { radius, rgb, space, useTheme } from '@/theme';
import { KUJA_DOSHAM_OPTIONS } from './constants';

export function HoroscopeSection({
  profileId,
  details,
  onSaved,
  onBack,
  onSkip,
  isWizard = false,
}: {
  profileId: string;
  details: Record<string, unknown>;
  onSaved: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  isWizard?: boolean;
}) {
  const theme = useTheme();
  const chart = (details.horoscope as Record<string, unknown> | undefined) ?? {};
  const available = details.horoscopeAvailable === true;
  const storedValue = typeof details.horoscopeDocumentUrl === 'string' ? details.horoscopeDocumentUrl : null;

  const [editing, setEditing] = useState(isWizard);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({
    rashi: String(chart.rashi ?? ''),
    star: String(chart.star ?? ''),
    padam: String(chart.padam ?? ''),
    gothram: String(chart.gothram ?? ''),
    kujaDosham: String(chart.kujaDosham ?? ''),
    timeOfBirth: String(chart.timeOfBirth ?? ''),
    horoscopeDocumentUrl: storedValue ?? '',
  });

  const save = useMutation({
    mutationFn: async (patch: Partial<typeof form> = {}) => {
      const next = { ...form, ...patch };
      
      const hasData = next.rashi || next.star || next.padam || next.gothram || next.kujaDosham || next.timeOfBirth || next.horoscopeDocumentUrl;
      const isAvailable = hasData ? true : available;

      await api.put(`/profiles/${profileId}/details/horoscope`, {
        horoscopeAvailable: isAvailable,
        ...Object.fromEntries(
          (['rashi', 'star', 'padam', 'gothram', 'kujaDosham', 'timeOfBirth'] as const)
            .map((key) => [key, next[key].trim()])
            .filter(([, value]) => value),
        ),
        ...(next.horoscopeDocumentUrl ? { horoscopeDocumentUrl: next.horoscopeDocumentUrl } : {}),
      });
    },
    onSuccess: () => {
      setError('');
      setNotice('Saved.');
      if (!isWizard) setEditing(false);
      onSaved();
    },
    onError: (err) => setError(apiMessage(err, 'That could not be saved.')),
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <View style={{ gap: space(4) }}>
      {error ? <Alert tone="critical">{error}</Alert> : null}
      
      <Card>
        {!isWizard && <SectionTitle>Horoscope</SectionTitle>}
        {notice && !isWizard ? <Alert tone="positive">{notice}</Alert> : null}

        {editing ? (
          <>
            <Field label="Rashi" value={form.rashi} onChangeText={set('rashi')} />
            <Field label="Star / Nakshatram" value={form.star} onChangeText={set('star')} />
            <Field label="Padam" value={form.padam} onChangeText={set('padam')} maxLength={20} />
            <Field label="Gothram" value={form.gothram} onChangeText={set('gothram')} />
            <SelectField
              label="Kuja dosham"
              value={form.kujaDosham}
              onChange={set('kujaDosham')}
              options={KUJA_DOSHAM_OPTIONS}
            />
            <Field label="Time of Birth" value={form.timeOfBirth} onChangeText={set('timeOfBirth')} hint="e.g. 10:30 AM" />
            {!isWizard && (
              <View style={{ gap: space(2) }}>
                <Button label="Save" busy={save.isPending} onPress={() => save.mutate({})} />
                <Button label="Cancel" variant="outline" onPress={() => setEditing(false)} />
              </View>
            )}
          </>
        ) : (
          <>
            <DetailGrid>
              <DetailRow label="Has a horoscope">{available ? 'Yes' : 'Not said'}</DetailRow>
              <DetailRow label="Rashi">{String(chart.rashi ?? '—')}</DetailRow>
              <DetailRow label="Star">{String(chart.star ?? '—')}</DetailRow>
              <DetailRow label="Padam">{String(chart.padam ?? '—')}</DetailRow>
              <DetailRow label="Gothram">{String(chart.gothram ?? '—')}</DetailRow>
              <DetailRow label="Kuja dosham">{String(chart.kujaDosham ?? '—')}</DetailRow>
              <DetailRow label="Time of Birth">{String(chart.timeOfBirth ?? '—')}</DetailRow>
            </DetailGrid>
            <Button label="Edit the chart details" variant="outline" small onPress={() => setEditing(true)} />
          </>
        )}
      </Card>

      <Card>
        {storedValue ? (
          isChartImage(storedValue) ? (
            <Image
              source={{ uri: storedValue }}
              style={{
                width: '100%',
                height: 240,
                borderRadius: radius.sm,
                backgroundColor: rgb(theme.surfaceSunken),
              }}
              contentFit="contain"
              transition={150}
            />
          ) : (
            <View style={{ gap: space(1.5) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
                <FileText size={18} color={rgb(theme.ink[400])} />
                <Body tone="muted" style={{ flex: 1 }}>
                  The chart is attached as a document.
                </Body>
              </View>
              <Button
                label="Open the chart"
                variant="outline"
                small
                onPress={() => void Linking.openURL(storedValue)}
              />
            </View>
          )
        ) : (
          <Caption tone="faint">Chart: not uploaded</Caption>
        )}

        <PhotoPicker
          label={storedValue ? 'Replace the chart' : 'Attach the chart'}
          kind="attachment"
          onUploaded={(url) => {
            setForm((current) => ({ ...current, horoscopeDocumentUrl: url }));
            save.mutate({ horoscopeDocumentUrl: url });
          }}
        />
        <Caption tone="faint">
          A photograph of it is fine, or a PDF. Families compare charts before deciding whether to
          send interest, so anyone who can see your profile can open it.
        </Caption>
      </Card>

      {isWizard && (
        <View style={{ gap: space(2) }}>
          <View style={{ flexDirection: 'row', gap: space(2) }}>
            {onBack && (
              <Button
                label="Back"
                variant="outline"
                onPress={onBack}
                disabled={save.isPending}
              />
            )}
            <Button
              style={{ flex: 1 }}
              label="Save & Continue →"
              busy={save.isPending}
              onPress={() => save.mutate({})}
            />
          </View>
          {onSkip && (
            <Button
              label="Skip this step"
              variant="ghost"
              onPress={onSkip}
              disabled={save.isPending}
            />
          )}
        </View>
      )}
    </View>
  );
}
