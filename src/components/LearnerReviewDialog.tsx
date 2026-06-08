import { useMemo, useState } from 'react';
import { CheckCircle2, LifeBuoy, MessageSquareText, NotebookPen, X } from 'lucide-react';
import type { Board } from '../store/boardStore';
import { saveLearnerFeedback, type ProBoardLearnerInsightResponse } from '../services/pasosApi';
import { logAppEvent } from '../services/appTelemetry';

interface LearnerReviewDialogProps {
    board: Board;
    learner: ProBoardLearnerInsightResponse;
    onClose: () => void;
    onSaved: (learner: ProBoardLearnerInsightResponse) => void;
}

export function LearnerReviewDialog({ board, learner, onClose, onSaved }: LearnerReviewDialogProps) {
    const [taskId, setTaskId] = useState(
        learner.help_task_ids[0]
        ?? learner.evidence_entries[0]?.task_id
        ?? learner.validated_task_ids[0]
        ?? board.tasks[0]?.id
        ?? '',
    );
    const [status, setStatus] = useState<'comment' | 'needs_revision' | 'validated'>('comment');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const taskMap = useMemo(() => new Map(board.tasks.map((task) => [task.id, task])), [board.tasks]);

    const handleSubmit = async () => {
        if (!learner.share_code || !taskId || !message.trim()) {
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            const updatedLearner = await saveLearnerFeedback(board.id, {
                shareCode: learner.share_code,
                learnerKey: learner.learner_key,
                taskId,
                message: message.trim(),
                status,
                resolveHelpRequest: true,
            });
            onSaved(updatedLearner);
            setMessage('');
            setStatus('comment');
            logAppEvent({
                type: 'learner_feedback_saved',
                level: 'info',
                message: 'Se guardó feedback docente para un alumno del tablero.',
                metadata: { board_id: board.id, learner_key: learner.learner_key, task_id: taskId, status },
            });
        } catch (issue) {
            const nextError = issue instanceof Error ? issue.message : 'No se pudo guardar el feedback docente.';
            setError(nextError);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-toast flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="learner-review-dialog-title"
                className="glass-panel w-full max-w-5xl rounded-3xl p-6 sm:p-8"
            >
                <div className="flex items-start justify-between gap-4 border-b border-line/50 pb-5">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-sub">Seguimiento docente</p>
                        <h2 id="learner-review-dialog-title" className="mt-1 text-2xl font-black text-ink">
                            {learner.learner_label || 'Alumno anónimo'}
                        </h2>
                        <p className="mt-2 text-sm text-sub">
                            {learner.completed_count}/{learner.total_tasks} tareas · {learner.progress_percent}% · {learner.last_event_type || 'sin evento reciente'}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-xl p-2 text-sub transition-colors hover:text-ink">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
                    <section className="space-y-4 rounded-2xl border border-lme-border bg-black/20 p-5">
                        <div className="flex items-center gap-2 text-ink">
                            <LifeBuoy className="h-4 w-4 text-lme-warning" />
                            <h3 className="text-base font-bold">Ayuda y evidencias</h3>
                        </div>

                        <div className="rounded-2xl border border-lme-border bg-lme-surface/30 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-sub">Solicitudes de ayuda</p>
                            {learner.help_task_ids.length === 0 ? (
                                <p className="mt-2 text-sm text-sub">No hay tareas marcadas como bloqueadas.</p>
                            ) : (
                                <ul className="mt-2 space-y-2 text-sm text-ink">
                                    {learner.help_task_ids.map((helpTaskId) => (
                                        <li key={helpTaskId}>{taskMap.get(helpTaskId)?.title || helpTaskId}</li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="rounded-2xl border border-lme-border bg-lme-surface/30 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-sub">Evidencias del alumno</p>
                            {learner.evidence_entries.length === 0 ? (
                                <p className="mt-2 text-sm text-sub">Todavía no hay evidencias registradas.</p>
                            ) : (
                                <div className="mt-3 space-y-3">
                                    {learner.evidence_entries.map((entry) => (
                                        <article key={`${entry.task_id}-${entry.submitted_at}`} className="rounded-2xl border border-lme-border bg-black/20 p-4">
                                            <p className="text-sm font-semibold text-ink">{taskMap.get(entry.task_id)?.title || entry.task_id}</p>
                                            {entry.note && <p className="mt-2 text-sm text-sub">{entry.note}</p>}
                                            {entry.url && (
                                                <a href={entry.url} target="_blank" rel="noreferrer noopener" className="mt-2 inline-block text-sm text-sky hover:underline">
                                                    Abrir enlace adjunto
                                                </a>
                                            )}
                                            <p className="mt-2 text-xs text-sub">{new Date(entry.submitted_at).toLocaleString()}</p>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="space-y-4 rounded-2xl border border-lme-border bg-black/20 p-5">
                        <div className="flex items-center gap-2 text-ink">
                            <MessageSquareText className="h-4 w-4 text-mint" />
                            <h3 className="text-base font-bold">Feedback y validación</h3>
                        </div>

                        <div className="rounded-2xl border border-lme-border bg-lme-surface/30 p-4">
                            <label htmlFor="learner-review-task" className="mb-2 block text-xs font-bold uppercase tracking-wide text-sub">
                                Paso a revisar
                            </label>
                            <select
                                id="learner-review-task"
                                value={taskId}
                                onChange={(event) => setTaskId(event.target.value)}
                                className="w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none"
                            >
                                {board.tasks.map((task) => (
                                    <option key={task.id} value={task.id}>
                                        {task.title}
                                    </option>
                                ))}
                            </select>

                            <label htmlFor="learner-review-status" className="mt-4 mb-2 block text-xs font-bold uppercase tracking-wide text-sub">
                                Tipo de devolución
                            </label>
                            <select
                                id="learner-review-status"
                                value={status}
                                onChange={(event) => setStatus(event.target.value as 'comment' | 'needs_revision' | 'validated')}
                                className="w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none"
                            >
                                <option value="comment">Comentario</option>
                                <option value="needs_revision">Necesita revisión</option>
                                <option value="validated">Validar paso</option>
                            </select>

                            <label htmlFor="learner-review-message" className="mt-4 mb-2 block text-xs font-bold uppercase tracking-wide text-sub">
                                Mensaje docente
                            </label>
                            <textarea
                                id="learner-review-message"
                                value={message}
                                onChange={(event) => setMessage(event.target.value)}
                                className="min-h-[120px] w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none"
                                placeholder="Escribe una devolución formativa clara, breve y accionable."
                            />

                            {error && <p className="mt-3 text-sm text-lme-danger/80">{error}</p>}

                            <button
                                type="button"
                                onClick={() => void handleSubmit()}
                                disabled={!taskId || !message.trim() || !learner.share_code || submitting}
                                className="mt-4 w-full rounded-xl bg-mint px-4 py-3 text-sm font-bold text-bg0 transition-colors hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {submitting ? 'Guardando...' : 'Guardar feedback'}
                            </button>
                        </div>

                        <div className="rounded-2xl border border-lme-border bg-lme-surface/30 p-4">
                            <div className="flex items-center gap-2 text-ink">
                                <NotebookPen className="h-4 w-4 text-sky" />
                                <p className="text-sm font-semibold">Historial docente</p>
                            </div>
                            <div className="mt-3 space-y-2">
                                {learner.feedback_entries.length === 0 ? (
                                    <p className="text-sm text-sub">Todavía no hay mensajes guardados para este alumno.</p>
                                ) : (
                                    learner.feedback_entries.map((entry) => (
                                        <article key={`${entry.task_id}-${entry.created_at}`} className="rounded-2xl border border-lme-border bg-black/20 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-sm font-semibold text-ink">{taskMap.get(entry.task_id)?.title || entry.task_id}</p>
                                                {entry.status === 'validated' && <CheckCircle2 className="h-4 w-4 text-mint" />}
                                            </div>
                                            <p className="mt-2 text-sm text-sub">{entry.message}</p>
                                            <p className="mt-2 text-xs text-sub">
                                                {entry.author_label || 'Docente'} · {new Date(entry.created_at).toLocaleString()}
                                            </p>
                                        </article>
                                    ))
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
