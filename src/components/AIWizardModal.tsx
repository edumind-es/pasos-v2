/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
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

import { useMemo, useRef, useState } from 'react';
import { Sparkles, X, Image as ImageIcon, Loader2, FileText, Upload, CalendarClock } from 'lucide-react';
import { useStore, type Board } from '../store/boardStore';
import { parseInputToBoard } from '../utils/parsers';
import { autoAssignPictogramsToTasks } from '../utils/arasaac';
import {
    isSessionTemplate,
    parseSessionTemplate,
    sessionToBoard,
    type SessionLayout,
} from '../utils/sessionTemplate';
import {
    dragCarriesFiles,
    pickSessionFile,
    readSessionFile,
    SESSION_FILE_ACCEPT,
    SessionFileError,
} from '../utils/sessionFile';

interface AIWizardModalProps {
    onClose: () => void;
    /** Texto ya cargado (p. ej. al soltar un archivo sobre el tablero). */
    initialInput?: string;
    /** Nombre del archivo de origen, solo informativo. */
    initialFileName?: string;
    workspaceContext?: {
        organizationId?: string | null;
        teamId?: string | null;
        contextType?: 'personal' | 'organization' | 'team';
        boardType?: string | null;
    };
}

const LAYOUT_OPTIONS: { value: SessionLayout; title: string; hint: string }[] = [
    { value: 'fases', title: 'Fases de la sesión', hint: 'Una columna por Apertura, Núcleo y Cierre' },
    { value: 'kanban', title: 'Kanban de ejecución', hint: 'Todo en «Por hacer» para irlo moviendo en clase' },
];

export default function AIWizardModal({ onClose, initialInput, initialFileName, workspaceContext }: AIWizardModalProps) {
    const { importBoard, currentUser } = useStore();
    const [input, setInput] = useState(initialInput ?? '');
    const [fileName, setFileName] = useState<string | null>(initialFileName ?? null);
    const [usePictograms, setUsePictograms] = useState(true);
    const [layout, setLayout] = useState<SessionLayout>('fases');
    const [processing, setProcessing] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Si el texto es una plantilla de sesión, la leemos para la vista previa.
    const session = useMemo(
        () => (isSessionTemplate(input) ? parseSessionTemplate(input) : null),
        [input],
    );

    const stepsByPhase = useMemo(() => {
        if (!session) return [];
        return (['apertura', 'nucleo', 'cierre'] as const)
            .map(phase => ({
                phase,
                label: phase === 'nucleo' ? 'Núcleo' : phase === 'apertura' ? 'Apertura' : 'Cierre',
                count: session.steps.filter(step => step.phase === phase).length,
            }))
            .filter(group => group.count > 0);
    }, [session]);

    const loadFile = async (file: File | null) => {
        if (!file) return;
        setError(null);
        try {
            const { content, fileName: name } = await readSessionFile(file);
            setInput(content);
            setFileName(name);
        } catch (e) {
            setFileName(null);
            setError(e instanceof SessionFileError ? e.message : 'No se pudo leer el archivo.');
        }
    };

    const handleDrop = async (event: React.DragEvent) => {
        event.preventDefault();
        setDragging(false);
        await loadFile(pickSessionFile(event.dataTransfer));
    };

    const handleGenerate = async () => {
        if (!input.trim()) return;
        setProcessing(true);
        setError(null);

        // 1. Plantilla de sesión → tablero estructurado; si no, el lector genérico.
        let board;
        let pictogramTerms: Record<string, string> = {};

        if (session) {
            const result = sessionToBoard(session, layout);
            board = result.board;
            pictogramTerms = result.pictogramTerms;
        } else {
            const { board: parsed, error: parseError } = parseInputToBoard(input);
            if (parseError || !parsed?.tasks) {
                setError(parseError || 'No se pudieron generar tareas.');
                setProcessing(false);
                return;
            }
            board = parsed;
        }

        if (!board.tasks || board.tasks.length === 0) {
            setError('No se encontraron pasos en el contenido.');
            setProcessing(false);
            return;
        }

        // 2. Pictogramas: buscamos por el término depurado de cada paso, no por
        //    el título completo, para que la imagen se ajuste a lo que se hace.
        if (usePictograms) {
            await autoAssignPictogramsToTasks(board.tasks, {
                termFor: task => (task.id ? pictogramTerms[task.id] : undefined),
            });
        }

        const finalBoard: Board = {
            ...board,
            id: board.id ?? crypto.randomUUID(),
            title: board.title ?? 'Nuevo tablero importado',
            organizationId: workspaceContext?.organizationId ?? undefined,
            teamId: workspaceContext?.teamId ?? undefined,
            contextType: workspaceContext?.contextType ?? 'personal',
            boardType: workspaceContext?.boardType ?? (
                workspaceContext?.teamId
                    ? 'team_coordination'
                    : workspaceContext?.organizationId
                        ? 'organization_project'
                        : 'learning_sequence'
            ),
            columns: board.columns ?? [],
            tasks: board.tasks ?? [],
            createdAt: board.createdAt ?? Date.now(),
            ownerId: currentUser?.id ?? 'local-user',
            remoteRole: currentUser?.mode === 'pro' ? 'owner' : board.remoteRole,
            assignedTo: [],
        };

        importBoard(finalBoard);
        setProcessing(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-dropdown flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-lme-surface-alt w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-lme-border max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-line flex justify-between items-center bg-black/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Asistente Mágico</h2>
                            <p className="text-xs text-sub">Crea un tablero desde un texto o desde tu sesión en Markdown</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-sub hover:text-white transition-colors p-1" aria-label="Cerrar">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto">
                    <div className="space-y-4">
                        <label htmlFor="wizard-input" className="block text-sm font-semibold text-sub uppercase">
                            1. Arrastra tu sesión o pega el texto
                        </label>

                        {/* Zona de soltar archivo */}
                        <div
                            onDragOver={e => {
                                if (!dragCarriesFiles(e.dataTransfer)) return;
                                e.preventDefault();
                                setDragging(true);
                            }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={handleDrop}
                            className={`rounded-xl border-2 border-dashed p-4 flex items-center justify-between gap-4 transition-colors ${
                                dragging ? 'border-vio bg-vio/10' : 'border-line bg-black/10'
                            }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <Upload className={`w-5 h-5 shrink-0 ${dragging ? 'text-vio' : 'text-sub'}`} />
                                <div className="min-w-0">
                                    <p className="text-sm text-ink font-medium truncate">
                                        {fileName ? `Archivo cargado: ${fileName}` : 'Suelta aquí tu archivo de sesión (.md)'}
                                    </p>
                                    <p className="text-xs text-sub">Se lee en tu dispositivo; no se envía a ningún servidor</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-3 py-2 text-xs font-semibold rounded-lg border border-line text-ink hover:border-vio hover:text-vio transition-colors shrink-0"
                            >
                                Elegir archivo
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={SESSION_FILE_ACCEPT}
                                className="sr-only"
                                onChange={async e => {
                                    await loadFile(e.target.files?.[0] ?? null);
                                    e.target.value = '';
                                }}
                            />
                        </div>

                        <textarea
                            id="wizard-input"
                            value={input}
                            onChange={e => { setInput(e.target.value); setFileName(null); }}
                            className="w-full h-40 bg-lme-surface p-4 rounded-xl border border-line focus:border-vio focus:outline-none text-ink resize-none font-mono text-sm leading-relaxed"
                            placeholder={"Ejemplo:\n- Lavarse las manos\n- Coger el cepillo\n- Poner pasta de dientes\n- Cepillar los dientes durante 2 minutos\n- Enjuagarse"}
                        />
                        <div className="flex justify-between items-center text-xs text-sub">
                            <span>Admite plantilla de sesión, Markdown, texto plano y JSON</span>
                            {input.length > 0 && (
                                <span className="text-vio">
                                    {session
                                        ? `${session.steps.length} pasos de sesión detectados`
                                        : `${input.split('\n').filter(l => l.trim()).length} pasos detectados`}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Vista previa de la sesión reconocida */}
                    {session && (
                        <div className="space-y-4 bg-black/20 p-4 rounded-xl border border-mint/30">
                            <div className="flex items-start gap-3">
                                <FileText className="w-5 h-5 text-mint shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-ink">Sesión reconocida: {session.title}</h3>
                                    {(session.dateLabel || session.timeLabel) && (
                                        <p className="text-xs text-sub flex items-center gap-1 mt-0.5">
                                            <CalendarClock className="w-3 h-3" aria-hidden="true" />
                                            {[session.dateLabel, session.timeLabel].filter(Boolean).join(' · ')}
                                        </p>
                                    )}
                                    <p className="text-xs text-sub mt-1">
                                        {stepsByPhase.map(g => `${g.label}: ${g.count}`).join(' · ')}
                                        {session.reminders.length > 0 && ` · Recordatorios: ${session.reminders.length}`}
                                    </p>
                                </div>
                            </div>

                            <fieldset className="space-y-2">
                                <legend className="text-xs font-semibold text-sub uppercase mb-1">2. Estructura del tablero</legend>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {LAYOUT_OPTIONS.map(option => (
                                        <label
                                            key={option.value}
                                            className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                                                layout === option.value ? 'border-vio bg-vio/10' : 'border-line hover:border-vio/50'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="session-layout"
                                                value={option.value}
                                                checked={layout === option.value}
                                                onChange={() => setLayout(option.value)}
                                                className="sr-only"
                                            />
                                            <span className="block text-sm font-bold text-ink">{option.title}</span>
                                            <span className="block text-xs text-sub mt-0.5">{option.hint}</span>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                        </div>
                    )}

                    <div className="bg-black/20 p-4 rounded-xl flex items-center justify-between border border-line/50">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${usePictograms ? 'bg-mint/20 text-mint' : 'bg-lme-surface text-sub'}`}>
                                <ImageIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-ink">Pictogramas Automáticos</h3>
                                <p className="text-xs text-sub">Busca en ARASAAC la imagen de cada paso</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={usePictograms} onChange={e => setUsePictograms(e.target.checked)} className="sr-only peer" aria-label="Pictogramas automáticos" />
                            <div className="w-11 h-6 bg-lme-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-mint"></div>
                        </label>
                    </div>

                    {error && (
                        <div role="alert" className="p-3 bg-lme-danger/10 border border-lme-danger/30 rounded-lg text-sm text-lme-danger">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-line bg-black/20 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2 rounded-xl text-sub font-medium hover:text-white transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={!input.trim() || processing}
                        className="px-6 py-2 bg-vio text-white font-bold rounded-xl hover:bg-vio/80 transition-all shadow-lg shadow-vio/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generando...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                {session ? 'Crear sesión' : 'Generar Tablero'}
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
