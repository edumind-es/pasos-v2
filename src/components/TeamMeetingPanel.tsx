import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileText, Presentation, Save, Users } from 'lucide-react';
import type { Board } from '../store/boardStore';
import {
    createBoardMeeting,
    getApiErrorMessage,
    listBoardMeetings,
    type ProBoardMeetingResponse,
} from '../services/pasosApi';
import { logAppEvent } from '../services/appTelemetry';

interface TeamMeetingPanelProps {
    board: Board;
    readOnly?: boolean;
}

const STORAGE_PREFIX = 'pasos-team-meeting-mode';

function isClosedColumn(board: Board, columnId: string): boolean {
    const column = board.columns.find((item) => item.id === columnId);
    const title = column?.title.toLowerCase() ?? '';
    return title.includes('cerrado') || title.includes('hecho') || title.includes('terminado') || title.includes('acordado') || title.includes('completado');
}

export function TeamMeetingPanel({ board, readOnly = false }: TeamMeetingPanelProps) {
    const storageKey = `${STORAGE_PREFIX}:${board.id}`;
    const [meetings, setMeetings] = useState<ProBoardMeetingResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [meetingMode, setMeetingMode] = useState(false);
    const [title, setTitle] = useState(`Reunión ${new Date().toLocaleDateString()}`);
    const [summary, setSummary] = useState('');
    const [decisionsText, setDecisionsText] = useState('');
    const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        try {
            setMeetingMode(window.localStorage.getItem(storageKey) === '1');
        } catch {
            setMeetingMode(false);
        }
    }, [storageKey]);

    useEffect(() => {
        try {
            window.localStorage.setItem(storageKey, meetingMode ? '1' : '0');
        } catch {
            // Ignore persistence failures in restricted environments.
        }
    }, [meetingMode, storageKey]);

    useEffect(() => {
        let cancelled = false;

        listBoardMeetings(board.id)
            .then((payload) => {
                if (!cancelled) {
                    setMeetings(payload);
                    setError(null);
                }
            })
            .catch((issue) => {
                if (!cancelled) {
                    setError(getApiErrorMessage(issue, 'No se pudieron cargar las actas del equipo.'));
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
    }, [board.id]);

    const openTasks = useMemo(() => (
        board.tasks.filter((task) => !isClosedColumn(board, task.columnId))
    ), [board]);
    const agendaTasks = useMemo(() => (
        openTasks.filter((task) => task.taskType === 'agreement' || task.taskType === 'milestone' || task.taskType === 'task')
    ), [openTasks]);
    const documentTasks = useMemo(() => (
        openTasks.filter((task) => task.taskType === 'document' || (task.attachments?.length ?? 0) > 0)
    ), [openTasks]);
    const incidentTasks = useMemo(() => (
        openTasks.filter((task) => task.taskType === 'incident')
    ), [openTasks]);

    const toggleTask = (taskId: string) => {
        setLinkedTaskIds((current) => (
            current.includes(taskId)
                ? current.filter((value) => value !== taskId)
                : [...current, taskId]
        ));
    };

    const handleSaveMeeting = async () => {
        const normalizedTitle = title.trim();
        if (!normalizedTitle) return;

        setSubmitting(true);
        setError(null);
        try {
            const created = await createBoardMeeting(board.id, {
                title: normalizedTitle,
                summary: summary.trim() || undefined,
                decisions: decisionsText
                    .split('\n')
                    .map((item) => item.trim())
                    .filter(Boolean),
                linkedTaskIds,
            });
            setMeetings((current) => [created, ...current]);
            setSummary('');
            setDecisionsText('');
            setLinkedTaskIds([]);
            setMeetingMode(false);
            logAppEvent({
                type: 'team_meeting_created',
                level: 'info',
                message: 'Se registró un acta de equipo.',
                metadata: { board_id: board.id, linked_items: created.linked_task_ids.length },
            });
        } catch (issue) {
            setError(getApiErrorMessage(issue, 'No se pudo guardar el acta de reunión.'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="rounded-2xl border border-lme-border bg-lme-surface-alt/90 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-sub">Modo reunión</p>
                    <h2 className="mt-1 text-xl font-bold text-ink">Seguimiento y actas</h2>
                    <p className="mt-1 text-sm text-sub">
                        Prepara la reunión, proyecta los acuerdos y deja una acta trazable conectada con el tablero.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setMeetingMode((current) => !current)}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${meetingMode ? 'bg-white text-slate-900 hover:bg-white/90' : 'bg-vio/10 text-vio/80 hover:bg-vio/20'}`}
                >
                    <Presentation className="h-4 w-4" />
                    {meetingMode ? 'Salir de reunión' : 'Entrar en reunión'}
                </button>
            </div>

            <div className={`mt-4 grid gap-4 ${meetingMode ? 'xl:grid-cols-[1.15fr_0.85fr]' : 'xl:grid-cols-[0.95fr_1.05fr]'}`}>
                <div className={`rounded-2xl border border-lme-border p-4 ${meetingMode ? 'bg-slate-950 text-white' : 'bg-black/20'}`}>
                    <div className="flex items-center gap-2">
                        <Users className={`h-4 w-4 ${meetingMode ? 'text-white' : 'text-sky'}`} />
                        <h3 className="text-sm font-semibold">Guion de la reunión</h3>
                    </div>

                    <div className="mt-3 space-y-3">
                        <div className="rounded-xl border border-lme-border/70 bg-black/20 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-sub">Agenda viva</p>
                            <div className="mt-2 space-y-2">
                                {agendaTasks.length === 0 ? (
                                    <p className="text-sm text-sub">No hay acuerdos o tareas activas en agenda.</p>
                                ) : (
                                    agendaTasks.slice(0, 6).map((task) => (
                                        <label key={task.id} className="flex items-start gap-3 rounded-lg border border-lme-border/60 bg-lme-surface/30 px-3 py-2 text-sm text-ink">
                                            <input
                                                type="checkbox"
                                                checked={linkedTaskIds.includes(task.id)}
                                                onChange={() => toggleTask(task.id)}
                                                disabled={readOnly}
                                                className="mt-1"
                                            />
                                            <span className="min-w-0">
                                                <span className="block font-semibold">{task.title}</span>
                                                <span className="mt-1 block text-xs text-sub">
                                                    {board.columns.find((column) => column.id === task.columnId)?.title ?? 'Pendiente'}
                                                </span>
                                            </span>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-2">
                            <div className="rounded-xl border border-lme-border/70 bg-black/20 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-sub">Bloqueos</p>
                                <div className="mt-2 space-y-2">
                                    {incidentTasks.length === 0 ? (
                                        <p className="text-sm text-sub">Sin incidencias abiertas.</p>
                                    ) : (
                                        incidentTasks.slice(0, 4).map((task) => (
                                            <div key={task.id} className="rounded-lg border border-lme-warning/20 bg-lme-warning/10 px-3 py-2 text-sm text-lme-warning/85">
                                                {task.title}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="rounded-xl border border-lme-border/70 bg-black/20 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-sub">Documentos</p>
                                <div className="mt-2 space-y-2">
                                    {documentTasks.length === 0 ? (
                                        <p className="text-sm text-sub">Sin documentos vinculados.</p>
                                    ) : (
                                        documentTasks.slice(0, 4).map((task) => (
                                            <div key={task.id} className="rounded-lg border border-lme-border/60 bg-lme-surface/30 px-3 py-2 text-sm text-ink">
                                                {task.title}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-lme-border bg-black/20 p-4">
                    <div className="flex items-center gap-2 text-ink">
                        <FileText className="h-4 w-4 text-mint" />
                        <h3 className="text-sm font-semibold">Acta rápida</h3>
                    </div>

                    {!readOnly && (
                        <div className="mt-3 space-y-3 rounded-2xl border border-lme-border bg-lme-surface/30 p-4">
                            <div>
                                <label htmlFor="meeting-title" className="mb-2 block text-xs font-semibold uppercase text-sub">Título</label>
                                <input
                                    id="meeting-title"
                                    value={title}
                                    onChange={(event) => setTitle(event.target.value)}
                                    className="w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none"
                                />
                            </div>
                            <div>
                                <label htmlFor="meeting-summary" className="mb-2 block text-xs font-semibold uppercase text-sub">Resumen</label>
                                <textarea
                                    id="meeting-summary"
                                    value={summary}
                                    onChange={(event) => setSummary(event.target.value)}
                                    className="min-h-[100px] w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none"
                                    placeholder="Qué se ha trabajado, qué queda pendiente y qué necesita seguimiento."
                                />
                            </div>
                            <div>
                                <label htmlFor="meeting-decisions" className="mb-2 block text-xs font-semibold uppercase text-sub">Acuerdos</label>
                                <textarea
                                    id="meeting-decisions"
                                    value={decisionsText}
                                    onChange={(event) => setDecisionsText(event.target.value)}
                                    className="min-h-[110px] w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none"
                                    placeholder={'Un acuerdo por línea\nEj. Compartir el documento final\nEj. Revisar incidencias el jueves'}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => void handleSaveMeeting()}
                                disabled={!title.trim() || submitting}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-mint px-4 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-mint/85 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Save className="h-4 w-4" />
                                {submitting ? 'Guardando acta...' : 'Guardar acta'}
                            </button>
                        </div>
                    )}

                    {error && <p className="mt-3 text-sm text-lme-danger/80">{error}</p>}

                    <div className="mt-4 space-y-3">
                        {loading ? (
                            <p className="text-sm text-sub">Cargando actas...</p>
                        ) : meetings.length === 0 ? (
                            <p className="text-sm text-sub">Todavía no hay actas registradas en este tablero.</p>
                        ) : (
                            meetings.map((meeting) => (
                                <article key={meeting.id} className="rounded-xl border border-lme-border bg-lme-surface/40 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold text-ink">{meeting.title}</p>
                                        <p className="text-xs text-sub">{new Date(meeting.created_at).toLocaleString()}</p>
                                    </div>
                                    {meeting.summary && <p className="mt-2 text-sm text-sub whitespace-pre-wrap">{meeting.summary}</p>}
                                    {meeting.decisions.length > 0 && (
                                        <div className="mt-3 space-y-2">
                                            {meeting.decisions.map((decision, index) => (
                                                <div key={`${meeting.id}-decision-${index}`} className="flex items-start gap-2 rounded-lg border border-lme-border/60 bg-black/20 px-3 py-2 text-sm text-ink">
                                                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-mint" />
                                                    <span>{decision}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {meeting.linked_task_ids.length > 0 && (
                                        <p className="mt-3 text-xs text-sub">
                                            Elementos vinculados: {meeting.linked_task_ids.length}
                                        </p>
                                    )}
                                </article>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
