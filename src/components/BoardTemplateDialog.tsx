import { useMemo, useState } from 'react';
import { CopyPlus, Layers3, Save } from 'lucide-react';
import { useStore, type Board, type BoardTemplateCategory } from '../store/boardStore';
import { BUILT_IN_BOARD_TEMPLATES } from '../utils/boardTemplates';
import { logAppEvent } from '../services/appTelemetry';

interface BoardTemplateDialogProps {
    currentBoard: Board | null;
    onClose: () => void;
}

const CATEGORY_LABELS: Record<BoardTemplateCategory, string> = {
    routine: 'Rutina',
    classroom: 'Aula',
    therapy: 'Terapia',
    custom: 'Personalizada',
};

export function BoardTemplateDialog({ currentBoard, onClose }: BoardTemplateDialogProps) {
    const {
        currentUser,
        boardTemplates,
        createBoardFromTemplate,
        duplicateBoard,
        saveBoardAsTemplate,
        deleteBoardTemplate,
    } = useStore();
    const [templateTitle, setTemplateTitle] = useState(currentBoard ? `${currentBoard.title} · plantilla` : '');
    const [templateDescription, setTemplateDescription] = useState('');
    const [templateCategory, setTemplateCategory] = useState<BoardTemplateCategory>('custom');

    const allTemplates = useMemo(() => ([
        ...BUILT_IN_BOARD_TEMPLATES,
        ...boardTemplates,
    ]), [boardTemplates]);

    const handleCreateFromTemplate = (
        template: typeof allTemplates[number],
        source: 'builtin' | 'custom',
    ) => {
        createBoardFromTemplate(template, { ownerId: currentUser?.id });
        logAppEvent({
            type: source === 'builtin' ? 'board_created_from_builtin_template' : 'board_created_from_custom_template',
            level: 'info',
            message: source === 'builtin'
                ? 'Se creó un tablero desde la biblioteca pedagógica.'
                : 'Se creó un tablero desde una plantilla personalizada.',
            metadata: { template_title: template.title, category: template.category },
        });
        onClose();
    };

    const handleDuplicateBoard = () => {
        if (!currentBoard) return;
        duplicateBoard(currentBoard.id, `${currentBoard.title} (copia)`, currentUser?.id);
        logAppEvent({
            type: 'board_duplicated',
            level: 'info',
            message: 'Se duplicó el tablero activo para reutilización pedagógica.',
            metadata: { board_title: currentBoard.title },
        });
        onClose();
    };

    const handleSaveCurrentBoardAsTemplate = () => {
        if (!currentBoard) return;
        const normalizedTitle = templateTitle.trim();
        if (!normalizedTitle) return;
        saveBoardAsTemplate(currentBoard.id, {
            title: normalizedTitle,
            description: templateDescription.trim() || undefined,
            category: templateCategory,
        });
        logAppEvent({
            type: 'board_saved_as_template',
            level: 'info',
            message: 'El tablero actual se guardó como plantilla reutilizable.',
            metadata: { template_title: normalizedTitle, category: templateCategory },
        });
        setTemplateDescription('');
        setTemplateCategory('custom');
        setTemplateTitle(`${currentBoard.title} · plantilla`);
    };

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="board-template-dialog-title"
                className="glass-panel w-full max-w-6xl rounded-3xl p-6 sm:p-8"
            >
                <div className="flex flex-col gap-4 border-b border-line/50 pb-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-sub">Biblioteca pedagógica</p>
                        <h2 id="board-template-dialog-title" className="mt-1 text-2xl font-black text-ink">Plantillas y reutilización</h2>
                        <p className="mt-2 max-w-2xl text-sm text-sub">
                            Duplica tableros, guarda secuencias como plantilla y crea nuevas intervenciones desde una biblioteca lista para aula, rutina o terapia.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="self-start rounded-xl px-4 py-2 text-sm font-medium text-sub transition-colors hover:text-ink"
                    >
                        Cerrar
                    </button>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_1fr]">
                    <section className="rounded-2xl border border-lme-border bg-black/20 p-5">
                        <div className="flex items-center gap-2 text-ink">
                            <Layers3 className="h-4 w-4 text-sky" />
                            <h3 className="text-base font-bold">Biblioteca de plantillas</h3>
                        </div>
                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                            {allTemplates.map(template => {
                                const isBuiltIn = BUILT_IN_BOARD_TEMPLATES.some(item => item.id === template.id);
                                const resourceCount = template.tasks.filter(task => (task.attachments?.length ?? 0) > 0).length;
                                return (
                                    <article key={template.id} className="rounded-2xl border border-lme-border bg-lme-surface/40 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold uppercase tracking-wide text-sub">
                                                    {CATEGORY_LABELS[template.category]}
                                                </p>
                                                <h4 className="mt-1 truncate text-lg font-bold text-ink">{template.title}</h4>
                                            </div>
                                            <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${isBuiltIn ? 'bg-sky/10 text-sky' : 'bg-mint/10 text-mint'}`}>
                                                {isBuiltIn ? 'Base' : 'Tuya'}
                                            </span>
                                        </div>
                                        <p className="mt-2 min-h-[2.75rem] text-sm text-sub">
                                            {template.description || 'Plantilla reutilizable sin descripción adicional.'}
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-sub">
                                            <span className="rounded-full bg-white/5 px-2 py-1">{template.columns.length} columnas</span>
                                            <span className="rounded-full bg-white/5 px-2 py-1">{template.tasks.length} tareas</span>
                                            <span className="rounded-full bg-white/5 px-2 py-1">{resourceCount} con recursos</span>
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleCreateFromTemplate(template, isBuiltIn ? 'builtin' : 'custom')}
                                                className="rounded-xl bg-sky px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-sky/80"
                                            >
                                                Crear tablero
                                            </button>
                                            {!isBuiltIn && (
                                                <button
                                                    type="button"
                                                    onClick={() => deleteBoardTemplate(template.id)}
                                                    className="rounded-xl border border-lme-danger/30 px-3 py-2 text-sm font-medium text-lme-danger/80 transition-colors hover:bg-lme-danger/10"
                                                >
                                                    Eliminar
                                                </button>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="rounded-2xl border border-lme-border bg-black/20 p-5">
                            <div className="flex items-center gap-2 text-ink">
                                <CopyPlus className="h-4 w-4 text-mint" />
                                <h3 className="text-base font-bold">Reutilización inmediata</h3>
                            </div>
                            <p className="mt-2 text-sm text-sub">
                                Duplica el tablero actual para otro grupo, turno o intervención manteniendo su estructura pedagógica.
                            </p>
                            <button
                                type="button"
                                onClick={handleDuplicateBoard}
                                disabled={!currentBoard}
                                className="mt-4 w-full rounded-xl bg-mint px-4 py-3 text-sm font-bold text-bg0 transition-colors hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Duplicar tablero activo
                            </button>
                        </div>

                        <div className="rounded-2xl border border-lme-border bg-black/20 p-5">
                            <div className="flex items-center gap-2 text-ink">
                                <Save className="h-4 w-4 text-sky" />
                                <h3 className="text-base font-bold">Guardar como plantilla</h3>
                            </div>
                            <p className="mt-2 text-sm text-sub">
                                Convierte el tablero actual en una plantilla reutilizable con recursos, temporizadores y secuencia didáctica.
                            </p>

                            <div className="mt-4 space-y-3">
                                <div>
                                    <label htmlFor="template-title" className="mb-2 block text-xs font-semibold uppercase text-sub">Nombre de plantilla</label>
                                    <input
                                        id="template-title"
                                        value={templateTitle}
                                        onChange={(event) => setTemplateTitle(event.target.value)}
                                        className="w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none"
                                        placeholder="Ej. Rutina de aula estructurada"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="template-description" className="mb-2 block text-xs font-semibold uppercase text-sub">Descripción</label>
                                    <textarea
                                        id="template-description"
                                        value={templateDescription}
                                        onChange={(event) => setTemplateDescription(event.target.value)}
                                        className="min-h-[92px] w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none"
                                        placeholder="Qué objetivo pedagógico resuelve esta plantilla y en qué contexto la reutilizas."
                                    />
                                </div>
                                <div>
                                    <label htmlFor="template-category" className="mb-2 block text-xs font-semibold uppercase text-sub">Categoría</label>
                                    <select
                                        id="template-category"
                                        value={templateCategory}
                                        onChange={(event) => setTemplateCategory(event.target.value as BoardTemplateCategory)}
                                        className="w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none"
                                    >
                                        <option value="custom">Personalizada</option>
                                        <option value="routine">Rutina</option>
                                        <option value="classroom">Aula</option>
                                        <option value="therapy">Terapia</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleSaveCurrentBoardAsTemplate}
                                disabled={!currentBoard || !templateTitle.trim()}
                                className="mt-4 w-full rounded-xl border border-sky/30 bg-sky/10 px-4 py-3 text-sm font-bold text-sky transition-colors hover:bg-sky/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Guardar plantilla personalizada
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
