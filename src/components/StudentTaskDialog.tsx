import { useState } from 'react';
import { CheckCircle2, Circle, LifeBuoy, Link2, MessageSquareText, X } from 'lucide-react';
import type { Task } from '../store/boardStore';
import type { StudentEvidenceEntry, StudentFeedbackEntry } from '../utils/shareCode';
import { sanitizeURL } from '../utils/security';

interface StudentTaskDialogProps {
    task: Task;
    isCompleted: boolean;
    needsHelp: boolean;
    isValidated: boolean;
    evidenceEntry?: StudentEvidenceEntry;
    feedbackEntries: StudentFeedbackEntry[];
    onClose: () => void;
    onToggleComplete: () => void;
    onToggleHelp: () => void;
    onSaveEvidence: (payload: { note?: string; url?: string }) => void;
}

export function StudentTaskDialog({
    task,
    isCompleted,
    needsHelp,
    isValidated,
    evidenceEntry,
    feedbackEntries,
    onClose,
    onToggleComplete,
    onToggleHelp,
    onSaveEvidence,
}: StudentTaskDialogProps) {
    const [note, setNote] = useState(evidenceEntry?.note ?? '');
    const [url, setUrl] = useState(evidenceEntry?.url ?? '');

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="student-task-dialog-title"
                className="glass-panel w-full max-w-3xl rounded-3xl p-6 sm:p-8"
            >
                <div className="flex items-start justify-between gap-4 border-b border-line/50 pb-5">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-sub">Pasos Aula</p>
                        <h2 id="student-task-dialog-title" className="mt-1 text-2xl font-black text-ink">{task.title}</h2>
                        {task.objective && <p className="mt-2 text-sm text-sub">{task.objective}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl p-2 text-sub transition-colors hover:text-ink"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                    <section className="space-y-4 rounded-2xl border border-lme-border bg-black/20 p-5">
                        {task.description && (
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-sub">Qué hay que hacer</p>
                                <p className="mt-2 text-sm text-ink">{task.description}</p>
                            </div>
                        )}

                        {task.supportText && (
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-sub">Ayuda o apoyo</p>
                                <p className="mt-2 text-sm text-ink">{task.supportText}</p>
                            </div>
                        )}

                        {task.expectedEvidence && (
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-sub">Evidencia esperada</p>
                                <p className="mt-2 text-sm text-ink">{task.expectedEvidence}</p>
                            </div>
                        )}

                        {task.nextStep && (
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-sub">Siguiente paso</p>
                                <p className="mt-2 text-sm text-ink">{task.nextStep}</p>
                            </div>
                        )}

                        {(task.attachments?.length ?? 0) > 0 && (
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-sub">Recursos</p>
                                <div className="mt-3 space-y-2">
                                    {task.attachments?.map((attachment) => (
                                        <a
                                            key={attachment.id}
                                            href={attachment.url}
                                            target="_blank"
                                            rel="noreferrer noopener"
                                            className="flex items-center gap-3 rounded-2xl border border-lme-border bg-lme-surface/40 p-3 text-sm text-ink transition-colors hover:bg-lme-surface/60"
                                        >
                                            <Link2 className="h-4 w-4 text-sky" />
                                            <span className="truncate">{attachment.title || attachment.url}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="space-y-4 rounded-2xl border border-lme-border bg-black/20 p-5">
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={onToggleComplete}
                                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${isCompleted ? 'bg-mint text-bg0' : 'border border-line bg-white/5 text-ink hover:bg-white/10'}`}
                            >
                                {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                                {isCompleted ? 'Marcada como hecha' : 'Marcar como hecha'}
                            </button>
                            <button
                                type="button"
                                onClick={onToggleHelp}
                                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${needsHelp ? 'bg-lme-warning text-bg0' : 'border border-line bg-white/5 text-ink hover:bg-white/10'}`}
                            >
                                <LifeBuoy className="h-4 w-4" />
                                {needsHelp ? 'Ayuda solicitada' : 'Necesito ayuda'}
                            </button>
                        </div>

                        {isValidated && (
                            <div className="rounded-2xl border border-mint/30 bg-mint/10 p-4 text-sm text-mint">
                                El docente ha validado este paso.
                            </div>
                        )}

                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-sub">Tu evidencia</p>
                            <textarea
                                value={note}
                                onChange={(event) => setNote(event.target.value)}
                                className="mt-3 min-h-[96px] w-full rounded-2xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none"
                                placeholder="Escribe qué has hecho, cómo te ha salido o qué has entregado."
                            />
                            <input
                                value={url}
                                onChange={(event) => setUrl(event.target.value)}
                                className="mt-3 w-full rounded-2xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none"
                                placeholder="Enlace opcional a foto, vídeo o documento"
                            />
                            <button
                                type="button"
                                onClick={() => onSaveEvidence({
                                    note: note.trim() || undefined,
                                    url: url.trim() ? sanitizeURL(url.trim()) || undefined : undefined,
                                })}
                                disabled={!note.trim() && !url.trim()}
                                className="mt-3 w-full rounded-xl bg-sky px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-sky/80 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Guardar evidencia
                            </button>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 text-ink">
                                <MessageSquareText className="h-4 w-4 text-mint" />
                                <p className="text-sm font-semibold">Feedback docente</p>
                            </div>
                            <div className="mt-3 space-y-2">
                                {feedbackEntries.length === 0 ? (
                                    <div className="rounded-2xl border border-lme-border bg-lme-surface/30 p-4 text-sm text-sub">
                                        Todavía no hay feedback docente para este paso.
                                    </div>
                                ) : (
                                    feedbackEntries.map((entry) => (
                                        <article key={`${entry.taskId}-${entry.createdAt}`} className="rounded-2xl border border-lme-border bg-lme-surface/40 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] font-bold text-ink">
                                                    {entry.status === 'validated' ? 'Validado' : entry.status === 'needs_revision' ? 'Revisar' : 'Comentario'}
                                                </span>
                                                <span className="text-[11px] text-sub">{new Date(entry.createdAt).toLocaleString()}</span>
                                            </div>
                                            <p className="mt-2 text-sm text-ink">{entry.message}</p>
                                            {entry.authorLabel && <p className="mt-1 text-xs text-sub">Por {entry.authorLabel}</p>}
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
