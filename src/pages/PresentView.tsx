/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
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
import { Home, X, Monitor, Minimize2, ChevronRight, ChevronLeft, Play, CheckCircle2, Keyboard } from 'lucide-react';
import { useBoardStore, useStore } from '../store/boardStore';
import { Link } from 'react-router-dom';
import { StudentCard } from '../components/StudentCard';
import { PresentationTimer, type TimerControl } from '../components/PresentationTimer';
import { useConfetti } from '../hooks/useConfetti';
import { AccessibilityControls } from '../components/AccessibilityControls';
import { getWorkspaceRootPath } from '../utils/workspaceRoutes';

function isCompletedColumnTitle(title: string): boolean {
    const t = title.toLowerCase();
    return t.includes('terminado') || t.includes('hecho') || t.includes('listo');
}

function PresentView() {
    const { columns, tasks, moveTask, updateTask } = useBoardStore();
    const { boards, activeBoardId } = useStore();
    const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
    const [kioskMode, setKioskMode] = useState(false);
    const timerControl = useRef<TimerControl | null>(null);
    const { triggerConfetti, ConfettiComponent } = useConfetti();

    const currentBoard = boards.find(b => b.id === activeBoardId);

    // Orden de lectura: columnas por orden, tareas dentro de cada columna
    const orderedColumns = useMemo(() => [...columns].sort((a, b) => a.order - b.order), [columns]);
    const orderedTasks = useMemo(
        () => orderedColumns.flatMap((col) => tasks.filter(t => t.columnId === col.id).map(task => ({ task, column: col }))),
        [orderedColumns, tasks],
    );

    const focusIndex = focusTaskId ? orderedTasks.findIndex(x => x.task.id === focusTaskId) : -1;
    const focus = focusIndex >= 0 ? orderedTasks[focusIndex] : null;

    const goTo = (index: number) => {
        const clamped = Math.max(0, Math.min(orderedTasks.length - 1, index));
        setFocusTaskId(orderedTasks[clamped]?.task.id ?? null);
    };
    const startPresentation = () => {
        if (orderedTasks.length > 0) setFocusTaskId(orderedTasks[0].task.id);
    };

    // Avanza la tarea enfocada a la siguiente columna (progreso guiado en clase)
    const advanceTaskColumn = () => {
        if (!focus) return;
        const colIndex = orderedColumns.findIndex(c => c.id === focus.task.columnId);
        if (colIndex < 0 || colIndex >= orderedColumns.length - 1) return;
        const target = orderedColumns[colIndex + 1];
        if (isCompletedColumnTitle(target.title)) triggerConfetti();
        moveTask(focus.task.id, target.id);
    };

    const toggleKioskMode = () => {
        if (!kioskMode) {
            document.documentElement.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
        setKioskMode(!kioskMode);
    };

    // Navegación por teclado en modo foco
    useEffect(() => {
        if (!focus) return undefined;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') { e.preventDefault(); goTo(focusIndex + 1); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(focusIndex - 1); }
            else if (e.key === ' ') { e.preventDefault(); timerControl.current?.toggle(); }
            else if (e.key === 'Escape') { setFocusTaskId(null); }
            else if (e.key.toLowerCase() === 'f') { toggleKioskMode(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focus, focusIndex, orderedTasks.length, kioskMode]);

    return (
        <div className={`flex min-h-screen flex-col bg-lme-background text-lme-text ${kioskMode ? 'p-4' : 'px-4 py-6'}`}>
            {/* Cabecera — oculta en kiosko */}
            {!kioskMode && (
                <header className="mb-6 flex items-center justify-between gap-3 border-b-2 border-ink px-2 pb-4">
                    <Link to={getWorkspaceRootPath('classroom')} className="flex min-h-[48px] items-center gap-2 rounded-lg px-3 text-sub transition-colors hover:bg-white/5 hover:text-ink">
                        <Home className="h-5 w-5" />
                        <span className="text-sm font-semibold">Volver</span>
                    </Link>
                    <div className="text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-fisico">Presentar</p>
                        <h1 className="text-xl font-black text-ink">{currentBoard?.title ?? 'Modo presentación'}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {orderedTasks.length > 0 && (
                            <button
                                type="button"
                                onClick={startPresentation}
                                className="flex min-h-[48px] items-center gap-2 rounded-lg bg-ink px-4 text-sm font-bold uppercase tracking-wide text-lme-background transition-colors hover:bg-fisico"
                            >
                                <Play className="h-4 w-4 fill-current" />
                                <span className="hidden sm:inline">Presentar en secuencia</span>
                            </button>
                        )}
                        <AccessibilityControls />
                        <button onClick={toggleKioskMode} title="Pantalla completa (F)" className="flex min-h-[48px] items-center gap-2 rounded-lg border border-line px-3 text-sub transition-colors hover:bg-white/5 hover:text-ink">
                            <Monitor className="h-5 w-5" />
                            <span className="hidden text-sm font-semibold sm:inline">Pantalla completa</span>
                        </button>
                    </div>
                </header>
            )}

            {kioskMode && (
                <button onClick={toggleKioskMode} title="Salir de pantalla completa" className="fixed right-4 top-4 z-modal rounded-full border border-lme-border bg-lme-surface p-3 shadow-lg transition-colors hover:border-ink">
                    <Minimize2 className="h-6 w-6 text-ink" />
                </button>
            )}

            {/* ── Modo foco secuencial ── */}
            {focus && (
                <div className="fixed inset-0 z-modal flex flex-col bg-lme-background animate-in fade-in duration-200">
                    {/* Barra superior del foco: progreso + cerrar */}
                    <div className="flex items-center justify-between gap-3 border-b border-lme-border px-4 py-3 sm:px-8">
                        <div className="flex items-center gap-3">
                            <span className="font-mono text-xs uppercase tracking-wide text-sub">
                                Tarea {focusIndex + 1} / {orderedTasks.length}
                            </span>
                            <span className="rounded border border-lme-border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-ink">
                                {focus.column.title}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="hidden items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-sub sm:flex">
                                <Keyboard className="h-3.5 w-3.5" /> ← → navegar · espacio temporizador · F pantalla · Esc salir
                            </span>
                            <button onClick={() => setFocusTaskId(null)} title="Salir (Esc)" className="flex h-11 w-11 items-center justify-center rounded-lg border border-lme-border text-sub transition-colors hover:border-ink hover:text-ink">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    {/* Contenido de la tarea */}
                    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
                        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
                            <h2 className="text-4xl font-black leading-tight text-ink sm:text-6xl" style={{ textWrap: 'balance' }}>{focus.task.title}</h2>

                            {(focus.task.objective || focus.task.description) && (
                                <div className="max-w-3xl space-y-2">
                                    {focus.task.objective && <p className="text-lg text-sub sm:text-2xl"><b className="text-ink">Objetivo:</b> {focus.task.objective}</p>}
                                    {focus.task.description && <p className="text-base text-sub sm:text-xl">{focus.task.description}</p>}
                                </div>
                            )}

                            {(focus.task.supportText || focus.task.expectedEvidence || focus.task.nextStep) && (
                                <div className="grid w-full max-w-3xl gap-3 text-left sm:grid-cols-3">
                                    {focus.task.supportText && <div className="rounded-2xl border border-lme-border bg-lme-surface p-4 text-sm"><strong className="text-ink">Ayuda</strong><div className="mt-2 text-sub">{focus.task.supportText}</div></div>}
                                    {focus.task.expectedEvidence && <div className="rounded-2xl border border-lme-border bg-lme-surface p-4 text-sm"><strong className="text-ink">Evidencia</strong><div className="mt-2 text-sub">{focus.task.expectedEvidence}</div></div>}
                                    {focus.task.nextStep && <div className="rounded-2xl border border-lme-border bg-lme-surface p-4 text-sm"><strong className="text-ink">Siguiente paso</strong><div className="mt-2 text-sub">{focus.task.nextStep}</div></div>}
                                </div>
                            )}

                            {/* Secuencia de pictogramas gigante */}
                            {(focus.task.pictograms?.length ?? 0) > 0 && (
                                <div className="my-2 flex flex-wrap justify-center gap-4 sm:gap-8">
                                    {focus.task.pictograms!.map((p, idx) => (
                                        <div key={idx} className="flex flex-col items-center">
                                            <div className="relative">
                                                <span className="absolute -left-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-lg font-bold text-lme-background shadow-lg sm:h-11 sm:w-11 sm:text-2xl">{idx + 1}</span>
                                                <img src={p.url} className="h-40 w-40 rounded-2xl border border-lme-border bg-white object-contain p-2 shadow-xl sm:h-60 sm:w-60 sm:p-4" alt={p.title} />
                                            </div>
                                            <span className="mt-2 rounded-lg bg-lme-surface px-4 py-1 text-xl font-medium text-ink sm:mt-4 sm:text-3xl">{p.title}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Temporizador */}
                            <div className="w-full max-w-2xl">
                                <PresentationTimer
                                    key={focus.task.id}
                                    task={focus.task}
                                    size="lg"
                                    controlRef={timerControl}
                                    onUpdateDuration={(seconds) => updateTask(focus.task.id, { durationSeconds: seconds })}
                                />
                            </div>

                            {/* Adjuntos grandes */}
                            {focus.task.attachments && focus.task.attachments.length > 0 && (
                                <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
                                    {focus.task.attachments.map(a => (
                                        <div key={a.id} className="relative aspect-video overflow-hidden rounded-xl border border-lme-border bg-black">
                                            {a.kind === 'video' || (a.kind === 'link' && (a.url.includes('youtube') || a.url.includes('youtu.be'))) ? (
                                                <iframe src={a.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/')} className="h-full w-full" allowFullScreen />
                                            ) : (
                                                <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex h-full w-full items-center justify-center bg-lme-surface font-bold text-ink hover:bg-white/5">Abrir recurso</a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Barra de navegación inferior */}
                    <div className="flex items-center justify-between gap-3 border-t border-lme-border px-4 py-3 sm:px-8">
                        <button
                            type="button"
                            onClick={() => goTo(focusIndex - 1)}
                            disabled={focusIndex <= 0}
                            className="flex min-h-[52px] items-center gap-2 rounded-lg border border-lme-border px-4 text-sm font-bold text-ink transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <ChevronLeft className="h-5 w-5" /> Anterior
                        </button>
                        <button
                            type="button"
                            onClick={advanceTaskColumn}
                            className="flex min-h-[52px] items-center gap-2 rounded-lg border border-emocional bg-emocional/10 px-4 text-sm font-bold text-emocional transition-colors hover:bg-emocional/20"
                        >
                            <CheckCircle2 className="h-5 w-5" /> Mover a siguiente fase
                        </button>
                        <button
                            type="button"
                            onClick={() => goTo(focusIndex + 1)}
                            disabled={focusIndex >= orderedTasks.length - 1}
                            className="flex min-h-[52px] items-center gap-2 rounded-lg bg-ink px-4 text-sm font-bold uppercase tracking-wide text-lme-background transition-colors hover:bg-fisico disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Siguiente <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* ── Vista general del tablero (columnas) — oculta durante el modo foco ── */}
            {!focus && (
            <div className={`flex h-full flex-1 gap-4 overflow-x-auto pb-4 sm:gap-6 ${kioskMode ? 'px-2' : ''}`}>
                {orderedColumns.map((col, colIndex) => {
                    const colTasks = tasks.filter(t => t.columnId === col.id);
                    const isDone = isCompletedColumnTitle(col.title);
                    return (
                        <div key={col.id} className={`flex min-w-[300px] flex-col rounded-2xl border bg-lme-surface sm:min-w-[380px] lg:min-w-[440px] ${isDone ? 'border-emocional/50' : 'border-lme-border'}`}>
                            <div className={`border-b-2 p-4 sm:p-5 ${isDone ? 'border-emocional' : 'border-ink'}`}>
                                <h2 className="flex items-center justify-center gap-2 text-center text-2xl font-black text-ink sm:text-3xl">
                                    {col.title}
                                    <span className="font-mono text-base font-normal text-sub">({colTasks.length})</span>
                                </h2>
                            </div>
                            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
                                {colTasks.map(task => (
                                    <StudentCard
                                        key={task.id}
                                        task={task}
                                        onMove={(direction) => {
                                            const newIndex = direction === 'next' ? colIndex + 1 : colIndex - 1;
                                            if (newIndex >= 0 && newIndex < orderedColumns.length) {
                                                const target = orderedColumns[newIndex];
                                                if (isCompletedColumnTitle(target.title) && direction === 'next') triggerConfetti();
                                                moveTask(task.id, target.id);
                                            }
                                        }}
                                        onExpand={() => setFocusTaskId(task.id)}
                                        canMovePrev={colIndex > 0}
                                        canMoveNext={colIndex < orderedColumns.length - 1}
                                        isCompletedColumn={isDone}
                                    />
                                ))}
                                {colTasks.length === 0 && (
                                    <div className="flex min-h-[140px] flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-lme-border text-lg italic text-sub">
                                        Sin tareas
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            )}

            {/* Pista de interacción */}
            {!focus && orderedTasks.length > 0 && (
                <div className="pointer-events-none fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-lme-border bg-lme-surface px-5 py-2.5 text-sm text-sub opacity-90 shadow-lg">
                    <Play className="h-4 w-4 text-fisico" />
                    <span>Toca una tarea para ampliarla o usa «Presentar en secuencia»</span>
                </div>
            )}

            {ConfettiComponent}
        </div>
    );
}

export default PresentView;
