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

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, X, Edit2 } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { type Column, type Task } from '../store/boardStore';

interface Props {
    column: Column;
    tasks: Task[];
    onAddTask: (colId: string) => void;
    onEditColumn: (id: string, title: string) => void;
    onDeleteColumn: (id: string) => void;
    onDeleteTask: (id: string) => void;
    onTaskClick: (id: string) => void;
    selectionMode?: boolean;
    selectedTaskIds?: string[];
    onToggleTaskSelect?: (id: string) => void;
    readOnly?: boolean;
}

export function BoardColumn({
    column,
    tasks,
    onAddTask,
    onEditColumn,
    onDeleteColumn,
    onDeleteTask,
    onTaskClick,
    selectionMode = false,
    selectedTaskIds = [],
    onToggleTaskSelect,
    readOnly = false,
}: Props) {
    const { setNodeRef } = useDroppable({
        id: column.id,
        data: { type: 'Column', column }
    });

    return (
        <div ref={setNodeRef} className="w-[min(20rem,calc(100vw-3rem))] sm:w-80 glass-card p-4 flex flex-col max-h-[calc(100vh-160px)] transition-all">
            <div className="flex items-center justify-between mb-4 group/col">
                <button
                    type="button"
                    className="font-semibold text-ink truncate flex-1 mr-2 text-left cursor-pointer"
                    onClick={() => {
                        if (!readOnly) {
                            onEditColumn(column.id, column.title);
                        }
                    }}
                >
                    {column.title}
                    <span className="ml-2 text-xs text-sub font-normal">({tasks.length})</span>
                </button>
                <div className="flex gap-1 opacity-100 transition-opacity">
                    {!readOnly && <button type="button" onClick={() => onEditColumn(column.id, column.title)} className="p-1 hover:text-sky" aria-label={`Editar columna ${column.title}`}><Edit2 className="w-3.5 h-3.5" /></button>}
                    {!readOnly && <button type="button" onClick={() => onDeleteColumn(column.id)} className="p-1 hover:text-lme-danger" aria-label={`Eliminar columna ${column.title}`}><X className="w-3.5 h-3.5" /></button>}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[100px] pr-1 flex flex-col gap-3">
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onClick={() => onTaskClick(task.id)}
                            onDelete={() => {
                                if (!readOnly) {
                                    onDeleteTask(task.id);
                                }
                            }}
                            selectionMode={selectionMode}
                            isSelected={selectedTaskIds.includes(task.id)}
                            onToggleSelect={() => onToggleTaskSelect?.(task.id)}
                            readOnly={readOnly}
                        />
                    ))}
                </SortableContext>

                {tasks.length === 0 && (
                    <div className="flex-1 border border-dashed border-line rounded-lg flex items-center justify-center text-sub text-sm italic min-h-[100px]">
                        Suelta aquí
                    </div>
                )}
            </div>

            {!readOnly && (
                <button type="button" onClick={() => onAddTask(column.id)} className="mt-4 w-full py-2 rounded-lg border border-dashed border-line text-sub hover:text-ink hover:border-mint hover:bg-mint/5 transition-all text-sm font-medium flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    Añadir Tarea
                </button>
            )}
        </div>
    );
}
