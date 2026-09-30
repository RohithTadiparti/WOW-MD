import { ChangeEvent, useRef, useState } from 'react';
import { api, apiMessage } from '../lib/api';
import { readBiodata } from '../lib/biodata-import';

interface BiodataImportProps {
  busy?: boolean;
  onBusy?: (busy: boolean) => void;
  onImported: (fields: Record<string, string>, documentUrl: string) => Promise<void> | void;
}

export default function BiodataImport({ busy = false, onBusy, onImported }: BiodataImportProps) {
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || busy) return;
    setError('');
    setStatus('Reading biodata document...');
    onBusy?.(true);

    try {
      const fields = await readBiodata(file);
      const contentType = file.type || (/\.pdf$/i.test(file.name) ? 'application/pdf'
        : /\.png$/i.test(file.name) ? 'image/png' : 'image/jpeg');

      // 2. Upload file to media storage to obtain biodataDocumentUrl
      setStatus('Uploading document...');
      const { data: presign } = await api.post('/media/attachment/presign', {
        filename: file.name,
        size: file.size,
        contentType,
      });

      const uploadRes = await fetch(presign.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': contentType,
          ...(presign.headers ?? {}),
        },
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload failed with status ${uploadRes.status}`);
      }

      const { data: completed } = await api.post('/media/complete', { key: presign.key });

      const docUrl = completed.ref;
      setStatus('Preparing extracted fields for review...');
      await onImported(fields, docUrl);
      setStatus('');
    } catch (err) {
      setError(err instanceof Error && !('response' in err)
        ? err.message : apiMessage(err, 'Failed to process document. You can still fill in the details manually.'));
    } finally {
      onBusy?.(false);
      setStatus('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-4 bg-gray-50/50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Upload Biodata Document (PDF or Image)</h3>
          <p className="text-xs text-gray-500">
            Extract the biodata into the review form. You can correct or complete every value before saving creates the client.
          </p>
        </div>
        <div className="shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/png,image/jpeg,image/jpg"
            className="hidden"
            onChange={handleFile}
            disabled={busy}
          />
          <button
            type="button"
            className="btn-outline text-xs py-1.5 px-3"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            {busy ? 'Processing…' : 'Choose Biodata File'}
          </button>
        </div>
      </div>

      {status && (
        <div className="mt-2 flex items-center gap-2 text-xs text-brand-dark">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <span>{status}</span>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-rose-600 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
