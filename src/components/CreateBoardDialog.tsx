import { useMemo, useState } from 'react';
import { Building2, Layers3, Users } from 'lucide-react';
import type { BoardContextType } from '../store/boardStore';
import { getBoardTypeOptions, getDefaultBoardType, getDefaultColumnsForBoardType, isSupportedBoardType, type SupportedBoardType } from '../utils/boardPresets';

interface CreateBoardDialogProps {
    isProUser: boolean;
    currentOrganizationId: string | null;
    currentTeamId: string | null;
    initialBoardType?: SupportedBoardType | null;
    onClose: () => void;
    onConfirm: (payload: {
        title: string;
        contextType: BoardContextType;
        boardType: SupportedBoardType;
        organizationId: string | null;
        teamId: string | null;
    }) => void;
}

function getContextType(currentOrganizationId: string | null, currentTeamId: string | null): BoardContextType {
    if (currentTeamId) return 'team';
    if (currentOrganizationId) return 'organization';
    return 'personal';
}

export function CreateBoardDialog({
    isProUser,
    currentOrganizationId,
    currentTeamId,
    initialBoardType,
    onClose,
    onConfirm,
}: CreateBoardDialogProps) {
    const contextType = useMemo(
        () => getContextType(currentOrganizationId, currentTeamId),
        [currentOrganizationId, currentTeamId],
    );
    const [title, setTitle] = useState('');
    const boardTypeOptions = useMemo(() => getBoardTypeOptions(contextType), [contextType]);
    const initialResolvedBoardType = useMemo(() => {
        if (isSupportedBoardType(initialBoardType) && boardTypeOptions.some((option) => option.value === initialBoardType)) {
            return initialBoardType;
        }
        return getDefaultBoardType(contextType);
    }, [boardTypeOptions, contextType, initialBoardType]);
    const [boardTypeOverride, setBoardTypeOverride] = useState<SupportedBoardType | null>(null);
    const boardType = boardTypeOverride && boardTypeOptions.some((option) => option.value === boardTypeOverride)
        ? boardTypeOverride
        : initialResolvedBoardType;
    const previewColumns = useMemo(() => getDefaultColumnsForBoardType(boardType), [boardType]);

    const contextLabel = contextType === 'team'
        ? 'Pasos Equipo'
        : contextType === 'organization'
            ? 'Pasos Claustro'
            : 'Pasos Aula';
    const contextDescription = contextType === 'team'
        ? 'Este tablero quedará vinculado al equipo activo para coordinación, seguimiento y reuniones.'
        : contextType === 'organization'
            ? 'Este tablero quedará disponible en el espacio organizativo actual para trabajo de centro.'
            : 'Este tablero se creará en tu espacio personal para aula, rutina o intervención individual.';
    const ContextIcon = contextType === 'team'
        ? Users
        : contextType === 'organization'
            ? Building2
            : Layers3;

    const handleConfirm = () => {
        const nextTitle = title.trim();
        if (!nextTitle) {
            return;
        }

        onConfirm({
            title: nextTitle,
            contextType,
            boardType,
            organizationId: isProUser ? currentOrganizationId : null,
            teamId: isProUser ? currentTeamId : null,
        });
    };

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-board-dialog-title"
                className="glass-panel w-full max-w-3xl rounded-3xl p-6 sm:p-8"
            >
                <div className="flex flex-col gap-4 border-b border-line/50 pb-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-sub">{contextLabel}</p>
                        <h2 id="create-board-dialog-title" className="mt-1 text-2xl font-black text-ink">Crear tablero contextual</h2>
                        <p className="mt-2 max-w-2xl text-sm text-sub">{contextDescription}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="self-start rounded-xl px-4 py-2 text-sm font-medium text-sub transition-colors hover:text-ink"
                    >
                        Cerrar
                    </button>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                    <section className="rounded-2xl border border-lme-border bg-black/20 p-5">
                        <label htmlFor="create-board-title" className="mb-2 block text-xs font-semibold uppercase text-sub">
                            Nombre del tablero
                        </label>
                        <input
                            id="create-board-title"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') handleConfirm();
                                if (event.key === 'Escape') onClose();
                            }}
                            className="w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none"
                            placeholder={contextType === 'team' ? 'Ej. Seguimiento semanal del equipo' : 'Ej. Plan de lectura trimestral'}
                            autoFocus
                        />

                        <label htmlFor="create-board-type" className="mt-5 mb-2 block text-xs font-semibold uppercase text-sub">
                            Tipo de tablero
                        </label>
                        <select
                            id="create-board-type"
                            value={boardType}
                            onChange={(event) => setBoardTypeOverride(event.target.value as SupportedBoardType)}
                            className="w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none"
                        >
                            {boardTypeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>

                        <div className="mt-5 rounded-2xl border border-line/60 bg-lme-surface/40 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                                <ContextIcon className="h-4 w-4 text-sky" />
                                Espacio de trabajo
                            </div>
                            <p className="mt-2 text-sm text-sub">
                                {contextType === 'team'
                                    ? 'Equipo activo'
                                    : contextType === 'organization'
                                        ? 'Organización activa'
                                        : 'Espacio personal'}
                            </p>
                            {isProUser && (
                                <div className="mt-3 flex flex-wrap gap-2 text-xs text-sub">
                                    <span className="rounded-full bg-white/5 px-3 py-1">
                                        Contexto: {contextType}
                                    </span>
                                    {currentOrganizationId && (
                                        <span className="rounded-full bg-white/5 px-3 py-1">
                                            Organización enlazada
                                        </span>
                                    )}
                                    {currentTeamId && (
                                        <span className="rounded-full bg-white/5 px-3 py-1">
                                            Equipo enlazado
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-lme-border bg-black/20 p-5">
                        <div className="flex items-center gap-2 text-ink">
                            <Layers3 className="h-4 w-4 text-mint" />
                            <h3 className="text-base font-bold">Estructura inicial</h3>
                        </div>
                        <p className="mt-2 text-sm text-sub">
                            Este tablero arrancará con una estructura pensada para el tipo de trabajo seleccionado.
                        </p>
                        <div className="mt-4 grid gap-3">
                            {previewColumns.map((column) => (
                                <div key={`${boardType}-${column.order}`} className="rounded-2xl border border-lme-border bg-lme-surface/40 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-sub">Columna {column.order + 1}</p>
                                    <p className="mt-1 text-sm font-semibold text-ink">{column.title}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-4 py-2 text-sm font-medium text-sub transition-colors hover:text-ink"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!title.trim()}
                        className="rounded-xl bg-sky px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-sky/80 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Crear tablero
                    </button>
                </div>
            </div>
        </div>
    );
}
