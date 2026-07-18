/**
 * @bodybalance/ui — shared component library (BLUEPRINT 4.1, SPRINT-2-PLAN 2A).
 * Platform-branded primitives; utility classes compile in the consuming app
 * (globals.css @source includes this package). Brand values for the PATIENT
 * site come from clinic_settings at render time — never hardcoded here.
 *
 * 2A minimal set (founder-timeboxed): Button, Field/Input/Select/Textarea,
 * Card, AppShell, Toast, Skeleton. DataTable, Dialog, EmptyState,
 * SetupProgress, StatCard, Badge, PageHeader arrive with the 2B screens
 * that need them.
 */

export { Button, type ButtonProps } from "./button.tsx";
export { EmptyState, type EmptyStateProps } from "./empty-state.tsx";
export { PageHeader, type PageHeaderProps } from "./page-header.tsx";
export { SetupProgress, type SetupItem } from "./setup-progress.tsx";
export { Field, Input, Select, Textarea, type FieldProps } from "./form.tsx";
export { Card } from "./card.tsx";
export { Skeleton } from "./skeleton.tsx";
export { ToastProvider, useToast } from "./toast.tsx";
export { AppShell, type AppShellProps, type NavItem } from "./app-shell.tsx";
