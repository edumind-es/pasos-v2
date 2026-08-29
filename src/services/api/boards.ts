/*
 * Tableros Pro: sincronización, compartir con alumnado, seguimiento (insights),
 * asignaciones, comentarios y reuniones.
 */
import type { Board } from '../../store/boardStore';
import { PasosApiError, requestJson } from './http';
import type {
    ProBoardCommentResponse,
    ProBoardInsightsResponse,
    ProBoardLearnerInsightResponse,
    ProBoardMeetingResponse,
    ProBoardResponse,
    ProBoardSnapshot,
    ProLearningAssignmentResponse,
    ProShareResolveResponse,
    ProShareResponse,
    ShareActivityPayload,
    ShareActivityResponse,
} from './types';

export function mapRemoteBoardToLocalBoard(remoteBoard: ProBoardResponse, ownerId: string): Board {
    return {
        id: remoteBoard.id,
        title: remoteBoard.title,
        ownerId: remoteBoard.owner_id || ownerId,
        organizationId: remoteBoard.organization_id ?? undefined,
        teamId: remoteBoard.team_id ?? undefined,
        contextType: remoteBoard.context_type ?? 'personal',
        boardType: remoteBoard.board_type ?? undefined,
        remoteRole: remoteBoard.role,
        columns: remoteBoard.snapshot.columns,
        tasks: remoteBoard.snapshot.tasks,
        createdAt: Date.parse(remoteBoard.created_at) || Date.now(),
    };
}

function toRemoteSnapshot(board: Board): ProBoardSnapshot {
    return {
        columns: board.columns.map(column => ({
            id: column.id,
            title: column.title,
            order: column.order,
        })),
        tasks: board.tasks.map(task => ({
            id: task.id,
            columnId: task.columnId,
            title: task.title,
            description: task.description,
            labels: task.labels,
            color: task.color,
            icon: task.icon,
            taskType: task.taskType,
            pictograms: task.pictograms ?? [],
            attachments: task.attachments ?? [],
            durationSeconds: task.durationSeconds,
            objective: task.objective,
            supportText: task.supportText,
            expectedEvidence: task.expectedEvidence,
            nextStep: task.nextStep,
            pedagogicalStatus: task.pedagogicalStatus,
            startDate: task.startDate,
            dueDate: task.dueDate,
            dependencyTaskIds: task.dependencyTaskIds ?? [],
            ownerLabel: task.ownerLabel,
            effortPoints: task.effortPoints,
            createdAt: task.createdAt,
        })),
    };
}

export async function listRemoteBoards(filters?: {
    organizationId?: string | null;
    teamId?: string | null;
}): Promise<ProBoardResponse[]> {
    const params = new URLSearchParams();
    if (filters?.organizationId) {
        params.set('organization_id', filters.organizationId);
    }
    if (filters?.teamId) {
        params.set('team_id', filters.teamId);
    }
    const query = params.toString();
    return requestJson<ProBoardResponse[]>(`/boards${query ? `?${query}` : ''}`);
}

export async function syncRemoteBoard(board: Board, options?: { preferCreate?: boolean }): Promise<ProBoardResponse> {
    const payload = {
        id: board.id,
        title: board.title,
        snapshot: toRemoteSnapshot(board),
        organization_id: board.organizationId,
        team_id: board.teamId,
        context_type: board.contextType,
        board_type: board.boardType,
    };

    const createRemoteBoard = () => requestJson<ProBoardResponse>('/boards', {
        method: 'POST',
        body: JSON.stringify(payload),
    });

    const updateRemoteBoard = () => requestJson<ProBoardResponse>(`/boards/${board.id}`, {
        method: 'PUT',
        body: JSON.stringify({
            title: board.title,
            snapshot: payload.snapshot,
            organization_id: board.organizationId,
            team_id: board.teamId,
            context_type: board.contextType,
            board_type: board.boardType,
        }),
    });

    try {
        return await updateRemoteBoard();
    } catch (error) {
        if (error instanceof PasosApiError) {
            if (error.status === 404) {
                return createRemoteBoard();
            }
            if (options?.preferCreate && error.status === 409) {
                return updateRemoteBoard();
            }
        }
        throw error;
    }
}

export async function createRemoteShare(boardId: string): Promise<ProShareResponse> {
    return requestJson<ProShareResponse>(`/boards/${boardId}/share`, {
        method: 'POST',
        body: JSON.stringify({
            permission: 'viewer',
            ttl_hours: 168,
            allow_anonymous: true,
        }),
    });
}

export async function resolveRemoteShare(code: string): Promise<ProShareResolveResponse> {
    return requestJson<ProShareResolveResponse>(`/share/${encodeURIComponent(code)}`, {
        method: 'GET',
    }, false);
}

export async function recordRemoteShareActivity(
    code: string,
    payload: ShareActivityPayload,
): Promise<ShareActivityResponse> {
    return requestJson<ShareActivityResponse>(`/share/${encodeURIComponent(code)}/activity`, {
        method: 'POST',
        body: JSON.stringify(payload),
    }, false);
}

export async function saveLearnerFeedback(
    boardId: string,
    payload: {
        shareCode: string;
        learnerKey: string;
        taskId: string;
        message: string;
        status?: 'comment' | 'needs_revision' | 'validated';
        resolveHelpRequest?: boolean;
    },
): Promise<ProBoardLearnerInsightResponse> {
    return requestJson<ProBoardLearnerInsightResponse>(`/boards/${encodeURIComponent(boardId)}/learner-feedback`, {
        method: 'POST',
        body: JSON.stringify({
            share_code: payload.shareCode,
            learner_key: payload.learnerKey,
            task_id: payload.taskId,
            message: payload.message,
            status: payload.status ?? 'comment',
            resolve_help_request: payload.resolveHelpRequest ?? true,
        }),
    });
}

export async function getBoardInsights(boardId: string): Promise<ProBoardInsightsResponse> {
    return requestJson<ProBoardInsightsResponse>(`/boards/${encodeURIComponent(boardId)}/insights`, {
        method: 'GET',
    });
}

export async function listBoardAssignments(boardId: string): Promise<ProLearningAssignmentResponse[]> {
    return requestJson<ProLearningAssignmentResponse[]>(`/boards/${encodeURIComponent(boardId)}/assignments`, {
        method: 'GET',
    });
}

export async function createBoardAssignment(
    boardId: string,
    payload: {
        targetType?: 'student' | 'group';
        targetLabel: string;
        targetKey?: string;
        dueDate?: string;
        notes?: string;
    },
): Promise<ProLearningAssignmentResponse> {
    return requestJson<ProLearningAssignmentResponse>(`/boards/${encodeURIComponent(boardId)}/assignments`, {
        method: 'POST',
        body: JSON.stringify({
            target_type: payload.targetType ?? 'student',
            target_label: payload.targetLabel,
            target_key: payload.targetKey,
            due_date: payload.dueDate,
            notes: payload.notes,
        }),
    });
}

export async function deleteBoardAssignment(boardId: string, assignmentId: string): Promise<void> {
    return requestJson<void>(`/boards/${encodeURIComponent(boardId)}/assignments/${encodeURIComponent(assignmentId)}`, {
        method: 'DELETE',
    });
}

export async function listTodayAssignments(): Promise<ProLearningAssignmentResponse[]> {
    return requestJson<ProLearningAssignmentResponse[]>('/assignments/today', {
        method: 'GET',
    });
}

export async function listBoardComments(boardId: string): Promise<ProBoardCommentResponse[]> {
    return requestJson<ProBoardCommentResponse[]>(`/boards/${encodeURIComponent(boardId)}/comments`, {
        method: 'GET',
    });
}

export async function createBoardComment(
    boardId: string,
    payload: { message: string },
): Promise<ProBoardCommentResponse> {
    return requestJson<ProBoardCommentResponse>(`/boards/${encodeURIComponent(boardId)}/comments`, {
        method: 'POST',
        body: JSON.stringify({ message: payload.message }),
    });
}

export async function listBoardMeetings(boardId: string): Promise<ProBoardMeetingResponse[]> {
    return requestJson<ProBoardMeetingResponse[]>(`/boards/${encodeURIComponent(boardId)}/meetings`, {
        method: 'GET',
    });
}

export async function createBoardMeeting(
    boardId: string,
    payload: {
        title: string;
        summary?: string;
        decisions?: string[];
        linkedTaskIds?: string[];
    },
): Promise<ProBoardMeetingResponse> {
    return requestJson<ProBoardMeetingResponse>(`/boards/${encodeURIComponent(boardId)}/meetings`, {
        method: 'POST',
        body: JSON.stringify({
            title: payload.title,
            summary: payload.summary,
            decisions: payload.decisions ?? [],
            linked_task_ids: payload.linkedTaskIds ?? [],
        }),
    });
}
