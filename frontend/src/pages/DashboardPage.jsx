import React from 'react';
import { Link } from 'react-router-dom';
import { ScanFace, UserPlus, Fingerprint, ArrowRight, Shield, Zap, Video, Layers, Users, ScrollText } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="max-w-4xl animate-slide-up">
      {/* Header section similar to preview (logo handled in sidebar, so just welcome here) */}
      <div className="flex items-center gap-sm mb-xs">
        <Fingerprint className="w-6 h-6 text-accent-brass" strokeWidth={1.5} />
        <h1 className="text-[20px] font-medium text-on-surface">Welcome to irid.ai</h1>
      </div>
      <p className="text-[13px] text-on-surface-variant max-w-xl mb-lg leading-relaxed">
        AI-powered biometric intelligence platform. Enroll identities, run real-time
        face verification, and manage your secure recognition gallery.
      </p>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-sm mb-lg">
        {[
          { icon: Shield, label: 'Secure', desc: 'ArcFace + FAISS' },
          { icon: Zap, label: 'Fast', desc: 'Vector search' },
          { icon: Fingerprint, label: 'Accurate', desc: '512-D embeddings' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flat-card p-sm flex flex-col gap-xs">
            <Icon className="w-5 h-5 text-accent-brass" strokeWidth={1.75} />
            <div>
              <p className="text-[13px] font-medium text-on-surface mt-1">{label}</p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Action cards */}
      <div className="grid sm:grid-cols-2 gap-sm">
        {[
          { to: '/live', Icon: Video, label: 'Live video recognition', desc: 'Stream from a camera with real-time bounding-box matching.', cta: 'Open feed →' },
          { to: '/logs', Icon: ScrollText, label: 'System logs', desc: 'Browse known and unknown detections, filter, and export CSV.', cta: 'View logs →' },
          { to: '/enroll', Icon: UserPlus, label: 'Identity enrollment', desc: 'Register a new subject with a clear photo and a name.', cta: '' },
          { to: '/bulk-enroll', Icon: Layers, label: 'Bulk enrollment', desc: 'Drag and drop a batch of photos to enroll many identities.', cta: '' },
          { to: '/recognize', Icon: ScanFace, label: 'Image verification', desc: 'Upload an image and match detected faces against enrolled identities.', cta: '' },
          { to: '/entities', Icon: Users, label: 'Entity management', desc: 'Delete identities and review the read-only deletion audit log.', cta: '' },
        ].map(({ to, Icon, label, desc, cta }) => (
          <Link
            key={to}
            to={to}
            className="group flat-card p-md flex flex-col justify-start hover:border-border-hover transition-colors duration-200"
          >
            <Icon className="w-6 h-6 text-accent-brass mb-2" strokeWidth={1.5} />
            <h2 className="text-[14px] font-medium text-on-surface mb-1">{label}</h2>
            <p className="text-[12px] text-on-surface-variant mb-2">{desc}</p>
            {cta && (
              <span className="text-[12px] text-accent-brass mt-auto font-medium">
                {cta}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
