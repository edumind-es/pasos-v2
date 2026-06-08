import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, CalendarRange, Check, Copy, ExternalLink, LoaderCircle, Users } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ViewNavHeader } from '../components/ViewNavHeader';
import {
    createCalendarFeed,
    getApiErrorMessage,
    listCalendarEvents,
    listCalendarFeeds,
    type ProCalendarEventResponse,
    type ProCalendarFeedResponse,
} from '../services/pasosApi';
import { useStore } from '../store/boardStore';
import { buildMonthGrid, deriveLocalAgendaEvents, getWeekDates, isSameDay, isSameMonth, type AgendaEvent } from '../utils/agenda';
import { getBoardWorkspacePath, getWorkspaceModeFromPath, getWorkspaceRootPath } from '../utils/workspaceRoutes';

function toAgendaEvent(event: ProCalendarEventResponse): AgendaEvent {
    return {
        id: event.id,
        eventType: event.event_type,
        title: event.title,
        description: event.description ?? undefined,
        startAt: event.start_at,
        endAt: event.end_at,
        boardId: event.board_id,
        boardTitle: event.board_title,
        organizationId: event.organization_id ?? undefined,
        teamId: event.team_id ?? undefined,
        targetLabel: event.target_label ?? undefined,
    };
}

function eventBadge(eventType: AgendaEvent['eventType']): string {
    return eventType === 'assignment_due' ? 'Asignacion' : 'Fecha objetivo';
}

function formatDayLabel(date: Date): string {
    return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function AgendaView() {
    const navigate = useNavigate();
    const location = useLocation();
    const { boards, currentUser, currentTeamId, setActiveBoard } = useStore();
    const isProUser = currentUser?.mode === 'pro';
    const workspaceMode = getWorkspaceModeFromPath(location.pathname);
    const [scopeType, setScopeType] = useState<'personal' | 'team'>('personal');
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
    const [referenceDate, setReferenceDate] = useState(() => new Date());
    const [events, setEvents] = useState<AgendaEvent[]>([]);
    const [feeds, setFeeds] = useState<ProCalendarFeedResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [creatingFeed, setCreatingFeed] = useState<'personal' | 'team' | null>(null);
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

    useEffect(() => {
        if (scopeType === 'team' && !currentTeamId) {
            setScopeType('personal');
        }
    }, [currentTeamId, scopeType]);

    useEffect(() => {
        let cancelled = false;

        async function loadAgenda() {
            setLoading(true);
            try {
                if (isProUser) {
                    const [remoteEvents, remoteFeeds] = await Promise.all([
                        listCalendarEvents({
                            scopeType,
                            teamId: scopeType === 'team' ? currentTeamId : null,
                        }),
                        listCalendarFeeds(),
                    ]);
                    if (cancelled) {
                        return;
                    }
                    setEvents(remoteEvents.map(toAgendaEvent));
                    setFeeds(remoteFeeds);
                } else {
                    const localEvents = deriveLocalAgendaEvents(boards, scopeType, currentTeamId);
                    if (cancelled) {
                        return;
                    }
                    setEvents(localEvents);
                    setFeeds([]);
                }
                setError(null);
            } catch (issue) {
                if (!cancelled) {
                    setError(getApiErrorMessage(issue, 'No se pudo cargar la agenda.'));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadAgenda();

        return () => {
            cancelled = true;
        };
    }, [boards, currentTeamId, isProUser, scopeType]);

    useEffect(() => {
        if (!copiedUrl) return undefined;
        const timer = window.setTimeout(() => setCopiedUrl(null), 1800);
        return () => window.clearTimeout(timer);
    }, [copiedUrl]);

    const monthGrid = buildMonthGrid(referenceDate);
    const weekDates = getWeekDates(referenceDate);

    const findEventsForDate = (date: Date) => (
        events.filter((event) => isSameDay(new Date(event.startAt), date))
    );

    const createFeedForScope = async (nextScope: 'personal' | 'team') => {
        if (!isProUser) return;
        setCreatingFeed(nextScope);
        try {
            await createCalendarFeed({
                name: nextScope === 'team' ? 'Agenda de equipo Pasos' : 'Agenda personal Pasos',
                scopeType: nextScope,
                teamId: nextScope === 'team' ? (currentTeamId ?? undefined) : undefined,
                includeAssignments: true,
                includeTaskDueDates: true,
            });
            const refreshedFeeds = await listCalendarFeeds();
            setFeeds(refreshedFeeds);
            setError(null);
        } catch (issue) {
            setError(getApiErrorMessage(issue, 'No se pudo crear el feed ICS.'));
        } finally {
            setCreatingFeed(null);
        }
    };

    const movePeriod = (direction: -1 | 1) => {
        const next = new Date(referenceDate);
        if (viewMode === 'month') {
            next.setMonth(referenceDate.getMonth() + direction);
        } else {
            next.setDate(referenceDate.getDate() + (7 * direction));
        }
        setReferenceDate(next);
    };

    const openBoard = (boardId: string) => {
        setActiveBoard(boardId);
        const board = boards.find((item) => item.id === boardId) ?? null;
        navigate(getBoardWorkspacePath(board));
    };

    return (
        <div className="min-h-screen bg-lme-background text-lme-text">
            <ViewNavHeader breadcrumb="Agenda" workspaceMode={workspaceMode} />
            <div className="px-4 pb-6 sm:px-6 xl:px-8">
            <div className="mx-auto max-w-7xl">
                <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                        <Link to={getWorkspaceRootPath(workspaceMode)} className="inline-flex items-center gap-2 text-sub transition-colors hover:text-ink">
                            <ArrowLeft className="h-4 w-4" />
                            Volver al tablero
                        </Link>
                        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-sub">Agenda de trabajo</p>
                        <h1 className="mt-1 text-3xl font-black text-ink">Agenda y calendarios</h1>
                        <p className="mt-2 text-sm text-sub">
                            Vista mensual y semanal de tareas con fecha, asignaciones activas y feeds `ICS` para seguimiento personal o de equipo.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => setViewMode('month')}
                            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${viewMode === 'month'
                                ? 'border-sky/30 bg-sky/10 text-sky'
                                : 'border-line text-sub hover:bg-white/5 hover:text-ink'
                                }`}
                        >
                            <CalendarDays className="mr-2 inline h-4 w-4" />
                            Mes
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('week')}
                            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${viewMode === 'week'
                                ? 'border-mint/30 bg-mint/10 text-mint'
                                : 'border-line text-sub hover:bg-white/5 hover:text-ink'
                                }`}
                        >
                            <CalendarRange className="mr-2 inline h-4 w-4" />
                            Semana
                        </button>
                    </div>
                </header>

                <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
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
                                    {workspaceMode === 'organization' ? 'Claustro' : 'Personal'}
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
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => movePeriod(-1)}
                                    className="rounded-full border border-line px-3 py-2 text-sm font-semibold text-sub transition-colors hover:bg-white/5 hover:text-ink"
                                >
                                    Anterior
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReferenceDate(new Date())}
                                    className="rounded-full border border-line px-3 py-2 text-sm font-semibold text-sub transition-colors hover:bg-white/5 hover:text-ink"
                                >
                                    Hoy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => movePeriod(1)}
                                    className="rounded-full border border-line px-3 py-2 text-sm font-semibold text-sub transition-colors hover:bg-white/5 hover:text-ink"
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>

                        {loading && (
                            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-line bg-black/20 p-4 text-sm text-sub">
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                Cargando agenda...
                            </div>
                        )}

                        {error && (
                            <div className="mt-4 rounded-2xl border border-lme-danger/30 bg-lme-danger/10 p-4 text-sm text-lme-danger/70">
                                {error}
                            </div>
                        )}

                        {!loading && !error && viewMode === 'month' && (
                            <div className="mt-4">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-lg font-bold text-ink">
                                            {referenceDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                        </p>
                                        <p className="text-sm text-sub">
                                            {events.length} evento(s) visibles en el alcance {scopeType === 'team' ? 'de equipo' : 'personal'}.
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wide text-sub">
                                    {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((label) => (
                                        <div key={label} className="rounded-xl px-2 py-2">{label}</div>
                                    ))}
                                </div>
                                <div className="mt-2 grid grid-cols-7 gap-2">
                                    {monthGrid.map((date) => {
                                        const dayEvents = findEventsForDate(date);
                                        return (
                                            <button
                                                key={date.toISOString()}
                                                type="button"
                                                onClick={() => setReferenceDate(date)}
                                                className={`min-h-[8rem] rounded-2xl border p-3 text-left align-top transition-colors ${isSameMonth(date, referenceDate)
                                                    ? 'border-line bg-black/20 hover:bg-white/5'
                                                    : 'border-line/40 bg-black/10 text-sub'
                                                    } ${isSameDay(date, new Date()) ? 'ring-1 ring-sky/40' : ''}`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-sm font-bold text-ink">{date.getDate()}</span>
                                                    {dayEvents.length > 0 && (
                                                        <span className="rounded-full bg-sky/10 px-2 py-0.5 text-[11px] font-semibold text-sky">
                                                            {dayEvents.length}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="mt-3 space-y-2">
                                                    {dayEvents.slice(0, 2).map((event) => (
                                                        <div key={event.id} className="rounded-xl bg-white/5 px-2 py-2 text-[11px] text-ink">
                                                            <p className="truncate font-semibold">{event.title}</p>
                                                            <p className="mt-1 text-sub">{eventBadge(event.eventType)}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {!loading && !error && viewMode === 'week' && (
                            <div className="mt-4 space-y-3">
                                {weekDates.map((date) => {
                                    const dayEvents = findEventsForDate(date);
                                    return (
                                        <section key={date.toISOString()} className="rounded-2xl border border-line bg-black/20 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <h2 className="text-lg font-bold text-ink">{formatDayLabel(date)}</h2>
                                                    <p className="text-sm text-sub">{dayEvents.length} evento(s)</p>
                                                </div>
                                                {isSameDay(date, new Date()) && (
                                                    <span className="rounded-full bg-mint/10 px-3 py-1 text-xs font-semibold text-mint">Hoy</span>
                                                )}
                                            </div>
                                            <div className="mt-4 space-y-3">
                                                {dayEvents.length === 0 ? (
                                                    <div className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-sub">
                                                        Sin eventos para esta fecha.
                                                    </div>
                                                ) : (
                                                    dayEvents.map((event) => (
                                                        <article key={event.id} className="rounded-2xl border border-line bg-black/10 p-4">
                                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                                <div>
                                                                    <p className="text-sm font-bold text-ink">{event.title}</p>
                                                                    <p className="mt-1 text-xs text-sub">
                                                                        {event.boardTitle} · {eventBadge(event.eventType)}
                                                                        {event.targetLabel ? ` · ${event.targetLabel}` : ''}
                                                                    </p>
                                                                </div>
                                                                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-ink">
                                                                    {new Date(event.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            {event.description && <p className="mt-3 text-sm text-sub">{event.description}</p>}
                                                            <button
                                                                type="button"
                                                                onClick={() => openBoard(event.boardId)}
                                                                className="mt-4 rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-white/10"
                                                            >
                                                                Abrir tablero
                                                            </button>
                                                        </article>
                                                    ))
                                                )}
                                            </div>
                                        </section>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <aside className="space-y-4">
                        <section className="rounded-3xl border border-lme-border bg-lme-surface-alt/80 p-4">
                            <h2 className="text-lg font-bold text-ink">Feeds ICS</h2>
                            <p className="mt-2 text-sm text-sub">
                                Suscribe la agenda de Pasos a tu calendario personal o de equipo. El feed es de solo lectura.
                            </p>
                            {isProUser ? (
                                <div className="mt-4 space-y-3">
                                    <button
                                        type="button"
                                        onClick={() => void createFeedForScope('personal')}
                                        disabled={creatingFeed !== null}
                                        className="w-full rounded-2xl border border-sky/30 bg-sky/10 px-4 py-3 text-left text-sm font-semibold text-sky transition-colors hover:bg-sky/20 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Crear feed personal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void createFeedForScope('team')}
                                        disabled={creatingFeed !== null || !currentTeamId}
                                        className="w-full rounded-2xl border border-mint/30 bg-mint/10 px-4 py-3 text-left text-sm font-semibold text-mint transition-colors hover:bg-mint/20 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Crear feed de equipo
                                    </button>
                                    {feeds.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-line px-4 py-4 text-sm text-sub">
                                            Todavia no has creado feeds ICS.
                                        </div>
                                    ) : (
                                        feeds.map((feed) => (
                                            <div key={feed.id} className="rounded-2xl border border-line bg-black/20 p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-bold text-ink">{feed.name}</p>
                                                        <p className="mt-1 text-xs text-sub">
                                                            {feed.scope_type === 'team' ? 'Equipo' : 'Personal'}
                                                        </p>
                                                    </div>
                                                    <a
                                                        href={feed.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="rounded-full border border-line p-2 text-sub transition-colors hover:bg-white/5 hover:text-ink"
                                                        title="Abrir feed"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                </div>
                                                <div className="mt-3 rounded-2xl bg-black/20 px-3 py-3 text-xs text-sub break-all">
                                                    {feed.url}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        await navigator.clipboard.writeText(feed.url);
                                                        setCopiedUrl(feed.url);
                                                    }}
                                                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-white/5"
                                                >
                                                    {copiedUrl === feed.url ? <Check className="h-4 w-4 text-mint" /> : <Copy className="h-4 w-4" />}
                                                    {copiedUrl === feed.url ? 'Copiado' : 'Copiar URL'}
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            ) : (
                                <div className="mt-4 rounded-2xl border border-dashed border-line px-4 py-4 text-sm text-sub">
                                    En modo local puedes consultar la agenda, pero los feeds `ICS` se activan en modo Pro.
                                </div>
                            )}
                        </section>

                        <section className="rounded-3xl border border-lme-border bg-lme-surface-alt/80 p-4">
                            <h2 className="text-lg font-bold text-ink">Encaje organizativo</h2>
                            <p className="mt-2 text-sm text-sub">
                                Esta agenda conecta el kanban con fechas reales del centro: vencimientos del tablero, asignaciones activas y seguimiento semanal del equipo.
                            </p>
                            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-xs font-semibold text-ink">
                                <CalendarDays className="h-4 w-4 text-sky" />
                                Base lista para cronograma y Gantt
                            </div>
                        </section>
                    </aside>
                </div>
            </div>
            </div>
        </div>
    );
}
