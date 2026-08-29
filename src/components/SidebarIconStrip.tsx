import { Columns2 } from 'lucide-react';
import type { SidebarPanelDef } from './sidebarPanels';

interface Props {
    panels: SidebarPanelDef[];
    activePanel: string | null;
    onToggle: (key: string) => void;
    /** Llama a esta función cuando el usuario quiere volver al Kanban completo */
    onShowKanban: () => void;
}

export function SidebarIconStrip({ panels, activePanel, onToggle, onShowKanban }: Props) {
    const visible = panels.filter((p) => p.available);
    if (visible.length === 0) return null;

    const kanbanIsActive = activePanel === null;

    return (
        <div className="hidden xl:flex flex-col items-center shrink-0 w-14 border-l border-lme-border/50 py-3 gap-1">
            {/* Botón Kanban — siempre visible, cierra cualquier panel */}
            <button
                type="button"
                onClick={onShowKanban}
                title="Kanban — ver tablero completo"
                aria-label="Volver al Kanban"
                aria-pressed={kanbanIsActive}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    kanbanIsActive
                        ? 'bg-mint/20 text-mint border border-mint/30 shadow-sm'
                        : 'text-sub hover:text-ink hover:bg-white/5 border border-transparent'
                }`}
            >
                <Columns2 className="w-4 h-4" />
            </button>
            {/* Separador */}
            <div className="w-6 border-t border-lme-border/50 my-1" />
            {visible.map((panel) => {
                const isActive = activePanel === panel.key;
                return (
                    <button
                        key={panel.key}
                        type="button"
                        onClick={() => onToggle(panel.key)}
                        title={`${panel.label} — ${panel.help}`}
                        aria-label={panel.label}
                        aria-pressed={isActive}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            isActive
                                ? 'bg-sky/20 text-sky border border-sky/30 shadow-sm'
                                : 'text-sub hover:text-ink hover:bg-white/5 border border-transparent'
                        }`}
                    >
                        {panel.icon}
                    </button>
                );
            })}
        </div>
    );
}
