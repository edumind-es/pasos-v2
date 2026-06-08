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

import React, { useState, useEffect } from 'react';
import { X, Save, Search, Plus, Image as ImageIcon, Video, Link as LinkIcon, Trash2 } from 'lucide-react';
import { useBoardStore, type Attachment, type PedagogicalStatus, type Pictogram } from '../store/boardStore';
import { sanitizeURL } from '../utils/security';
import { getTaskColorLabel, TASK_COLOR_OPTIONS } from '../utils/taskColorSemantics';

interface FoundPictogram {
    id: number;
    title: string;
    url: string;
}

interface ArasaacSearchResult {
    _id: number;
}

interface TaskModalProps {
    taskId: string;
    onClose: () => void;
    readOnly?: boolean;
}

type ModalTab = 'basico' | 'pedagogia' | 'planificacion' | 'pictogramas' | 'adjuntos';

const MODAL_TABS: Array<{ key: ModalTab; label: string }> = [
    { key: 'basico', label: 'Básico' },
    { key: 'pedagogia', label: 'Pedagogía' },
    { key: 'planificacion', label: 'Planificación' },
    { key: 'pictogramas', label: 'Pictogramas' },
    { key: 'adjuntos', label: 'Adjuntos' },
];

export default function TaskModal({ taskId, onClose, readOnly = false }: TaskModalProps) {
    const { tasks, updateTask, deleteTask } = useBoardStore();
    const task = tasks.find(t => t.id === taskId);
    const [activeTab, setActiveTab] = useState<ModalTab>('basico');

    const [title, setTitle] = useState(task?.title ?? '');
    const [description, setDescription] = useState(task?.description ?? '');
    const [color, setColor] = useState(task?.color ?? '');
    const [taskType, setTaskType] = useState(task?.taskType ?? 'task');
    const [durationMinutes, setDurationMinutes] = useState(
        task?.durationSeconds ? Math.round(task.durationSeconds / 60).toString() : ''
    );
    const [objective, setObjective] = useState(task?.objective ?? '');
    const [supportText, setSupportText] = useState(task?.supportText ?? '');
    const [expectedEvidence, setExpectedEvidence] = useState(task?.expectedEvidence ?? '');
    const [nextStep, setNextStep] = useState(task?.nextStep ?? '');
    const [pedagogicalStatus, setPedagogicalStatus] = useState<PedagogicalStatus>(task?.pedagogicalStatus ?? 'not_started');
    const [startDate, setStartDate] = useState(task?.startDate ? task.startDate.slice(0, 10) : '');
    const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.slice(0, 10) : '');
    const [ownerLabel, setOwnerLabel] = useState(task?.ownerLabel ?? '');
    const [effortPoints, setEffortPoints] = useState(task?.effortPoints ? String(task.effortPoints) : '');
    const [dependencyTaskIds, setDependencyTaskIds] = useState<string[]>(task?.dependencyTaskIds ?? []);

    // Pictograms
    const [pictograms, setPictograms] = useState<Pictogram[]>(task?.pictograms ?? []);
    const [searchQuery, setSearchQuery] = useState('');
    const [foundPictograms, setFoundPictograms] = useState<FoundPictogram[]>([]);
    const [searching, setSearching] = useState(false);

    // Attachments
    const [attachments, setAttachments] = useState<Attachment[]>(task?.attachments ?? []);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState(false);

    const previewPictograms = pictograms.length > 0
        ? pictograms
        : task?.icon
            ? [{ id: -1, url: task.icon, title: title || task.title }]
            : [];

    // Update local state if task changes externally
    useEffect(() => {
        if (!task) return;
        setTitle(task.title);
        setDescription(task.description || '');
        setColor(task.color || '');
        setTaskType(task.taskType || 'task');
        setDurationMinutes(task.durationSeconds ? Math.round(task.durationSeconds / 60).toString() : '');
        setObjective(task.objective || '');
        setSupportText(task.supportText || '');
        setExpectedEvidence(task.expectedEvidence || '');
        setNextStep(task.nextStep || '');
        setPedagogicalStatus(task.pedagogicalStatus || 'not_started');
        setStartDate(task.startDate ? task.startDate.slice(0, 10) : '');
        setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : '');
        setOwnerLabel(task.ownerLabel || '');
        setEffortPoints(task.effortPoints ? String(task.effortPoints) : '');
        setDependencyTaskIds(task.dependencyTaskIds || []);
        setPictograms(task.pictograms || []);
        setAttachments(task.attachments || []);
        setFormError(null);
        setPendingDelete(false);
    }, [task]);

    if (!task) return null;

    const handleSave = () => {
        if (readOnly) return;
        const normalizedTitle = title.trim();
        if (!taskId || !normalizedTitle) {
            setFormError('La tarea necesita un título antes de guardar.');
            return;
        }
        if (startDate && dueDate && startDate > dueDate) {
            setFormError('La fecha de inicio no puede ser posterior a la fecha objetivo.');
            return;
        }

        const minutesValue = Number(durationMinutes);
        const durationSeconds = Number.isFinite(minutesValue) && minutesValue > 0
            ? Math.round(minutesValue * 60)
            : undefined;
        const effortValue = Number(effortPoints);
        updateTask(taskId, {
            title: normalizedTitle,
            description,
            color,
            taskType,
            pictograms,
            attachments,
            icon: pictograms[0]?.url || task.icon,
            durationSeconds,
            objective: objective.trim() || undefined,
            supportText: supportText.trim() || undefined,
            expectedEvidence: expectedEvidence.trim() || undefined,
            nextStep: nextStep.trim() || undefined,
            pedagogicalStatus,
            startDate: startDate ? new Date(`${startDate}T08:00:00`).toISOString() : undefined,
            dueDate: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : undefined,
            ownerLabel: ownerLabel.trim() || undefined,
            effortPoints: Number.isFinite(effortValue) && effortValue >= 0 ? effortValue : undefined,
            dependencyTaskIds,
        });
        onClose();
    };

    const handleDelete = () => {
        if (readOnly) return;
        deleteTask(taskId);
        onClose();
    };

    const searchPictograms = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery) return;
        setSearching(true);
        try {
            const res = await fetch(`https://api.arasaac.org/v1/pictograms/es/search/${encodeURIComponent(searchQuery)}`);
            const data = await res.json() as ArasaacSearchResult[];
            const pics = data.map((p) => ({
                id: p._id,
                title: searchQuery,
                url: `https://static.arasaac.org/pictograms/${p._id}/${p._id}_500.png`
            }));
            setFoundPictograms(pics);
        } catch (e) {
            console.error(e);
        } finally {
            setSearching(false);
        }
    };

    const addUrlAttachment = () => {
        if (newAttachmentUrl) {
            // Sanitize and validate URL
            const sanitized = sanitizeURL(newAttachmentUrl);
            if (!sanitized) {
                setFormError('URL no válida. Solo se permiten direcciones http:// y https://.');
                return;
            }

            const kind = sanitized.match(/\.(jpeg|jpg|gif|png)$/) != null ? 'image'
                : sanitized.includes('youtube') || sanitized.includes('youtu.be') ? 'video'
                    : 'link';

            setAttachments([...attachments, {
                id: Date.now().toString(),
                kind,
                url: sanitized,
                title: sanitized
            }]);
            setNewAttachmentUrl('');
            setShowUrlInput(false);
            setFormError(null);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 500 * 1024) {
                setFormError('El archivo es demasiado grande. El máximo permitido es 500 KB.');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setAttachments([...attachments, {
                    id: Date.now().toString(),
                    kind: 'image',
                    url: base64,
                    title: file.name
                }]);
                setFormError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div role="dialog" aria-modal="true" aria-labelledby="task-modal-title" className="relative bg-lme-surface-alt w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-lme-border">

                {/* Header: título + tabs + cerrar */}
                <div className="border-b border-line bg-black/20">
                    <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            disabled={readOnly}
                            className="flex-1 bg-transparent text-2xl font-bold text-white placeholder-white/30 focus:outline-none"
                            placeholder="Título de la tarea..."
                            id="task-modal-title"
                        />
                        <button onClick={onClose} className="mt-1 text-sub hover:text-white transition-colors shrink-0">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    {/* Tabs de navegación */}
                    <nav className="flex gap-0 px-4 overflow-x-auto" aria-label="Secciones de la tarea">
                        {MODAL_TABS.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveTab(tab.key)}
                                className={`shrink-0 px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
                                    activeTab === tab.key
                                        ? 'border-mint text-mint'
                                        : 'border-transparent text-sub hover:text-ink'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Body — cada sección visible solo cuando su tab es activa.
                    Se usa CSS `hidden` (no condicional) para preservar el estado
                    React de todos los campos al cambiar de tab. */}
                <div className="flex-1 overflow-y-auto">
                {/* Alertas — siempre visibles */}
                {(formError || readOnly) && (
                    <div className="px-6 pt-4 space-y-3">
                        {formError && (
                            <div className="rounded-xl border border-lme-danger/30 bg-lme-danger/10 p-3 text-sm text-lme-danger/80">{formError}</div>
                        )}
                        {readOnly && (
                            <div className="rounded-xl border border-lme-warning/30 bg-lme-warning/10 p-3 text-sm text-lme-warning/85">
                                Modo solo lectura. Puedes revisar, pero no guardar cambios.
                            </div>
                        )}
                    </div>
                )}
                <div className="p-6 space-y-6">
                    {/* Pictograma preview — siempre visible en tab Pictogramas */}
                    {previewPictograms.length > 0 && (
                        <div className="bg-black/20 p-4 rounded-xl">
                            <h3 className="text-xs font-semibold uppercase text-sub mb-3">Vista ampliada</h3>
                            <div className="flex flex-wrap justify-center gap-4">
                                {previewPictograms.map((p, index) => (
                                    <div key={`${p.id}-${index}`} className="relative">
                                        {previewPictograms.length > 1 && (
                                            <span className="absolute -top-2 -left-2 bg-sky text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold shadow-lg shadow-sky/30">
                                                {index + 1}
                                            </span>
                                        )}
                                        <img src={p.url} className="w-28 h-28 object-contain bg-white rounded-2xl p-2 shadow-lg" alt={p.title} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── TAB: BÁSICO ── */}
                    <div className={activeTab !== 'basico' ? 'hidden' : 'space-y-6'}>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold uppercase text-sub">Descripción</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            disabled={readOnly}
                            className="w-full bg-lme-surface p-3 rounded-xl border border-line focus:border-mint focus:outline-none text-ink min-h-[100px] resize-none"
                            placeholder="Añade detalles..."
                        />
                    </div>

                    {/* Tipo de tarjeta — en tab Básico */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold uppercase text-sub">Tipo de tarjeta</label>
                        <select value={taskType} onChange={e => setTaskType(e.target.value as typeof taskType)} disabled={readOnly}
                            className="w-full bg-lme-surface border border-line rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-sky disabled:cursor-not-allowed disabled:opacity-50">
                            <option value="task">Tarea</option>
                            <option value="learning_step">Paso de aprendizaje</option>
                            <option value="agreement">Acuerdo</option>
                            <option value="resource">Recurso</option>
                            <option value="document">Documento</option>
                            <option value="incident">Incidencia</option>
                            <option value="milestone">Hito</option>
                            <option value="evidence">Evidencia</option>
                        </select>
                    </div>
                    </div>{/* ── FIN TAB BÁSICO ── */}

                    {/* ── TAB: PEDAGOGÍA ── */}
                    <div className={activeTab !== 'pedagogia' ? 'hidden' : 'space-y-6'}>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold uppercase text-sub">Objetivo</label>
                                <textarea value={objective} onChange={e => setObjective(e.target.value)} disabled={readOnly}
                                    className="w-full bg-lme-surface p-3 rounded-xl border border-line focus:border-sky focus:outline-none text-ink min-h-[92px] resize-none"
                                    placeholder="Qué debe conseguir el alumno en este paso." />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold uppercase text-sub">Apoyo o ayuda</label>
                                <textarea value={supportText} onChange={e => setSupportText(e.target.value)} disabled={readOnly}
                                    className="w-full bg-lme-surface p-3 rounded-xl border border-line focus:border-sky focus:outline-none text-ink min-h-[92px] resize-none"
                                    placeholder="Pistas, andamiaje, adaptaciones o apoyos visuales." />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold uppercase text-sub">Evidencia esperada</label>
                                <textarea value={expectedEvidence} onChange={e => setExpectedEvidence(e.target.value)} disabled={readOnly}
                                    className="w-full bg-lme-surface p-3 rounded-xl border border-line focus:border-sky focus:outline-none text-ink min-h-[92px] resize-none"
                                    placeholder="Qué debe mostrar o entregar para considerar este paso realizado." />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold uppercase text-sub">Siguiente paso</label>
                                <textarea value={nextStep} onChange={e => setNextStep(e.target.value)} disabled={readOnly}
                                    className="w-full bg-lme-surface p-3 rounded-xl border border-line focus:border-sky focus:outline-none text-ink min-h-[92px] resize-none"
                                    placeholder="Qué viene justo después cuando termine este paso." />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold uppercase text-sub">Estado pedagógico</label>
                            <select value={pedagogicalStatus} onChange={e => setPedagogicalStatus(e.target.value as PedagogicalStatus)} disabled={readOnly}
                                className="w-full bg-lme-surface border border-line rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-sky disabled:cursor-not-allowed disabled:opacity-50">
                                <option value="not_started">Por empezar</option>
                                <option value="in_progress">En marcha</option>
                                <option value="needs_help">Necesita ayuda</option>
                                <option value="ready_for_review">Listo para revisar</option>
                                <option value="validated">Validado</option>
                            </select>
                        </div>
                    </div>{/* ── FIN TAB PEDAGOGÍA ── */}

                    {/* ── TAB: PLANIFICACIÓN ── */}
                    <div className={activeTab !== 'planificacion' ? 'hidden' : 'space-y-6'}>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold uppercase text-sub">Fecha de inicio</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={readOnly}
                                    className="w-full bg-lme-surface border border-line rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-sky disabled:cursor-not-allowed disabled:opacity-50" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold uppercase text-sub">Fecha objetivo</label>
                                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} disabled={readOnly}
                                    className="w-full bg-lme-surface border border-line rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-sky disabled:cursor-not-allowed disabled:opacity-50" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold uppercase text-sub">Responsable</label>
                                <input value={ownerLabel} onChange={e => setOwnerLabel(e.target.value)} disabled={readOnly}
                                    className="w-full bg-lme-surface border border-line rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-sky disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Ana, Coordinación, PT…" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold uppercase text-sub">Esfuerzo (puntos)</label>
                                <input type="number" min="0" value={effortPoints} onChange={e => setEffortPoints(e.target.value)} disabled={readOnly}
                                    className="w-full bg-lme-surface border border-line rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-sky disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Puntos o carga estimada" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-semibold uppercase text-sub">Dependencias</label>
                                <p className="mt-1 text-xs text-sub">Tareas que deben quedar resueltas antes de arrancar esta.</p>
                            </div>
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                {tasks.filter(c => c.id !== taskId).map(candidate => {
                                    const checked = dependencyTaskIds.includes(candidate.id);
                                    return (
                                        <label key={candidate.id} className="flex items-start gap-3 rounded-xl border border-line bg-black/20 px-3 py-3 text-sm text-ink">
                                            <input type="checkbox" checked={checked} disabled={readOnly} className="mt-1"
                                                onChange={() => setDependencyTaskIds(cur => checked ? cur.filter(i => i !== candidate.id) : [...cur, candidate.id])} />
                                            <span>
                                                <span className="block font-semibold">{candidate.title}</span>
                                                {candidate.dueDate && <span className="block text-xs text-sub">Vence: {new Date(candidate.dueDate).toLocaleDateString()}</span>}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>{/* ── FIN TAB PLANIFICACIÓN ── */}

                    {/* ── TAB: PICTOGRAMAS ── */}
                    <div className={activeTab !== 'pictogramas' ? 'hidden' : 'space-y-6'}>
                    {/* Timer */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold uppercase text-sub">Temporizador</label>
                        <div className="flex flex-wrap items-center gap-3">
                            <input
                                type="number"
                                min="0"
                                inputMode="numeric"
                                value={durationMinutes}
                                onChange={e => setDurationMinutes(e.target.value)}
                                className="w-28 bg-lme-surface border border-line rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-mint"
                                placeholder="Min"
                            />
                            <div className="flex items-center gap-2 text-xs text-sub">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const next = Math.max(0, Number(durationMinutes || 0) - 5);
                                        setDurationMinutes(next > 0 ? String(next) : '');
                                    }}
                                    className="px-3 py-1.5 rounded-lg border border-line hover:border-sky hover:text-ink transition-colors"
                                >
                                    -5 min
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const next = Number(durationMinutes || 0) + 5;
                                        setDurationMinutes(String(next));
                                    }}
                                    className="px-3 py-1.5 rounded-lg border border-line hover:border-mint hover:text-ink transition-colors"
                                >
                                    +5 min
                                </button>
                                <span>por tarea</span>
                            </div>
                        </div>
                    </div>

                    <hr className="border-line/50" />

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Pictogram Search UI */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold uppercase text-sub flex items-center gap-2">
                                <Search className="w-4 h-4" /> Pictogramas
                            </h3>
                            <form onSubmit={searchPictograms} className="flex gap-2">
                                <input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="flex-1 bg-lme-surface text-sm px-3 py-2 rounded-lg border border-line focus:outline-none focus:border-sky text-ink"
                                    placeholder="Buscar..."
                                />
                                <button type="submit" disabled={searching} className="bg-sky text-white px-3 rounded-lg font-bold disabled:opacity-50 hover:bg-sky/80 transition-colors">
                                    <Search className="w-4 h-4" />
                                </button>
                            </form>

                            {foundPictograms.length > 0 ? (
                                <div className="grid grid-cols-4 gap-2 bg-black/20 p-2 rounded-lg max-h-40 overflow-y-auto">
                                    {foundPictograms.map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => {
                                                setPictograms([...pictograms, { id: p.id, url: p.url, title: p.title }]);
                                                setSearchQuery('');
                                                setFoundPictograms([]);
                                                setFormError(null);
                                            }}
                                            className="bg-white p-1 rounded hover:scale-105 transition-transform"
                                        >
                                            <img src={p.url} className="w-full h-full object-contain" alt={p.title} />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                pictograms.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto py-2">
                                        {pictograms.map(p => (
                                            <div key={p.id} className="relative group flex-shrink-0">
                                                <img src={p.url} className="w-16 h-16 bg-white rounded-lg p-1 object-contain" alt={p.title} />
                                                <button type="button" onClick={() => setPictograms(pictograms.filter(x => x.id !== p.id))} className="absolute -top-1 -right-1 bg-lme-danger text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Quitar pictograma ${p.title}`}>
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>

                        {/* Color Picker */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold uppercase text-sub">Color Etiqueta</label>
                            <div className="flex flex-wrap gap-2">
                                {TASK_COLOR_OPTIONS.map(({ value, label }) => (
                                    <button
                                        type="button"
                                        key={value}
                                        onClick={() => setColor(value)}
                                        title={label}
                                        aria-label={`Seleccionar ${label}`}
                                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${color === value ? 'border-white ring-2 ring-white/20' : 'border-transparent'}`}
                                        style={{ backgroundColor: value }}
                                    />
                                ))}
                                {color && (
                                    <button type="button" onClick={() => setColor('')} className="p-1 px-2 text-xs text-sub hover:text-white">
                                        Limpiar
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-sub">
                                {color ? `Se mostrará como ${getTaskColorLabel(color)} y en modo e-ink aparecerá también como etiqueta textual.` : 'Selecciona un color para reforzar la prioridad o la categoría del paso.'}
                            </p>
                        </div>
                    </div>

                    </div>{/* ── FIN TAB PICTOGRAMAS ── */}

                    {/* ── TAB: ADJUNTOS ── */}
                    <div className={activeTab !== 'adjuntos' ? 'hidden' : 'space-y-6'}>
                    {/* Attachments UI */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase text-sub">Adjuntos</h3>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setShowUrlInput(!showUrlInput)}
                                className={`flex-1 py-3 border border-dashed rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-medium ${showUrlInput ? 'border-sky bg-sky/5 text-sky' : 'border-line text-sub hover:text-ink hover:border-sky'}`}
                            >
                                <LinkIcon className="w-4 h-4" /> Añadir URL / Vídeo
                            </button>
                            <label className="flex-1 py-3 border border-dashed border-line rounded-xl text-sub hover:text-ink hover:border-mint transition-all flex items-center justify-center gap-2 text-sm font-medium cursor-pointer hover:bg-mint/5">
                                <ImageIcon className="w-4 h-4" /> Subir Imagen
                                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                            </label>
                        </div>

                        {showUrlInput && (
                            <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 bg-black/20 p-3 rounded-xl">
                                <input
                                    type="text"
                                    value={newAttachmentUrl}
                                    onChange={e => setNewAttachmentUrl(e.target.value)}
                                    placeholder="https://youtube.com/..."
                                    className="flex-1 bg-lme-surface border border-line rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-mint"
                                />
                                <button
                                    type="button"
                                    onClick={addUrlAttachment}
                                    disabled={!newAttachmentUrl}
                                    className="bg-mint text-bg0 px-4 rounded-lg font-bold disabled:opacity-50 hover:bg-mint/90"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        {attachments.length > 0 && (
                            <div className="space-y-2 bg-black/20 p-3 rounded-xl">
                                {attachments.map(a => (
                                    <div key={a.id} className="flex items-center gap-3 bg-lme-surface p-2 rounded-lg group border border-transparent hover:border-line transition-colors">
                                        <div className="w-10 h-10 rounded-lg bg-black/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {a.kind === 'image' ? (
                                                <img src={a.url} className="w-full h-full object-cover" alt={a.title || 'Adjunto de imagen'} />
                                            ) : a.kind === 'video' ? (
                                                <Video className="w-5 h-5 text-sub" />
                                            ) : (
                                                <LinkIcon className="w-5 h-5 text-sub" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <a href={a.url} target="_blank" rel="noreferrer noopener" className="text-sm text-sky hover:underline truncate block font-medium">{a.title || 'Adjunto'}</a>
                                            <span className="text-xs text-sub capitalize flex items-center gap-1">
                                                {a.kind} {a.kind === 'video' && <span className="w-1 h-1 rounded-full bg-sub" />}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setAttachments(attachments.filter(att => att.id !== a.id))}
                                            className="text-sub hover:text-lme-danger opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-lme-danger/10 rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-line bg-black/20 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => setPendingDelete(true)}
                        className={`text-sm font-medium flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 ${pendingDelete ? 'text-lme-danger/80' : 'text-lme-danger hover:underline'}`}
                    >
                        <Trash2 className="w-4 h-4" /> {pendingDelete ? 'Confirmar eliminación' : 'Eliminar Tarea'}
                    </button>
                    <div className="flex flex-col-reverse gap-3 sm:flex-row">
                        <button type="button" onClick={onClose} className="px-6 py-2 rounded-xl text-sub font-medium hover:text-white transition-colors">
                            Cancelar
                        </button>
                        <button type="button" disabled={readOnly} onClick={handleSave} className="px-6 py-2 bg-mint text-bg0 font-bold rounded-xl hover:bg-mint/90 transition-colors shadow-lg shadow-mint/20 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
                            <Save className="w-4 h-4" /> Guardar Cambios
                        </button>
                    </div>
                    </div>{/* ── FIN TAB ADJUNTOS ── */}
                </div>{/* fin space-y-6 interno */}
                </div>{/* fin flex-1 overflow-y-auto */}

                {pendingDelete && (
                    <div className="border-t border-lme-danger/20 bg-lme-danger/10 px-6 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-lme-danger/70">
                                Esta acción moverá la tarea a la papelera del tablero y podrás restaurarla después.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setPendingDelete(false)}
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-sub hover:text-ink transition-colors"
                                >
                                    Seguir editando
                                </button>
                                <button
                                    type="button"
                                    disabled={readOnly}
                                    onClick={handleDelete}
                                    className="rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-lme-danger/80 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Eliminar ahora
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
