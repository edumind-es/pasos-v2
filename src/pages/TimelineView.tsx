import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CalendarRange, ChevronLeft, ChevronRight, Download, Network, Users } from 'lucide-react';
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

function sameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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
        ? 'border-lme-danger/40 bg-lme-danger/10 text-lme-danger'
        : 'border-lme-warning/40 bg-lme-warning/10 text-ink';
}

/** Color de barra según estado, en la paleta de Los Cinco Mundos. */
function barTone(item: TimelineItem): string {
    if (item.isDelayed) return 'bg-fisico text-white';
    if (item.isBlocked) return 'bg-social text-ink';
    if (item.isMilestone) return 'bg-mental text-white';
    if (item.isCompleted) return 'bg-emocional text-white';
    return 'bg-interior text-white';
}

function itemStatusLabel(item: TimelineItem): string {
    if (item.isBlocked) return 'Bloqueada';
    if (item.isDelayed) return 'Retrasada';
    if (item.isMilestone) return 'Hito';
    if (item.isCompleted) return 'Completada';
    return 'En curso';
}

/** Exporta el cronograma como CSV (con BOM para que Excel respete los acentos). */
function exportTimelineCsv(overview: TimelineOverview): void {
    const header = ['Tablero', 'Tarea', 'Responsable', 'Esfuerzo', 'Inicio', 'Fin', 'Estado'];
    const rows = overview.items.map((item) => [
        item.boardTitle,
        item.title,
        item.ownerLabel || '',
        String(item.effortPoints),
        item.startAt ? new Date(item.startAt).toLocaleDateString() : '',
        item.endAt ? new Date(item.endAt).toLocaleDateString() : '',
        itemStatusLabel(item),
    ]);
    const csv = [header, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pasos-cronograma-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function renderCapacityCard(capacity: TimelineCapacity) {
    return (
        <article key={capacity.ownerLabel} className="rounded-lg border border-lme-border bg-lme-background p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-bold text-ink">{capacity.ownerLabel}</p>
                    <p className="mt-1 font-mono text-[11px] text-sub">{capacity.taskCount} tarea(s)</p>
                </div>
                <span className="rounded border border-lme-border px-2 py-0.5 font-mono text-[11px] font-semibold text-ink">
                    {capacity.effortPoints} pts
                </span>
            </div>
            <p className="mt-3 font-mono text-[11px] text-sub">
                Bloqueadas: {capacity.blockedCount} · Retrasadas: {capacity.delayedCount}
            </p>
        </article>
    );
}

/** Botón de segmento estilo lámina (activo = tinta sólida). */
function SegButton({ active, onClick, disabled, children }: { active: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${active ? 'bg-ink text-lme-background' : 'border border-line text-sub hover:border-ink hover:text-ink'}`}
        >
            {children}
        </button>
    );
}

const GRID_COLS = 'grid-cols-[18rem_repeat(21,minmax(3rem,1fr))]';

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

    const openItemBoard = (item: TimelineItem, board: Board | null) => {
        setActiveBoard(item.boardId);
        navigate(getBoardWorkspacePath(board ?? boards.find((c) => c.id === item.boardId) ?? null));
    };

    function DayGridHeader() {
        return (
            <div className={`mb-3 grid ${GRID_COLS} gap-2 font-mono text-[11px] font-bold uppercase tracking-wide text-sub`}>
                <div className="px-3 py-2">Item</div>
                {horizon.map((day) => (
                    <div key={day.toISOString()} className={`px-1 py-2 text-center ${sameDay(day, new Date()) ? 'font-black text-fisico' : day.getDay() === 1 ? 'text-mental' : ''}`}>
                        {day.toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                    </div>
                ))}
            </div>
        );
    }

    function BarTrack({ item, board }: { item: TimelineItem; board: Board | null }) {
        const window = findBarWindow(item, horizon);
        return (
            <div className="relative col-span-21 grid grid-cols-[repeat(21,minmax(3rem,1fr))] rounded-lg border border-lme-border bg-lme-background px-1 py-3">
                {horizon.map((day) => (
                    <div key={day.toISOString()} className={`border-l border-lme-border/40 first:border-l-0 ${sameDay(day, new Date()) ? 'bg-fisico/5' : ''}`} />
                ))}
                {window && (
                    <button
                        type="button"
                        onClick={() => openItemBoard(item, board)}
                        className={`absolute top-1/2 h-8 -translate-y-1/2 truncate rounded px-3 text-left text-xs font-semibold shadow-sm ${barTone(item)}`}
                        style={{
                            left: `calc(${(window.startIndex / horizon.length) * 100}% + 0.25rem)`,
                            width: `calc(${(window.span / horizon.length) * 100}% - 0.5rem)`,
                        }}
                        title={`${item.title} — ${itemStatusLabel(item)}`}
                    >
                        <span className="truncate">{item.title}</span>
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-lme-background text-lme-text">
            <ViewNavHeader breadcrumb="Cronograma" workspaceMode={workspaceMode} />
            <div className="px-4 pb-6 sm:px-6 xl:px-8">
                <div className="mx-auto max-w-[1500px]">
                    <header className="mb-6 border-b-2 border-ink pb-5 pt-2">
                        <Link to={getWorkspaceRootPath(workspaceMode)} className="inline-flex items-center gap-2 text-sub transition-colors hover:text-ink">
                            <ArrowLeft className="h-4 w-4" />
                            Volver al tablero
                        </Link>
                        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-fisico">Cronograma y diagrama Gantt</p>
                        <h1 className="mt-1 text-3xl font-black text-ink">Cronograma del workspace</h1>
                        <p className="mt-2 max-w-2xl text-sm text-sub">
                            Visualiza dependencias, hitos, capacidad y retrasos sin salir de Pasos.
                        </p>
                    </header>

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
                        <section className="rounded-2xl border border-lme-border bg-lme-surface p-4 sm:p-5">
                            {/* Barra de control */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <SegButton active={viewMode === 'timeline'} onClick={() => setViewMode('timeline')}><Network className="h-4 w-4" /> Timeline</SegButton>
                                    <SegButton active={viewMode === 'gantt'} onClick={() => setViewMode('gantt')}><CalendarRange className="h-4 w-4" /> Gantt</SegButton>
                                    <span className="mx-1 h-6 w-px bg-line" />
                                    <SegButton active={scopeType === 'personal'} onClick={() => setScopeType('personal')}>{workspaceMode === 'organization' ? 'Claustro' : 'Personal'}</SegButton>
                                    <SegButton active={scopeType === 'team'} onClick={() => setScopeType('team')} disabled={!currentTeamId}><Users className="h-4 w-4" /> Equipo</SegButton>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => setAnchorDate((current) => new Date(current.getTime() - 7 * 24 * 60 * 60 * 1000))} className="rounded-lg border border-line p-2 text-sub transition-colors hover:border-ink hover:text-ink"><ChevronLeft className="h-4 w-4" /></button>
                                    <button type="button" onClick={() => setAnchorDate(new Date())} className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-sub transition-colors hover:border-ink hover:text-ink">Hoy</button>
                                    <button type="button" onClick={() => setAnchorDate((current) => new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000))} className="rounded-lg border border-line p-2 text-sub transition-colors hover:border-ink hover:text-ink"><ChevronRight className="h-4 w-4" /></button>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-3">
                                <select
                                    value={boardFilter}
                                    onChange={(event) => setBoardFilter(event.target.value)}
                                    className="rounded-lg border border-lme-border bg-lme-background px-4 py-2.5 text-sm text-ink focus:border-mental focus:outline-none"
                                >
                                    <option value="all">Todos los tableros visibles</option>
                                    {scopedBoards.map((board) => (
                                        <option key={board.id} value={board.id}>{board.title}</option>
                                    ))}
                                </select>
                                {overview && (
                                    <span className="font-mono text-[11px] uppercase tracking-wide text-sub">
                                        {overview.itemCount} item(s) · {overview.blockedCount} bloqueadas · {overview.delayedCount} retrasadas
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => overview && exportTimelineCsv(overview)}
                                    disabled={!overview || overview.items.length === 0}
                                    className="ml-auto inline-flex items-center gap-2 rounded-lg border border-lme-border px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <Download className="h-4 w-4" /> Exportar CSV
                                </button>
                            </div>

                            {loading && (
                                <div className="mt-4 rounded-2xl border border-lme-border bg-lme-background p-4 text-sm text-sub">Cargando cronograma…</div>
                            )}
                            {error && (
                                <div className="mt-4 rounded-2xl border border-lme-danger/40 bg-lme-danger/10 p-4 text-sm text-lme-danger/85">{error}</div>
                            )}

                            {!loading && !error && overview && (
                                <div className="mt-4 overflow-x-auto">
                                    <div className="min-w-[900px]">
                                        <DayGridHeader />
                                        <div className="space-y-4">
                                            {viewMode === 'timeline' ? (
                                                groupedByBoard.length === 0 ? (
                                                    <div className="rounded-2xl border border-dashed border-lme-border p-8 text-center text-sm text-sub">
                                                        No hay tarjetas con fecha en este alcance. Añade fechas a las tareas para verlas en el cronograma.
                                                    </div>
                                                ) : groupedByBoard.map((group) => (
                                                    <section key={group.items[0]?.boardId ?? 'empty'} className="rounded-2xl border border-lme-border bg-lme-background p-4">
                                                        <div className="mb-3 border-b border-lme-border pb-2">
                                                            <h2 className="text-base font-bold text-ink">{group.items[0]?.boardTitle ?? 'Sin tablero'}</h2>
                                                            <p className="font-mono text-[11px] text-sub">{group.items.length} tarjeta(s) con señal temporal</p>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {group.items.map((item) => (
                                                                <div key={`${item.boardId}-${item.taskId}`} className={`grid ${GRID_COLS} gap-2`}>
                                                                    <div className="rounded-lg border border-lme-border bg-lme-surface px-3 py-3">
                                                                        <p className="text-sm font-semibold text-ink">{item.title}</p>
                                                                        <p className="mt-1 font-mono text-[11px] text-sub">{item.ownerLabel || 'Sin responsable'} · {item.effortPoints} pts</p>
                                                                    </div>
                                                                    <BarTrack item={item} board={group.board} />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </section>
                                                ))
                                            ) : (
                                                overview.items.length === 0 ? (
                                                    <div className="rounded-2xl border border-dashed border-lme-border p-8 text-center text-sm text-sub">
                                                        No hay tarjetas con fecha en este alcance.
                                                    </div>
                                                ) : overview.items.map((item) => (
                                                    <div key={`${item.boardId}-${item.taskId}`} className={`grid ${GRID_COLS} gap-2 rounded-2xl border border-lme-border bg-lme-background p-3`}>
                                                        <div>
                                                            <p className="text-sm font-bold text-ink">{item.title}</p>
                                                            <p className="mt-1 font-mono text-[11px] text-sub">{item.boardTitle} · {item.ownerLabel || 'Sin responsable'} · {item.effortPoints} pts</p>
                                                            <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-sub">{itemStatusLabel(item)}</p>
                                                        </div>
                                                        <BarTrack item={item} board={null} />
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        <aside className="space-y-4">
                            <section className="rounded-2xl border border-lme-border bg-lme-surface p-4">
                                <div className="flex items-center gap-2 border-b border-line pb-2">
                                    <AlertTriangle className="h-4 w-4 text-social" />
                                    <h2 className="text-sm font-bold text-ink">Hitos en riesgo</h2>
                                </div>
                                <div className="mt-3 space-y-2.5">
                                    {overview?.alerts.length ? (
                                        overview.alerts.slice(0, 8).map((alert) => (
                                            <article key={`${alert.taskId}-${alert.alertType}`} className={`rounded-lg border p-3 ${alertTone(alert)}`}>
                                                <p className="text-sm font-bold">{alert.title}</p>
                                                <p className="mt-0.5 text-xs opacity-90">{alert.boardTitle}</p>
                                                <p className="mt-2 text-sm">{alert.message}</p>
                                            </article>
                                        ))
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-lme-border p-4 text-sm text-sub">No hay alertas activas en este alcance.</div>
                                    )}
                                </div>
                            </section>

                            <section className="rounded-2xl border border-lme-border bg-lme-surface p-4">
                                <div className="border-b border-line pb-2">
                                    <h2 className="text-sm font-bold text-ink">Capacidad</h2>
                                </div>
                                <p className="mt-2 text-xs text-sub">Carga viva por responsable para detectar sobreasignación.</p>
                                <div className="mt-3 space-y-2.5">
                                    {overview?.capacities.length ? overview.capacities.map(renderCapacityCard) : (
                                        <div className="rounded-lg border border-dashed border-lme-border p-4 text-sm text-sub">Añade responsable y esfuerzo en las tarjetas para ver la carga del equipo.</div>
                                    )}
                                </div>
                            </section>

                            {/* Leyenda de colores */}
                            <section className="rounded-2xl border border-lme-border bg-lme-surface p-4">
                                <h2 className="text-sm font-bold text-ink">Leyenda</h2>
                                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-sub">
                                    <span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-interior" /> En curso</span>
                                    <span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-emocional" /> Completada</span>
                                    <span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-mental" /> Hito</span>
                                    <span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-social" /> Bloqueada</span>
                                    <span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-fisico" /> Retrasada</span>
                                </div>
                            </section>
                        </aside>
                    </div>
                </div>
            </div>
        </div>
    );
}
