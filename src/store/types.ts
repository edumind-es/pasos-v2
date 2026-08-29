/*
 * Modelo de dominio de Pasos: usuarios, tableros, tareas, plantillas
 * y preferencias de paneles del workspace.
 */

export type UserRole = 'teacher' | 'student';
export type VisualMode = 'eink' | 'edumind';
export type AccessMode = 'express' | 'identified' | 'pro';
export type BoardContextType = 'personal' | 'organization' | 'team';
export type PedagogicalStatus = 'not_started' | 'in_progress' | 'needs_help' | 'ready_for_review' | 'validated';
export type WorkspacePanelKey =
    | 'workspace_context'
    | 'classroom_quick_create'
    | 'teacher_summary'
    | 'teacher_share_sync'
    | 'teacher_recent_activity'
    | 'teacher_learners'
    | 'team_coordination'
    | 'team_meeting'
    | 'team_activity';

export interface WorkspacePanelPreference {
    visible: boolean;
    expanded: boolean;
}

export interface User {
    id: string;
    username: string;
    role: UserRole;
    mode?: AccessMode;
    email?: string;
    workspaceCode?: string;
}

export interface Attachment {
    id: string;
    kind: 'link' | 'image' | 'video' | 'file';
    url: string;
    title?: string;
}

export interface Pictogram {
    id: number;
    url: string;
    title: string;
}

export interface Task {
    id: string;
    columnId: string;
    title: string;
    description?: string;
    labels: string[];
    color?: string;
    icon?: string; // Icono principal
    taskType?: 'task' | 'learning_step' | 'evidence' | 'agreement' | 'document' | 'resource' | 'incident' | 'milestone';
    pictograms?: Pictogram[]; // Secuencia
    attachments?: Attachment[];
    durationSeconds?: number;
    objective?: string;
    supportText?: string;
    expectedEvidence?: string;
    nextStep?: string;
    pedagogicalStatus?: PedagogicalStatus;
    startDate?: string;
    dueDate?: string;
    dependencyTaskIds?: string[];
    ownerLabel?: string;
    effortPoints?: number;
    createdAt: number;
}

export interface Column {
    id: string;
    title: string;
    order: number;
}

export interface Board {
    id: string;
    title: string;
    ownerId: string; // ID del usuario creador (docente)
    organizationId?: string;
    teamId?: string;
    contextType?: BoardContextType;
    boardType?: string;
    remoteRole?: 'owner' | 'editor' | 'viewer';
    assignedTo?: string[]; // IDs de usuario (alumnado/equipos)
    columns: Column[];
    tasks: Task[];
    createdAt: number;
}

export type BoardTemplateCategory = 'routine' | 'classroom' | 'therapy' | 'custom';

export interface BoardTemplate {
    id: string;
    title: string;
    description?: string;
    category: BoardTemplateCategory;
    columns: Column[];
    tasks: Task[];
    createdAt: number;
    updatedAt: number;
    sourceBoardId?: string;
}

export interface DeletedTaskEntry {
    task: Task;
    boardId: string;
    deletedAt: number;
}

export type ProSyncState = 'idle' | 'syncing' | 'error';

export const DEFAULT_WORKSPACE_PANEL_PREFERENCES: Record<WorkspacePanelKey, WorkspacePanelPreference> = {
    workspace_context: { visible: true, expanded: false },
    classroom_quick_create: { visible: true, expanded: true },
    teacher_summary: { visible: true, expanded: true },
    teacher_share_sync: { visible: false, expanded: false },
    teacher_recent_activity: { visible: false, expanded: false },
    teacher_learners: { visible: true, expanded: true },
    team_coordination: { visible: true, expanded: false },
    team_meeting: { visible: true, expanded: false },
    team_activity: { visible: true, expanded: false },
};

export function normalizeWorkspacePanelPreferences(
    preferences?: Partial<Record<WorkspacePanelKey, Partial<WorkspacePanelPreference>>>,
): Record<WorkspacePanelKey, WorkspacePanelPreference> {
    const normalized = { ...DEFAULT_WORKSPACE_PANEL_PREFERENCES };

    if (!preferences) {
        return normalized;
    }

    for (const key of Object.keys(DEFAULT_WORKSPACE_PANEL_PREFERENCES) as WorkspacePanelKey[]) {
        normalized[key] = {
            visible: preferences[key]?.visible ?? DEFAULT_WORKSPACE_PANEL_PREFERENCES[key].visible,
            expanded: preferences[key]?.expanded ?? DEFAULT_WORKSPACE_PANEL_PREFERENCES[key].expanded,
        };
    }

    return normalized;
}
