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

import { useState, useRef, useEffect } from 'react';
import { Search, Filter, X, ChevronDown, Trash2, CheckSquare, Play, XCircle } from 'lucide-react';
import { TASK_COLOR_OPTIONS } from '../utils/taskColorSemantics';

interface BoardToolbarProps {
    onSearch: (query: string) => void;
    onFilterColor: (color: string | null) => void;
    activeFilter: string | null;
    taskCount: number;
    trashCount?: number;
    onOpenTrash?: () => void;
    selectionMode?: boolean;
    selectedCount?: number;
    onToggleSelectionMode?: () => void;
    onOpenSequence?: () => void;
    onClearSelection?: () => void;
}

export function BoardToolbar({
    onSearch,
    onFilterColor,
    activeFilter,
    taskCount,
    trashCount = 0,
    onOpenTrash,
    selectionMode = false,
    selectedCount = 0,
    onToggleSelectionMode,
    onOpenSequence,
    onClearSelection
}: BoardToolbarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setShowFilters(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        onSearch(value);
    };

    return (
        <div className="mb-4 flex flex-col gap-3 px-1 sm:px-2 lg:flex-row lg:flex-wrap lg:items-center">
            {/* Search */}
            <div className="relative w-full min-w-0 flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sub" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Buscar tareas..."
                    className="w-full bg-lme-surface border border-lme-border rounded-lg pl-9 pr-3 py-2 text-sm text-ink placeholder-sub focus:outline-none focus:border-sky transition-colors"
                />
                {searchQuery && (
                    <button
                        type="button"
                        onClick={() => handleSearchChange('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-sub hover:text-ink"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Filter by color */}
            <div className="relative w-full sm:w-auto" ref={filterRef}>
                <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors sm:w-auto ${activeFilter
                            ? 'border-sky bg-sky/10 text-sky'
                            : 'border-lme-border text-sub hover:text-ink hover:bg-white/5'
                        }`}
                >
                    <Filter className="w-4 h-4" />
                    <span>Filtrar</span>
                    {activeFilter && (
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: activeFilter }}
                        />
                    )}
                    <ChevronDown className="w-3 h-3" />
                </button>

                {showFilters && (
                    <div className="absolute top-full left-0 mt-2 w-full min-w-[12rem] bg-lme-surface-alt border border-lme-border rounded-xl shadow-2xl p-2 z-modal animate-scale-in sm:w-48">
                        <p className="px-2 py-1 text-xs font-bold text-sub uppercase mb-1">
                            Por Color
                        </p>
                        {TASK_COLOR_OPTIONS.map((color) => (
                            <button
                                key={color.value}
                                type="button"
                                onClick={() => {
                                    onFilterColor(activeFilter === color.value ? null : color.value);
                                    setShowFilters(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 ${activeFilter === color.value
                                        ? 'bg-sky/10 text-sky'
                                        : 'text-ink hover:bg-white/5'
                                    }`}
                            >
                                <div
                                    className="w-4 h-4 rounded-full"
                                    style={{ backgroundColor: color.value }}
                                />
                                {color.label}
                            </button>
                        ))}
                        {activeFilter && (
                            <>
                                <hr className="my-2 border-lme-border" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        onFilterColor(null);
                                        setShowFilters(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm rounded-lg text-lme-danger hover:bg-lme-danger/10"
                                >
                                    Quitar filtro
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Task count badge */}
            <div className="flex items-center gap-2 text-sm text-sub">
                <span className="bg-mint/20 text-mint px-2 py-0.5 rounded-full font-medium">
                    {taskCount} tareas
                </span>
            </div>

            {onToggleSelectionMode && (
                <button
                    type="button"
                    onClick={onToggleSelectionMode}
                    className={`flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors sm:w-auto ${selectionMode
                            ? 'border-mint/40 bg-mint/10 text-mint'
                            : 'border-lme-border text-sub hover:text-ink hover:bg-white/5'
                        }`}
                >
                    <CheckSquare className="w-4 h-4" />
                    <span>{selectionMode ? 'Seleccionando' : 'Seleccionar'}</span>
                </button>
            )}

            {selectionMode && (
                <>
                    <span className="text-sm text-sub">Seleccionadas: {selectedCount}</span>
                    <button
                        type="button"
                        onClick={onOpenSequence}
                        disabled={selectedCount === 0}
                        className="flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg border border-sky/30 bg-sky/10 text-sky hover:bg-sky/20 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                    >
                        <Play className="w-4 h-4 fill-current" />
                        Ver secuencia
                    </button>
                    <button
                        type="button"
                        onClick={onClearSelection}
                        className="flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg border border-lme-border text-sub hover:text-ink hover:bg-white/5 transition-colors text-sm font-medium sm:w-auto"
                    >
                        <XCircle className="w-4 h-4" />
                        Limpiar
                    </button>
                </>
            )}

            {onOpenTrash && (
                <button
                    type="button"
                    onClick={onOpenTrash}
                    className={`flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors sm:w-auto ${trashCount > 0
                            ? 'border-lme-danger/40 bg-lme-danger/10 text-lme-danger'
                            : 'border-lme-border text-sub hover:text-ink hover:bg-white/5'
                        }`}
                >
                    <Trash2 className="w-4 h-4" />
                    <span>Papelera</span>
                    {trashCount > 0 && (
                        <span className="bg-lme-danger text-white text-xs px-1.5 py-0.5 rounded-full">
                            {trashCount}
                        </span>
                    )}
                </button>
            )}
        </div>
    );
}
