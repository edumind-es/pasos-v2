import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarClock, CalendarDays, CalendarRange, Check, Clock, Copy, ExternalLink, Inbox, LoaderCircle, Users } from 'lucide-react';
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

type ViewMode = 'month' | 'week' | 'day';

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
    return eventType === 'assignment_due' ? 'Asignación' : 'Fecha objetivo';
}

function formatDayLabel(date: Date): string {
    return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Botón de segmento estilo lámina (activo = tinta sólida). */
function SegButton({ active, onClick, disabled, children }: { active: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${active
                ? 'bg-ink text-lme-background'
                : 'border border-line text-sub hover:border-ink hover:text-ink'
                }`}
        >
            {children}
        </button>
    );
}

export default function AgendaView() {
    const navigate = useNavigate();
    const location = useLocation();
    const { boards, currentUser, currentTeamId, setActiveBoard } = useStore();
    const isProUser = currentUser?.mode === 'pro';
    const workspaceMode = getWorkspaceModeFromPath(location.pathname);
    const [scopeType, setScopeType] = useState<'personal' | 'team'>('personal');
    const [viewMode, setViewMode] = useState<ViewMode>('month');
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
                    if (cancelled) return;
                    setEvents(remoteEvents.map(toAgendaEvent));
                    setFeeds(remoteFeeds);
                } else {
                    const localEvents = deriveLocalAgendaEvents(boards, scopeType, currentTeamId);
                    if (cancelled) return;
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
        return () => { cancelled = true; };
    }, [boards, currentTeamId, isProUser, scopeType]);

    useEffect(() => {
        if (!copiedUrl) return undefined;
        const timer = window.setTimeout(() => setCopiedUrl(null), 1800);
        return () => window.clearTimeout(timer);
    }, [copiedUrl]);

    const monthGrid = useMemo(() => buildMonthGrid(referenceDate), [referenceDate]);
    const weekDates = useMemo(() => getWeekDates(referenceDate), [referenceDate]);

    const findEventsForDate = (date: Date) => (
        events.filter((event) => isSameDay(new Date(event.startAt), date))
    );

    // Tablero(s) del alcance activo, para derivar tareas sin fecha
    const scopedBoards = useMemo(
        () => boards.filter((board) => (scopeType === 'team' ? board.teamId === currentTeamId : !board.teamId)),
        [boards, scopeType, currentTeamId],
    );

    // Tareas sin fecha límite: hoy son invisibles en el calendario; aquí se rescatan
    const tasksWithoutDate = useMemo(() => (
        scopedBoards.flatMap((board) => (
            board.tasks
                .filter((task) => !task.dueDate)
                .map((task) => ({ boardId: board.id, boardTitle: board.title, taskId: task.id, title: task.title }))
        ))
    ), [scopedBoards]);

    // Próximos eventos (desde hoy), para escaneo rápido
    const upcomingEvents = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return [...events]
            .filter((event) => new Date(event.startAt) >= today)
            .sort((a, b) => a.startAt.localeCompare(b.startAt))
            .slice(0, 8);
    }, [events]);

    const dayEventsForReference = useMemo(() => findEventsForDate(referenceDate), [events, referenceDate]); // eslint-disable-line react-hooks/exhaustive-deps

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
        } else if (viewMode === 'week') {
            next.setDate(referenceDate.getDate() + (7 * direction));
        } else {
            next.setDate(referenceDate.getDate() + direction);
        }
        setReferenceDate(next);
    };

    const openBoard = (boardId: string) => {
        setActiveBoard(boardId);
        const board = boards.find((item) => item.id === boardId) ?? null;
        navigate(getBoardWorkspacePath(board));
    };

    const periodLabel = viewMode === 'month'
        ? referenceDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
        : viewMode === 'week'
            ? `Semana del ${weekDates[0].toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}`
            : formatDayLabel(referenceDate);

    function EventCard({ event }: { event: AgendaEvent }) {
        return (
            <article className="rounded-2xl border border-lme-border bg-lme-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-ink">{event.title}</p>
                        <p className="mt-1 text-xs text-sub">
                            {event.boardTitle} · {eventBadge(event.eventType)}{event.targetLabel ? ` · ${event.targetLabel}` : ''}
                        </p>
                    </div>
                    <span className="shrink-0 rounded border border-lme-border px-2 py-0.5 font-mono text-[11px] text-ink">
                        {new Date(event.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                {event.description && <p className="mt-3 text-sm text-sub">{event.description}</p>}
                <button
                    type="button"
                    onClick={() => openBoard(event.boardId)}
                    className="mt-4 rounded-lg border border-lme-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-white/5"
                >
                    Abrir tablero
                </button>
            </article>
        );
    }

    return (
        <div className="min-h-screen bg-lme-background text-lme-text">
            <ViewNavHeader breadcrumb="Agenda" workspaceMode={workspaceMode} />
            <div className="px-4 pb-6 sm:px-6 xl:px-8">
                <div className="mx-auto max-w-7xl">
                    <header className="mb-6 border-b-2 border-ink pb-5 pt-2">
                        <Link to={getWorkspaceRootPath(workspaceMode)} className="inline-flex items-center gap-2 text-sub transition-colors hover:text-ink">
                            <ArrowLeft className="h-4 w-4" />
                            Volver al tablero
                        </Link>
                        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-fisico">Agenda de trabajo</p>
                        <h1 className="mt-1 text-3xl font-black text-ink">Agenda y calendarios</h1>
                        <p className="mt-2 max-w-2xl text-sm text-sub">
                            Vista mes, semana y día de las tareas con fecha, asignaciones activas y feeds ICS para seguimiento personal o de equipo.
                        </p>
                    </header>

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
                        <section className="rounded-2xl border border-lme-border bg-lme-surface p-4 sm:p-5">
                            {/* Barra de control */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <SegButton active={viewMode === 'month'} onClick={() => setViewMode('month')}><CalendarDays className="h-4 w-4" /> Mes</SegButton>
                                    <SegButton active={viewMode === 'week'} onClick={() => setViewMode('week')}><CalendarRange className="h-4 w-4" /> Semana</SegButton>
                                    <SegButton active={viewMode === 'day'} onClick={() => setViewMode('day')}><CalendarClock className="h-4 w-4" /> Día</SegButton>
                                    <span className="mx-1 h-6 w-px bg-line" />
                                    <SegButton active={scopeType === 'personal'} onClick={() => setScopeType('personal')}>{workspaceMode === 'organization' ? 'Claustro' : 'Personal'}</SegButton>
                                    <SegButton active={scopeType === 'team'} onClick={() => setScopeType('team')} disabled={!currentTeamId}><Users className="h-4 w-4" /> Equipo</SegButton>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => movePeriod(-1)} className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-sub transition-colors hover:border-ink hover:text-ink">Anterior</button>
                                    <button type="button" onClick={() => setReferenceDate(new Date())} className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-sub transition-colors hover:border-ink hover:text-ink">Hoy</button>
                                    <button type="button" onClick={() => movePeriod(1)} className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-sub transition-colors hover:border-ink hover:text-ink">Siguiente</button>
                                </div>
                            </div>

                            <div className="mt-4 flex items-baseline justify-between gap-3">
                                <h2 className="text-lg font-black capitalize text-ink">{periodLabel}</h2>
                                <span className="font-mono text-[11px] uppercase tracking-wide text-sub">{events.length} evento(s) · {scopeType === 'team' ? 'equipo' : 'personal'}</span>
                            </div>

                            {loading && (
                                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-lme-border bg-lme-background p-4 text-sm text-sub">
                                    <LoaderCircle className="h-4 w-4 animate-spin" /> Cargando agenda…
                                </div>
                            )}

                            {error && (
                                <div className="mt-4 rounded-2xl border border-lme-danger/40 bg-lme-danger/10 p-4 text-sm text-lme-danger/85">{error}</div>
                            )}

                            {/* MES */}
                            {!loading && !error && viewMode === 'month' && (
                                <div className="mt-4">
                                    <div className="grid grid-cols-7 gap-2 text-center font-mono text-[11px] font-bold uppercase tracking-wide text-sub">
                                        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((label) => (
                                            <div key={label} className="py-1">{label}</div>
                                        ))}
                                    </div>
                                    <div className="mt-2 grid grid-cols-7 gap-2">
                                        {monthGrid.map((date) => {
                                            const dayEvents = findEventsForDate(date);
                                            const inMonth = isSameMonth(date, referenceDate);
                                            const today = isSameDay(date, new Date());
                                            return (
                                                <button
                                                    key={date.toISOString()}
                                                    type="button"
                                                    onClick={() => { setReferenceDate(date); setViewMode('day'); }}
                                                    className={`min-h-[7rem] rounded-lg border p-2 text-left align-top transition-colors ${inMonth ? 'border-lme-border bg-lme-background hover:border-ink' : 'border-lme-border/40 bg-transparent text-sub'} ${today ? 'border-l-4 border-l-fisico' : ''}`}
                                                >
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span className={`text-sm font-bold ${today ? 'text-fisico' : 'text-ink'}`}>{date.getDate()}</span>
                                                        {dayEvents.length > 0 && (
                                                            <span className="rounded-full bg-mental/15 px-1.5 py-px font-mono text-[10px] font-bold text-mental">{dayEvents.length}</span>
                                                        )}
                                                    </div>
                                                    <div className="mt-2 space-y-1.5">
                                                        {dayEvents.slice(0, 2).map((event) => (
                                                            <div key={event.id} className="truncate rounded border-l-2 border-mental bg-lme-surface px-1.5 py-1 text-[11px] font-medium text-ink">{event.title}</div>
                                                        ))}
                                                        {dayEvents.length > 2 && <p className="pl-1 font-mono text-[10px] text-sub">+{dayEvents.length - 2} más</p>}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* SEMANA */}
                            {!loading && !error && viewMode === 'week' && (
                                <div className="mt-4 space-y-3">
                                    {weekDates.map((date) => {
                                        const dayEvents = findEventsForDate(date);
                                        const today = isSameDay(date, new Date());
                                        return (
                                            <section key={date.toISOString()} className={`rounded-2xl border bg-lme-background p-4 ${today ? 'border-fisico' : 'border-lme-border'}`}>
                                                <div className="flex items-center justify-between gap-3">
                                                    <h3 className="text-base font-bold capitalize text-ink">{formatDayLabel(date)}</h3>
                                                    <span className="font-mono text-[11px] uppercase tracking-wide text-sub">{today ? 'Hoy · ' : ''}{dayEvents.length} evento(s)</span>
                                                </div>
                                                <div className="mt-3 space-y-3">
                                                    {dayEvents.length === 0 ? (
                                                        <div className="rounded-lg border border-dashed border-lme-border px-4 py-3 text-sm text-sub">Sin eventos para esta fecha.</div>
                                                    ) : dayEvents.map((event) => <EventCard key={event.id} event={event} />)}
                                                </div>
                                            </section>
                                        );
                                    })}
                                </div>
                            )}

                            {/* DÍA */}
                            {!loading && !error && viewMode === 'day' && (
                                <div className="mt-4 space-y-3">
                                    {dayEventsForReference.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-lme-border px-4 py-8 text-center text-sm text-sub">
                                            <CalendarClock className="mx-auto mb-2 h-6 w-6 text-sub" />
                                            No hay eventos el {formatDayLabel(referenceDate)}.
                                        </div>
                                    ) : dayEventsForReference.map((event) => <EventCard key={event.id} event={event} />)}
                                </div>
                            )}
                        </section>

                        {/* Panel lateral */}
                        <aside className="space-y-4">
                            {/* Próximos eventos */}
                            <section className="rounded-2xl border border-lme-border bg-lme-surface p-4">
                                <div className="flex items-center gap-2 border-b border-line pb-2">
                                    <Clock className="h-4 w-4 text-mental" />
                                    <h2 className="text-sm font-bold text-ink">Próximos eventos</h2>
                                </div>
                                {upcomingEvents.length === 0 ? (
                                    <p className="mt-3 text-sm text-sub">No hay eventos futuros con fecha en este alcance.</p>
                                ) : (
                                    <ul className="mt-3 space-y-2">
                                        {upcomingEvents.map((event) => (
                                            <li key={event.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => { setReferenceDate(new Date(event.startAt)); setViewMode('day'); }}
                                                    className="flex w-full items-center gap-3 rounded-lg border border-lme-border bg-lme-background px-3 py-2 text-left transition-colors hover:border-ink"
                                                >
                                                    <span className="flex w-11 shrink-0 flex-col items-center rounded border border-lme-border bg-lme-surface py-1">
                                                        <span className="font-mono text-[9px] uppercase text-sub">{new Date(event.startAt).toLocaleDateString(undefined, { month: 'short' })}</span>
                                                        <span className="font-black leading-none text-ink">{new Date(event.startAt).getDate()}</span>
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className="block truncate text-sm font-semibold text-ink">{event.title}</span>
                                                        <span className="block truncate text-[11px] text-sub">{event.boardTitle}</span>
                                                    </span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>

                            {/* Tareas sin fecha */}
                            {tasksWithoutDate.length > 0 && (
                                <section className="rounded-2xl border border-lme-border bg-lme-surface p-4">
                                    <div className="flex items-center gap-2 border-b border-line pb-2">
                                        <Inbox className="h-4 w-4 text-social" />
                                        <h2 className="text-sm font-bold text-ink">Sin fecha</h2>
                                        <span className="ml-auto font-mono text-[11px] text-sub">{tasksWithoutDate.length}</span>
                                    </div>
                                    <p className="mt-2 text-xs text-sub">Tareas que aún no aparecen en el calendario. Ábrelas para ponerles fecha.</p>
                                    <ul className="mt-3 space-y-1.5">
                                        {tasksWithoutDate.slice(0, 12).map((item) => (
                                            <li key={item.taskId}>
                                                <button
                                                    type="button"
                                                    onClick={() => openBoard(item.boardId)}
                                                    className="flex w-full items-center gap-2 rounded-lg border-l-2 border-social bg-lme-background px-3 py-2 text-left transition-colors hover:bg-white/5"
                                                >
                                                    <span className="min-w-0">
                                                        <span className="block truncate text-sm font-medium text-ink">{item.title}</span>
                                                        <span className="block truncate text-[11px] text-sub">{item.boardTitle}</span>
                                                    </span>
                                                </button>
                                            </li>
                                        ))}
                                        {tasksWithoutDate.length > 12 && <li className="px-3 pt-1 font-mono text-[11px] text-sub">+{tasksWithoutDate.length - 12} más…</li>}
                                    </ul>
                                </section>
                            )}

                            {/* Feeds ICS */}
                            <section className="rounded-2xl border border-lme-border bg-lme-surface p-4">
                                <div className="flex items-center gap-2 border-b border-line pb-2">
                                    <ExternalLink className="h-4 w-4 text-interior" />
                                    <h2 className="text-sm font-bold text-ink">Feeds ICS</h2>
                                </div>
                                <p className="mt-2 text-xs text-sub">Suscribe la agenda de Pasos a tu calendario. El feed es de solo lectura.</p>
                                {isProUser ? (
                                    <div className="mt-3 space-y-2.5">
                                        <button type="button" onClick={() => void createFeedForScope('personal')} disabled={creatingFeed !== null} className="w-full rounded-lg border border-lme-border bg-lme-background px-4 py-2.5 text-left text-sm font-semibold text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-50">Crear feed personal</button>
                                        <button type="button" onClick={() => void createFeedForScope('team')} disabled={creatingFeed !== null || !currentTeamId} className="w-full rounded-lg border border-lme-border bg-lme-background px-4 py-2.5 text-left text-sm font-semibold text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-50">Crear feed de equipo</button>
                                        {feeds.length === 0 ? (
                                            <div className="rounded-lg border border-dashed border-lme-border px-4 py-3 text-sm text-sub">Todavía no has creado feeds ICS.</div>
                                        ) : feeds.map((feed) => (
                                            <div key={feed.id} className="rounded-lg border border-lme-border bg-lme-background p-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-bold text-ink">{feed.name}</p>
                                                        <p className="mt-0.5 font-mono text-[11px] uppercase text-sub">{feed.scope_type === 'team' ? 'Equipo' : 'Personal'}</p>
                                                    </div>
                                                    <a href={feed.url} target="_blank" rel="noreferrer" title="Abrir feed" className="rounded border border-lme-border p-1.5 text-sub transition-colors hover:border-ink hover:text-ink">
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                </div>
                                                <div className="mt-2 break-all rounded bg-lme-surface px-2 py-2 font-mono text-[11px] text-sub">{feed.url}</div>
                                                <button type="button" onClick={async () => { await navigator.clipboard.writeText(feed.url); setCopiedUrl(feed.url); }} className="mt-2 inline-flex items-center gap-2 rounded-lg border border-lme-border px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-white/5">
                                                    {copiedUrl === feed.url ? <Check className="h-4 w-4 text-emocional" /> : <Copy className="h-4 w-4" />}
                                                    {copiedUrl === feed.url ? 'Copiado' : 'Copiar URL'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-3 rounded-lg border border-dashed border-lme-border px-4 py-3 text-sm text-sub">En modo local puedes consultar la agenda; los feeds ICS se activan en modo Pro.</div>
                                )}
                            </section>
                        </aside>
                    </div>
                </div>
            </div>
        </div>
    );
}
