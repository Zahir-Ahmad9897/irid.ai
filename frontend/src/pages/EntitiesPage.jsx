import React, { useEffect, useState } from 'react';
import { Users, Trash2, ScrollText } from 'lucide-react';
import { listIdentities, deleteIdentity, fetchAuditLog } from '../api.js';
import { seedIdentities, seedAuditLog } from '../mock.js';
import { ConfirmModal, SkeletonCard, useToast } from '../components/ui.jsx';

export default function EntitiesPage() {
  const toast = useToast();
  const [identities, setIdentities] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState(null); // identity pending deletion
  const [deleting, setDeleting] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ids, audit] = await Promise.all([listIdentities(), fetchAuditLog()]);
      setIdentities(Array.isArray(ids) ? ids : ids?.identities || []);
      setAuditLog(Array.isArray(audit) ? audit : audit?.entries || []);
    } catch {
      setIdentities(seedIdentities());
      setAuditLog(seedAuditLog());
      toast.info('Backend unreachable — showing demo identity data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmDelete = async () => {
    if (!target) return;
    setDeleting(true);
    try {
      await deleteIdentity(target.name);
      setIdentities((list) => list.filter((i) => i.name !== target.name));
      setAuditLog((log) => [
        {
          id: `local_${Date.now()}`,
          action: 'DELETE_IDENTITY',
          target: target.name,
          actor: 'you',
          timestamp: new Date().toISOString(),
        },
        ...log,
      ]);
      toast.success(`Deleted identity "${target.name}".`);
    } catch (err) {
      toast.error(err.message || 'Failed to delete identity.');
    } finally {
      setDeleting(false);
      setTarget(null);
    }
  };

  return (
    <div className="max-w-4xl animate-slide-up">
      <div className="flex items-center gap-md mb-md">
        <div className="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center">
          <Users className="w-5 h-5 text-accent-brass" />
        </div>
        <div>
          <h1 className="text-headline-lg text-on-surface">Entity Management</h1>
          <p className="text-body-sm text-on-surface-variant">Enrolled identities and their deletion history.</p>
        </div>
      </div>

      {/* Identity list */}
      {loading ? (
        <div className="space-y-sm">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : identities.length === 0 ? (
        <div className="flat-card p-lg text-center text-body-sm text-on-surface-muted">
          No identities enrolled yet.
        </div>
      ) : (
        <ul className="flat-card divide-y divide-glass-border overflow-hidden">
          {identities.map((identity) => (
            <li key={identity.id || identity.name} className="flex items-center justify-between gap-md px-md py-sm">
              <div className="min-w-0">
                <p className="text-body-sm font-medium text-on-surface truncate">{identity.name}</p>
                <p className="text-caption text-on-surface-muted">
                  {identity.samples ?? 1} sample(s) &middot; enrolled{' '}
                  {identity.enrolledAt ? new Date(identity.enrolledAt).toLocaleDateString() : 'recently'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTarget(identity)}
                className="shrink-0 inline-flex items-center gap-xs min-h-[40px] px-md py-2 rounded-lg text-body-sm font-medium text-status-error border border-status-error-border hover:bg-status-error-bg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Audit log (read-only) */}
      <div className="flex items-center gap-md mt-xl mb-md">
        <div className="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center">
          <ScrollText className="w-5 h-5 text-accent-violet" />
        </div>
        <div>
          <h2 className="text-headline-md text-on-surface">Deletion Audit Log</h2>
          <p className="text-body-sm text-on-surface-variant">Read-only record — cannot be edited or cleared.</p>
        </div>
      </div>

      {loading ? (
        <SkeletonCard />
      ) : auditLog.length === 0 ? (
        <div className="flat-card p-lg text-center text-body-sm text-on-surface-muted">No deletions recorded.</div>
      ) : (
        <ul className="flat-card divide-y divide-glass-border overflow-hidden">
          {auditLog.map((entry) => (
            <li key={entry.id} className="px-md py-sm">
              <p className="text-body-sm text-on-surface">
                <span className="font-medium">{entry.actor}</span> deleted identity{' '}
                <span className="font-medium text-status-error">{entry.target}</span>
              </p>
              <p className="text-caption text-on-surface-muted">{new Date(entry.timestamp).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        open={!!target}
        onClose={() => setTarget(null)}
        onConfirm={confirmDelete}
        busy={deleting}
        title="Delete identity"
        message={`This will permanently remove "${target?.name}" from the recognition gallery. This action is recorded in the audit log and cannot be undone.`}
      />
    </div>
  );
}
