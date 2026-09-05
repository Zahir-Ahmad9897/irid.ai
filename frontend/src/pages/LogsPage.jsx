import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, ScrollText } from 'lucide-react';
import DataGrid from '../components/DataGrid.jsx';
import { fetchLogs } from '../api.js';
import { useToast } from '../components/ui.jsx';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All detections' },
  { value: 'known', label: 'Known only' },
  { value: 'unknown', label: 'Unknown only' },
];

export default function LogsPage() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchLogs();
        if (!cancelled) setLogs(Array.isArray(data) ? data : data?.logs || []);
      } catch (err) {
        if (!cancelled) toast.error('Failed to load system logs.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (status !== 'all' && log.status !== status) return false;
      if (search && !(log.name || 'unknown').toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [logs, status, search]);

  const columns = [
    {
      key: 'timestamp',
      label: 'Timestamp',
      render: (row) => new Date(row.timestamp).toLocaleString(),
      csv: (row) => new Date(row.timestamp).toISOString(),
    },
    { key: 'camera', label: 'Camera' },
    {
      key: 'name',
      label: 'Identity',
      render: (row) => row.name || 'Unknown',
      csv: (row) => row.name || 'Unknown',
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) =>
        row.status === 'known' ? (
          <span className="inline-flex items-center gap-xs px-sm py-1 rounded-full bg-status-success-bg text-status-success text-caption font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Known
          </span>
        ) : (
          <span className="inline-flex items-center gap-xs px-sm py-1 rounded-full bg-status-error-bg text-status-error text-caption font-semibold">
            <XCircle className="w-3.5 h-3.5" /> Unknown
          </span>
        ),
    },
    {
      key: 'confidence',
      label: 'Confidence',
      render: (row) => `${(row.confidence * 100).toFixed(1)}%`,
      csv: (row) => (row.confidence * 100).toFixed(1),
    },
  ];

  return (
    <div className="max-w-6xl animate-slide-up">
      <div className="flex items-center gap-md mb-md">
        <div className="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center">
          <ScrollText className="w-5 h-5 text-accent-brass" />
        </div>
        <div>
          <h1 className="text-headline-lg text-on-surface">System Logs</h1>
          <p className="text-body-sm text-on-surface-variant">Known and unknown detection events across all cameras.</p>
        </div>
      </div>

      <DataGrid
        rows={filtered}
        columns={columns}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by identity…"
        filters={{ key: 'status', label: 'Filter by status', options: STATUS_OPTIONS, value: status, onChange: setStatus }}
        exportFilename="iridai-logs.csv"
      />
    </div>
  );
}
