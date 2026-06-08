import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { WorkspacePanelKey, WorkspacePanelPreference } from '../store/boardStore';

export interface WorkspacePanelMenuItem {
    key: WorkspacePanelKey;
    label: string;
    description: string;
}

interface Props {
    items: WorkspacePanelMenuItem[];
    preferences: Record<WorkspacePanelKey, WorkspacePanelPreference>;
    onUpdatePreference: (panel: WorkspacePanelKey, updates: Partial<WorkspacePanelPreference>) => void;
    onReset: () => void;
}

export function WorkspacePanelsMenu({ items, preferences, onUpdatePreference, onReset }: Props) {
    const [open, setOpen] = useState(false);
    const hiddenCount = items.filter((item) => !preferences[item.key].visible).length;

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-black/20 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-white/5"
                aria-haspopup="menu"
                aria-expanded={open}
            >
                <SlidersHorizontal className="h-4 w-4" />
                Personalizar vista
                {hiddenCount > 0 && (
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-sub">
                        {hiddenCount} oculto{hiddenCount === 1 ? '' : 's'}
                    </span>
                )}
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-dropdown-backdrop" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full z-dropdown mt-2 w-[22rem] rounded-2xl border border-lme-border bg-lme-surface-alt p-3 shadow-2xl">
                        <div className="flex items-start justify-between gap-3 px-2 py-1">
                            <div>
                                <p className="text-sm font-bold text-ink">Paneles visibles</p>
                                <p className="mt-1 text-xs leading-5 text-sub">
                                    Decide qué módulos ves y guarda esa preferencia entre sesiones.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => { onReset(); setOpen(false); }}
                                className="text-xs font-semibold text-sky transition-colors hover:text-sky/80"
                            >
                                Restablecer
                            </button>
                        </div>
                        <div className="mt-2 space-y-2">
                            {items.map((item) => {
                                const pref = preferences[item.key];
                                return (
                                    <label
                                        key={item.key}
                                        className="flex items-start gap-3 rounded-xl border border-lme-border bg-black/20 px-3 py-3 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={pref.visible}
                                            onChange={(e) => onUpdatePreference(item.key, { visible: e.target.checked })}
                                            className="mt-1"
                                        />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-semibold text-ink">{item.label}</span>
                                            <span className="mt-1 block text-xs leading-5 text-sub">{item.description}</span>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
