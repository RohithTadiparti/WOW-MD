import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { api, apiMessage } from '@/lib/api';
import { money } from '@/lib/format';
import { usePlannerListing, type PlannerPackage } from '@/lib/planner-listing';
import { EMAIL_PATTERN } from '@/shared/permissions';
import { Badge, Divider } from '@/components/chrome';
import { Textarea } from '@/components/form';
import { MediaStrip, PhotoPicker } from '@/components/uploader';
import {
  Alert,
  Body,
  Button,
  Caption,
  Card,
  Field,
  Loading,
  PageSubtitle,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { space } from '@/theme';

/**
 * A wedding planner's listing, on a phone (EZ1-I39).
 *
 * The web app's planner listing form, compacted: the agency, how to reach it,
 * the packages couples book and the photographs they judge it by. It reads and
 * writes `/wedding-planners/me` — a planner has exactly one listing, so there is
 * no switcher and no id to get wrong. Business Details used to be the only
 * thing at this address, and it writes `/vendors`, which a planner cannot hold.
 *
 * Saving an unapproved listing is what puts it in front of an administrator;
 * the server raises that review itself and refuses an edit to a rejected one,
 * and this screen says whatever the server said.
 */
const EMPTY = {
  agencyName: '',
  city: '',
  servesCities: '',
  yearsExperience: '',
  bio: '',
  contactPerson: '',
  contactPhone: '',
  contactEmail: '',
  address: '',
  website: '',
};

type Form = typeof EMPTY;
type Errors = Partial<Record<keyof Form, string>>;

const MOBILE = /^(\+91)?[6-9]\d{9}$/;

export function PlannerListingForm() {
  const qc = useQueryClient();
  const navigation = useNavigation();
  const { data: listing, isPending } = usePlannerListing();

  const [form, setForm] = useState<Form>(EMPTY);
  const [packages, setPackages] = useState<PlannerPackage[]>([]);
  const [portfolio, setPortfolio] = useState<string[]>([]);
  const [draft, setDraft] = useState({ name: '', price: '', includes: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [packageError, setPackageError] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // The route's header is named for the vendor's step; this is the planner's.
  useEffect(() => {
    navigation.setOptions({ title: 'My Listing' });
  }, [navigation]);

  useEffect(() => {
    if (!listing) return;
    setForm({
      agencyName: listing.agencyName ?? '',
      city: listing.city ?? '',
      servesCities: (listing.servesCities ?? []).join(', '),
      yearsExperience: listing.yearsExperience ? String(listing.yearsExperience) : '',
      bio: listing.bio ?? '',
      contactPerson: listing.contactPerson ?? '',
      contactPhone: listing.contactPhone ?? '',
      contactEmail: listing.contactEmail ?? '',
      address: listing.address ?? '',
      website: listing.website ?? '',
    });
    setPackages(listing.packages ?? []);
    setPortfolio(listing.portfolio ?? []);
  }, [listing]);

  const set = (key: keyof Form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  function addPackage() {
    const price = Number(draft.price);
    if (draft.name.trim().length < 2) {
      setPackageError('A package needs a name.');
      return;
    }
    if (!draft.price.trim() || Number.isNaN(price) || price < 0) {
      setPackageError('Give the package a price in rupees.');
      return;
    }
    setPackageError('');
    setPackages((current) => [
      ...current,
      {
        name: draft.name.trim(),
        price,
        includes: draft.includes
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      },
    ]);
    setDraft({ name: '', price: '', includes: '' });
  }

  function validate(): Errors {
    const found: Errors = {};
    if (form.agencyName.trim().length < 2) found.agencyName = 'Your agency needs a name';
    if (form.contactPhone.trim() && !MOBILE.test(form.contactPhone.replace(/\s|-/g, ''))) {
      found.contactPhone = 'Enter a 10-digit Indian mobile number';
    }
    if (form.contactEmail.trim() && !EMAIL_PATTERN.test(form.contactEmail.trim())) {
      found.contactEmail = 'Enter a valid email address';
    }
    const years = form.yearsExperience.trim();
    if (years && !(/^\d{1,2}$/.test(years) && Number(years) <= 80)) {
      found.yearsExperience = 'Years of experience, from 0 to 80';
    }
    return found;
  }

  async function save() {
    setError('');
    setNotice('');
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        agencyName: form.agencyName.trim(),
        bio: form.bio.trim(),
        servesCities: form.servesCities
          .split(',')
          .map((city) => city.trim())
          .filter(Boolean),
        packages,
        portfolio,
      };
      // A blank is dropped rather than sent: an empty phone or email fails the
      // server's format checks, and a field left out keeps what was saved.
      for (const key of ['city', 'contactPerson', 'contactPhone', 'contactEmail', 'address', 'website'] as const) {
        if (form[key].trim()) payload[key] = form[key].trim();
      }
      if (form.yearsExperience.trim()) payload.yearsExperience = Number(form.yearsExperience);

      await api.put('/wedding-planners/me', payload);
      for (const key of ['planner-me', 'payout-account']) {
        void qc.invalidateQueries({ queryKey: [key] });
      }
      setNotice(
        listing?.isApproved
          ? 'Saved. Couples see the change now.'
          : 'Saved. An administrator reviews the listing before couples can find it.',
      );
    } catch (err) {
      setError(apiMessage(err, 'The listing could not be saved.'));
    } finally {
      setBusy(false);
    }
  }

  if (isPending) {
    return (
      <Screen>
        <Loading rows={4} />
      </Screen>
    );
  }

  return (
    <Screen>
      <PageSubtitle>
        {listing
          ? 'What couples read before they hire you: the agency, the packages and the work.'
          : 'Couples find planners through the listing. Once it is written it goes to an administrator for review.'}
      </PageSubtitle>

      {listing ? (
        <View style={{ flexDirection: 'row' }}>
          <Badge tone={listing.isApproved ? 'positive' : 'caution'}>
            {listing.isApproved ? 'Live in search' : 'Awaiting review'}
          </Badge>
        </View>
      ) : null}

      {notice ? <Alert tone="positive">{notice}</Alert> : null}
      {error ? <Alert tone="critical">{error}</Alert> : null}

      <Card>
        <SectionTitle>The agency</SectionTitle>
        <Field
          label="Agency name"
          value={form.agencyName}
          onChangeText={set('agencyName')}
          error={errors.agencyName}
          autoCapitalize="words"
          maxLength={120}
        />
        <Field label="City" value={form.city} onChangeText={set('city')} autoCapitalize="words" maxLength={80} />
        <Field
          label="Cities you work in"
          value={form.servesCities}
          onChangeText={set('servesCities')}
          hint="Separated by commas."
        />
        <Field
          label="Years of experience"
          value={form.yearsExperience}
          onChangeText={set('yearsExperience')}
          error={errors.yearsExperience}
          keyboardType="number-pad"
          maxLength={2}
        />
        <Textarea label="About the agency" value={form.bio} onChange={set('bio')} rows={4} maxLength={2000} />
      </Card>

      <Card>
        <SectionTitle>Contact</SectionTitle>
        <Field
          label="Contact person"
          value={form.contactPerson}
          onChangeText={set('contactPerson')}
          autoCapitalize="words"
          maxLength={120}
        />
        <Field
          label="Contact number"
          value={form.contactPhone}
          onChangeText={set('contactPhone')}
          error={errors.contactPhone}
          keyboardType="phone-pad"
        />
        <Field
          label="Email"
          value={form.contactEmail}
          onChangeText={set('contactEmail')}
          error={errors.contactEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Textarea label="Address" value={form.address} onChange={set('address')} rows={3} maxLength={500} />
        <Field
          label="Website"
          value={form.website}
          onChangeText={set('website')}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={200}
        />
      </Card>

      <Card>
        <SectionTitle>Packages</SectionTitle>
        <Body tone="muted">What couples can hire you for, and what each costs.</Body>
        {packages.length === 0 ? (
          <Caption tone="faint">No packages yet.</Caption>
        ) : (
          packages.map((pkg, index) => (
            <View key={`${pkg.name}-${index}`} style={{ gap: space(1) }}>
              {index > 0 ? <Divider /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
                <Body style={{ flex: 1 }}>{pkg.name}</Body>
                <Body style={{ fontVariant: ['tabular-nums'] }}>{money(pkg.price)}</Body>
              </View>
              {pkg.includes && pkg.includes.length > 0 ? (
                <Caption tone="faint">{pkg.includes.join(', ')}</Caption>
              ) : null}
              <Button
                label="Remove"
                variant="ghost"
                small
                onPress={() => setPackages((current) => current.filter((_, i) => i !== index))}
              />
            </View>
          ))
        )}
        <Divider />
        <Field
          label="Package name"
          value={draft.name}
          onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
          maxLength={100}
        />
        <Field
          label="Price (₹)"
          value={draft.price}
          onChangeText={(price) => setDraft((d) => ({ ...d, price }))}
          keyboardType="decimal-pad"
        />
        <Field
          label="What it includes"
          value={draft.includes}
          onChangeText={(includes) => setDraft((d) => ({ ...d, includes }))}
          hint="Separated by commas."
        />
        {packageError ? <Caption tone="critical">{packageError}</Caption> : null}
        <Button label="Add the package" variant="outline" small onPress={addPackage} />
      </Card>

      <Card>
        <SectionTitle>Portfolio</SectionTitle>
        <Body tone="muted">Weddings you have run. Couples rarely hire from a listing with none.</Body>
        <MediaStrip
          urls={portfolio}
          onRemove={(url) => setPortfolio((current) => current.filter((u) => u !== url))}
        />
        <PhotoPicker label="Add photos" onUploaded={(url) => setPortfolio((current) => [...current, url])} />
      </Card>

      <Button
        label={listing ? 'Save changes' : 'Create the listing'}
        busy={busy}
        onPress={() => void save()}
      />
      <Caption tone="faint">
        Packages and photographs are saved with the listing. A contact detail left blank keeps what
        was saved before.
      </Caption>
    </Screen>
  );
}
