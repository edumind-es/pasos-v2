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
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Copy, X, Video, Image as ImageIcon, Link as LinkIcon, CheckSquare, Square, CalendarDays, GitBranch, User } from 'lucide-react';
import { useStore, type Task } from '../store/boardStore';
import { getTaskColorEinkLabel, getTaskColorLabel } from '../utils/taskColorSemantics';

interface Props {
    task: Task;
    onClick: () => void;
    onDelete: () => void;
    selectionMode?: boolean;
    isSelected?: boolean;
    onToggleSelect?: () => void;
    readOnly?: boolean;
    /** Modo compacto: muestra solo título + estado; el resto aparece al hover. Default: true */
    compact?: boolean;
}

const PEDAGOGICAL_STATUS_LABEL: Record<string, string> = {
    validated: 'Validado',
    ready_for_review: 'Revisar',
    needs_help: 'Ayuda',
    in_progress: 'En marcha',
};

const PEDAGOGICAL_STATUS_DOT: Record<string, string> = {
    validated: 'bg-mint',
    ready_for_review: 'bg-sky',
    needs_help: 'bg-lme-danger',
    in_progress: 'bg-lme-warning',
};

const TASK_TYPE_LABEL: Record<string, string> = {
    learning_step: 'Paso',
    agreement: 'Acuerdo',
    document: 'Documento',
    resource: 'Recurso',
    incident: 'Incidencia',
    milestone: 'Hito',
    evidence: 'Evidencia',
};

export function TaskCard({
    task,
    onClick,
    onDelete,
    selectionMode = false,
    isSelected = false,
    onToggleSelect,
    readOnly = false,
    compact = true,
}: Props) {
    const visualMode = useStore((state) => state.visualMode);
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task.id,
        data: { type: 'Task', task },
        disabled: selectionMode || readOnly,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    const mainIcon = task.icon ?? task.pictograms?.[0]?.url;
    const sequence = task.pictograms ?? [];
    const sequenceToShow = mainIcon && sequence.length > 0 && sequence[0].url === mainIcon
        ? sequence.slice(1)
        : sequence;

    const pedagogicalStatusLabel = task.pedagogicalStatus ? PEDAGOGICAL_STATUS_LABEL[task.pedagogicalStatus] ?? null : null;
    const pedagogicalStatusDot = task.pedagogicalStatus ? PEDAGOGICAL_STATUS_DOT[task.pedagogicalStatus] ?? null : null;
    const taskTypeLabel = task.taskType && task.taskType !== 'task'
        ? (TASK_TYPE_LABEL[task.taskType] ?? task.taskType)
        : null;

    const dueLabel = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : null;
    const rangeLabel = task.startDate && task.dueDate
        ? `${new Date(task.startDate).toLocaleDateString()} – ${new Date(task.dueDate).toLocaleDateString()}`
        : dueLabel;

    const colorLabel = getTaskColorLabel(task.color);
    const einkColorLabel = visualMode === 'eink' ? getTaskColorEinkLabel(task.color) : null;
    const visibleLabels = task.labels.filter((l) => l.trim());

    const hasDetails = task.description || task.objective || sequenceToShow.length > 0
        || visibleLabels.length > 0 || colorLabel || einkColorLabel
        || rangeLabel || task.dependencyTaskIds?.length || task.attachments?.length
        || taskTypeLabel || task.expectedEvidence || task.ownerLabel;

    return (
        <div
            ref={setNodeRef}
            style={{
                ...style,
                ...(task.color ? { borderLeft: `4px solid ${task.color}` } : {}),
            }}
            {...attributes}
            {...listeners}
            className={`bg-lme-surface rounded-lg border shadow-sm hover:border-sky group/task transition-all cursor-pointer relative touch-none
                ${isSelected ? 'border-mint/60 ring-2 ring-mint/40' : 'border-lme-border'}
                ${compact ? 'p-2.5' : 'p-3'}`}
        >
            {/* Checkbox modo selección */}
            {selectionMode && (
                <div className="absolute top-2 right-2 bg-black/40 rounded-full p-1">
                    {isSelected
                        ? <CheckSquare className="w-4 h-4 text-mint" />
                        : <Square className="w-4 h-4 text-sub" />}
                </div>
            )}

            <button
                type="button"
                onClick={(e) => {
                    if (selectionMode) { e.stopPropagation(); onToggleSelect?.(); return; }
                    onClick();
                }}
                className="block w-full text-left"
                aria-label={selectionMode ? `Seleccionar ${task.title}` : `Abrir ${task.title}`}
            >
                {/* ── FILA PRIMARIA: siempre visible ── */}
                <div className="flex items-center gap-2 min-h-[36px]">
                    {mainIcon && (
                        <img
                            src={mainIcon}
                            className={`shrink-0 object-contain bg-white/10 rounded-md p-0.5 ${compact ? 'w-8 h-8' : 'w-12 h-12'}`}
                            alt=""
                        />
                    )}
                    <p className={`flex-1 font-medium text-ink leading-tight ${compact ? 'text-sm truncate' : 'text-sm'}`}>
                        {task.title}
                    </p>
                    {/* Estado pedagógico como punto de color en modo compacto */}
                    {compact && pedagogicalStatusDot && (
                        <span
                            className={`shrink-0 w-2 h-2 rounded-full ${pedagogicalStatusDot}`}
                            title={pedagogicalStatusLabel ?? undefined}
                        />
                    )}
                </div>

                {/* ── DETALLES: ocultos en compacto, visibles al hover ── */}
                {hasDetails && (
                    <div className={compact
                        ? 'overflow-hidden transition-[max-height,opacity] duration-200 ease-out max-h-0 opacity-0 group-hover/task:max-h-[400px] group-hover/task:opacity-100'
                        : 'mt-2'
                    }>
                        {task.description && (
                            <p className="text-xs text-sub mt-1.5 line-clamp-2">{task.description}</p>
                        )}
                        {task.objective && (
                            <p className="mt-1 text-[11px] text-sub line-clamp-2">Objetivo: {task.objective}</p>
                        )}

                        {/* Secuencia de pictogramas */}
                        {sequenceToShow.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {sequenceToShow.slice(0, 4).map((p, i) => (
                                    <img key={i} src={p.url} className="w-8 h-8 object-contain bg-white/10 rounded-md p-0.5" alt="" />
                                ))}
                                {sequenceToShow.length > 4 && (
                                    <span className="text-[10px] text-sub flex items-center">+{sequenceToShow.length - 4}</span>
                                )}
                            </div>
                        )}

                        {/* Etiquetas y color */}
                        {(visibleLabels.length > 0 || einkColorLabel || (visualMode !== 'eink' && colorLabel)) && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {visibleLabels.map((label) => (
                                    <span key={`${task.id}-${label}`} className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink">
                                        {label}
                                    </span>
                                ))}
                                {visualMode === 'eink' && einkColorLabel && (
                                    <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink">
                                        {einkColorLabel}
                                    </span>
                                )}
                                {visualMode !== 'eink' && colorLabel && visibleLabels.length === 0 && (
                                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sub">
                                        {colorLabel}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Badges de metadatos */}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {task.attachments?.some(a => a.kind === 'video') && <Video className="w-3 h-3 text-sub" />}
                            {task.attachments?.some(a => a.kind === 'image') && <ImageIcon className="w-3 h-3 text-sub" />}
                            {task.attachments?.some(a => a.kind === 'link') && <LinkIcon className="w-3 h-3 text-sub" />}

                            {pedagogicalStatusLabel && (
                                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-ink">
                                    {pedagogicalStatusLabel}
                                </span>
                            )}
                            {task.expectedEvidence && (
                                <span className="rounded-full bg-sky/10 px-2 py-0.5 text-[10px] font-semibold text-sky">
                                    Evidencia
                                </span>
                            )}
                            {taskTypeLabel && (
                                <span className="rounded-full bg-mint/10 px-2 py-0.5 text-[10px] font-semibold text-mint">
                                    {taskTypeLabel}
                                </span>
                            )}
                            {rangeLabel && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-lme-warning/10 px-2 py-0.5 text-[10px] font-semibold text-lme-warning">
                                    <CalendarDays className="h-3 w-3" />
                                    {rangeLabel}
                                </span>
                            )}
                            {task.dependencyTaskIds && task.dependencyTaskIds.length > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-lme-danger/10 px-2 py-0.5 text-[10px] font-semibold text-lme-danger/70">
                                    <GitBranch className="h-3 w-3" />
                                    {task.dependencyTaskIds.length} dep.
                                </span>
                            )}
                            {task.ownerLabel && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-ink">
                                    <User className="h-3 w-3" />
                                    {task.ownerLabel}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </button>

            {/* Botones de acción (visibles al hover) */}
            {!selectionMode && !readOnly && (
                <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 opacity-0 group-hover/task:opacity-100 transition-opacity">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); useStore.getState().duplicateTask(task.id); }}
                        aria-label={`Duplicar ${task.title}`}
                        title="Duplicar tarea"
                        className="p-0.5 text-sub hover:text-sky transition-colors"
                    >
                        <Copy className="w-3 h-3" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        aria-label={`Eliminar ${task.title}`}
                        title="Eliminar tarea"
                        className="p-0.5 text-sub hover:text-lme-danger transition-colors"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}
        </div>
    );
}
