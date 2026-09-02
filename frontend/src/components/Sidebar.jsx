import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanFace,
  UserPlus,
  Fingerprint,
  ScrollText,
  Users,
  Layers,
  Video,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/logs', label: 'System Logs', Icon: ScrollText },
  { to: '/live', label: 'Live Video', Icon: Video },
  { to: '/recognize', label: 'Image Verification', Icon: ScanFace },
  { to: '/enroll', label: 'Identity Enrollment', Icon: UserPlus },
  { to: '/bulk-enroll', label: 'Bulk Enrollment', Icon: Layers },
  { to: '/entities', label: 'Entity Management', Icon: Users },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <nav aria-label="Main navigation" className="h-screen w-64 fixed left-0 top-0 flat-sidebar flex flex-col z-50">
      {/* Logo */}
      <div className="p-lg flex items-center gap-md border-b border-border-subtle">
        <div className="w-10 h-10 shrink-0 flex items-center justify-center">
          <img src="/irid.ai-logo.png" alt="irid.ai logo" className="w-full h-full object-contain" />
        </div>
        <div>
          <h1 className="text-[17px] leading-tight font-bold text-brass">
            irid.ai
          </h1>
          <p className="text-caption text-on-surface-muted">Biometric Intelligence</p>
        </div>
      </div>

      {/* Navigation */}
      <ul className="flex flex-col gap-xs flex-grow overflow-y-auto px-sm py-md">
        {NAV_ITEMS.map(({ to, label, Icon }) => {
          const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);
          return (
            <li key={to}>
              <NavLink
                to={to}
                aria-current={isActive ? 'page' : undefined}
                className={
                  `flex items-center gap-md px-md py-sm rounded-lg text-body-sm font-medium transition-all duration-200 motion-reduce:transition-none min-h-[44px] ${isActive
                    ? 'bg-sidebar-active text-accent-brass border-l-2 border-sidebar-active-border'
                    : 'text-on-surface-variant hover:bg-surface-hover hover:text-on-surface'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" strokeWidth={1.75} />
                {label}
              </NavLink>
            </li>
          );
        })}
      </ul>

      {/* User / logout */}
      <div className="p-md border-t border-border-subtle">
        {user && (
          <div className="flex items-center justify-between gap-sm mb-sm">
            <div className="min-w-0">
              <p className="text-body-sm text-on-surface truncate">{user.name}</p>
              <p className="text-caption text-on-surface-muted capitalize">{user.role}</p>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="shrink-0 p-2 min-w-[40px] min-h-[40px] rounded-lg text-on-surface-variant hover:text-status-error hover:bg-status-error-bg transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4 mx-auto" />
            </button>
          </div>
        )}
        <p className="text-caption text-on-surface-muted">irid.ai &copy; {new Date().getFullYear()}</p>
      </div>
    </nav>
  );
}
