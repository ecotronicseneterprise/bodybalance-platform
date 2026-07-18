"use client";

import { usePathname } from "next/navigation";
import { AppShell, ToastProvider, type NavItem } from "@bodybalance/ui";
import type { ReactNode } from "react";

export function ShellClient(props: {
  clinicName: string;
  userName: string;
  roleLabel: string;
  nav: NavItem[];
  signOutSlot: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  return (
    <ToastProvider>
      <AppShell {...props} currentPath={pathname} />
    </ToastProvider>
  );
}
