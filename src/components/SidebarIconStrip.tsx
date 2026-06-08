import { Activity, Building2, Columns2, GraduationCap, HelpCircle, Layers, MessageSquare, Mic2, Share2, Users, Zap } from 'lucide-react';

export interface SidebarPanelDef {
    key: string;
    label: string;
    help: string;
    icon: React.ReactNode;
    available: boolean;
}

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

/* ── Definiciones de paneles por workspace ─────────────────────────── */

export const CLASSROOM_SIDEBAR_PANELS: Omit<SidebarPanelDef, 'available'>[] = [
    {
        key: 'quick_create',
        label: 'Entrada rápida',
        help: 'Añade tareas al Kanban sin abrir modales. Ideal para dictar durante la clase.',
        icon: <Zap className="w-4 h-4" />,
    },
    {
        key: 'teacher_insights',
        label: 'Panel docente',
        help: 'Métricas pedagógicas, enlace de alumno, actividad reciente y seguimiento individual.',
        icon: <GraduationCap className="w-4 h-4" />,
    },
    {
        key: 'share_sync',
        label: 'Compartir y sync',
        help: 'Genera el enlace que tus alumnos usan para ver y completar las tareas del tablero.',
        icon: <Share2 className="w-4 h-4" />,
    },
    {
        key: 'learners',
        label: 'Seguimiento del alumnado',
        help: 'Ve quién completó, quién pide ayuda y lee las evidencias entregadas, alumno por alumno.',
        icon: <Users className="w-4 h-4" />,
    },
    {
        key: 'recent_activity',
        label: 'Actividad reciente',
        help: 'Historial de acciones del tablero: qué tarea se movió, quién la completó y cuándo.',
        icon: <Activity className="w-4 h-4" />,
    },
];

export const ORG_SIDEBAR_PANELS: Omit<SidebarPanelDef, 'available'>[] = [
    {
        key: 'workspace_context',
        label: 'Organización y equipo',
        help: 'Selecciona la organización activa, cambia de equipo y crea tableros en el contexto correcto.',
        icon: <Building2 className="w-4 h-4" />,
    },
    {
        key: 'team_coordination',
        label: 'Coordinación semanal',
        help: 'Resumen de bloqueos, vencimientos próximos y tareas en riesgo del equipo.',
        icon: <Layers className="w-4 h-4" />,
    },
    {
        key: 'team_meeting',
        label: 'Modo reunión',
        help: 'Prepara la reunión del equipo, proyecta los acuerdos en pantalla y genera un acta trazable.',
        icon: <Mic2 className="w-4 h-4" />,
    },
    {
        key: 'team_activity',
        label: 'Actividad y acuerdos',
        help: 'Conversación del equipo, acuerdos pendientes e incidencias abiertas del tablero.',
        icon: <MessageSquare className="w-4 h-4" />,
    },
];

export const HELP_PANEL: Omit<SidebarPanelDef, 'available'> = {
    key: 'help',
    label: 'Ayuda',
    help: 'Explicaciones de cada función para sacar el máximo partido a Pasos.',
    icon: <HelpCircle className="w-4 h-4" />,
};
