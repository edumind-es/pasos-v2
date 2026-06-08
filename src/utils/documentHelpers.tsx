/**
 * Helpers para el panel de documentos de tablero.
 * Separados del componente para facilitar testing y reutilización.
 */
import { ExternalLink, FileText, Image as ImageIcon, Link as LinkIcon, Volume2, Video } from 'lucide-react';

export type DocumentKind = 'note' | 'link' | 'file' | 'image' | 'audio' | 'video' | 'embed';
export type DocumentStatus = 'draft' | 'in_review' | 'approved' | 'published';

export interface DocumentDraft {
    title: string;
    kind: DocumentKind;
    status: DocumentStatus;
    description: string;
    url: string;
    content: string;
    linkedTaskIds: string[];
    tagsText: string;
}

export const DOCUMENT_KIND_OPTIONS: Array<{ value: DocumentKind; label: string }> = [
    { value: 'note', label: 'Nota' },
    { value: 'link', label: 'Enlace' },
    { value: 'file', label: 'Archivo' },
    { value: 'image', label: 'Imagen' },
    { value: 'audio', label: 'Audio' },
    { value: 'video', label: 'Video' },
    { value: 'embed', label: 'Embebido' },
];

export const DOCUMENT_STATUS_OPTIONS: Array<{ value: DocumentStatus; label: string }> = [
    { value: 'draft', label: 'Borrador' },
    { value: 'in_review', label: 'En revisión' },
    { value: 'approved', label: 'Aprobado' },
    { value: 'published', label: 'Publicado' },
];

export function createEmptyDraft(): DocumentDraft {
    return { title: '', kind: 'note', status: 'draft', description: '', url: '', content: '', linkedTaskIds: [], tagsText: '' };
}

export function mapDocumentToDraft(doc: { title: string; kind: DocumentKind; status: DocumentStatus; description?: string | null; url?: string | null; content?: string | null; linked_task_ids: string[]; tags: string[] }): DocumentDraft {
    return {
        title: doc.title,
        kind: doc.kind,
        status: doc.status,
        description: doc.description ?? '',
        url: doc.url ?? '',
        content: doc.content ?? '',
        linkedTaskIds: doc.linked_task_ids,
        tagsText: doc.tags.join(', '),
    };
}

export function parseTags(tagsText: string): string[] {
    return tagsText.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 30);
}

export function statusLabel(status: DocumentStatus): string {
    return DOCUMENT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export function kindLabel(kind: DocumentKind): string {
    return DOCUMENT_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? kind;
}

export function kindIcon(kind: DocumentKind) {
    switch (kind) {
        case 'image': return ImageIcon;
        case 'audio': return Volume2;
        case 'video': case 'embed': return Video;
        case 'link': return LinkIcon;
        default: return FileText;
    }
}

export function renderDocumentPreview(draft: DocumentDraft) {
    if (draft.kind === 'note') {
        return (
            <div className="rounded-2xl border border-line bg-black/20 p-4 text-sm text-sub whitespace-pre-wrap">
                {draft.content.trim() || 'La nota aparecerá aquí cuando añadas contenido.'}
            </div>
        );
    }
    if (!draft.url.trim()) {
        return (
            <div className="rounded-2xl border border-dashed border-line bg-black/20 p-4 text-sm text-sub">
                Añade una URL para ver la vista previa del recurso.
            </div>
        );
    }
    if (draft.kind === 'image') {
        return <img src={draft.url} alt={draft.title || 'Vista previa'} className="max-h-72 w-full rounded-2xl border border-line object-cover" />;
    }
    if (draft.kind === 'audio') {
        return <audio controls className="w-full rounded-2xl border border-line bg-black/20 p-3" src={draft.url} />;
    }
    if (draft.kind === 'video') {
        return <video controls className="max-h-72 w-full rounded-2xl border border-line bg-black/20" src={draft.url} />;
    }
    if (draft.kind === 'embed' || draft.kind === 'file') {
        return <iframe title={draft.title || 'Vista previa'} src={draft.url} className="h-72 w-full rounded-2xl border border-line bg-white" />;
    }
    return (
        <a href={draft.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-sky/30 bg-sky/10 px-4 py-3 text-sm font-semibold text-sky hover:bg-sky/20">
            Abrir recurso
            <ExternalLink className="h-4 w-4" />
        </a>
    );
}
