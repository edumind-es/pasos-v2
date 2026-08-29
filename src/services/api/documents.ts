/*
 * Documentos de tablero y su historial de versiones.
 */
import { requestJson } from './http';
import type { ProBoardDocumentResponse, ProBoardDocumentVersionResponse } from './types';

export async function listBoardDocuments(boardId: string): Promise<ProBoardDocumentResponse[]> {
    return requestJson<ProBoardDocumentResponse[]>(`/boards/${encodeURIComponent(boardId)}/documents`, {
        method: 'GET',
    });
}

export async function createBoardDocument(
    boardId: string,
    payload: {
        title: string;
        kind?: 'note' | 'link' | 'file' | 'image' | 'audio' | 'video' | 'embed';
        status?: 'draft' | 'in_review' | 'approved' | 'published';
        description?: string;
        url?: string;
        content?: string;
        linkedTaskIds?: string[];
        tags?: string[];
    },
): Promise<ProBoardDocumentResponse> {
    return requestJson<ProBoardDocumentResponse>(`/boards/${encodeURIComponent(boardId)}/documents`, {
        method: 'POST',
        body: JSON.stringify({
            title: payload.title,
            kind: payload.kind ?? 'note',
            status: payload.status ?? 'draft',
            description: payload.description,
            url: payload.url,
            content: payload.content,
            linked_task_ids: payload.linkedTaskIds ?? [],
            tags: payload.tags ?? [],
        }),
    });
}

export async function updateBoardDocument(
    boardId: string,
    documentId: string,
    payload: {
        title: string;
        kind: 'note' | 'link' | 'file' | 'image' | 'audio' | 'video' | 'embed';
        status: 'draft' | 'in_review' | 'approved' | 'published';
        description?: string;
        url?: string;
        content?: string;
        linkedTaskIds?: string[];
        tags?: string[];
    },
): Promise<ProBoardDocumentResponse> {
    return requestJson<ProBoardDocumentResponse>(
        `/boards/${encodeURIComponent(boardId)}/documents/${encodeURIComponent(documentId)}`,
        {
            method: 'PUT',
            body: JSON.stringify({
                title: payload.title,
                kind: payload.kind,
                status: payload.status,
                description: payload.description,
                url: payload.url,
                content: payload.content,
                linked_task_ids: payload.linkedTaskIds ?? [],
                tags: payload.tags ?? [],
            }),
        },
    );
}

export async function deleteBoardDocument(boardId: string, documentId: string): Promise<void> {
    return requestJson<void>(`/boards/${encodeURIComponent(boardId)}/documents/${encodeURIComponent(documentId)}`, {
        method: 'DELETE',
    });
}

export async function listBoardDocumentVersions(boardId: string, documentId: string): Promise<ProBoardDocumentVersionResponse[]> {
    return requestJson<ProBoardDocumentVersionResponse[]>(
        `/boards/${encodeURIComponent(boardId)}/documents/${encodeURIComponent(documentId)}/versions`,
        {
            method: 'GET',
        },
    );
}
