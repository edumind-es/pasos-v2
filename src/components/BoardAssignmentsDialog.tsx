import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Trash2, UserRoundPlus, Users } from 'lucide-react';
import {
    createBoardAssignment,
    deleteBoardAssignment,
    getApiErrorMessage,
    listBoardAssignments,
    type ProBoardLearnerInsightResponse,
    type ProLearningAssignmentResponse,
} from '../services/pasosApi';
import { logAppEvent } from '../services/appTelemetry';

interface BoardAssignmentsDialogProps {
    boardId: string;
    boardTitle: string;
    learners?: ProBoardLearnerInsightResponse[];
    onClose: () => void;
}

function normalizeLabel(value: string): string {
    return value.trim().toLowerCase();
}

export function BoardAssignmentsDialog({ boardId, boardTitle, learners = [], onClose }: BoardAssignmentsDialogProps) {
    const [assignments, setAssignments] = useState<ProLearningAssignmentResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [targetType, setTargetType] = useState<'student' | 'group'>('student');
    const [targetLabel, setTargetLabel] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        let cancelled = false;

        const loadAssignments = async () => {
            setLoading(true);
            try {
                const payload = await listBoardAssignments(boardId);
                if (!cancelled) {
                    setAssignments(payload);
                    setError(null);
                }
            } catch (issue) {
                if (!cancelled) {
                    setError(getApiErrorMessage(issue, 'No se pudieron cargar las asignaciones del tablero.'));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadAssignments();
        return () => {
            cancelled = true;
        };
    }, [boardId]);

    const learnerMap = useMemo(() => new Map(
        learners.map((learner) => [normalizeLabel(learner.learner_label || ''), learner]),
    ), [learners]);

    const handleCreate = async () => {
        const normalizedLabel = targetLabel.trim();
        if (!normalizedLabel) {
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            const created = await createBoardAssignment(boardId, {
                targetType,
                targetLabel: normalizedLabel,
                dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
                notes: notes.trim() || undefined,
            });
            setAssignments((current) => [created, ...current]);
            setTargetLabel('');
            setDueDate('');
            setNotes('');
            logAppEvent({
                type: 'board_assignment_created',
                level: 'info',
                message: 'Se creó una asignación de secuencia.',
                metadata: { board_id: boardId, target_type: targetType },
            });
        } catch (issue) {
            setError(getApiErrorMessage(issue, 'No se pudo crear la asignación.'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (assignmentId: string) => {
        try {
            await deleteBoardAssignment(boardId, assignmentId);
            setAssignments((current) => current.filter((assignment) => assignment.id !== assignmentId));
        } catch (issue) {
            setError(getApiErrorMessage(issue, 'No se pudo eliminar la asignación.'));
        }
    };

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="board-assignments-dialog-title"
                className="glass-panel w-full max-w-5xl rounded-3xl p-6 sm:p-8"
            >
                <div className="flex flex-col gap-4 border-b border-line/50 pb-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-sub">Asignaciones</p>
                        <h2 id="board-assignments-dialog-title" className="mt-1 text-2xl font-black text-ink">
                            {boardTitle}
                        </h2>
                        <p className="mt-2 text-sm text-sub">
                            Asigna esta secuencia a alumnado o grupos y conecta la planificación con el seguimiento real.
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="self-start rounded-xl px-4 py-2 text-sm font-medium text-sub transition-colors hover:text-ink">
                        Cerrar
                    </button>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                    <section className="rounded-2xl border border-lme-border bg-black/20 p-5">
                        <div className="flex items-center gap-2 text-ink">
                            <UserRoundPlus className="h-4 w-4 text-sky" />
                            <h3 className="text-base font-bold">Nueva asignación</h3>
                        </div>

                        <div className="mt-4 space-y-3">
                            <div>
                                <label htmlFor="assignment-target-type" className="mb-2 block text-xs font-semibold uppercase text-sub">Tipo</label>
                                <select
                                    id="assignment-target-type"
                                    value={targetType}
                                    onChange={(event) => setTargetType(event.target.value as 'student' | 'group')}
                                    className="w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none"
                                >
                                    <option value="student">Alumno</option>
                                    <option value="group">Grupo</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="assignment-target-label" className="mb-2 block text-xs font-semibold uppercase text-sub">Nombre</label>
                                <input
                                    id="assignment-target-label"
                                    value={targetLabel}
                                    onChange={(event) => setTargetLabel(event.target.value)}
                                    className="w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none"
                                    placeholder={targetType === 'student' ? 'Ej. Marta' : 'Ej. Equipo Azul'}
                                />
                            </div>

                            <div>
                                <label htmlFor="assignment-due-date" className="mb-2 block text-xs font-semibold uppercase text-sub">Fecha objetivo</label>
                                <input
                                    id="assignment-due-date"
                                    type="date"
                                    value={dueDate}
                                    onChange={(event) => setDueDate(event.target.value)}
                                    className="w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none"
                                />
                            </div>

                            <div>
                                <label htmlFor="assignment-notes" className="mb-2 block text-xs font-semibold uppercase text-sub">Notas</label>
                                <textarea
                                    id="assignment-notes"
                                    value={notes}
                                    onChange={(event) => setNotes(event.target.value)}
                                    className="min-h-[100px] w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none"
                                    placeholder="Objetivo, adaptaciones o criterio de seguimiento."
                                />
                            </div>
                        </div>

                        {error && <p className="mt-4 text-sm text-lme-danger/80">{error}</p>}

                        <button
                            type="button"
                            onClick={() => void handleCreate()}
                            disabled={!targetLabel.trim() || submitting}
                            className="mt-5 w-full rounded-xl bg-sky px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-sky/80 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {submitting ? 'Guardando...' : 'Crear asignación'}
                        </button>
                    </section>

                    <section className="rounded-2xl border border-lme-border bg-black/20 p-5">
                        <div className="flex items-center gap-2 text-ink">
                            <Users className="h-4 w-4 text-mint" />
                            <h3 className="text-base font-bold">Seguimiento asignado</h3>
                        </div>

                        <div className="mt-4 space-y-3">
                            {loading ? (
                                <div className="rounded-2xl border border-lme-border bg-lme-surface/30 p-4 text-sm text-sub">
                                    Cargando asignaciones...
                                </div>
                            ) : assignments.length === 0 ? (
                                <div className="rounded-2xl border border-lme-border bg-lme-surface/30 p-4 text-sm text-sub">
                                    Todavía no hay asignaciones para esta secuencia.
                                </div>
                            ) : (
                                assignments.map((assignment) => {
                                    const matchedLearner = learnerMap.get(normalizeLabel(assignment.target_label));
                                    return (
                                        <article key={assignment.id} className="rounded-2xl border border-lme-border bg-lme-surface/40 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-ink">{assignment.target_label}</p>
                                                    <p className="text-xs text-sub">
                                                        {assignment.target_type === 'student' ? 'Alumno' : 'Grupo'}
                                                        {assignment.due_date ? ` · ${new Date(assignment.due_date).toLocaleDateString()}` : ' · Sin fecha'}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleDelete(assignment.id)}
                                                    className="rounded-lg p-2 text-sub transition-colors hover:bg-lme-danger/10 hover:text-lme-danger/80"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>

                                            {assignment.notes && <p className="mt-2 text-sm text-sub">{assignment.notes}</p>}

                                            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-sub">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1">
                                                    <CalendarDays className="h-3 w-3" />
                                                    {assignment.due_date ? 'Programada' : 'Sin fecha'}
                                                </span>
                                                {matchedLearner && (
                                                    <>
                                                        <span className="rounded-full bg-mint/10 px-2 py-1 text-mint">
                                                            {matchedLearner.progress_percent}%
                                                        </span>
                                                        <span className="rounded-full bg-white/5 px-2 py-1">
                                                            ayuda {matchedLearner.help_task_count}
                                                        </span>
                                                        <span className="rounded-full bg-white/5 px-2 py-1">
                                                            evidencias {matchedLearner.evidence_count}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
