/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuna
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Home, LayoutGrid, Minimize2, Monitor, Pause, Play, Plus, Rows, Minus, Maximize2, X, Hourglass } from 'lucide-react';
import { useBoardStore, useStore, type Attachment, type Task } from '../store/boardStore';
import { SoundMeter } from '../components/SoundMeter';
import { getWorkspaceRootPath } from '../utils/workspaceRoutes';

type Orientation = 'horizontal' | 'vertical';

function formatTime(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.max(0, totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function parseYoutubeId(url: string) {
    const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    return match ? match[1] : null;
}

function playTimerAlert() {
    try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 880;
        osc.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
        window.setTimeout(() => {
            void ctx.close();
        }, 500);
    } catch {
        // Browsers may block autoplay audio until the user interacts with the page.
    }
}

function AttachmentThumbnail({ attachment }: { attachment: Attachment }) {
    if (attachment.kind === 'image') {
        return (
            <div className="w-16 h-12 rounded-lg overflow-hidden bg-black/30 border border-white/10">
                <img src={attachment.url} alt={attachment.title || 'Adjunto'} className="w-full h-full object-cover" />
            </div>
        );
    }

    if (attachment.kind === 'video') {
        const youtubeId = parseYoutubeId(attachment.url);
        if (youtubeId) {
            return (
                <div className="w-16 h-12 rounded-lg overflow-hidden bg-black/30 border border-white/10">
                    <img src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`} alt="Video" className="w-full h-full object-cover" />
                </div>
            );
        }
    }

    return (
        <div className="w-16 h-12 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-[10px] text-sub px-1 text-center">
            {attachment.title?.slice(0, 18) || 'Enlace'}
        </div>
    );
}

function TaskTimer({ task, onUpdateDuration }: { task: Task; onUpdateDuration: (seconds: number | undefined) => void }) {
    const initialDuration = task.durationSeconds ?? 0;
    const [remaining, setRemaining] = useState(initialDuration);
    const [total, setTotal] = useState(initialDuration);
    const [running, setRunning] = useState(false);
    const [completed, setCompleted] = useState(false);

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
            <div className="mt-6 bg-black/30 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-sub">
                    <Hourglass className="w-5 h-5 text-mint" />
                    <span className="text-sm font-medium">Temporizador rapido</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                    {[5, 10, 15].map(minutes => (
                        <button
                            key={minutes}
                            onClick={() => setQuickTimer(minutes)}
                            className="px-4 py-2 rounded-xl border border-line text-ink hover:text-white hover:border-mint transition-colors text-lg font-bold bg-white/5"
                        >
                            {minutes} min
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    const progress = total > 0 ? remaining / total : 0;
    const ringStyle = {
        background: `conic-gradient(${completed ? '#f87171' : '#34d399'} ${Math.round(progress * 360)}deg, rgba(255,255,255,0.1) 0deg)`
    };

    return (
        <div className={`mt-6 bg-black/30 border rounded-2xl p-4 ${completed ? 'border-lme-danger/60' : 'border-white/10'}`}>
            <div className="flex flex-wrap items-center gap-6">
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1" style={ringStyle}>
                    <div className="absolute inset-1 rounded-full bg-lme-surface flex flex-col items-center justify-center text-center">
                        <span className="text-xs uppercase text-sub">Tiempo</span>
                        <span className="text-xl sm:text-2xl font-black text-ink">{formatTime(remaining)}</span>
                    </div>
                </div>
                <div className="flex-1">
                    <p className="text-xs uppercase text-sub tracking-wide">Cuenta regresiva</p>
                    <p className="text-3xl sm:text-4xl font-black text-ink">{formatTime(remaining)}</p>
                    {completed && <p className="text-sm text-lme-danger mt-1">Tiempo agotado</p>}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setRunning(value => !value)}
                        className="p-3 rounded-xl bg-black/40 text-sub hover:text-ink transition-colors"
                    >
                        {running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={() => adjustTime(-60)}
                        className="p-3 rounded-xl bg-black/40 text-sub hover:text-ink transition-colors"
                    >
                        <Minus className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => adjustTime(60)}
                        className="p-3 rounded-xl bg-black/40 text-sub hover:text-ink transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-sub">
                <button
                    onClick={() => {
                        const base = task.durationSeconds ?? 0;
                        setRemaining(base);
                        setTotal(base);
                        setRunning(false);
                        setCompleted(false);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-line hover:border-sky transition-colors"
                >
                    Reiniciar
                </button>
                <button
                    onClick={() => onUpdateDuration(undefined)}
                    className="px-3 py-1.5 rounded-lg border border-line hover:border-lme-danger transition-colors"
                >
                    Quitar temporizador
                </button>
            </div>
        </div>
    );
}

export default function SequenceView() {
    const { columns, tasks, updateTask } = useBoardStore();
    const { selectedTaskIds } = useStore();
    const [orientation, setOrientation] = useState<Orientation>('horizontal');
    const [kioskMode, setKioskMode] = useState(false);
    const [soundExpanded, setSoundExpanded] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

    const isHorizontal = orientation === 'horizontal';

    const orderedTasks = useMemo(() => {
        const selectedSet = new Set(selectedTaskIds);
        const orderedColumns = [...columns].sort((a, b) => a.order - b.order);
        return orderedColumns.flatMap(col => tasks.filter(task => task.columnId === col.id && selectedSet.has(task.id)));
    }, [columns, tasks, selectedTaskIds]);
    const boundedActiveIndex = orderedTasks.length > 0
        ? Math.min(activeIndex, orderedTasks.length - 1)
        : 0;

    const scrollToIndex = (index: number) => {
        const node = cardRefs.current[index];
        if (!node) return;
        node.scrollIntoView({
            behavior: 'smooth',
            block: orientation === 'vertical' ? 'start' : 'center',
            inline: orientation === 'horizontal' ? 'center' : 'nearest'
        });
        setActiveIndex(index);
    };

    const toggleKioskMode = () => {
        if (!kioskMode) {
            document.documentElement.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
        setKioskMode(!kioskMode);
    };

    if (orderedTasks.length === 0) {
        return (
            <div className="min-h-screen bg-lme-background text-lme-text flex items-center justify-center p-8">
                <div className="bg-lme-surface-alt border border-lme-border rounded-2xl p-8 text-center max-w-md">
                    <h2 className="text-xl font-bold text-ink mb-2">No hay pasos seleccionados</h2>
                    <p className="text-sm text-sub mb-6">Vuelve al tablero, activa el modo seleccion y elige los pasos.</p>
                    <Link to={getWorkspaceRootPath('classroom')} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-line text-sub hover:text-ink hover:bg-white/5 transition-colors">
                        <Home className="w-4 h-4" />
                        Volver al tablero
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen bg-lme-background text-lme-text flex flex-col font-sans ${kioskMode ? 'p-4' : 'px-6 py-6'}`}>
            {!kioskMode && (
                <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <Link to={getWorkspaceRootPath('classroom')} className="flex items-center gap-2 text-sub hover:text-white transition-colors min-h-[48px] px-3 rounded-xl hover:bg-white/5">
                        <Home className="w-5 h-5" />
                        <span className="text-sm font-medium">Volver</span>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-mint to-sky">Secuencia de pasos</h1>
                        <p className="text-xs text-sub">{orderedTasks.length} pasos seleccionados</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setOrientation(orientation === 'horizontal' ? 'vertical' : 'horizontal')}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line text-sub hover:text-ink hover:bg-white/5 transition-colors text-sm"
                        >
                            {isHorizontal ? <Rows className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                            {isHorizontal ? 'Vertical' : 'Horizontal'}
                        </button>
                        <button
                            onClick={toggleKioskMode}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-sky/30 bg-sky/10 text-sky hover:bg-sky/20 transition-colors text-sm"
                        >
                            <Monitor className="w-4 h-4" />
                            Pantalla completa
                        </button>
                    </div>
                </header>
            )}

            {kioskMode && (
                <button
                    onClick={toggleKioskMode}
                    className="fixed top-4 right-4 z-modal p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors backdrop-blur"
                >
                    <Minimize2 className="w-6 h-6 text-white" />
                </button>
            )}

            <div className={`flex-1 ${isHorizontal ? 'overflow-x-auto' : 'overflow-y-auto'} pb-6`}>
                <div
                    className={`gap-10 ${isHorizontal ? 'flex flex-row min-w-max snap-x snap-mandatory' : 'flex flex-col max-w-6xl mx-auto'}`}
                >
                    {orderedTasks.map((task, index) => {
                        const mainIcon = task.icon ?? task.pictograms?.[0]?.url;
                        const showConnector = index < orderedTasks.length - 1;
                        return (
                            <div
                                key={task.id}
                                ref={el => { cardRefs.current[index] = el; }}
                                className={`relative ${isHorizontal ? 'pr-20' : 'pb-20'}`}
                            >
                                <div
                                    className={`glass-card rounded-3xl p-8 border border-lme-border shadow-2xl snap-center ${isHorizontal ? 'w-[88vw] max-w-[860px]' : 'w-full'} ${kioskMode ? 'min-h-[70vh]' : 'min-h-[520px]'}`}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-6">
                                        <div className="flex items-start gap-4">
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-mint/20 text-mint flex items-center justify-center font-black text-3xl sm:text-4xl shadow-lg shadow-mint/20">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <h2 className="text-2xl sm:text-3xl font-black text-ink">{task.title}</h2>
                                                {task.description && (
                                                    <p className="text-base text-sub mt-2">{task.description}</p>
                                                )}
                                            </div>
                                        </div>
                                        {mainIcon && (
                                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white/10 p-3 flex items-center justify-center">
                                                <img src={mainIcon} className="w-full h-full object-contain" />
                                            </div>
                                        )}
                                    </div>

                                    {(task.pictograms?.length ?? 0) > 1 && (
                                        <div className="mt-6 flex flex-wrap gap-3">
                                            {task.pictograms!.slice(0, 8).map((pic, picIndex) => (
                                                <div key={`${pic.id}-${picIndex}`} className="w-14 h-14 rounded-xl bg-white/10 p-2">
                                                    <img src={pic.url} className="w-full h-full object-contain" alt={pic.title} />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {task.attachments && task.attachments.length > 0 && (
                                        <div className="mt-6">
                                            <p className="text-sm text-sub mb-2">Recursos</p>
                                            <div className="flex flex-wrap gap-3">
                                                {task.attachments.slice(0, 10).map(att => (
                                                    <AttachmentThumbnail key={att.id} attachment={att} />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <TaskTimer
                                        key={`${task.id}:${task.durationSeconds ?? 0}`}
                                        task={task}
                                        onUpdateDuration={(duration) => updateTask(task.id, { durationSeconds: duration })}
                                    />
                                </div>

                                {showConnector && (
                                    <div
                                        className={`pointer-events-none absolute ${isHorizontal
                                                ? 'right-6 top-1/2 -translate-y-1/2'
                                                : 'left-1/2 bottom-6 -translate-x-1/2'
                                            }`}
                                    >
                                        <div
                                            className={`relative ${isHorizontal ? 'w-16 h-1.5 bg-gradient-to-r' : 'w-1.5 h-16 bg-gradient-to-b'} rounded-full from-mint/40 via-sky/70 to-mint/40`}
                                        >
                                            <span
                                                className={`absolute ${isHorizontal ? '-left-2 top-1/2 -translate-y-1/2' : 'left-1/2 -translate-x-1/2 -top-2'} w-4 h-4 rounded-full bg-mint shadow-lg shadow-mint/40`}
                                            />
                                            <span
                                                className={`absolute ${isHorizontal ? '-right-2 top-1/2 -translate-y-1/2' : 'left-1/2 -translate-x-1/2 -bottom-2'} w-4 h-4 rounded-full bg-sky shadow-lg shadow-sky/40`}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center justify-center gap-3">
                <button
                    onClick={() => scrollToIndex(Math.max(0, boundedActiveIndex - 1))}
                    className="px-4 py-2 rounded-full border border-line text-sub hover:text-ink hover:bg-white/5 transition-colors text-sm flex items-center gap-2"
                    disabled={boundedActiveIndex === 0}
                >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                </button>
                <button
                    onClick={() => scrollToIndex(Math.min(orderedTasks.length - 1, boundedActiveIndex + 1))}
                    className="px-4 py-2 rounded-full border border-line text-sub hover:text-ink hover:bg-white/5 transition-colors text-sm flex items-center gap-2"
                    disabled={boundedActiveIndex >= orderedTasks.length - 1}
                >
                    Siguiente
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            <div className="fixed bottom-6 right-6 z-dropdown-backdrop w-[320px]">
                <div className="relative">
                    <button
                        onClick={() => setSoundExpanded(true)}
                        className="absolute -top-3 -left-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                        aria-label="Maximizar medidor de sonido"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </button>
                    <SoundMeter />
                </div>
            </div>

            {soundExpanded && (
                <div className="fixed inset-0 z-sticky bg-black/70 backdrop-blur flex items-center justify-center p-6">
                    <div className="relative w-full max-w-xl">
                        <button
                            onClick={() => setSoundExpanded(false)}
                            className="absolute -top-4 -right-4 bg-black/70 text-white rounded-full p-2 hover:bg-black/90 transition-colors"
                            aria-label="Cerrar medidor de sonido"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <SoundMeter variant="expanded" className="w-full" />
                    </div>
                </div>
            )}
        </div>
    );
}
