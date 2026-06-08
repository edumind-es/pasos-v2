import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, MessageSquareText, NotebookPen, Send } from 'lucide-react';
import type { Board } from '../store/boardStore';
import { createBoardComment, getApiErrorMessage, listBoardComments, type ProBoardCommentResponse } from '../services/pasosApi';
import { logAppEvent } from '../services/appTelemetry';

interface TeamActivityPanelProps {
    board: Board;
    readOnly?: boolean;
}

function isClosedColumn(board: Board, columnId: string): boolean {
    const column = board.columns.find((item) => item.id === columnId);
    const title = column?.title.toLowerCase() ?? '';
    return title.includes('cerrado') || title.includes('hecho') || title.includes('terminado') || title.includes('acordado');
}

export function TeamActivityPanel({ board, readOnly = false }: TeamActivityPanelProps) {
    const [comments, setComments] = useState<ProBoardCommentResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        listBoardComments(board.id)
            .then((payload) => {
                if (!cancelled) {
                    setComments(payload);
                    setError(null);
                }
            })
            .catch((issue) => {
                if (!cancelled) {
                    setError(getApiErrorMessage(issue, 'No se pudo cargar la actividad del equipo.'));
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

    const pendingAgreements = useMemo(() => (
        board.tasks.filter((task) => task.taskType === 'agreement' && !isClosedColumn(board, task.columnId))
    ), [board]);
    const openIncidents = useMemo(() => (
        board.tasks.filter((task) => task.taskType === 'incident' && !isClosedColumn(board, task.columnId))
    ), [board]);

    const handleSubmit = async () => {
        const normalized = message.trim();
        if (!normalized) return;

        setSubmitting(true);
        setError(null);
        try {
            const comment = await createBoardComment(board.id, { message: normalized });
            setComments((current) => [comment, ...current]);
            setMessage('');
            logAppEvent({
                type: 'team_comment_created',
                level: 'info',
                message: 'Se publicó un comentario en el tablero de equipo.',
                metadata: { board_id: board.id, mentions: comment.mentions.length },
            });
        } catch (issue) {
            setError(getApiErrorMessage(issue, 'No se pudo publicar el comentario.'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="rounded-2xl border border-lme-border bg-lme-surface-alt/90 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-sub">Pasos Equipo</p>
                    <h2 className="mt-1 text-xl font-bold text-ink">Actividad y acuerdos</h2>
                    <p className="mt-1 text-sm text-sub">
                        Comentarios, menciones y seguimiento rápido de acuerdos pendientes del equipo.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-sub">
                    <span className="rounded-full bg-white/5 px-3 py-1 text-ink">
                        Acuerdos pendientes: {pendingAgreements.length}
                    </span>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-ink">
                        Incidencias abiertas: {openIncidents.length}
                    </span>
                </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-2xl border border-lme-border bg-black/20 p-4">
                    <div className="flex items-center gap-2 text-ink">
                        <NotebookPen className="h-4 w-4 text-mint" />
                        <h3 className="text-sm font-semibold">Acuerdos pendientes</h3>
                    </div>
                    <div className="mt-3 space-y-2">
                        {pendingAgreements.length === 0 ? (
                            <p className="text-sm text-sub">No hay acuerdos pendientes en este momento.</p>
                        ) : (
                            pendingAgreements.slice(0, 6).map((task) => (
                                <article key={task.id} className="rounded-xl border border-lme-border bg-lme-surface/40 p-3">
                                    <p className="text-sm font-semibold text-ink">{task.title}</p>
                                    {task.description && <p className="mt-1 text-xs text-sub">{task.description}</p>}
                                </article>
                            ))
                        )}
                        {openIncidents.length > 0 && (
                            <div className="rounded-xl border border-lme-warning/30 bg-lme-warning/10 p-3 text-sm text-lme-warning/85">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    {openIncidents.length} incidencia(s) requieren seguimiento.
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-lme-border bg-black/20 p-4">
                    <div className="flex items-center gap-2 text-ink">
                        <MessageSquareText className="h-4 w-4 text-sky" />
                        <h3 className="text-sm font-semibold">Conversación del equipo</h3>
                    </div>

                    {!readOnly && (
                        <div className="mt-3 rounded-2xl border border-lme-border bg-lme-surface/40 p-3">
                            <textarea
                                value={message}
                                onChange={(event) => setMessage(event.target.value)}
                                className="min-h-[88px] w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none"
                                placeholder="Comparte un acuerdo, bloqueo o mención usando @nombre."
                            />
                            <button
                                type="button"
                                onClick={() => void handleSubmit()}
                                disabled={!message.trim() || submitting}
                                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-sky px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-sky/80 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Send className="h-4 w-4" />
                                {submitting ? 'Publicando...' : 'Publicar comentario'}
                            </button>
                        </div>
                    )}

                    {error && <p className="mt-3 text-sm text-lme-danger/80">{error}</p>}

                    <div className="mt-3 space-y-3">
                        {loading ? (
                            <p className="text-sm text-sub">Cargando actividad del equipo...</p>
                        ) : comments.length === 0 ? (
                            <p className="text-sm text-sub">Todavía no hay comentarios en este tablero de equipo.</p>
                        ) : (
                            comments.map((comment) => (
                                <article key={comment.id} className="rounded-xl border border-lme-border bg-lme-surface/40 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold text-ink">{comment.author_label || 'Equipo'}</p>
                                        <p className="text-xs text-sub">{new Date(comment.created_at).toLocaleString()}</p>
                                    </div>
                                    <p className="mt-2 text-sm text-sub whitespace-pre-wrap">{comment.message}</p>
                                    {comment.mentions.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-sky">
                                            {comment.mentions.map((mention) => (
                                                <span key={mention} className="rounded-full bg-sky/10 px-2 py-1">
                                                    @{mention}
                                                </span>
                                            ))}
                                        </div>
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
