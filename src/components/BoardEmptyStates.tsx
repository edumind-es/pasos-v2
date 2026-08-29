import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, Layout, ListChecks, RefreshCcw } from 'lucide-react';
import type { SupportedBoardType } from '../utils/boardPresets';

/** Puerta de acceso al espacio Claustro para cuentas sin plan Pro. */
export function ProWorkspaceGate() {
    return (
        <div className="min-h-screen bg-lme-background px-4 py-6 text-lme-text sm:px-6 xl:px-8">
            <div className="mx-auto max-w-4xl">
                <Link to="/" className="inline-flex items-center gap-2 text-sub transition-colors hover:text-ink">
                    <Layout className="h-4 w-4" />
                    Volver al panel de acceso
                </Link>
                <section className="mt-8 rounded-3xl border border-lme-border bg-lme-surface-alt/70 p-8">
                    <p className="text-xs font-bold uppercase tracking-wide text-sub">Pasos Claustro</p>
                    <h1 className="mt-2 text-3xl font-black text-ink">
                        Este espacio es para trabajo institucional Pro
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-sub">
                        Pasos Claustro permite gestionar organizaciones, equipos, coordinación y seguimiento
                        institucional. Requiere una cuenta Pro docente vinculada al servidor de tu centro.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 rounded-lg bg-sky px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-sky/80"
                        >
                            Acceder con cuenta Pro
                        </Link>
                        <Link
                            to="/aula"
                            className="inline-flex items-center gap-2 rounded-lg border border-line px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-white/5"
                        >
                            Ir a Pasos Aula
                        </Link>
                    </div>
                    <p className="mt-6 text-xs text-sub max-w-xl">
                        Si tu centro tiene Pasos Pro activo, el administrador puede facilitarte las credenciales
                        o la URL de acceso directo.
                    </p>
                </section>
            </div>
        </div>
    );
}

const CLASSROOM_TEMPLATE_CHOICES = [
    {
        type: 'learning_sequence' as const,
        icon: <ListChecks className="w-5 h-5 text-sky" />,
        title: 'Secuencia de aprendizaje',
        desc: 'Pasos ordenados: Por hacer → En marcha → Listo',
        accent: 'border-sky/20 bg-sky/5 hover:border-sky/40',
    },
    {
        type: 'learning_routine' as const,
        icon: <RefreshCcw className="w-5 h-5 text-mint" />,
        title: 'Rutina visual',
        desc: 'Preparado → Ahora → Terminado. Ideal para rutinas diarias.',
        accent: 'border-mint/20 bg-mint/5 hover:border-mint/40',
    },
    {
        type: 'student_plan' as const,
        icon: <ClipboardList className="w-5 h-5 text-vio" />,
        title: 'Plan individual',
        desc: 'Organización personalizada para un alumno o grupo concreto.',
        accent: 'border-vio/20 bg-vio/5 hover:border-vio/40',
    },
];

interface ClassroomTemplatePickerProps {
    onPickTemplate: (type: SupportedBoardType | null) => void;
}

/** Selector de plantilla inicial cuando el aula todavía no tiene tablero. */
export function ClassroomTemplatePicker({ onPickTemplate }: ClassroomTemplatePickerProps) {
    return (
        <section className="mb-4 rounded-3xl border border-lme-border bg-lme-surface-alt/70 p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-sub">Pasos Aula</p>
            <h2 className="mt-2 text-2xl font-black text-ink">Elige una plantilla para empezar</h2>
            <p className="mt-2 text-sm leading-6 text-sub max-w-2xl">
                Cada plantilla configura las columnas del Kanban para un tipo de trabajo pedagógico. Puedes editarlo después.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {CLASSROOM_TEMPLATE_CHOICES.map(({ type, icon, title, desc, accent }) => (
                    <button
                        key={type}
                        type="button"
                        onClick={() => onPickTemplate(type)}
                        className={`group text-left rounded-2xl border p-4 transition-all ${accent}`}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="rounded-xl bg-white/5 p-2">{icon}</div>
                            <ArrowRight className="w-4 h-4 text-sub opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                        </div>
                        <p className="mt-3 text-sm font-bold text-ink">{title}</p>
                        <p className="mt-1 text-xs leading-5 text-sub">{desc}</p>
                    </button>
                ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={() => onPickTemplate(null)}
                    className="text-sm font-medium text-sub hover:text-ink transition-colors underline underline-offset-2"
                >
                    Crear tablero vacío
                </button>
                <Link to="/" className="text-sm font-medium text-sub hover:text-ink transition-colors">
                    Volver al panel de acceso
                </Link>
            </div>
        </section>
    );
}

interface EmptyWorkspaceNoticeProps {
    isClassroomWorkspace: boolean;
    canCreateBoard: boolean;
    onCreateBoard: () => void;
}

/** Aviso cuando no hay tablero activo (aula sin permisos o Claustro sin contexto). */
export function EmptyWorkspaceNotice({ isClassroomWorkspace, canCreateBoard, onCreateBoard }: EmptyWorkspaceNoticeProps) {
    return (
        <section className="mb-4 rounded-3xl border border-lme-border bg-lme-surface-alt/70 p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-sub">
                {isClassroomWorkspace ? 'Pasos Aula' : 'Pasos Claustro'}
            </p>
            <h2 className="mt-2 text-2xl font-black text-ink">
                {isClassroomWorkspace
                    ? 'Todavía no hay un tablero activo en tu espacio de aula'
                    : 'Selecciona o crea una organización para empezar'}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-sub">
                {isClassroomWorkspace
                    ? 'Crea tu primer tablero de aula desde este espacio y empezarás a ver la secuencia, la presentación y el seguimiento pedagógico.'
                    : 'El trabajo institucional vive en un espacio distinto. Primero elige una organización o un equipo y después crea el tablero correspondiente.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={onCreateBoard}
                    disabled={!canCreateBoard}
                    className="rounded-lg bg-sky px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-sky/80 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isClassroomWorkspace ? 'Crear tablero de aula' : 'Crear tablero organizativo'}
                </button>
                <Link
                    to="/"
                    className="rounded-lg border border-line px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-white/5"
                >
                    Volver al panel de acceso
                </Link>
            </div>
        </section>
    );
}
