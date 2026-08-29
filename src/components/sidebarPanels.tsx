import { Activity, Building2, GraduationCap, Layers, MessageSquare, Mic2, Share2, Users, Zap } from 'lucide-react';

export interface SidebarPanelDef {
    key: string;
    label: string;
    help: string;
    icon: React.ReactNode;
    available: boolean;
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
