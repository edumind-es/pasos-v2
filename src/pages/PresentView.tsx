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

import { useState } from 'react';
import { Home, X, Monitor, Minimize2, ChevronRight, ChevronLeft } from 'lucide-react';
import { useBoardStore, useStore } from '../store/boardStore';
import { Link } from 'react-router-dom';
import { StudentCard } from '../components/StudentCard';
import { useConfetti } from '../hooks/useConfetti';
import { AccessibilityControls } from '../components/AccessibilityControls';
import { VisualModeToggle } from '../components/VisualModeToggle';
import { getWorkspaceRootPath } from '../utils/workspaceRoutes';

function PresentView() {
    const { columns, tasks, moveTask } = useBoardStore();
    const { boards, activeBoardId } = useStore();
    const [activeTask, setActiveTask] = useState<string | null>(null);
    const [kioskMode, setKioskMode] = useState(false);

    // Confetti for completed tasks
    const { triggerConfetti, ConfettiComponent } = useConfetti();

    // Get current board name
    const currentBoard = boards.find(b => b.id === activeBoardId);

    const taskDetails = activeTask ? tasks.find(t => t.id === activeTask) : null;

    const handleMove = (taskId: string, currentColId: string, direction: 'next' | 'prev') => {
        const currentIndex = columns.findIndex(c => c.id === currentColId);
        if (currentIndex === -1) return;

        const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        if (newIndex >= 0 && newIndex < columns.length) {
            // Check if moving to completed column
            const targetColumn = columns[newIndex];
            const isCompletedColumn = targetColumn.title.toLowerCase().includes('terminado') ||
                targetColumn.title.toLowerCase().includes('hecho');

            if (isCompletedColumn && direction === 'next') {
                triggerConfetti();
            }

            moveTask(taskId, columns[newIndex].id);
        }
    };

    // Toggle fullscreen for kiosk mode
    const toggleKioskMode = () => {
        if (!kioskMode) {
            document.documentElement.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
        setKioskMode(!kioskMode);
    };

    return (
        <div className={`min-h-screen bg-lme-background text-lme-text flex flex-col font-sans overflow-hidden ${kioskMode ? 'p-4' : 'px-4 py-6'}`}>
            {/* Header - Hidden in kiosk mode */}
            {!kioskMode && (
                <header className="flex justify-between items-center mb-6 px-4">
                    <Link to={getWorkspaceRootPath('classroom')} className="flex items-center gap-2 text-sub hover:text-white transition-colors min-h-[56px] px-4 -ml-4 rounded-xl hover:bg-white/5">
                        <Home className="w-6 h-6" />
                        <span className="text-sm font-medium">Volver</span>
                    </Link>

                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-mint to-sky">
                            Modo Presentación
                        </h1>
                        {currentBoard && (
                            <p className="text-sm text-sub">{currentBoard.title}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <AccessibilityControls />
                        <VisualModeToggle />
                        <button
                            onClick={toggleKioskMode}
                            className="flex items-center gap-2 text-sub hover:text-white transition-colors min-h-[56px] px-4 rounded-xl hover:bg-white/5"
                        >
                            <Monitor className="w-5 h-5" />
                            <span className="text-sm font-medium hidden sm:inline">Pantalla Completa</span>
                        </button>
                    </div>
                </header>
            )}

            {/* Kiosk mode exit button - Always visible */}
            {kioskMode && (
                <button
                    onClick={toggleKioskMode}
                    className="fixed top-4 right-4 z-modal p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors backdrop-blur"
                >
                    <Minimize2 className="w-6 h-6 text-white" />
                </button>
            )}

            {/* Full Screen Task Focus */}
            {taskDetails && (
                <div className="fixed inset-0 z-modal bg-black/90 backdrop-blur flex items-center justify-center p-4 sm:p-8 animate-in zoom-in duration-300">
                    <button onClick={() => setActiveTask(null)} className="absolute top-4 right-4 sm:top-8 sm:right-8 text-white/50 hover:text-white min-h-[56px] min-w-[56px] flex items-center justify-center bg-white/10 rounded-full">
                        <X className="w-8 h-8" />
                    </button>

                    <div className="bg-lme-surface-alt w-full max-w-5xl rounded-3xl border border-lme-border shadow-2xl p-6 sm:p-12 flex flex-col gap-6 sm:gap-8 items-center text-center max-h-[90vh] overflow-y-auto">
                        <h2 className="text-4xl sm:text-6xl font-black text-ink">{taskDetails.title}</h2>
                        {(taskDetails.objective || taskDetails.description) && (
                            <div className="max-w-3xl space-y-3">
                                {taskDetails.objective && <p className="text-lg sm:text-2xl text-sub">Objetivo: {taskDetails.objective}</p>}
                                {taskDetails.description && <p className="text-base sm:text-xl text-sub">{taskDetails.description}</p>}
                                {(taskDetails.supportText || taskDetails.expectedEvidence || taskDetails.nextStep) && (
                                    <div className="grid gap-3 sm:grid-cols-3 text-left">
                                        {taskDetails.supportText && <div className="rounded-2xl bg-black/20 p-4 text-sm text-ink"><strong>Ayuda</strong><div className="mt-2 text-sub">{taskDetails.supportText}</div></div>}
                                        {taskDetails.expectedEvidence && <div className="rounded-2xl bg-black/20 p-4 text-sm text-ink"><strong>Evidencia</strong><div className="mt-2 text-sub">{taskDetails.expectedEvidence}</div></div>}
                                        {taskDetails.nextStep && <div className="rounded-2xl bg-black/20 p-4 text-sm text-ink"><strong>Siguiente paso</strong><div className="mt-2 text-sub">{taskDetails.nextStep}</div></div>}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Giant Pictogram Sequence */}
                        {(taskDetails.pictograms?.length ?? 0) > 0 && (
                            <div className="flex flex-wrap justify-center gap-4 sm:gap-8 my-4 sm:my-8">
                                {taskDetails.pictograms!.map((p, idx) => (
                                    <div key={idx} className="flex flex-col items-center">
                                        <div className="relative">
                                            <span className="absolute -top-4 -left-4 sm:-top-6 sm:-left-6 bg-sky text-white text-xl sm:text-2xl w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold shadow-lg shadow-sky/50">{idx + 1}</span>
                                            <img src={p.url} className="w-40 h-40 sm:w-64 sm:h-64 object-contain bg-white rounded-2xl p-2 sm:p-4 shadow-xl" alt={p.title} />
                                        </div>
                                        <span className="mt-2 sm:mt-4 text-xl sm:text-3xl font-medium text-ink bg-black/30 px-4 sm:px-6 py-1 sm:py-2 rounded-xl">{p.title}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Big Attachments */}
                        {taskDetails.attachments && taskDetails.attachments.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-4 sm:mt-8">
                                {taskDetails.attachments.map(a => (
                                    <div key={a.id} className="aspect-video bg-black rounded-xl overflow-hidden shadow-lg border border-line relative group">
                                        {a.kind === 'video' || (a.kind === 'link' && (a.url.includes('youtube') || a.url.includes('youtu.be'))) ? (
                                            <iframe
                                                src={a.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/')}
                                                className="w-full h-full"
                                                allowFullScreen
                                            />
                                        ) : (
                                            <img src={a.url} className="w-full h-full object-cover opacity-50" alt="" />
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:bg-black/20 transition-colors">
                                            <a href={a.url} target="_blank" rel="noopener noreferrer" className="bg-white/10 backdrop-blur px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold pointer-events-auto hover:bg-white/20 border border-white/20 min-h-[44px] flex items-center">Abrir Recurso</a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Columns - Responsive layout */}
            <div className={`flex-1 flex gap-4 sm:gap-8 h-full overflow-x-auto pb-4 snap-x ${kioskMode ? 'px-4' : ''}`}>
                {columns.map((col, colIndex) => {
                    const colTasks = tasks.filter(t => t.columnId === col.id);
                    const isCompletedColumn = col.title.toLowerCase().includes('terminado') ||
                        col.title.toLowerCase().includes('hecho');
                    return (
                        <div
                            key={col.id}
                            className={`
                                min-w-[320px] sm:min-w-[400px] lg:min-w-[480px]
                                glass-card rounded-3xl flex flex-col snap-center
                                relative
                                ${isCompletedColumn ? 'border-green-500/30 bg-green-500/5' : ''}
                            `}
                        >
                            <div className={`p-4 sm:p-6 border-b border-lme-border ${isCompletedColumn ? 'bg-green-500/10' : ''}`}>
                                <h2 className="text-2xl sm:text-3xl font-bold text-center text-ink flex items-center justify-center gap-2">
                                    {col.title}
                                    <span className="text-base font-normal text-sub">({colTasks.length})</span>
                                </h2>
                            </div>

                            <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto">
                                {colTasks.map(task => (
                                    <StudentCard
                                        key={task.id}
                                        task={task}
                                        onMove={(direction) => handleMove(task.id, col.id, direction)}
                                        onExpand={() => setActiveTask(task.id)}
                                        canMovePrev={colIndex > 0}
                                        canMoveNext={colIndex < columns.length - 1}
                                        isCompletedColumn={isCompletedColumn}
                                    />
                                ))}

                                {colTasks.length === 0 && (
                                    <div className="flex-1 min-h-[140px] border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center text-sub text-lg italic">
                                        Sin tareas
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Swipe hint for touch users */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 text-sub text-sm bg-black/50 backdrop-blur px-6 py-3 rounded-full pointer-events-none opacity-60">
                <ChevronLeft className="w-4 h-4" />
                <span>Desliza las tareas para moverlas</span>
                <ChevronRight className="w-4 h-4" />
            </div>

            {/* Confetti */}
            {ConfettiComponent}
        </div>
    );
}

export default PresentView;
