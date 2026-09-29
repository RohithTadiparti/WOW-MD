import React, { useState } from 'react';
import { View } from 'react-native';
import { FileText, PencilLine, UploadSimple } from 'phosphor-react-native';
import { api, apiMessage } from '@/lib/api';
import { Body, Button, Card, SectionTitle, Alert, Screen, PageTitle, PageSubtitle, Loading } from '@/components/ui';
import { PhotoPicker } from '@/components/uploader';
import { radius, rgb, space, useTheme } from '@/theme';

export function UploadFlow({
  profileId,
  onExtracted,
  onCustom
}: {
  profileId: string | null;
  onExtracted: (data: any) => void;
  onCustom: () => void;
}) {
  const theme = useTheme();
  const [mode, setMode] = useState<'select' | 'upload' | 'processing' | 'success'>('select');
  const [error, setError] = useState('');

  const handleUpload = async (url: string) => {
    setMode('processing');
    setError('');
    try {
      // Call the backend API to extract biodata from the uploaded document
      const res = await api.post(`/profiles/${profileId}/details/extract`, { documentUrl: url });
      setMode('success');
      setTimeout(() => {
        onExtracted(res.data);
      }, 2000);
    } catch (err) {
      setError(apiMessage(err, 'Failed to process document. Please try again or enter details manually.'));
      setMode('upload');
    }
  };

  if (mode === 'select') {
    return (
      <View style={{ gap: space(4), flex: 1, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', marginBottom: space(6) }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: rgb(theme.brand), opacity: 0.1, position: 'absolute' }} />
          <FileText size={48} color={rgb(theme.brandStrong)} style={{ marginTop: 16 }} />
        </View>
        
        <View style={{ alignItems: 'center', gap: space(2), marginBottom: space(4) }}>
          <PageTitle style={{ alignSelf: 'center', textAlign: 'center' }}>How would you like to add your biodata?</PageTitle>
          <PageSubtitle style={{ alignSelf: 'center', textAlign: 'center' }}>Choose an option to get started.</PageSubtitle>
        </View>

        <Card>
          <Button 
            label="Upload Biodata" 
            onPress={() => setMode('upload')} 
            style={{ marginBottom: space(2) }} 
          />
          <Body tone="muted" style={{ textAlign: 'center' }}>
            Upload your biodata and we'll fill in the details for you.
          </Body>
        </Card>

        <Card>
          <Button 
            label="Custom Biodata" 
            variant="outline"
            onPress={onCustom} 
            style={{ marginBottom: space(2) }} 
          />
          <Body tone="muted" style={{ textAlign: 'center' }}>
            Enter your biodata details manually.
          </Body>
        </Card>
      </View>
    );
  }

  if (mode === 'upload') {
    return (
      <View style={{ gap: space(4) }}>
        <View style={{ alignItems: 'center', marginBottom: space(4) }}>
          <UploadSimple size={48} color={rgb(theme.brandStrong)} />
          <SectionTitle style={{ marginTop: space(4) }}>Upload your biodata</SectionTitle>
          <Body tone="muted" style={{ textAlign: 'center', marginTop: space(2) }}>
            We'll extract the information and autofill the details for you.
          </Body>
        </View>

        {error ? <Alert tone="critical">{error}</Alert> : null}

        <Card>
          <PhotoPicker 
            kind="biodata" 
            label="Tap to upload" 
            onUploaded={handleUpload} 
          />
        </Card>
        
        <Button label="Back" variant="ghost" onPress={() => setMode('select')} />
      </View>
    );
  }

  if (mode === 'processing') {
    return (
      <View style={{ gap: space(4), alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        <Loading rows={2} />
        <SectionTitle style={{ marginTop: space(4) }}>Processing your biodata</SectionTitle>
        <Body tone="muted" style={{ textAlign: 'center', marginTop: space(2) }}>
          We are extracting the information from your document. This may take a few seconds.
        </Body>
      </View>
    );
  }

  if (mode === 'success') {
    return (
      <View style={{ gap: space(4), alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: rgb(theme.positiveBg), alignItems: 'center', justifyContent: 'center' }}>
          <FileText size={40} color={rgb(theme.positiveFg)} />
        </View>
        <SectionTitle style={{ marginTop: space(4) }}>Information extracted successfully!</SectionTitle>
        <Body tone="muted" style={{ textAlign: 'center', marginTop: space(2) }}>
          We have filled in your biodata details. Please review and edit if needed.
        </Body>
        <Alert tone="caution">Some fields may still be empty. Please complete the remaining details before saving.</Alert>
      </View>
    );
  }

  return null;
}
