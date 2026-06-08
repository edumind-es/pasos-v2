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

import { useState, useRef, type TouchEvent as ReactTouchEvent } from 'react';
import { Check, ChevronRight, ChevronLeft, Maximize2 } from 'lucide-react';
import { type Task } from '../store/boardStore';

interface StudentCardProps {
    task: Task;
    onMove: (direction: 'prev' | 'next') => void;
    onExpand: () => void;
    canMovePrev: boolean;
    canMoveNext: boolean;
    isCompletedColumn?: boolean;
}

export function StudentCard({
    task,
    onMove,
    onExpand,
    canMovePrev,
    canMoveNext,
    isCompletedColumn = false
}: StudentCardProps) {
    const [swipeState, setSwipeState] = useState<{ startX: number; currentX: number } | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    // Touch handlers for swipe gestures
    const handleTouchStart = (e: ReactTouchEvent) => {
        setSwipeState({
            startX: e.touches[0].clientX,
            currentX: e.touches[0].clientX
        });
    };

    const handleTouchMove = (e: ReactTouchEvent) => {
        if (!swipeState) return;
        setSwipeState({
            ...swipeState,
            currentX: e.touches[0].clientX
        });
    };

    const handleTouchEnd = () => {
        if (!swipeState) return;

        const diff = swipeState.currentX - swipeState.startX;
        const threshold = 80; // Minimum swipe distance

        if (diff > threshold && canMovePrev) {
            onMove('prev');
        } else if (diff < -threshold && canMoveNext) {
            onMove('next');
        }

        setSwipeState(null);
    };

    const swipeOffset = swipeState ? swipeState.currentX - swipeState.startX : 0;
    const clampedOffset = Math.max(-100, Math.min(100, swipeOffset));

    return (
        <div
            ref={cardRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={onExpand}
            className={`
                relative glass-card p-8 rounded-2xl shadow-lg 
                border-2 transition-all duration-200 cursor-pointer
                touch-manipulation select-none
                min-h-[140px]
                ${isCompletedColumn
                    ? 'border-green-500/50 bg-green-500/5'
                    : 'border-transparent hover:border-sky/50'
                }
            `}
            style={{
                transform: `translateX(${clampedOffset}px)`,
                borderLeft: task.color ? `8px solid ${task.color}` : undefined,
                fontSize: 'var(--user-font-size, 18px)',
                fontFamily: 'var(--user-font-family, "Comic Neue", cursive)',
            }}
        >
            {/* Main content */}
            <div className="flex items-start gap-4">
                {/* Large pictogram/icon */}
                {task.icon && (
                    <div className="flex-shrink-0">
                        <img
                            src={task.icon}
                            alt=""
                            className="w-24 h-24 object-contain rounded-xl bg-white p-2 shadow-md"
                        />
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <h3 className="text-2xl font-bold text-ink leading-tight mb-2">
                        {task.title}
                    </h3>
                    {task.objective && (
                        <p className="text-base text-sub mb-2">
                            Objetivo: {task.objective}
                        </p>
                    )}

                    {/* Pictogram sequence preview */}
                    {(task.pictograms?.length ?? 0) > 0 && (
                        <div className="flex gap-2 flex-wrap">
                            {task.pictograms!.slice(0, 5).map((p, i) => (
                                <div key={i} className="relative">
                                    <span className="absolute -top-1 -left-1 bg-sky text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shadow">
                                        {i + 1}
                                    </span>
                                    <img
                                        src={p.url}
                                        alt={p.title}
                                        className="w-14 h-14 object-contain bg-white rounded-lg p-1 shadow"
                                    />
                                </div>
                            ))}
                            {(task.pictograms?.length ?? 0) > 5 && (
                                <div className="w-14 h-14 bg-black/20 rounded-lg flex items-center justify-center text-sub font-bold">
                                    +{task.pictograms!.length - 5}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Completed indicator */}
                {isCompletedColumn && (
                    <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-pulse-success">
                        <Check className="w-7 h-7 text-white" />
                    </div>
                )}
            </div>

            {(task.expectedEvidence || task.supportText) && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {task.expectedEvidence && (
                        <span className="rounded-full bg-sky/10 px-3 py-1 text-xs font-semibold text-sky">
                            Evidencia
                        </span>
                    )}
                    {task.supportText && (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-ink">
                            Con apoyo
                        </span>
                    )}
                </div>
            )}

            {/* Touch action buttons - Large for accessibility */}
            <div className="mt-6 flex items-center justify-between">
                <button
                    onClick={(e) => { e.stopPropagation(); onMove('prev'); }}
                    disabled={!canMovePrev}
                    className={`
                        min-h-[56px] min-w-[56px] px-6 rounded-xl font-bold flex items-center gap-2
                        transition-all touch-manipulation
                        ${canMovePrev
                            ? 'bg-sky/20 text-sky hover:bg-sky/30 active:scale-95'
                            : 'opacity-30 cursor-not-allowed text-sub'
                        }
                    `}
                >
                    <ChevronLeft className="w-6 h-6" />
                    <span className="hidden sm:inline">Anterior</span>
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); onExpand(); }}
                    className="min-h-[56px] min-w-[56px] px-4 rounded-xl bg-mint/20 text-mint hover:bg-mint/30 active:scale-95 transition-all touch-manipulation"
                >
                    <Maximize2 className="w-6 h-6" />
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); onMove('next'); }}
                    disabled={!canMoveNext}
                    className={`
                        min-h-[56px] min-w-[56px] px-6 rounded-xl font-bold flex items-center gap-2
                        transition-all touch-manipulation
                        ${canMoveNext
                            ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30 active:scale-95'
                            : 'opacity-30 cursor-not-allowed text-sub'
                        }
                    `}
                >
                    <span className="hidden sm:inline">Siguiente</span>
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>

            {/* Swipe indicators */}
            {swipeState && (
                <>
                    {clampedOffset > 30 && canMovePrev && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sky text-lg font-bold animate-pulse">
                            ← Anterior
                        </div>
                    )}
                    {clampedOffset < -30 && canMoveNext && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 text-lg font-bold animate-pulse">
                            Siguiente →
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
