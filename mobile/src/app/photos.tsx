import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api, apiMessage } from '@/lib/api';
import { MediaStrip, PhotoPicker } from '@/components/uploader';
import { ProfileSilhouette } from '@/components/profile-silhouette';
import { Alert, Body, Caption, Card, Loading, Screen, SectionTitle } from '@/components/ui';
import { radius } from '@/theme';

export default function Photos() {
  const qc = useQueryClient();

  const { data: me, isPending: loadingMe, isError: meFailed } = useQuery({
    queryKey: ['me'],
    queryFn: async () =>
      (await api.get('/users/me')).data as { id?: string | null; gender?: string | null },
    retry: false,
  });
  const profileId = me?.id ?? null;

  const {
    data: photos,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['biodata-photos', profileId],
    enabled: Boolean(profileId),
    queryFn: async () =>
      (await api.get(`/profiles/${profileId}/details/photos`)).data as { photos: string[] },
    retry: false,
  });

  const urls = photos?.photos ?? [];

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['biodata-photos', profileId] });
    void qc.invalidateQueries({ queryKey: ['biodata-completion', profileId] });
  };

  if (loadingMe || (profileId && isPending)) {
    return (
      <Screen>
        <Loading rows={3} />
      </Screen>
    );
  }

  if (meFailed || isError) {
    return (
      <Screen>
        <Alert tone="critical">{apiMessage(error, 'Photos could not be loaded.')}</Alert>
      </Screen>
    );
  }

  if (!profileId) {
    return (
      <Screen>
        <Card>
          <SectionTitle>No profile yet</SectionTitle>
          <Body tone="muted">Photographs attach to a matrimony profile.</Body>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <SectionTitle>Photos</SectionTitle>
        <Caption tone="muted">
          {urls.length} of 6 uploaded. Add clear photos to get better matches.
        </Caption>
        {urls.length === 0 ? (
          <ProfileSilhouette
            gender={me?.gender}
            style={{ width: 116, height: 84, borderRadius: radius.sm }}
          />
        ) : null}
        <MediaStrip
          urls={urls}
          onRemove={(url) => {
            void api
              .delete(`/profiles/${profileId}/details/photos`, { data: { url } })
              .then(refresh);
          }}
        />
        {urls.length < 6 ? (
          <PhotoPicker
            label="Add Photo"
            onUploaded={(url) => {
              void api.post(`/profiles/${profileId}/details/photos`, { url }).then(refresh);
            }}
          />
        ) : null}
      </Card>
    </Screen>
  );
}
