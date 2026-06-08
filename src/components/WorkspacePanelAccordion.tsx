import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface WorkspacePanelAccordionProps {
    title: string;
    description?: string;
    expanded: boolean;
    onToggleExpanded: () => void;
    children: ReactNode;
    badge?: string;
    actions?: ReactNode;
    className?: string;
    contentClassName?: string;
}

export function WorkspacePanelAccordion({
    title,
    description,
    expanded,
    onToggleExpanded,
    children,
    badge,
    actions,
    className = '',
    contentClassName = '',
}: WorkspacePanelAccordionProps) {
    return (
        <section className={`rounded-2xl border border-lme-border bg-lme-surface-alt/80 ${className}`.trim()}>
            <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5">
                <button
                    type="button"
                    onClick={onToggleExpanded}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    aria-expanded={expanded}
                >
                    <span className={`mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-line bg-black/20 transition-transform ${expanded ? 'rotate-180' : ''}`}>
                        <ChevronDown className="h-4 w-4 text-sub" />
                    </span>
                    <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold uppercase tracking-wide text-ink">{title}</span>
                            {badge && (
                                <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] font-semibold text-sub">
                                    {badge}
                                </span>
                            )}
                        </span>
                        {description && (
                            <span className="mt-1 block text-sm leading-6 text-sub">
                                {description}
                            </span>
                        )}
                    </span>
                </button>
                {actions && (
                    <div className="flex flex-shrink-0 items-center gap-2">
                        {actions}
                    </div>
                )}
            </div>
            {expanded && (
                <div className={`border-t border-lme-border px-4 py-4 sm:px-5 ${contentClassName}`.trim()}>
                    {children}
                </div>
            )}
        </section>
    );
}
