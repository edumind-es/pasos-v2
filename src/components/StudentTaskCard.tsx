/**
 * Tarjeta de tarea para la vista compartida del alumno.
 * Muestra pictogramas, estado de completado, ayuda y feedback.
 */
import { CheckCircle2, Circle, LifeBuoy, MessageSquareText } from 'lucide-react';
import type { Task } from '../store/boardStore';

const COLOR_CLASSES: Record<string, string> = {
    red: 'bg-lme-danger/20 border-lme-danger/50',
    orange: 'bg-orange-500/20 border-orange-500/50',
    yellow: 'bg-yellow-500/20 border-yellow-500/50',
    green: 'bg-green-500/20 border-green-500/50',
    blue: 'bg-blue-500/20 border-blue-500/50',
    purple: 'bg-vio/20 border-vio/50',
    pink: 'bg-pink-500/20 border-pink-500/50',
    gray: 'bg-black/20 border-line',
};

interface Props {
    task: Task;
    isCompleted: boolean;
    needsHelp: boolean;
    feedbackCount: number;
    onToggle: () => void;
    onOpenDetails: () => void;
}

export function StudentTaskCard({ task, isCompleted, needsHelp, feedbackCount, onToggle, onOpenDetails }: Props) {
    const cardClass = isCompleted
        ? 'bg-mint/10 border-mint/50'
        : (COLOR_CLASSES[task.color || 'gray'] ?? COLOR_CLASSES.gray);

    return (
        <article className={`relative p-4 rounded-2xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${cardClass}`}>
            <div className="flex items-start gap-3">
                {/* Toggle de completado */}
                <button
                    type="button"
                    className="mt-0.5 shrink-0"
                    onClick={onToggle}
                    aria-label={isCompleted ? 'Marcar como pendiente' : 'Marcar como completada'}
                >
                    {isCompleted
                        ? <CheckCircle2 className="w-6 h-6 text-mint" />
                        : <Circle className="w-6 h-6 text-sub" />}
                </button>

                <div className="flex-1 min-w-0">
                    <h3 className={`font-bold text-base leading-tight ${isCompleted ? 'line-through text-sub' : 'text-ink'}`}>
                        {task.title}
                    </h3>
                    {task.description && (
                        <p className={`mt-1 text-sm leading-5 ${isCompleted ? 'text-sub/60' : 'text-sub'}`}>
                            {task.description}
                        </p>
                    )}
                    {task.objective && (
                        <p className={`mt-1 text-xs ${isCompleted ? 'text-sub/60' : 'text-sub'}`}>
                            Objetivo: {task.objective}
                        </p>
                    )}

                    {/* Pictogramas */}
                    {(task.pictograms?.length ?? 0) > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {task.pictograms!.slice(0, 4).map((pic, i) => (
                                <img
                                    key={i}
                                    src={typeof pic === 'string' ? pic : pic.url}
                                    alt=""
                                    className={`w-12 h-12 rounded-xl object-contain bg-white/80 p-0.5 ${isCompleted ? 'opacity-50' : ''}`}
                                />
                            ))}
                            {(task.pictograms!.length) > 4 && (
                                <span className="text-[11px] text-sub flex items-center">+{task.pictograms!.length - 4}</span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Badges de estado */}
            {(needsHelp || task.expectedEvidence || feedbackCount > 0) && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {needsHelp && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-lme-warning/20 px-2 py-1 text-[11px] font-semibold text-lme-warning">
                            <LifeBuoy className="h-3 w-3" /> Ayuda solicitada
                        </span>
                    )}
                    {task.expectedEvidence && (
                        <span className="rounded-full bg-sky/20 px-2 py-1 text-[11px] font-semibold text-sky">
                            Evidencia
                        </span>
                    )}
                    {feedbackCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-mint/20 px-2 py-1 text-[11px] font-semibold text-mint">
                            <MessageSquareText className="h-3 w-3" /> {feedbackCount} feedback
                        </span>
                    )}
                </div>
            )}

            <button
                type="button"
                onClick={onOpenDetails}
                className="mt-3 w-full rounded-xl border border-line bg-white/5 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-white/10"
            >
                Ver detalle
            </button>
        </article>
    );
}
