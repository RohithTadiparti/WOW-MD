import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiMessage } from '@/lib/api';
import { Alert, Button, Field, PageSubtitle, PageTitle, Screen } from '@/components/ui';

/** A deliberately small, consent-first intake. The Biodata route completes the
 * profile after it has a stable id; it avoids duplicating that long form here. */
export default function AgentOnboard() {
  const router = useRouter(); const qc = useQueryClient();
  const [displayName, setDisplayName] = useState(''); const [phone, setPhone] = useState(''); const [email, setEmail] = useState(''); const [error, setError] = useState('');
  const create = useMutation({ mutationFn: async () => (await api.post('/agents/profiles', { displayName: displayName.trim(), ...(phone.trim() ? { contactPhone: phone.trim() } : {}), ...(email.trim() ? { contactEmail: email.trim() } : {}), consent: { method: 'in_person', givenByRelation: 'self', givenAt: new Date().toISOString().slice(0, 10), allowsCirculation: false } })).data as { id: string }, onSuccess: (profile) => { void qc.invalidateQueries({ queryKey: ['agent-clients-mobile'] }); router.replace({ pathname: '/biodata', params: { profileId: profile.id } }); }, onError: (e) => setError(apiMessage(e, 'The client profile could not be created.')) });
  return <Screen><PageTitle>New client</PageTitle><PageSubtitle>Record consent first, then finish the biodata together. Contact details can be added later.</PageSubtitle>{error ? <Alert tone="critical">{error}</Alert> : null}<Field label="Client name" required value={displayName} onChangeText={setDisplayName} autoCapitalize="words" /><Field label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Optional at intake" /><Field label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Optional at intake" /><Button label="Create and continue" busy={create.isPending} disabled={displayName.trim().length < 2} onPress={() => create.mutate()} /></Screen>;
}
