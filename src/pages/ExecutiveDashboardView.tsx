import { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    ArrowLeft,
    Building2,
    CircleDashed,
    Download,
    FileClock,
    Flag,
    Layers3,
    RefreshCw,
    Users,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ViewNavHeader } from '../components/ViewNavHeader';
import {
    exportExecutiveDashboardCsv,
    getApiErrorMessage,
    getExecutiveDashboard,
    listOrganizationTeams,
    type ProExecutiveDashboardResponse,
    type ProTeamResponse,
} from '../services/pasosApi';
import { useStore } from '../store/boardStore';
import { getBoardWorkspacePath, getWorkspaceRootPath } from '../utils/workspaceRoutes';

const PERIOD_OPTIONS = [
    { value: 14, label: '14 dias' },
    { value: 30, label: '30 dias' },
    { value: 60, label: '60 dias' },
    { value: 90, label: '90 dias' },
];

function formatTimestamp(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Pendiente' : date.toLocaleString();
}

function summaryTone(kind: 'progress' | 'blocked' | 'delayed' | 'milestone' | 'documents' | 'blockers'): string {
    /* Solo borde + fondo semántico. El texto se gestiona explícitamente en cada elemento. */
    if (kind === 'progress') return 'border-mint/40 bg-mint/10 [&_svg]:text-mint';
    if (kind === 'blocked') return 'border-lme-warning/40 bg-lme-warning/10 [&_svg]:text-lme-warning';
    if (kind === 'delayed') return 'border-lme-danger/40 bg-lme-danger/10 [&_svg]:text-lme-danger';
    if (kind === 'milestone') return 'border-sky/40 bg-sky/10 [&_svg]:text-sky';
    if (kind === 'documents') return 'border-vio/40 bg-vio/10 [&_svg]:text-vio';
    return 'border-line bg-black/20 [&_svg]:text-sub';
}

function statusBadge(status: 'draft' | 'in_review' | 'approved' | 'published'): string {
    if (status === 'in_review') return 'border-lme-warning/30 bg-lme-warning/10 text-lme-warning/85';
    if (status === 'approved') return 'border-mint/30 bg-mint/10 text-mint';
    if (status === 'published') return 'border-sky/30 bg-sky/10 text-sky';
    return 'border-white/10 bg-white/5 text-sub';
}

function recurringBlockerTone(blockedTaskCount: number): string {
    if (blockedTaskCount >= 3) return 'border-lme-danger/30 bg-lme-danger/10';
    if (blockedTaskCount >= 2) return 'border-lme-warning/30 bg-lme-warning/10';
    return 'border-line bg-black/20';
}

export default function ExecutiveDashboardView() {
    const navigate = useNavigate();
    const {
        boards,
        currentUser,
        currentOrganizationId,
        currentTeamId,
        setActiveBoard,
    } = useStore();
    const isProUser = currentUser?.mode === 'pro';
    const [availableTeams, setAvailableTeams] = useState<ProTeamResponse[]>([]);
    const [dashboard, setDashboard] = useState<ProExecutiveDashboardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [periodDays, setPeriodDays] = useState(30);
    const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
    const [selectedBoardId, setSelectedBoardId] = useState<string>('all');
    const [selectedOwnerLabel, setSelectedOwnerLabel] = useState<string>('all');
    const [refreshTick, setRefreshTick] = useState(0);

    const proBoards = useMemo(() => (
        boards.filter((board) => board.ownerId === currentUser?.id || Boolean(board.remoteRole))
    ), [boards, currentUser?.id]);
    const effectiveTeamId = currentTeamId ?? (selectedTeamId !== 'all' ? selectedTeamId : null);
    const scopedBoards = useMemo(() => (
        proBoards.filter((board) => {
            if (effectiveTeamId) {
                return board.teamId === effectiveTeamId;
            }
            if (currentOrganizationId) {
                return board.organizationId === currentOrganizationId;
            }
            return !board.organizationId && !board.teamId;
        })
    ), [currentOrganizationId, effectiveTeamId, proBoards]);
    const ownerOptions = useMemo(() => dashboard?.owners ?? [], [dashboard?.owners]);
    const teamOptions = useMemo(() => {
        if (currentTeamId) {
            const currentTeam = dashboard?.teams.find((team) => team.team_id === currentTeamId);
            return [
                {
                    id: currentTeamId,
                    name: currentTeam?.team_name ?? 'Equipo activo',
                },
            ];
        }
        return availableTeams.map((team) => ({ id: team.id, name: team.name }));
    }, [availableTeams, currentTeamId, dashboard?.teams]);

    useEffect(() => {
        if (!isProUser || !currentOrganizationId || currentTeamId) {
            setAvailableTeams([]);
            return;
        }

        let cancelled = false;
        void listOrganizationTeams(currentOrganizationId)
            .then((payload) => {
                if (!cancelled) {
                    setAvailableTeams(payload);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setAvailableTeams([]);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [currentOrganizationId, currentTeamId, isProUser]);

    useEffect(() => {
        if (selectedBoardId !== 'all' && !scopedBoards.some((board) => board.id === selectedBoardId)) {
            setSelectedBoardId('all');
        }
    }, [scopedBoards, selectedBoardId]);

    useEffect(() => {
        if (selectedOwnerLabel !== 'all' && !ownerOptions.some((owner) => owner.owner_label === selectedOwnerLabel)) {
            setSelectedOwnerLabel('all');
        }
    }, [ownerOptions, selectedOwnerLabel]);

    useEffect(() => {
        if (!isProUser) {
            setDashboard(null);
            setLoading(false);
            setError(null);
            return;
        }

        let cancelled = false;

        async function loadDashboard() {
            setLoading(true);
            try {
                const payload = await getExecutiveDashboard({
                    organizationId: currentOrganizationId,
                    teamId: effectiveTeamId,
                    boardId: selectedBoardId !== 'all' ? selectedBoardId : null,
                    ownerLabel: selectedOwnerLabel !== 'all' ? selectedOwnerLabel : null,
                    periodDays,
                });
                if (!cancelled) {
                    setDashboard(payload);
                    setError(null);
                }
            } catch (issue) {
                if (!cancelled) {
                    setError(getApiErrorMessage(issue, 'No se pudo cargar el panel ejecutivo.'));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadDashboard();

        return () => {
            cancelled = true;
        };
    }, [currentOrganizationId, effectiveTeamId, isProUser, periodDays, refreshTick, selectedBoardId, selectedOwnerLabel]);

    const handleExport = async () => {
        if (!isProUser) return;
        setExporting(true);
        try {
            const csv = await exportExecutiveDashboardCsv({
                organizationId: currentOrganizationId,
                teamId: effectiveTeamId,
                boardId: selectedBoardId !== 'all' ? selectedBoardId : null,
                ownerLabel: selectedOwnerLabel !== 'all' ? selectedOwnerLabel : null,
                periodDays,
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `pasos-panel-ejecutivo-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (issue) {
            setError(getApiErrorMessage(issue, 'No se pudo exportar el panel ejecutivo.'));
        } finally {
            setExporting(false);
        }
    };

    const openBoard = (boardId: string) => {
        setActiveBoard(boardId);
        const board = boards.find((item) => item.id === boardId) ?? null;
        navigate(getBoardWorkspacePath(board));
    };

    if (!isProUser) {
        return (
            <div className="min-h-screen bg-lme-background px-4 py-6 text-lme-text sm:px-6 xl:px-8">
                <div className="mx-auto max-w-5xl">
                    <Link to={getWorkspaceRootPath('organization')} className="inline-flex items-center gap-2 text-sub transition-colors hover:text-ink">
                        <ArrowLeft className="h-4 w-4" />
                        Volver al tablero
                    </Link>
                    <section className="mt-8 rounded-3xl border border-lme-border bg-lme-surface-alt/85 p-8">
                        <p className="text-xs font-bold uppercase tracking-wide text-sub">Panel ejecutivo · Pasos Claustro</p>
                        <h1 className="mt-2 text-3xl font-black text-ink">Disponible en Pasos Pro</h1>
                        <p className="mt-3 max-w-2xl text-sm text-sub">
                            El panel transversal de centro necesita organizaciones, equipos y sincronización remota para leer
                            proyectos, bloqueos y documentos del claustro.
                        </p>
                    </section>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-lme-background text-lme-text">
            <ViewNavHeader breadcrumb="Panel ejecutivo" workspaceMode="organization" />
            <div className="px-4 pb-6 sm:px-6 xl:px-8">
            <div className="mx-auto max-w-[1500px]">
                <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                        <Link to={getWorkspaceRootPath('organization')} className="inline-flex items-center gap-2 text-sub transition-colors hover:text-ink">
                            <ArrowLeft className="h-4 w-4" />
                            Volver al tablero
                        </Link>
                        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-sub">Centro · Lectura transversal</p>
                        <h1 className="mt-1 text-3xl font-black text-ink">Panel ejecutivo del centro</h1>
                        <p className="mt-2 max-w-3xl text-sm text-sub">
                            Detecta cuellos de botella, documentos pendientes, hitos vencidos y progreso por proyecto sin
                            entrar en cada tablero.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => setRefreshTick((current) => current + 1)}
                            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-sub transition-colors hover:bg-white/5 hover:text-ink"
                        >
                            <RefreshCw className="mr-2 inline h-4 w-4" />
                            Refrescar
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleExport()}
                            disabled={exporting}
                            className="rounded-full border border-sky/30 bg-sky/10 px-4 py-2 text-sm font-semibold text-sky transition-colors hover:bg-sky/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Download className="mr-2 inline h-4 w-4" />
                            {exporting ? 'Exportando...' : 'Exportar CSV'}
                        </button>
                    </div>
                </header>

                <section className="mb-6 rounded-3xl border border-lme-border bg-lme-surface-alt/85 p-4">
                    <div className="grid gap-4 lg:grid-cols-4 xl:grid-cols-5">
                        <label className="flex flex-col gap-2">
                            <span className="text-xs font-bold uppercase tracking-wide text-sub">Periodo</span>
                            <select
                                value={periodDays}
                                onChange={(event) => setPeriodDays(Number(event.target.value))}
                                className="rounded-xl border border-line bg-black/20 px-4 py-3 text-sm text-ink focus:border-sky focus:outline-none"
                            >
                                {PERIOD_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </label>
                        <label className="flex flex-col gap-2">
                            <span className="text-xs font-bold uppercase tracking-wide text-sub">Equipo</span>
                            <select
                                value={currentTeamId ?? selectedTeamId}
                                onChange={(event) => setSelectedTeamId(event.target.value)}
                                disabled={Boolean(currentTeamId)}
                                className="rounded-xl border border-line bg-black/20 px-4 py-3 text-sm text-ink focus:border-sky focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="all">Todos los equipos</option>
                                {teamOptions.map((team) => (
                                    <option key={team.id} value={team.id}>{team.name}</option>
                                ))}
                            </select>
                        </label>
                        <label className="flex flex-col gap-2">
                            <span className="text-xs font-bold uppercase tracking-wide text-sub">Proyecto</span>
                            <select
                                value={selectedBoardId}
                                onChange={(event) => setSelectedBoardId(event.target.value)}
                                className="rounded-xl border border-line bg-black/20 px-4 py-3 text-sm text-ink focus:border-sky focus:outline-none"
                            >
                                <option value="all">Todos los proyectos</option>
                                {scopedBoards.map((board) => (
                                    <option key={board.id} value={board.id}>{board.title}</option>
                                ))}
                            </select>
                        </label>
                        <label className="flex flex-col gap-2">
                            <span className="text-xs font-bold uppercase tracking-wide text-sub">Responsable</span>
                            <select
                                value={selectedOwnerLabel}
                                onChange={(event) => setSelectedOwnerLabel(event.target.value)}
                                className="rounded-xl border border-line bg-black/20 px-4 py-3 text-sm text-ink focus:border-sky focus:outline-none"
                            >
                                <option value="all">Todas las personas</option>
                                {ownerOptions.map((owner) => (
                                    <option key={owner.owner_label} value={owner.owner_label}>{owner.owner_label}</option>
                                ))}
                            </select>
                        </label>
                        <div className="flex flex-col justify-end rounded-2xl border border-lme-border bg-black/20 px-4 py-3 text-sm text-sub">
                            <span className="text-xs font-bold uppercase tracking-wide text-sub">Generado</span>
                            <span className="mt-2 text-ink">{dashboard ? formatTimestamp(dashboard.generated_at) : 'Cargando...'}</span>
                        </div>
                    </div>
                </section>

                {error && (
                    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-lme-danger/30 bg-lme-danger/10 p-4 text-lme-danger/70">
                        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                    {[
                        {
                            label: 'Avance global',
                            value: `${dashboard?.summary.progress_percent ?? 0}%`,
                            detail: `${dashboard?.summary.completed_tasks ?? 0}/${dashboard?.summary.total_tasks ?? 0} tareas`,
                            kind: 'progress' as const,
                            icon: Layers3,
                        },
                        {
                            label: 'Bloqueadas',
                            value: String(dashboard?.summary.blocked_count ?? 0),
                            detail: `${dashboard?.summary.total_boards ?? 0} proyectos visibles`,
                            kind: 'blocked' as const,
                            icon: CircleDashed,
                        },
                        {
                            label: 'Retrasadas',
                            value: String(dashboard?.summary.delayed_count ?? 0),
                            detail: `Ventana ${periodDays} dias`,
                            kind: 'delayed' as const,
                            icon: AlertTriangle,
                        },
                        {
                            label: 'Hitos vencidos',
                            value: String(dashboard?.summary.overdue_milestone_count ?? 0),
                            detail: 'Seguimiento directivo',
                            kind: 'milestone' as const,
                            icon: Flag,
                        },
                        {
                            label: 'Documentos pendientes',
                            value: String(dashboard?.summary.pending_document_count ?? 0),
                            detail: 'Draft o revision',
                            kind: 'documents' as const,
                            icon: FileClock,
                        },
                        {
                            label: 'Bloqueos repetidos',
                            value: String(dashboard?.summary.recurrent_blocker_count ?? 0),
                            detail: 'Patrones transversales',
                            kind: 'blockers' as const,
                            icon: Building2,
                        },
                    ].map(({ label, value, detail, kind, icon: Icon }) => (
                        <article key={label} className={`rounded-2xl border p-4 ${summaryTone(kind)}`}>
                            {/* Icono hereda el color semántico; label y valor usan colores legibles */}
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-sub">
                                <Icon className="h-4 w-4" style={{ color: 'inherit' }} />
                                {label}
                            </div>
                            <p className="mt-3 text-3xl font-black text-ink">{loading && !dashboard ? '…' : value}</p>
                            <p className="mt-2 text-xs text-sub">{detail}</p>
                        </article>
                    ))}
                </section>

                <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
                    <section className="space-y-6">
                        <article className="rounded-3xl border border-lme-border bg-lme-surface-alt/85 p-5">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-sub">Indicadores por equipo</p>
                                    <h2 className="mt-1 text-xl font-bold text-ink">Pulso organizativo</h2>
                                </div>
                                <span className="text-xs text-sub">{dashboard?.teams.length ?? 0} equipos visibles</span>
                            </div>
                            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                {(dashboard?.teams ?? []).map((team) => (
                                    <article key={team.team_id ?? team.team_name} className="rounded-2xl border border-line bg-black/20 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-ink">{team.team_name}</p>
                                                <p className="mt-1 text-xs text-sub">{team.board_count} proyectos · {team.total_tasks} tareas</p>
                                            </div>
                                            <span className="rounded-full bg-mint/10 px-3 py-1 text-xs font-bold text-mint">
                                                {team.progress_percent}%
                                            </span>
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-sub">
                                            <span className="rounded-xl bg-white/5 px-3 py-2">Bloqueadas: <span className="text-ink">{team.blocked_count}</span></span>
                                            <span className="rounded-xl bg-white/5 px-3 py-2">Retrasadas: <span className="text-ink">{team.delayed_count}</span></span>
                                            <span className="rounded-xl bg-white/5 px-3 py-2">Hitos: <span className="text-ink">{team.overdue_milestone_count}</span></span>
                                            <span className="rounded-xl bg-white/5 px-3 py-2">Docs: <span className="text-ink">{team.pending_document_count}</span></span>
                                        </div>
                                    </article>
                                ))}
                                {!loading && (dashboard?.teams.length ?? 0) === 0 && (
                                    <p className="rounded-2xl border border-line bg-black/20 p-4 text-sm text-sub">
                                        Todavia no hay equipos con actividad suficiente para generar indicadores.
                                    </p>
                                )}
                            </div>
                        </article>

                        <article className="rounded-3xl border border-lme-border bg-lme-surface-alt/85 p-5">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-sub">Avance por proyecto</p>
                                    <h2 className="mt-1 text-xl font-bold text-ink">Donde intervenir primero</h2>
                                </div>
                                <span className="text-xs text-sub">Ordenado por riesgo y progreso</span>
                            </div>
                            <div className="mt-4 overflow-x-auto">
                                <table className="min-w-full divide-y divide-line text-sm">
                                    <thead>
                                        <tr className="text-left text-xs uppercase tracking-wide text-sub">
                                            <th className="pb-3 pr-4 font-semibold">Proyecto</th>
                                            <th className="pb-3 pr-4 font-semibold">Equipo</th>
                                            <th className="pb-3 pr-4 font-semibold">Avance</th>
                                            <th className="pb-3 pr-4 font-semibold">Riesgo</th>
                                            <th className="pb-3 font-semibold">Actualizado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-line/60">
                                        {(dashboard?.projects ?? []).map((project) => (
                                            <tr key={project.board_id}>
                                                <td className="py-3 pr-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => openBoard(project.board_id)}
                                                        className="text-left transition-colors hover:text-sky"
                                                    >
                                                        <span className="font-semibold text-ink">{project.board_title}</span>
                                                        <span className="mt-1 block text-xs text-sub">{project.total_tasks} tareas · {project.completed_tasks} completadas</span>
                                                    </button>
                                                </td>
                                                <td className="py-3 pr-4 text-sub">{project.team_name || 'Espacio personal'}</td>
                                                <td className="py-3 pr-4">
                                                    <span className="rounded-full bg-mint/10 px-3 py-1 text-xs font-bold text-mint">
                                                        {project.progress_percent}%
                                                    </span>
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <div className="flex flex-wrap gap-2 text-xs text-sub">
                                                        <span className="rounded-full bg-white/5 px-2 py-1">Bloq {project.blocked_count}</span>
                                                        <span className="rounded-full bg-white/5 px-2 py-1">Retr {project.delayed_count}</span>
                                                        <span className="rounded-full bg-white/5 px-2 py-1">Hitos {project.overdue_milestone_count}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 text-sub">{formatTimestamp(project.updated_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {!loading && (dashboard?.projects.length ?? 0) === 0 && (
                                    <p className="rounded-2xl border border-line bg-black/20 p-4 text-sm text-sub">
                                        No hay proyectos que coincidan con los filtros activos.
                                    </p>
                                )}
                            </div>
                        </article>

                        <article className="rounded-3xl border border-lme-border bg-lme-surface-alt/85 p-5">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-sub">Bloqueos recurrentes</p>
                                    <h2 className="mt-1 text-xl font-bold text-ink">Patrones que se repiten</h2>
                                </div>
                                <span className="text-xs text-sub">{dashboard?.recurring_blockers.length ?? 0} señales</span>
                            </div>
                            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                {(dashboard?.recurring_blockers ?? []).map((blocker) => (
                                    <article key={blocker.blocker_label} className={`rounded-2xl border p-4 ${recurringBlockerTone(blocker.blocked_task_count)}`}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-ink">{blocker.blocker_label}</p>
                                                <p className="mt-1 text-xs text-sub">
                                                    {blocker.blocked_task_count} tareas afectadas · {blocker.board_count} proyecto(s)
                                                </p>
                                            </div>
                                            <AlertTriangle className="h-5 w-5 text-current" />
                                        </div>
                                        <p className="mt-3 text-xs text-sub">
                                            Proyectos: <span className="text-ink">{blocker.board_titles.join(', ') || 'Sin detalle'}</span>
                                        </p>
                                        <p className="mt-2 text-xs text-sub">
                                            Responsables: <span className="text-ink">{blocker.owner_labels.join(', ') || 'Sin responsable'}</span>
                                        </p>
                                    </article>
                                ))}
                                {!loading && (dashboard?.recurring_blockers.length ?? 0) === 0 && (
                                    <p className="rounded-2xl border border-line bg-black/20 p-4 text-sm text-sub">
                                        No se han detectado bloqueos repetidos en la ventana seleccionada.
                                    </p>
                                )}
                            </div>
                        </article>
                    </section>

                    <aside className="space-y-6">
                        <article className="rounded-3xl border border-lme-border bg-lme-surface-alt/85 p-5">
                            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                                <Users className="h-4 w-4 text-sky" />
                                Carga por responsable
                            </div>
                            <div className="mt-4 space-y-3">
                                {(dashboard?.owners ?? []).map((owner) => (
                                    <article key={owner.owner_label} className="rounded-2xl border border-line bg-black/20 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-ink">{owner.owner_label}</p>
                                                <p className="mt-1 text-xs text-sub">{owner.task_count} tareas abiertas · {owner.board_count} proyecto(s)</p>
                                            </div>
                                            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-ink">
                                                {owner.effort_points} pts
                                            </span>
                                        </div>
                                        <p className="mt-3 text-xs text-sub">
                                            Bloqueadas: <span className="text-ink">{owner.blocked_count}</span> · Retrasadas: <span className="text-ink">{owner.delayed_count}</span>
                                        </p>
                                    </article>
                                ))}
                                {!loading && (dashboard?.owners.length ?? 0) === 0 && (
                                    <p className="rounded-2xl border border-line bg-black/20 p-4 text-sm text-sub">
                                        No hay responsables visibles para los filtros aplicados.
                                    </p>
                                )}
                            </div>
                        </article>

                        <article className="rounded-3xl border border-lme-border bg-lme-surface-alt/85 p-5">
                            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                                <FileClock className="h-4 w-4 text-lme-warning" />
                                Documentos pendientes
                            </div>
                            <div className="mt-4 space-y-3">
                                {(dashboard?.pending_documents ?? []).map((document) => (
                                    <article key={document.document_id} className="rounded-2xl border border-line bg-black/20 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-ink">{document.title}</p>
                                                <p className="mt-1 text-xs text-sub">{document.board_title} · {document.team_name || 'Centro / claustro'}</p>
                                            </div>
                                            <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${statusBadge(document.status)}`}>
                                                {document.status === 'in_review' ? 'Revision' : 'Borrador'}
                                            </span>
                                        </div>
                                        <p className="mt-3 text-xs text-sub">
                                            {document.author_label || 'Sin autor visible'} · {document.age_days} dias pendiente
                                        </p>
                                        <p className="mt-1 text-xs text-sub">Ultima actualizacion: {formatTimestamp(document.updated_at)}</p>
                                    </article>
                                ))}
                                {!loading && (dashboard?.pending_documents.length ?? 0) === 0 && (
                                    <p className="rounded-2xl border border-line bg-black/20 p-4 text-sm text-sub">
                                        No hay documentos pendientes con los filtros activos.
                                    </p>
                                )}
                            </div>
                        </article>

                        <article className="rounded-3xl border border-lme-border bg-lme-surface-alt/85 p-5">
                            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                                <Flag className="h-4 w-4 text-lme-danger/80" />
                                Hitos vencidos
                            </div>
                            <div className="mt-4 space-y-3">
                                {(dashboard?.overdue_milestones ?? []).map((milestone) => (
                                    <article key={`${milestone.board_id}-${milestone.task_id}`} className="rounded-2xl border border-lme-danger/30 bg-lme-danger/10 p-4">
                                        <p className="text-sm font-bold text-ink">{milestone.title}</p>
                                        <p className="mt-1 text-xs text-sub">{milestone.board_title} · {milestone.team_name || 'Centro / claustro'}</p>
                                        <p className="mt-3 text-xs text-sub">
                                            Responsable: <span className="text-ink">{milestone.owner_label || 'Sin asignar'}</span>
                                        </p>
                                        <p className="mt-1 text-xs text-sub">
                                            Vencido hace <span className="text-ink">{milestone.delayed_days} dias</span> · {new Date(milestone.due_at).toLocaleDateString()}
                                        </p>
                                    </article>
                                ))}
                                {!loading && (dashboard?.overdue_milestones.length ?? 0) === 0 && (
                                    <p className="rounded-2xl border border-line bg-black/20 p-4 text-sm text-sub">
                                        No hay hitos vencidos en la ventana seleccionada.
                                    </p>
                                )}
                            </div>
                        </article>
                    </aside>
                </div>
            </div>
            </div>
        </div>
    );
}
