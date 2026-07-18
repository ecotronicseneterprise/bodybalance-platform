"use client";

import { useState, type ReactNode } from "react";

export interface NavItem {
  label: string;
  href: string;
  live: boolean;
  badge?: number;
}

export interface AppShellProps {
  clinicName: string;
  userName: string;
  roleLabel: string;
  nav: NavItem[];
  currentPath: string;
  signOutSlot: ReactNode;
  children: ReactNode;
}

/**
 * Admin app shell: fixed sidebar on desktop, hamburger + slide-over on
 * mobile. Framework-free presentational component — the app passes
 * currentPath from usePathname so this package never imports next/*.
 */
export function AppShell({
  clinicName,
  userName,
  roleLabel,
  nav,
  currentPath,
  signOutSlot,
  children,
}: AppShellProps) {
  const [open, setOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm font-bold text-white">
          B
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{clinicName}</p>
          <p className="truncate text-[11px] text-muted">
            {userName} · {roleLabel}
          </p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {nav.map((item) =>
          item.live ? (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${
                currentPath === item.href
                  ? "bg-lavender font-semibold text-brand-deep"
                  : "text-ink/70 hover:bg-ground"
              }`}
            >
              {item.label}
              {item.badge ? (
                <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">
                  {item.badge}
                </span>
              ) : null}
            </a>
          ) : (
            <span
              key={item.label}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted/70"
            >
              {item.label}
              <span className="rounded bg-ground px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                soon
              </span>
            </span>
          ),
        )}
      </nav>
      <div className="border-t border-line p-3">{signOutSlot}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ground">
      {/* mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-line bg-white px-4 py-3 md:hidden">
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink"
        >
          <span aria-hidden className="text-lg leading-none">
            {open ? "✕" : "☰"}
          </span>
        </button>
        <div className="grid h-7 w-7 place-items-center rounded-md bg-brand text-xs font-bold text-white">
          B
        </div>
        <span className="truncate text-sm font-semibold text-ink">{clinicName}</span>
      </header>

      {/* mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            aria-hidden
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/30"
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-line bg-white shadow-card">
            {sidebar}
          </aside>
        </div>
      ) : null}

      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-line bg-white md:block">
        {sidebar}
      </aside>

      <main className="md:pl-60">{children}</main>
    </div>
  );
}
