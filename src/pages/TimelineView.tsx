import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CalendarRange, ChevronLeft, ChevronRight, Network, Users } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ViewNavHeader } from '../components/ViewNavHeader';
import { getApiErrorMessage, getTimelineOverview, type ProTimelineOverviewResponse } from '../services/pasosApi';
import { useStore, type Board } from '../store/boardStore';
import { buildTimelineOverview, type TimelineAlert, type TimelineCapacity, type TimelineItem, type TimelineOverview } from '../utils/timeline';
import { getBoardWorkspacePath, getWorkspaceModeFromPath, getWorkspaceRootPath } from '../utils/workspaceRoutes';

function normalizeRemoteOverview(payload: ProTimelineOverviewResponse): TimelineOverview {
    return {
        scopeType: payload.scope_type,
        organizationId: payload.organization_id ?? undefined,
        teamId: payload.team_id ?? undefined,
        boardId: payload.board_id ?? undefined,
        itemCount: payload.item_count,
        blockedCount: payload.blocked_count,
        delayedCount: payload.delayed_count,
        milestoneRiskCount: payload.milestone_risk_count,
        items: payload.items.map((item) => ({
            taskId: item.task_id,
            boardId: item.board_id,
            boardTitle: item.board_title,
            title: item.title,
            taskType: item.task_type,
            ownerLabel: item.owner_label ?? undefined,
            effortPoints: item.effort_points,
            columnTitle: item.column_title ?? undefined,
            dependencyTaskIds: item.dependency_task_ids,
            blockedByTaskIds: item.blocked_by_task_ids,
            startAt: item.start_at ?? undefined,
            endAt: item.end_at ?? undefined,
            isBlocked: item.is_blocked,
            isDelayed: item.is_delayed,
            isMilestone: item.is_milestone,
            isCompleted: item.is_completed,
            contextType: item.context_type ?? undefined,
            organizationId: item.organization_id ?? undefined,
            teamId: item.team_id ?? undefined,
        })),
        alerts: payload.alerts.map((alert) => ({
            alertType: alert.alert_type,
            severity: alert.severity,
            taskId: alert.task_id,
            boardId: alert.board_id,
            boardTitle: alert.board_title,
            title: alert.title,
            ownerLabel: alert.owner_label ?? undefined,
            message: alert.message,
        })),
        capacities: payload.capacities.map((capacity) => ({
            ownerLabel: capacity.owner_label,
            taskCount: capacity.task_count,
            effortPoints: capacity.effort_points,
            blockedCount: capacity.blocked_count,
            delayedCount: capacity.delayed_count,
        })),
    };
}

function startOfWeek(date: Date): Date {
    const next = new Date(date);
    const day = next.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    next.setDate(next.getDate() + offset);
    next.setHours(0, 0, 0, 0);
    return next;
}

function buildHorizon(anchorDate: Date, days = 21): Date[] {
    const start = startOfWeek(anchorDate);
    return Array.from({ length: days }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return date;
    });
}

function findBarWindow(item: TimelineItem, horizon: Date[]): { startIndex: number; span: number } | null {
    const startAt = item.startAt ? new Date(item.startAt) : item.endAt ? new Date(item.endAt) : null;
    const endAt = item.endAt ? new Date(item.endAt) : startAt;
    if (!startAt || !endAt) return null;

    const horizonStart = horizon[0];
    const horizonEnd = horizon[horizon.length - 1];
    if (endAt < horizonStart || startAt > horizonEnd) {
        return null;
    }

    let startIndex = 0;
    let endIndex = horizon.length - 1;

    horizon.forEach((date, index) => {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        if (startAt >= dayStart && startAt <= dayEnd) {
            startIndex = index;
        }
        if (endAt >= dayStart && endAt <= dayEnd) {
            endIndex = index;
        }
    });

    return { startIndex, span: Math.max(1, endIndex - startIndex + 1) };
}

function alertTone(alert: TimelineAlert): string {
    return alert.severity === 'critical'
        ? 'border-lme-danger/30 bg-lme-danger/10 text-lme-danger/70'
        : 'border-lme-warning/30 bg-lme-warning/10 text-lme-warning/85';
}

function barTone(item: TimelineItem): string {
    if (item.isDelayed) return 'bg-lme-danger/70';
    if (item.isBlocked) return 'bg-lme-warning/70';
    if (item.isMilestone) return 'bg-sky/80';
    if (item.isCompleted) return 'bg-mint/70';
    return 'bg-vio/70';
}

function renderCapacityCard(capacity: TimelineCapacity) {
    return (
        <article key={capacity.ownerLabel} className="rounded-2xl border border-line bg-black/20 p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-bold text-ink">{capacity.ownerLabel}</p>
                    <p className="mt-1 text-xs text-sub">{capacity.taskCount} tarea(s)</p>
                </div>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-ink">
                    {capacity.effortPoints} pts
                </span>
            </div>
            <p className="mt-3 text-xs text-sub">
                Bloqueadas: {capacity.blockedCount} · Retrasadas: {capacity.delayedCount}
            </p>
        </article>
    );
}

export default function TimelineView() {
    const navigate = useNavigate();
    const location = useLocation();
    const {
        boards,
        currentUser,
        currentOrganizationId,
        currentTeamId,
        setActiveBoard,
    } = useStore();
    const isProUser = currentUser?.mode === 'pro';
    const workspaceMode = getWorkspaceModeFromPath(location.pathname);
    const [scopeType, setScopeType] = useState<'personal' | 'team'>(currentTeamId ? 'team' : 'personal');
    const [viewMode, setViewMode] = useState<'timeline' | 'gantt'>('timeline');
    const [anchorDate, setAnchorDate] = useState(() => new Date());
    const [boardFilter, setBoardFilter] = useState<string>('all');
    const [overview, setOverview] = useState<TimelineOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (scopeType === 'team' && !currentTeamId) {
            setScopeType('personal');
        }
    }, [currentTeamId, scopeType]);

    const scopedBoards = useMemo(() => boards.filter((board) => {
        if (scopeType === 'team') {
            return board.teamId === currentTeamId;
        }
        if (currentOrganizationId) {
            return board.organizationId === currentOrganizationId && !board.teamId;
        }
        return !board.teamId;
    }), [boards, currentOrganizationId, currentTeamId, scopeType]);

    useEffect(() => {
        if (boardFilter !== 'all' && !scopedBoards.some((board) => board.id === boardFilter)) {
            setBoardFilter('all');
        }
    }, [boardFilter, scopedBoards]);

    useEffect(() => {
        let cancelled = false;

        async function loadOverview() {
            setLoading(true);
            try {
                if (isProUser) {
                    const payload = await getTimelineOverview({
                        organizationId: scopeType === 'personal' ? currentOrganizationId : null,
                        teamId: scopeType === 'team' ? currentTeamId : null,
                        boardId: boardFilter !== 'all' ? boardFilter : null,
                    });
                    if (!cancelled) {
                        setOverview(normalizeRemoteOverview(payload));
                    }
                } else {
                    const payload = buildTimelineOverview(boards, {
                        organizationId: scopeType === 'personal' ? currentOrganizationId : null,
                        teamId: scopeType === 'team' ? currentTeamId : null,
                        boardId: boardFilter !== 'all' ? boardFilter : null,
                    });
                    if (!cancelled) {
                        setOverview(payload);
                    }
                }
                if (!cancelled) {
                    setError(null);
                }
            } catch (issue) {
                if (!cancelled) {
                    setError(getApiErrorMessage(issue, 'No se pudo cargar el cronograma.'));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadOverview();

        return () => {
            cancelled = true;
        };
    }, [boardFilter, boards, currentOrganizationId, currentTeamId, isProUser, scopeType]);

    const horizon = useMemo(() => buildHorizon(anchorDate), [anchorDate]);

    const groupedByBoard = useMemo(() => {
        const groups = new Map<string, { board: Board | null; items: TimelineItem[] }>();
        overview?.items.forEach((item) => {
            const board = boards.find((candidate) => candidate.id === item.boardId) ?? null;
            const current = groups.get(item.boardId) ?? { board, items: [] };
            current.items.push(item);
            groups.set(item.boardId, current);
        });
        return Array.from(groups.values());
    }, [boards, overview?.items]);

    return (
        <div className="min-h-screen bg-lme-background text-lme-text">
            <ViewNavHeader breadcrumb="Cronograma" workspaceMode={workspaceMode} />
            <div className="px-4 pb-6 sm:px-6 xl:px-8">
            <div className="mx-auto max-w-[1500px]">
                <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                        <Link to={getWorkspaceRootPath(workspaceMode)} className="inline-flex items-center gap-2 text-sub transition-colors hover:text-ink">
                            <ArrowLeft className="h-4 w-4" />
                            Volver al tablero
                        </Link>
                        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-sub">Cronograma y diagrama Gantt</p>
                        <h1 className="mt-1 text-3xl font-black text-ink">Cronograma del workspace</h1>
                        <p className="mt-2 text-sm text-sub">
                            Visualiza dependencias, hitos, capacidad y retrasos sin salir de Pasos.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => setViewMode('timeline')}
                            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${viewMode === 'timeline'
                                ? 'border-sky/30 bg-sky/10 text-sky'
                                : 'border-line text-sub hover:bg-white/5 hover:text-ink'
                                }`}
                        >
                            <Network className="mr-2 inline h-4 w-4" />
                            Timeline
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('gantt')}
                            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${viewMode === 'gantt'
                                ? 'border-mint/30 bg-mint/10 text-mint'
                                : 'border-line text-sub hover:bg-white/5 hover:text-ink'
                                }`}
                        >
                            <CalendarRange className="mr-2 inline h-4 w-4" />
                            Gantt
                        </button>
                    </div>
                </header>

                <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
                    <section className="rounded-3xl border border-lme-border bg-lme-surface-alt/80 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setScopeType('personal')}
                                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${scopeType === 'personal'
                                        ? 'border-sky/30 bg-sky/10 text-sky'
                                        : 'border-line text-sub hover:bg-white/5 hover:text-ink'
                                        }`}
                                >
                                    {workspaceMode === 'organization' ? 'Claustro / centro' : 'Personal'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setScopeType('team')}
                                    disabled={!currentTeamId}
                                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${scopeType === 'team'
                                        ? 'border-mint/30 bg-mint/10 text-mint'
                                        : 'border-line text-sub hover:bg-white/5 hover:text-ink'
                                        } disabled:cursor-not-allowed disabled:opacity-50`}
                                >
                                    <Users className="mr-2 inline h-4 w-4" />
                                    Equipo
                                </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setAnchorDate((current) => new Date(current.getTime() - 7 * 24 * 60 * 60 * 1000))}
                                    className="rounded-full border border-line p-2 text-sub transition-colors hover:bg-white/5 hover:text-ink"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAnchorDate(new Date())}
                                    className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-sub transition-colors hover:bg-white/5 hover:text-ink"
                                >
                                    Hoy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAnchorDate((current) => new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000))}
                                    className="rounded-full border border-line p-2 text-sub transition-colors hover:bg-white/5 hover:text-ink"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                            <select
                                value={boardFilter}
                                onChange={(event) => setBoardFilter(event.target.value)}
                                className="rounded-2xl border border-line bg-black/20 px-4 py-3 text-sm text-ink focus:border-sky focus:outline-none"
                            >
                                <option value="all">Todos los tableros visibles</option>
                                {scopedBoards.map((board) => (
                                    <option key={board.id} value={board.id}>{board.title}</option>
                                ))}
                            </select>
                            {overview && (
                                <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-semibold text-ink">
                                    {overview.itemCount} item(s) · {overview.blockedCount} bloqueadas · {overview.delayedCount} retrasadas
                                </div>
                            )}
                        </div>

                        {loading && (
                            <div className="mt-4 rounded-2xl border border-line bg-black/20 p-4 text-sm text-sub">
                                Cargando cronograma...
                            </div>
                        )}

                        {error && (
                            <div className="mt-4 rounded-2xl border border-lme-danger/30 bg-lme-danger/10 p-4 text-sm text-lme-danger/70">
                                {error}
                            </div>
                        )}

                        {!loading && !error && overview && (
                            <div className="mt-4 overflow-x-auto">
                                <div className="min-w-[900px]">
                                {/* Cabecera de días — dentro del mismo scroll para que se alinee */}
                                <div className="mb-3 grid grid-cols-[18rem_repeat(21,minmax(3rem,1fr))] gap-2 text-xs font-bold uppercase tracking-wide text-sub">
                                    <div className="rounded-xl px-3 py-2">Item</div>
                                    {horizon.map((day) => (
                                        <div key={day.toISOString()} className={`rounded-xl px-1 py-2 text-center ${day.getDay() === 1 ? 'text-sky' : ''}`}>
                                            {day.toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-4">
                                        {viewMode === 'timeline' ? (
                                            groupedByBoard.map((group) => (
                                                <section key={group.items[0]?.boardId ?? 'empty'} className="rounded-3xl border border-line bg-black/20 p-4">
                                                    <div className="mb-3 flex items-center justify-between gap-3">
                                                        <div>
                                                            <h2 className="text-lg font-bold text-ink">{group.items[0]?.boardTitle ?? 'Sin tablero'}</h2>
                                                            <p className="text-sm text-sub">{group.items.length} tarjeta(s) con señal temporal</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {group.items.map((item) => {
                                                            const window = findBarWindow(item, horizon);
                                                            return (
                                                                <div key={`${item.boardId}-${item.taskId}`} className="grid grid-cols-[18rem_repeat(21,minmax(3rem,1fr))] gap-2">
                                                                    <div className="rounded-2xl border border-line bg-black/20 px-3 py-3">
                                                                        <p className="text-sm font-semibold text-ink">{item.title}</p>
                                                                        <p className="mt-1 text-xs text-sub">
                                                                            {item.ownerLabel || 'Sin responsable'} · {item.effortPoints} pts
                                                                        </p>
                                                                    </div>
                                                                    <div className="relative col-span-21 grid grid-cols-[repeat(21,minmax(3rem,1fr))] rounded-2xl border border-line bg-black/10 px-1 py-3">
                                                                        {horizon.map((day) => (
                                                                            <div key={day.toISOString()} className="border-l border-white/5 first:border-l-0" />
                                                                        ))}
                                                                        {window && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setActiveBoard(item.boardId);
                                                                                    navigate(getBoardWorkspacePath(group.board));
                                                                                }}
                                                                                className={`absolute top-1/2 h-8 -translate-y-1/2 rounded-full px-3 text-left text-xs font-semibold text-white shadow-lg ${barTone(item)}`}
                                                                                style={{
                                                                                    left: `calc(${(window.startIndex / horizon.length) * 100}% + 0.25rem)`,
                                                                                    width: `calc(${(window.span / horizon.length) * 100}% - 0.5rem)`,
                                                                                }}
                                                                            >
                                                                                <span className="truncate">{item.title}</span>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </section>
                                            ))
                                        ) : (
                                            overview.items.map((item) => {
                                                const window = findBarWindow(item, horizon);
                                                return (
                                                    <div key={`${item.boardId}-${item.taskId}`} className="grid grid-cols-[18rem_repeat(21,minmax(3rem,1fr))] gap-2 rounded-3xl border border-line bg-black/20 p-3">
                                                        <div>
                                                            <p className="text-sm font-bold text-ink">{item.title}</p>
                                                            <p className="mt-1 text-xs text-sub">
                                                                {item.boardTitle} · {item.ownerLabel || 'Sin responsable'} · {item.effortPoints} pts
                                                            </p>
                                                            <p className="mt-2 text-[11px] text-sub">
                                                                {item.isBlocked ? 'Bloqueada' : item.isDelayed ? 'Retrasada' : item.isMilestone ? 'Hito' : 'En curso'}
                                                            </p>
                                                        </div>
                                                        <div className="relative col-span-21 grid grid-cols-[repeat(21,minmax(3rem,1fr))] rounded-2xl border border-line bg-black/10 px-1 py-3">
                                                            {horizon.map((day) => (
                                                                <div key={day.toISOString()} className="border-l border-white/5 first:border-l-0" />
                                                            ))}
                                                            {window && (
                                                                <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setActiveBoard(item.boardId);
                                                                    const targetBoard = boards.find((candidate) => candidate.id === item.boardId) ?? null;
                                                                    navigate(getBoardWorkspacePath(targetBoard));
                                                                }}
                                                                    className={`absolute top-1/2 h-9 -translate-y-1/2 rounded-full px-3 text-left text-xs font-semibold text-white shadow-lg ${barTone(item)}`}
                                                                    style={{
                                                                        left: `calc(${(window.startIndex / horizon.length) * 100}% + 0.25rem)`,
                                                                        width: `calc(${(window.span / horizon.length) * 100}% - 0.5rem)`,
                                                                    }}
                                                                >
                                                                    <span className="truncate">{item.title}</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    <aside className="space-y-4">
                        <section className="rounded-3xl border border-lme-border bg-lme-surface-alt/80 p-4">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-lme-warning" />
                                <h2 className="text-lg font-bold text-ink">Hitos en riesgo</h2>
                            </div>
                            <div className="mt-4 space-y-3">
                                {overview?.alerts.length ? (
                                    overview.alerts.slice(0, 8).map((alert) => (
                                        <article key={`${alert.taskId}-${alert.alertType}`} className={`rounded-2xl border p-4 ${alertTone(alert)}`}>
                                            <p className="text-sm font-bold">{alert.title}</p>
                                            <p className="mt-1 text-xs opacity-90">{alert.boardTitle}</p>
                                            <p className="mt-3 text-sm">{alert.message}</p>
                                        </article>
                                    ))
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-line p-4 text-sm text-sub">
                                        No hay alertas activas en este alcance.
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="rounded-3xl border border-lme-border bg-lme-surface-alt/80 p-4">
                            <h2 className="text-lg font-bold text-ink">Capacidad</h2>
                            <p className="mt-2 text-sm text-sub">Carga viva por responsable para detectar sobreasignación.</p>
                            <div className="mt-4 space-y-3">
                                {overview?.capacities.length ? overview.capacities.map(renderCapacityCard) : (
                                    <div className="rounded-2xl border border-dashed border-line p-4 text-sm text-sub">
                                        Añade responsable y esfuerzo en las tarjetas para ver la carga del equipo.
                                    </div>
                                )}
                            </div>
                        </section>
                    </aside>
                </div>
            </div>
            </div>
        </div>
    );
}
