import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Clock3, LayoutList, TriangleAlert } from 'lucide-react';
import { listTodayAssignments, type ProLearningAssignmentResponse } from '../services/pasosApi';
import { getApiErrorMessage } from '../services/pasosApi';
import { useStore } from '../store/boardStore';
import { getBoardWorkspacePath, getWorkspaceRootPath } from '../utils/workspaceRoutes';

function classifyAssignment(assignment: ProLearningAssignmentResponse): 'today' | 'upcoming' | 'overdue' {
    if (!assignment.due_date) return 'upcoming';
    const now = new Date();
    const due = new Date(assignment.due_date);
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    if (due < startToday) return 'overdue';
    if (due <= endToday) return 'today';
    return 'upcoming';
}

export default function TodayView() {
    const navigate = useNavigate();
    const { setActiveBoard } = useStore();
    const [assignments, setAssignments] = useState<ProLearningAssignmentResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        listTodayAssignments()
            .then((payload) => {
                if (!cancelled) {
                    setAssignments(payload);
                    setError(null);
                }
            })
            .catch((issue) => {
                if (!cancelled) {
                    setError(getApiErrorMessage(issue, 'No se pudo cargar la Vista Hoy.'));
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const grouped = useMemo(() => ({
        overdue: assignments.filter((assignment) => classifyAssignment(assignment) === 'overdue'),
        today: assignments.filter((assignment) => classifyAssignment(assignment) === 'today'),
        upcoming: assignments.filter((assignment) => classifyAssignment(assignment) === 'upcoming'),
    }), [assignments]);

    const sections: Array<{
        key: 'overdue' | 'today' | 'upcoming';
        title: string;
        description: string;
        icon: typeof TriangleAlert;
        items: ProLearningAssignmentResponse[];
    }> = [
        {
            key: 'overdue',
            title: 'Vencidas',
            description: 'Secuencias que ya han superado su fecha objetivo.',
            icon: TriangleAlert,
            items: grouped.overdue,
        },
        {
            key: 'today',
            title: 'Hoy',
            description: 'Trabajo que toca revisar o poner en marcha hoy.',
            icon: CalendarClock,
            items: grouped.today,
        },
        {
            key: 'upcoming',
            title: 'Próximas',
            description: 'Secuencias previstas en los próximos días.',
            icon: Clock3,
            items: grouped.upcoming,
        },
    ];

    return (
        <div className="min-h-screen bg-lme-background px-4 py-6 text-lme-text sm:px-6 xl:px-8">
            <div className="mx-auto max-w-6xl">
                <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Link to={getWorkspaceRootPath('classroom')} className="inline-flex items-center gap-2 text-sub transition-colors hover:text-ink">
                            <ArrowLeft className="h-4 w-4" />
                            Volver al tablero
                        </Link>
                        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-sub">Pasos Aula</p>
                        <h1 className="mt-1 text-3xl font-black text-ink">Vista Hoy</h1>
                        <p className="mt-2 text-sm text-sub">
                            Planificación activa por alumno o grupo para hoy y los próximos días.
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 self-start rounded-full border border-mint/30 bg-mint/10 px-4 py-2 text-sm font-semibold text-mint">
                        <LayoutList className="h-4 w-4" />
                        {assignments.length} asignación(es)
                    </div>
                </header>

                {loading && (
                    <div className="rounded-2xl border border-lme-border bg-lme-surface-alt/80 p-6 text-sm text-sub">
                        Cargando asignaciones activas...
                    </div>
                )}

                {error && (
                    <div className="rounded-2xl border border-lme-danger/30 bg-lme-danger/10 p-6 text-sm text-lme-danger/70">
                        {error}
                    </div>
                )}

                {!loading && !error && (
                    <div className="space-y-6">
                        {sections.map(({ key, title, description, icon: Icon, items }) => (
                            <section key={key} className="rounded-3xl border border-lme-border bg-lme-surface-alt/80 p-5">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-2xl bg-black/20 p-3">
                                        <Icon className="h-5 w-5 text-sky" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-ink">{title}</h2>
                                        <p className="text-sm text-sub">{description}</p>
                                    </div>
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                    {items.length === 0 ? (
                                        <div className="rounded-2xl border border-lme-border bg-black/20 p-4 text-sm text-sub">
                                            No hay secuencias en esta franja.
                                        </div>
                                    ) : (
                                        items.map((assignment) => (
                                            <article key={assignment.id} className="rounded-2xl border border-lme-border bg-black/20 p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-ink">{assignment.target_label}</p>
                                                        <p className="text-xs text-sub">
                                                            {assignment.target_type === 'student' ? 'Alumno' : 'Grupo'} · {assignment.board_title}
                                                        </p>
                                                    </div>
                                                    {assignment.due_date && (
                                                        <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] font-semibold text-ink">
                                                            {new Date(assignment.due_date).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                                {assignment.notes && <p className="mt-3 text-sm text-sub">{assignment.notes}</p>}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveBoard(assignment.board_id);
                                                        navigate(getBoardWorkspacePath({
                                                            organizationId: assignment.organization_id ?? undefined,
                                                            teamId: assignment.team_id ?? undefined,
                                                            contextType: assignment.team_id ? 'team' : assignment.organization_id ? 'organization' : 'personal',
                                                        }));
                                                    }}
                                                    className="mt-4 rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-white/10"
                                                >
                                                    Abrir tablero
                                                </button>
                                            </article>
                                        ))
                                    )}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
