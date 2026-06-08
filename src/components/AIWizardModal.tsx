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
import { Sparkles, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useStore, type Board } from '../store/boardStore';
import { parseInputToBoard } from '../utils/parsers';
import { autoAssignPictogramsToTasks } from '../utils/arasaac';

interface AIWizardModalProps {
    onClose: () => void;
    workspaceContext?: {
        organizationId?: string | null;
        teamId?: string | null;
        contextType?: 'personal' | 'organization' | 'team';
        boardType?: string | null;
    };
}

export default function AIWizardModal({ onClose, workspaceContext }: AIWizardModalProps) {
    const { importBoard, currentUser } = useStore();
    const [input, setInput] = useState('');
    const [usePictograms, setUsePictograms] = useState(true);
    const [processing, setProcessing] = useState(false);
    // const [step, setStep] = useState<'input' | 'preview'>('input'); // Future expansion
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!input.trim()) return;
        setProcessing(true);
        setError(null);

        // 1. Parse Input
        const { board, error: parseError } = parseInputToBoard(input);

        if (parseError || !board || !board.tasks) {
            setError(parseError || 'No se pudieron generar tareas.');
            setProcessing(false);
            return;
        }

        // 2. Auto-assign Pictograms if requested
        if (usePictograms && board.tasks.length > 0) {
            await autoAssignPictogramsToTasks(board.tasks);
        }

        // 3. Create full board object
        // Use parsers.ts partial board but ensure we have all required fields for store
        // The parser returns a mostly complete board including IDs.

        // We need to inject the ownerId (current user usually, or generic)
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
            <div className="relative bg-lme-surface-alt w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-lme-border">

                {/* Header */}
                <div className="p-6 border-b border-line flex justify-between items-center bg-black/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Asistente Mágico</h2>
                            <p className="text-xs text-sub">Crea un tablero automáticamente desde texto</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-sub hover:text-white transition-colors p-1">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <label className="block text-sm font-semibold text-sub uppercase">
                            1. Describe el proceso o pega tu lista
                        </label>
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            className="w-full h-48 bg-lme-surface p-4 rounded-xl border border-line focus:border-vio focus:outline-none text-ink resize-none font-mono text-sm leading-relaxed"
                            placeholder={"Ejemplo:\n- Lavarse las manos\n- Coger el cepillo\n- Poner pasta de dientes\n- Cepillar los dientes durante 2 minutos\n- Enjuagarse"}
                        />
                        <div className="flex justify-between items-center text-xs text-sub">
                            <span>Soporta Texto plano, Markdown y JSON</span>
                            {input.length > 0 && <span className="text-vio">{input.split('\n').filter(l => l.trim()).length} pasos detectados</span>}
                        </div>
                    </div>

                    <div className="bg-black/20 p-4 rounded-xl flex items-center justify-between border border-line/50">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${usePictograms ? 'bg-mint/20 text-mint' : 'bg-lme-surface text-sub'}`}>
                                <ImageIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-ink">Pictogramas Automáticos</h3>
                                <p className="text-xs text-sub">Busca imágenes en ARASAAC para cada paso</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={usePictograms} onChange={e => setUsePictograms(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-lme-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-mint"></div>
                        </label>
                    </div>

                    {error && (
                        <div className="p-3 bg-lme-danger/10 border border-lme-danger/30 rounded-lg text-sm text-lme-danger">
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
                                Generar Tablero
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
