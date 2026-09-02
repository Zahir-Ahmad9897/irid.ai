// Demo-data fallback so the UI is fully explorable before the backend exposes
// /logs, /identities, /audit-log, /auth/login. Real requests are always tried
// first (see api.js) — this only kicks in on network failure, and every page
// that uses it shows a toast so it's clear demo data is being displayed.

const NAMES = ['Jane Doe', 'Marcus Lee', 'Priya Nair', 'Tom Alvarez', 'Sofia Rossi'];

export function seedLogs(count = 87) {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const known = Math.random() > 0.35;
    return {
      id: `log_${i}`,
      timestamp: new Date(now - i * 1000 * 60 * 7).toISOString(),
      name: known ? NAMES[i % NAMES.length] : null,
      status: known ? 'known' : 'unknown',
      confidence: known ? 0.72 + Math.random() * 0.27 : Math.random() * 0.5,
      camera: `Camera ${(i % 3) + 1}`,
    };
  });
}

export function seedIdentities() {
  return NAMES.map((name, i) => ({
    id: `id_${i}`,
    name,
    enrolledAt: new Date(Date.now() - i * 1000 * 60 * 60 * 24 * 12).toISOString(),
    samples: 1 + (i % 4),
  }));
}

export function seedAuditLog() {
  return [
    {
      id: 'audit_1',
      action: 'DELETE_IDENTITY',
      target: 'Old Contractor',
      actor: 'admin@irid.ai',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    },
    {
      id: 'audit_2',
      action: 'DELETE_IDENTITY',
      target: 'Test Subject',
      actor: 'admin@irid.ai',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    },
  ];
}
