import { useEffect, useState, type MutableRefObject } from 'react';
import { Hourglass, Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react';
import type { Task } from '../store/boardStore';
import { formatTime, playTimerAlert } from '../utils/timer';

export interface TimerControl {
    /** Alterna iniciar/pausar (usado desde el teclado de la vista). */
    toggle: () => void;
}

interface Props {
    task: Task;
    onUpdateDuration: (seconds: number | undefined) => void;
    /** El componente publica aquí su control de play/pausa para gobernarlo por teclado. */
    controlRef?: MutableRefObject<TimerControl | null>;
    size?: 'md' | 'lg';
}

/**
 * Temporizador de cuenta atrás para impartir en aula (Presentar / Secuencia).
 * Anillo de progreso en colores de Los Cinco Mundos y campana al terminar.
 * Se remonta por tarea (key={task.id} en el padre), por lo que arranca limpio.
 */
export function PresentationTimer({ task, onUpdateDuration, controlRef, size = 'md' }: Props) {
    const initialDuration = task.durationSeconds ?? 0;
    const [remaining, setRemaining] = useState(initialDuration);
    const [total, setTotal] = useState(initialDuration);
    const [running, setRunning] = useState(false);
    const [completed, setCompleted] = useState(false);

    // Publica el control de play/pausa (asignar a un ref, no es setState)
    useEffect(() => {
        if (!controlRef) return undefined;
        controlRef.current = { toggle: () => { if (task.durationSeconds) setRunning(value => !value); } };
        return () => { controlRef.current = null; };
    }, [controlRef, task.durationSeconds]);

    useEffect(() => {
        if (!running) return undefined;
        const timer = window.setInterval(() => {
            setRemaining(value => {
                if (value <= 1) {
                    window.clearInterval(timer);
                    setRunning(false);
                    setCompleted(true);
                    playTimerAlert();
                    return 0;
                }
                return value - 1;
            });
        }, 1000);
        return () => window.clearInterval(timer);
    }, [running]);

    const adjustTime = (deltaSeconds: number) => {
        setRemaining(value => {
            const next = Math.max(0, value + deltaSeconds);
            setTotal(next);
            setCompleted(false);
            onUpdateDuration(next > 0 ? next : undefined);
            return next;
        });
    };

    const setQuickTimer = (minutes: number) => {
        const seconds = minutes * 60;
        onUpdateDuration(seconds);
        setRemaining(seconds);
        setTotal(seconds);
        setRunning(false);
        setCompleted(false);
    };

    if (!task.durationSeconds) {
        return (
            <div className="rounded-2xl border border-lme-border bg-lme-surface p-4">
                <div className="flex items-center gap-2 text-sub">
                    <Hourglass className="h-5 w-5 text-emocional" />
                    <span className="text-sm font-semibold">Temporizador rápido</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                    {[5, 10, 15].map(minutes => (
                        <button
                            key={minutes}
                            type="button"
                            onClick={() => setQuickTimer(minutes)}
                            className="rounded-lg border border-lme-border bg-lme-background px-4 py-2 text-lg font-bold text-ink transition-colors hover:border-ink"
                        >
                            {minutes} min
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    const progress = total > 0 ? remaining / total : 0;
    const ringColor = completed ? 'var(--color-fisico)' : 'var(--color-emocional)';
    const ringStyle = {
        background: `conic-gradient(${ringColor} ${Math.round(progress * 360)}deg, rgba(28,26,22,0.1) 0deg)`,
    };
    const ringSize = size === 'lg' ? 'h-32 w-32 sm:h-40 sm:w-40' : 'h-24 w-24 sm:h-28 sm:w-28';
    const bigTime = size === 'lg' ? 'text-5xl sm:text-6xl' : 'text-3xl sm:text-4xl';

    return (
        <div className={`rounded-2xl border bg-lme-surface p-4 ${completed ? 'border-lme-danger' : 'border-lme-border'}`}>
            <div className="flex flex-wrap items-center gap-6">
                <div className={`relative rounded-full p-1 ${ringSize}`} style={ringStyle}>
                    <div className="absolute inset-1 flex flex-col items-center justify-center rounded-full bg-lme-background text-center">
                        <span className="font-mono text-[10px] uppercase tracking-wide text-sub">Tiempo</span>
                        <span className={`font-black text-ink ${size === 'lg' ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>{formatTime(remaining)}</span>
                    </div>
                </div>
                <div className="flex-1">
                    <p className="font-mono text-[11px] uppercase tracking-wide text-sub">Cuenta atrás</p>
                    <p className={`font-black text-ink ${bigTime}`}>{formatTime(remaining)}</p>
                    {completed && <p className="mt-1 text-sm font-bold text-lme-danger">Tiempo agotado</p>}
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setRunning(value => !value)} title={running ? 'Pausar' : 'Iniciar'} className="rounded-lg border border-lme-border bg-lme-background p-3 text-ink transition-colors hover:border-ink">
                        {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </button>
                    <button type="button" onClick={() => adjustTime(-60)} title="−1 min" className="rounded-lg border border-lme-border bg-lme-background p-3 text-ink transition-colors hover:border-ink">
                        <Minus className="h-5 w-5" />
                    </button>
                    <button type="button" onClick={() => adjustTime(60)} title="+1 min" className="rounded-lg border border-lme-border bg-lme-background p-3 text-ink transition-colors hover:border-ink">
                        <Plus className="h-5 w-5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => { const base = task.durationSeconds ?? 0; setRemaining(base); setTotal(base); setRunning(false); setCompleted(false); }}
                        title="Reiniciar"
                        className="rounded-lg border border-lme-border bg-lme-background p-3 text-sub transition-colors hover:border-ink hover:text-ink"
                    >
                        <RotateCcw className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
