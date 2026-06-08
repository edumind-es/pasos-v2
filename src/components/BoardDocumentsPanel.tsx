import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, FolderOpen, LoaderCircle, Plus, Save, Trash2, X } from 'lucide-react';
import type { Board } from '../store/boardStore';
import {
    createBoardDocument,
    deleteBoardDocument,
    getApiErrorMessage,
    listBoardDocumentVersions,
    listBoardDocuments,
    syncRemoteBoard,
    updateBoardDocument,
    type ProBoardDocumentResponse,
    type ProBoardDocumentVersionResponse,
} from '../services/pasosApi';
import {
    type DocumentDraft,
    type DocumentKind,
    type DocumentStatus,
    DOCUMENT_KIND_OPTIONS,
    DOCUMENT_STATUS_OPTIONS,
    createEmptyDraft,
    kindIcon,
    kindLabel,
    mapDocumentToDraft,
    parseTags,
    renderDocumentPreview,
    statusLabel,
} from '../utils/documentHelpers';

export function BoardDocumentsPanel({
    board,
    isProUser,
    readOnly = false,
    onClose,
}: {
    board: Board | null;
    isProUser: boolean;
    readOnly?: boolean;
    onClose: () => void;
}) {
    const [documents, setDocuments] = useState<ProBoardDocumentResponse[]>([]);
    const [versions, setVersions] = useState<ProBoardDocumentVersionResponse[]>([]);
    const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
    const [draft, setDraft] = useState<DocumentDraft>(createEmptyDraft());
    const [loading, setLoading] = useState(true);
    const [versionsLoading, setVersionsLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const selectedDocumentIdRef = useRef<string | null>(null);

    const selectDocument = (document: ProBoardDocumentResponse | null) => {
        selectedDocumentIdRef.current = document?.id ?? null;
        setSelectedDocumentId(document?.id ?? null);
        setDraft(document ? mapDocumentToDraft(document) : createEmptyDraft());
    };

    useEffect(() => {
        let cancelled = false;

        async function load() {
            if (!board || !isProUser) {
                setDocuments([]);
                setVersions([]);
                selectDocument(null);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                if (!readOnly) {
                    await syncRemoteBoard(board);
                }
                const payload = await listBoardDocuments(board.id);
                if (cancelled) {
                    return;
                }
                setDocuments(payload);
                setError(null);
                if (payload.length > 0) {
                    const preserved = payload.find((item) => item.id === selectedDocumentIdRef.current) ?? payload[0];
                    selectDocument(preserved);
                } else {
                    selectDocument(null);
                }
            } catch (issue) {
                if (!cancelled) {
                    setError(getApiErrorMessage(issue, 'No se pudo cargar el panel de documentos.'));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void load();

        return () => {
            cancelled = true;
        };
    }, [board, isProUser, readOnly]);

    useEffect(() => {
        let cancelled = false;

        async function loadVersions() {
            if (!board || !selectedDocumentId || !isProUser) {
                setVersions([]);
                setVersionsLoading(false);
                return;
            }
            setVersionsLoading(true);
            try {
                const payload = await listBoardDocumentVersions(board.id, selectedDocumentId);
                if (!cancelled) {
                    setVersions(payload);
                }
            } catch (issue) {
                if (!cancelled) {
                    setError(getApiErrorMessage(issue, 'No se pudo cargar el historial del documento.'));
                }
            } finally {
                if (!cancelled) {
                    setVersionsLoading(false);
                }
            }
        }

        void loadVersions();

        return () => {
            cancelled = true;
        };
    }, [board, isProUser, selectedDocumentId]);

    const selectedDocument = documents.find((item) => item.id === selectedDocumentId) ?? null;

    const persistDocument = async () => {
        if (!board) return;
        setSaving(true);
        try {
            const payload = {
                title: draft.title.trim(),
                kind: draft.kind,
                status: draft.status,
                description: draft.description.trim() || undefined,
                url: draft.url.trim() || undefined,
                content: draft.content.trim() || undefined,
                linkedTaskIds: draft.linkedTaskIds,
                tags: parseTags(draft.tagsText),
            };
            if (!payload.title) {
                setError('El documento necesita un titulo.');
                setSaving(false);
                return;
            }
            const saved = selectedDocument
                ? await updateBoardDocument(board.id, selectedDocument.id, payload)
                : await createBoardDocument(board.id, payload);
            const refreshed = await listBoardDocuments(board.id);
            setDocuments(refreshed);
            const nextSelected = refreshed.find((item) => item.id === saved.id) ?? saved;
            selectDocument(nextSelected);
            setError(null);
        } catch (issue) {
            setError(getApiErrorMessage(issue, 'No se pudo guardar el documento.'));
        } finally {
            setSaving(false);
        }
    };

    const removeDocument = async () => {
        if (!board || !selectedDocument) return;
        setDeleting(true);
        try {
            await deleteBoardDocument(board.id, selectedDocument.id);
            const refreshed = await listBoardDocuments(board.id);
            setDocuments(refreshed);
            if (refreshed.length > 0) {
                selectDocument(refreshed[0]);
            } else {
                selectDocument(null);
                setVersions([]);
            }
            setError(null);
        } catch (issue) {
            setError(getApiErrorMessage(issue, 'No se pudo eliminar el documento.'));
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm">
            <div className="glass-panel flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl">
                <header className="flex flex-col gap-4 border-b border-line/60 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-sub">Documentos del tablero</p>
                        <h2 className="mt-1 text-2xl font-black text-ink">Panel de documentos</h2>
                        <p className="mt-2 text-sm text-sub">
                            Recurso centralizado para el tablero <span className="font-semibold text-ink">{board?.title ?? 'sin tablero'}</span>.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center gap-2 self-start rounded-full border border-line px-4 py-2 text-sm font-medium text-sub transition-colors hover:bg-white/5 hover:text-ink"
                    >
                        <X className="h-4 w-4" />
                        Cerrar
                    </button>
                </header>

                {!isProUser ? (
                    <div className="p-6">
                        <div className="rounded-3xl border border-sky/20 bg-sky/10 p-5 text-sm text-sky">
                            El panel de documentos, el historial de versiones y la agenda conectada estan disponibles en modo Pro.
                        </div>
                    </div>
                ) : (
                    <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[20rem_minmax(0,1fr)_18rem]">
                        <aside className="flex min-h-0 flex-col border-b border-line/60 p-4 lg:border-b-0 lg:border-r">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-sub">Biblioteca</p>
                                    <p className="text-sm text-sub">{documents.length} documento(s)</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        selectDocument(null);
                                        setVersions([]);
                                    }}
                                    disabled={readOnly}
                                    className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-3 py-2 text-xs font-bold text-mint transition-colors hover:bg-mint/20 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Plus className="h-4 w-4" />
                                    Nuevo
                                </button>
                            </div>

                            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                                {loading ? (
                                    <div className="flex items-center gap-2 rounded-2xl border border-line bg-black/20 p-4 text-sm text-sub">
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                        Cargando documentos...
                                    </div>
                                ) : documents.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-line bg-black/20 p-4 text-sm text-sub">
                                        Todavia no hay documentos para este tablero.
                                    </div>
                                ) : (
                                    documents.map((document) => {
                                        const Icon = kindIcon(document.kind);
                                        const isSelected = document.id === selectedDocumentId;
                                        return (
                                            <button
                                                key={document.id}
                                                type="button"
                                                onClick={() => {
                                                    selectDocument(document);
                                                    setError(null);
                                                }}
                                                className={`w-full rounded-2xl border p-4 text-left transition-colors ${isSelected
                                                    ? 'border-sky/40 bg-sky/10'
                                                    : 'border-line bg-black/20 hover:bg-white/5'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="rounded-2xl bg-black/20 p-2">
                                                        <Icon className="h-4 w-4 text-sky" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-bold text-ink">{document.title}</p>
                                                        <p className="mt-1 text-xs text-sub">
                                                            {kindLabel(document.kind)} · {statusLabel(document.status)}
                                                        </p>
                                                        <p className="mt-2 text-[11px] text-sub">
                                                            v{document.current_version} · {new Date(document.updated_at).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </aside>

                        <section className="min-h-0 overflow-y-auto border-b border-line/60 p-6 lg:border-b-0">
                            {error && (
                                <div className="mb-4 rounded-2xl border border-lme-danger/30 bg-lme-danger/10 p-4 text-sm text-lme-danger/70">
                                    {error}
                                </div>
                            )}

                            {readOnly && (
                                <div className="mb-4 rounded-2xl border border-lme-warning/30 bg-lme-warning/10 p-4 text-sm text-lme-warning/85">
                                    Este tablero esta en solo lectura. Puedes consultar documentos y versiones, pero no editarlos.
                                </div>
                            )}

                            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
                                <div className="space-y-5">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <label className="space-y-2 text-sm">
                                            <span className="font-semibold text-ink">Titulo</span>
                                            <input
                                                value={draft.title}
                                                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                                                disabled={readOnly}
                                                className="w-full rounded-2xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none disabled:opacity-60"
                                            />
                                        </label>
                                        <label className="space-y-2 text-sm">
                                            <span className="font-semibold text-ink">Estado</span>
                                            <select
                                                value={draft.status}
                                                onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as DocumentStatus }))}
                                                disabled={readOnly}
                                                className="w-full rounded-2xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none disabled:opacity-60"
                                            >
                                                {DOCUMENT_STATUS_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <label className="space-y-2 text-sm">
                                            <span className="font-semibold text-ink">Tipo</span>
                                            <select
                                                value={draft.kind}
                                                onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value as DocumentKind }))}
                                                disabled={readOnly}
                                                className="w-full rounded-2xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none disabled:opacity-60"
                                            >
                                                {DOCUMENT_KIND_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="space-y-2 text-sm">
                                            <span className="font-semibold text-ink">Etiquetas</span>
                                            <input
                                                value={draft.tagsText}
                                                onChange={(event) => setDraft((current) => ({ ...current, tagsText: event.target.value }))}
                                                disabled={readOnly}
                                                placeholder="guia, equipo, lectura"
                                                className="w-full rounded-2xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none disabled:opacity-60"
                                            />
                                        </label>
                                    </div>

                                    <label className="space-y-2 text-sm">
                                        <span className="font-semibold text-ink">Descripcion</span>
                                        <textarea
                                            value={draft.description}
                                            onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                                            disabled={readOnly}
                                            rows={3}
                                            className="w-full rounded-2xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none disabled:opacity-60"
                                        />
                                    </label>

                                    <label className="space-y-2 text-sm">
                                        <span className="font-semibold text-ink">URL del recurso</span>
                                        <input
                                            value={draft.url}
                                            onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
                                            disabled={readOnly}
                                            placeholder="https://..."
                                            className="w-full rounded-2xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none disabled:opacity-60"
                                        />
                                    </label>

                                    <label className="space-y-2 text-sm">
                                        <span className="font-semibold text-ink">Contenido o notas</span>
                                        <textarea
                                            value={draft.content}
                                            onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
                                            disabled={readOnly}
                                            rows={6}
                                            className="w-full rounded-2xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none disabled:opacity-60"
                                        />
                                    </label>

                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-sm font-semibold text-ink">Tareas vinculadas</p>
                                            <p className="text-xs text-sub">Conecta este documento con los pasos del tablero para centralizar materiales.</p>
                                        </div>
                                        <div className="grid gap-2 md:grid-cols-2">
                                            {board?.tasks.map((task) => {
                                                const checked = draft.linkedTaskIds.includes(task.id);
                                                return (
                                                    <label key={task.id} className="flex items-start gap-3 rounded-2xl border border-line bg-black/20 px-3 py-3 text-sm text-ink">
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            disabled={readOnly}
                                                            onChange={() => setDraft((current) => ({
                                                                ...current,
                                                                linkedTaskIds: checked
                                                                    ? current.linkedTaskIds.filter((item) => item !== task.id)
                                                                    : [...current.linkedTaskIds, task.id],
                                                            }))}
                                                            className="mt-1"
                                                        />
                                                        <span>
                                                            <span className="block font-semibold">{task.title}</span>
                                                            {task.description && <span className="block text-xs text-sub">{task.description}</span>}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => void persistDocument()}
                                            disabled={saving || readOnly}
                                            className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-4 py-2 text-sm font-bold text-mint transition-colors hover:bg-mint/20 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                            {selectedDocument ? 'Guardar cambios' : 'Crear documento'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void removeDocument()}
                                            disabled={!selectedDocument || deleting || readOnly}
                                            className="inline-flex items-center gap-2 rounded-full border border-lme-danger/30 bg-lme-danger/10 px-4 py-2 text-sm font-bold text-lme-danger/70 transition-colors hover:bg-lme-danger/20 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {deleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            Eliminar
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="rounded-3xl border border-line bg-black/20 p-4">
                                        <p className="text-sm font-bold text-ink">Vista previa</p>
                                        <div className="mt-4">{renderDocumentPreview(draft)}</div>
                                    </div>

                                    <div className="rounded-3xl border border-line bg-black/20 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-ink">Resumen</p>
                                                <p className="text-xs text-sub">
                                                    {kindLabel(draft.kind)} · {statusLabel(draft.status)}
                                                </p>
                                            </div>
                                            {selectedDocument && (
                                                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-ink">
                                                    v{selectedDocument.current_version}
                                                </span>
                                            )}
                                        </div>
                                        {draft.url.trim() && (
                                            <a
                                                href={draft.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-sky hover:text-sky/80"
                                            >
                                                Abrir recurso
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <aside className="min-h-0 overflow-y-auto p-4">
                            <div className="rounded-3xl border border-line bg-black/20 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-bold text-ink">Historial</p>
                                        <p className="text-xs text-sub">Versiones guardadas del documento.</p>
                                    </div>
                                    {versionsLoading && <LoaderCircle className="h-4 w-4 animate-spin text-sub" />}
                                </div>
                                <div className="mt-4 space-y-3">
                                    {!selectedDocument ? (
                                        <div className="rounded-2xl border border-dashed border-line p-4 text-sm text-sub">
                                            Crea o selecciona un documento para ver su historial.
                                        </div>
                                    ) : versions.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-line p-4 text-sm text-sub">
                                            Aun no hay versiones registradas.
                                        </div>
                                    ) : (
                                        versions.map((version) => (
                                            <div key={version.id} className="rounded-2xl border border-line bg-black/10 p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-bold text-ink">Version {version.version_number}</p>
                                                        <p className="mt-1 text-xs text-sub">
                                                            {statusLabel(version.status)} · {kindLabel(version.kind)}
                                                        </p>
                                                    </div>
                                                    {version.version_number === selectedDocument.current_version && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-mint/10 px-2 py-1 text-[11px] font-semibold text-mint">
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                            Actual
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-3 text-xs text-sub">
                                                    {new Date(version.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 rounded-3xl border border-line bg-black/20 p-4">
                                <p className="text-sm font-bold text-ink">Trazabilidad pedagógica</p>
                                <p className="mt-2 text-sm text-sub">
                                    Usa este panel para centralizar guias, actas, enlaces y materiales por tablero, vinculados a tareas concretas y con versionado ligero.
                                </p>
                                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-xs font-semibold text-ink">
                                    <FolderOpen className="h-4 w-4 text-sky" />
                                    Documentos listos para trabajo en equipo
                                </div>
                            </div>
                        </aside>
                    </div>
                )}
            </div>
        </div>
    );
}
