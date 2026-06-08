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

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { ThemeName } from '../utils/themes';
import { getDefaultBoardType, getDefaultColumnsForBoardType, isSupportedBoardType, type SupportedBoardType } from '../utils/boardPresets';

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

interface LoginOptions {
    mode?: AccessMode;
    email?: string;
    remoteId?: string;
    workspaceCode?: string;
}

interface CreateBoardOptions {
    organizationId?: string | null;
    teamId?: string | null;
    contextType?: BoardContextType;
    boardType?: SupportedBoardType | string;
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
    icon?: string; // Main icon
    taskType?: 'task' | 'learning_step' | 'evidence' | 'agreement' | 'document' | 'resource' | 'incident' | 'milestone';
    pictograms?: Pictogram[]; // Sequence
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
    ownerId: string; // User ID of the creator (teacher)
    organizationId?: string;
    teamId?: string;
    contextType?: BoardContextType;
    boardType?: string;
    remoteRole?: 'owner' | 'editor' | 'viewer';
    assignedTo?: string[]; // User IDs (students/teams)
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

function normalizeWorkspacePanelPreferences(
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

interface AppState {
    users: User[];
    boards: Board[];
    boardTemplates: BoardTemplate[];
    deletedTasks: DeletedTaskEntry[];
    currentUser: User | null;
    activeBoardId: string | null;
    currentTheme: ThemeName;
    visualMode: VisualMode;
    selectedTaskIds: string[];
    proSyncState: ProSyncState;
    lastProSyncAt: string | null;
    lastProSyncError: string | null;
    currentOrganizationId: string | null;
    currentTeamId: string | null;
    workspacePanelPreferences: Record<WorkspacePanelKey, WorkspacePanelPreference>;

    // Session
    login: (username: string, role: UserRole, options?: LoginOptions) => User | null;
    logout: () => void;

    // Theme
    setTheme: (theme: ThemeName) => void;
    setVisualMode: (mode: VisualMode) => void;
    setProSyncStatus: (status: ProSyncState, options?: { at?: string | null; error?: string | null }) => void;
    setCurrentOrganization: (organizationId: string | null) => void;
    setCurrentTeam: (teamId: string | null) => void;
    clearWorkspaceContext: () => void;
    setWorkspacePanelPreference: (panel: WorkspacePanelKey, updates: Partial<WorkspacePanelPreference>) => void;
    resetWorkspacePanelPreferences: () => void;

    // Board Management
    createBoard: (title: string, ownerId?: string, options?: CreateBoardOptions) => void;
    createBoardFromTemplate: (template: Pick<BoardTemplate, 'title' | 'columns' | 'tasks'>, options?: { title?: string; ownerId?: string } & CreateBoardOptions) => void;
    duplicateBoard: (boardId: string, title?: string, ownerId?: string) => void;
    deleteBoard: (boardId: string) => void;
    setActiveBoard: (boardId: string | null) => void;
    updateBoardTitle: (boardId: string, title: string) => void;
    mergeBoardsForOwner: (ownerId: string, boards: Board[]) => void;
    saveBoardAsTemplate: (boardId: string, template: { title: string; description?: string; category?: BoardTemplateCategory }) => void;
    deleteBoardTemplate: (templateId: string) => void;

    // Board Actions (operate on activeBoardId)
    addColumn: (title: string) => void;
    deleteColumn: (id: string) => void;
    updateColumn: (id: string, title: string) => void;

    addTask: (columnId: string, title: string) => void;
    updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => void;
    deleteTask: (id: string) => void;
    duplicateTask: (taskId: string) => void;
    moveTask: (taskId: string, newColumnId: string) => void;
    restoreLastDeletedTask: () => void;
    restoreDeletedTask: (taskId: string) => void;

    // Advanced
    importBoard: (board: Board) => void;

    // Selection
    toggleTaskSelection: (taskId: string) => void;
    setSelectedTaskIds: (taskIds: string[]) => void;
    clearTaskSelection: () => void;
}

function resolveBoardContext(options?: CreateBoardOptions): {
    organizationId?: string;
    teamId?: string;
    contextType: BoardContextType;
    boardType: SupportedBoardType;
} {
    const contextType = options?.teamId
        ? 'team'
        : options?.organizationId
            ? 'organization'
            : options?.contextType ?? 'personal';
    const boardType = isSupportedBoardType(options?.boardType)
        ? options.boardType
        : getDefaultBoardType(contextType);

    return {
        organizationId: options?.organizationId ?? undefined,
        teamId: options?.teamId ?? undefined,
        contextType,
        boardType,
    };
}

function createDefaultBoard(title: string, ownerId: string, options?: CreateBoardOptions): Board {
    const context = resolveBoardContext(options);
    return {
        id: uuidv4(),
        title,
        ownerId,
        organizationId: context.organizationId,
        teamId: context.teamId,
        contextType: context.contextType,
        boardType: context.boardType,
        columns: getDefaultColumnsForBoardType(context.boardType).map(c => ({ ...c, id: uuidv4() })),
        tasks: [],
        createdAt: Date.now()
    };
}

function instantiateBoardFromTemplate(
    template: Pick<BoardTemplate, 'title' | 'columns' | 'tasks'>,
    title: string,
    ownerId: string,
    options?: CreateBoardOptions,
): Board {
    const nextBoardId = uuidv4();
    const columnIdMap = new Map<string, string>();
    const nextColumns = template.columns
        .sort((left, right) => left.order - right.order)
        .map((column, index) => {
            const nextColumnId = uuidv4();
            columnIdMap.set(column.id, nextColumnId);
            return {
                id: nextColumnId,
                title: column.title,
                order: index,
            };
        });

    const nextTasks = template.tasks.map((task) => ({
        ...task,
        id: uuidv4(),
        columnId: columnIdMap.get(task.columnId) ?? nextColumns[0]?.id ?? task.columnId,
        labels: [...task.labels],
        pictograms: task.pictograms ? [...task.pictograms] : [],
        attachments: task.attachments ? [...task.attachments] : [],
        dependencyTaskIds: task.dependencyTaskIds ? [...task.dependencyTaskIds] : [],
        createdAt: Date.now(),
    }));

    const context = resolveBoardContext(options);

    return {
        id: nextBoardId,
        title,
        ownerId,
        organizationId: context.organizationId,
        teamId: context.teamId,
        contextType: context.contextType,
        boardType: context.boardType,
        columns: nextColumns,
        tasks: nextTasks,
        createdAt: Date.now(),
    };
}

function boardToTemplate(board: Board, template: { title: string; description?: string; category?: BoardTemplateCategory }): BoardTemplate {
    const now = Date.now();
    return {
        id: uuidv4(),
        title: template.title,
        description: template.description,
        category: template.category ?? 'custom',
        columns: board.columns.map(column => ({ ...column })),
        tasks: board.tasks.map(task => ({
            ...task,
            labels: [...task.labels],
            pictograms: task.pictograms ? [...task.pictograms] : [],
            attachments: task.attachments ? [...task.attachments] : [],
            dependencyTaskIds: task.dependencyTaskIds ? [...task.dependencyTaskIds] : [],
        })),
        createdAt: now,
        updatedAt: now,
        sourceBoardId: board.id,
    };
}

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            users: [],
            boards: [],
            boardTemplates: [],
            deletedTasks: [],
            currentUser: null,
            activeBoardId: null,
            currentTheme: 'professional',
            visualMode: 'eink',
            selectedTaskIds: [],
            proSyncState: 'idle',
            lastProSyncAt: null,
            lastProSyncError: null,
            currentOrganizationId: null,
            currentTeamId: null,
            workspacePanelPreferences: normalizeWorkspacePanelPreferences(),

            login: (username, role, options) => {
                const state = get();
                const normalized = username.trim();
                if (!normalized) return null;
                const normalizedEmail = options?.email?.trim().toLowerCase();
                const normalizedWorkspaceCode = options?.workspaceCode?.trim().toUpperCase();

                let user = state.users.find(u =>
                    (options?.remoteId && u.id === options.remoteId)
                    || (normalizedEmail && u.email?.toLowerCase() === normalizedEmail)
                    || u.username.toLowerCase() === normalized.toLowerCase()
                );
                let nextUsers = state.users;
                const previousUserId = user?.id;

                if (!user) {
                    user = {
                        id: options?.remoteId ?? uuidv4(),
                        username: normalized,
                        role,
                        mode: options?.mode ?? 'identified',
                        email: options?.email?.trim() || undefined,
                        workspaceCode: normalizedWorkspaceCode || undefined,
                    };
                    nextUsers = [...state.users, user];
                } else if (
                    user.role !== role
                    || user.username !== normalized
                    || user.mode !== (options?.mode ?? user.mode)
                    || user.email !== (options?.email?.trim() || user.email)
                    || user.workspaceCode !== (normalizedWorkspaceCode || user.workspaceCode)
                    || (options?.remoteId && user.id !== options.remoteId)
                ) {
                    user = {
                        ...user,
                        id: options?.remoteId ?? user.id,
                        username: normalized,
                        role,
                        mode: options?.mode ?? user.mode ?? 'identified',
                        email: options?.email?.trim() || user.email,
                        workspaceCode: normalizedWorkspaceCode || user.workspaceCode,
                    };
                    nextUsers = state.users.map(u => u.id === (previousUserId ?? user!.id) ? user! : u);
                }

                const ownerAliases = new Set([
                    normalized,
                    previousUserId,
                    'local-user',
                    'imported-user',
                ].filter(Boolean));

                const nextBoards = state.boards.map(board => {
                    if (board.ownerId === user!.id) return board;
                    if (ownerAliases.has(board.ownerId)) {
                        return { ...board, ownerId: user!.id };
                    }
                    return board;
                });

                set({
                    users: nextUsers,
                    boards: nextBoards,
                    currentUser: user
                });
                return user;
            },

            logout: () => set({
                currentUser: null,
                activeBoardId: null,
                proSyncState: 'idle',
                lastProSyncAt: null,
                lastProSyncError: null,
                currentOrganizationId: null,
                currentTeamId: null,
            }),

            setTheme: (theme) => set({ currentTheme: theme }),
            setVisualMode: (mode) => set({ visualMode: mode }),
            setProSyncStatus: (status, options) => set({
                proSyncState: status,
                lastProSyncAt: options?.at ?? null,
                lastProSyncError: options?.error ?? null,
            }),
            setCurrentOrganization: (organizationId) => set({
                currentOrganizationId: organizationId,
                currentTeamId: null,
            }),
            setCurrentTeam: (teamId) => set({ currentTeamId: teamId }),
            clearWorkspaceContext: () => set({
                currentOrganizationId: null,
                currentTeamId: null,
            }),
            setWorkspacePanelPreference: (panel, updates) => set(state => ({
                workspacePanelPreferences: (() => {
                    const normalized = normalizeWorkspacePanelPreferences(state.workspacePanelPreferences);
                    return {
                        ...normalized,
                        [panel]: {
                            ...normalized[panel],
                            ...updates,
                        },
                    };
                })(),
            })),
            resetWorkspacePanelPreferences: () => set({
                workspacePanelPreferences: normalizeWorkspacePanelPreferences(),
            }),

            createBoard: (title, ownerId, options) => {
                const state = get();
                const resolvedOwnerId = ownerId ?? state.currentUser?.id ?? 'local-user';
                const boardOptions = state.currentUser?.mode === 'pro'
                    ? {
                        organizationId: options?.organizationId ?? state.currentOrganizationId,
                        teamId: options?.teamId ?? state.currentTeamId,
                        contextType: options?.contextType,
                        boardType: options?.boardType,
                    }
                    : options;
                const newBoard = createDefaultBoard(title, resolvedOwnerId, boardOptions);
                if (state.currentUser?.mode === 'pro') {
                    newBoard.remoteRole = 'owner';
                }
                set(state => ({
                    boards: [...state.boards, newBoard],
                    activeBoardId: newBoard.id
                }));
            },

            createBoardFromTemplate: (template, options) => {
                const state = get();
                const resolvedOwnerId = options?.ownerId ?? state.currentUser?.id ?? 'local-user';
                const boardOptions = state.currentUser?.mode === 'pro'
                    ? {
                        organizationId: options?.organizationId ?? state.currentOrganizationId,
                        teamId: options?.teamId ?? state.currentTeamId,
                        contextType: options?.contextType,
                        boardType: options?.boardType,
                    }
                    : options;
                const nextBoard = instantiateBoardFromTemplate(
                    template,
                    options?.title?.trim() || template.title,
                    resolvedOwnerId,
                    boardOptions,
                );
                if (state.currentUser?.mode === 'pro') {
                    nextBoard.remoteRole = 'owner';
                }
                set(currentState => ({
                    boards: [...currentState.boards, nextBoard],
                    activeBoardId: nextBoard.id,
                }));
            },

            duplicateBoard: (boardId, title, ownerId) => {
                const state = get();
                const sourceBoard = state.boards.find(board => board.id === boardId);
                if (!sourceBoard) return;
                const resolvedOwnerId = ownerId ?? state.currentUser?.id ?? sourceBoard.ownerId;
                const nextBoard = instantiateBoardFromTemplate(
                    {
                        title: sourceBoard.title,
                        columns: sourceBoard.columns,
                        tasks: sourceBoard.tasks,
                    },
                    title?.trim() || `${sourceBoard.title} (copia)`,
                    resolvedOwnerId,
                );
                nextBoard.organizationId = sourceBoard.organizationId ?? state.currentOrganizationId ?? undefined;
                nextBoard.teamId = sourceBoard.teamId ?? state.currentTeamId ?? undefined;
                nextBoard.contextType = sourceBoard.teamId
                    ? 'team'
                    : sourceBoard.organizationId
                        ? 'organization'
                        : sourceBoard.contextType ?? 'personal';
                nextBoard.boardType = sourceBoard.boardType ?? (
                    nextBoard.teamId
                        ? 'team_coordination'
                        : nextBoard.organizationId
                            ? 'organization_project'
                            : 'learning_sequence'
                );
                nextBoard.remoteRole = state.currentUser?.mode === 'pro' ? 'owner' : sourceBoard.remoteRole;
                set(currentState => ({
                    boards: [...currentState.boards, nextBoard],
                    activeBoardId: nextBoard.id,
                }));
            },

            importBoard: (board) => set(state => ({
                boards: [...state.boards, { ...board, ownerId: board.ownerId || state.currentUser?.id || 'local-user' }],
                activeBoardId: board.id
            })),

            deleteBoard: (boardId) => set(state => ({
                boards: state.boards.filter(b => b.id !== boardId),
                activeBoardId: state.activeBoardId === boardId ? null : state.activeBoardId
            })),

            setActiveBoard: (boardId) => set({ activeBoardId: boardId }),

            updateBoardTitle: (boardId, title) => set(state => ({
                boards: state.boards.map(b => b.id === boardId ? { ...b, title } : b)
            })),

            mergeBoardsForOwner: (ownerId, boards) => set(state => {
                const nextBoards = [...state.boards];
                for (const board of boards) {
                    const nextBoard = { ...board, ownerId: board.ownerId || ownerId };
                    const index = nextBoards.findIndex(existing => existing.id === nextBoard.id);
                    if (index >= 0) {
                        nextBoards[index] = nextBoard;
                    } else {
                        nextBoards.push(nextBoard);
                    }
                }
                return { boards: nextBoards };
            }),

            saveBoardAsTemplate: (boardId, template) => set(state => {
                const board = state.boards.find(item => item.id === boardId);
                if (!board) return {};
                const nextTemplate = boardToTemplate(board, template);
                return {
                    boardTemplates: [nextTemplate, ...state.boardTemplates],
                };
            }),

            deleteBoardTemplate: (templateId) => set(state => ({
                boardTemplates: state.boardTemplates.filter(template => template.id !== templateId),
            })),

            // Board Mutations
            addColumn: (title) => set(state => {
                if (!state.activeBoardId) return {};
                const board = state.boards.find(b => b.id === state.activeBoardId);
                if (!board) return {};

                const newCol = { id: uuidv4(), title, order: board.columns.length };
                const updatedBoard = { ...board, columns: [...board.columns, newCol] };

                return {
                    boards: state.boards.map(b => b.id === state.activeBoardId ? updatedBoard : b)
                };
            }),

            deleteColumn: (id) => set(state => {
                if (!state.activeBoardId) return {};
                const board = state.boards.find(b => b.id === state.activeBoardId);
                if (!board) return {};

                const removedTaskIds = board.tasks.filter(t => t.columnId === id).map(t => t.id);
                const updatedBoard = {
                    ...board,
                    columns: board.columns.filter(c => c.id !== id),
                    tasks: board.tasks.filter(t => t.columnId !== id)
                };

                return {
                    boards: state.boards.map(b => b.id === state.activeBoardId ? updatedBoard : b),
                    selectedTaskIds: state.selectedTaskIds.filter(taskId => !removedTaskIds.includes(taskId))
                };
            }),

            updateColumn: (id, title) => set(state => {
                if (!state.activeBoardId) return {};
                const board = state.boards.find(b => b.id === state.activeBoardId);
                if (!board) return {};

                const updatedBoard = {
                    ...board,
                    columns: board.columns.map(c => c.id === id ? { ...c, title } : c)
                };
                return { boards: state.boards.map(b => b.id === state.activeBoardId ? updatedBoard : b) };
            }),

            addTask: (columnId, title) => set(state => {
                if (!state.activeBoardId) return {};
                const board = state.boards.find(b => b.id === state.activeBoardId);
                if (!board) return {};

                const newTask: Task = {
                    id: uuidv4(),
                    columnId,
                    title,
                    labels: [],
                    createdAt: Date.now()
                };

                const updatedBoard = { ...board, tasks: [...board.tasks, newTask] };
                return { boards: state.boards.map(b => b.id === state.activeBoardId ? updatedBoard : b) };
            }),

            updateTask: (taskId, updates) => set(state => {
                if (!state.activeBoardId) return {};
                const board = state.boards.find(b => b.id === state.activeBoardId);
                if (!board) return {};

                const updatedBoard = {
                    ...board,
                    tasks: board.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
                };
                return { boards: state.boards.map(b => b.id === state.activeBoardId ? updatedBoard : b) };
            }),

            duplicateTask: (taskId) => set(state => {
                if (!state.activeBoardId) return {};
                const board = state.boards.find(b => b.id === state.activeBoardId);
                if (!board) return {};
                const original = board.tasks.find(t => t.id === taskId);
                if (!original) return {};
                const copy: Task = {
                    ...original,
                    id: uuidv4(),
                    title: `Copia de ${original.title}`,
                    createdAt: Date.now(),
                    pedagogicalStatus: 'not_started',
                };
                const lastInColumn = [...board.tasks].reverse().findIndex((t: Task) => t.columnId === original.columnId);
                const insertIdx = lastInColumn === -1 ? board.tasks.length : board.tasks.length - lastInColumn;
                const updatedTasks = [...board.tasks];
                updatedTasks.splice(insertIdx, 0, copy);
                return { boards: state.boards.map(b => b.id === state.activeBoardId ? { ...b, tasks: updatedTasks } : b) };
            }),

            deleteTask: (taskId) => set(state => {
                if (!state.activeBoardId) return {};
                const board = state.boards.find(b => b.id === state.activeBoardId);
                if (!board) return {};

                const task = board.tasks.find(t => t.id === taskId);
                if (!task) return {};

                const updatedBoard = {
                    ...board,
                    tasks: board.tasks.filter(t => t.id !== taskId)
                };
                return {
                    boards: state.boards.map(b => b.id === state.activeBoardId ? updatedBoard : b),
                    deletedTasks: [
                        ...state.deletedTasks,
                        { task, boardId: board.id, deletedAt: Date.now() }
                    ],
                    selectedTaskIds: state.selectedTaskIds.filter(id => id !== taskId)
                };
            }),

            moveTask: (taskId, newColumnId) => set(state => {
                if (!state.activeBoardId) return {};
                const board = state.boards.find(b => b.id === state.activeBoardId);
                if (!board) return {};

                const updatedBoard = {
                    ...board,
                    tasks: board.tasks.map(t => t.id === taskId ? { ...t, columnId: newColumnId } : t)
                };
                return { boards: state.boards.map(b => b.id === state.activeBoardId ? updatedBoard : b) };
            }),

            restoreLastDeletedTask: () => set(state => {
                const last = state.deletedTasks[state.deletedTasks.length - 1];
                if (!last) return {};

                const board = state.boards.find(b => b.id === last.boardId);
                if (!board) {
                    return { deletedTasks: state.deletedTasks.slice(0, -1) };
                }

                const columnIdExists = board.columns.some(c => c.id === last.task.columnId);
                const fallbackColumnId = columnIdExists ? last.task.columnId : board.columns[0]?.id;

                if (!fallbackColumnId) {
                    return { deletedTasks: state.deletedTasks.slice(0, -1) };
                }

                const restoredTask = { ...last.task, columnId: fallbackColumnId };
                const updatedBoard = { ...board, tasks: [...board.tasks, restoredTask] };

                return {
                    boards: state.boards.map(b => b.id === board.id ? updatedBoard : b),
                    deletedTasks: state.deletedTasks.slice(0, -1)
                };
            }),

            restoreDeletedTask: (taskId) => set(state => {
                const index = state.deletedTasks.findIndex(entry => entry.task.id === taskId);
                if (index === -1) return {};

                const entry = state.deletedTasks[index];
                const board = state.boards.find(b => b.id === entry.boardId);

                const remaining = state.deletedTasks.filter((_, i) => i !== index);
                if (!board) {
                    return { deletedTasks: remaining };
                }

                const columnIdExists = board.columns.some(c => c.id === entry.task.columnId);
                const fallbackColumnId = columnIdExists ? entry.task.columnId : board.columns[0]?.id;

                if (!fallbackColumnId) {
                    return { deletedTasks: remaining };
                }

                const restoredTask = { ...entry.task, columnId: fallbackColumnId };
                const updatedBoard = { ...board, tasks: [...board.tasks, restoredTask] };

                return {
                    boards: state.boards.map(b => b.id === board.id ? updatedBoard : b),
                    deletedTasks: remaining
                };
            }),

            toggleTaskSelection: (taskId) => set(state => {
                const isSelected = state.selectedTaskIds.includes(taskId);
                return {
                    selectedTaskIds: isSelected
                        ? state.selectedTaskIds.filter(id => id !== taskId)
                        : [...state.selectedTaskIds, taskId]
                };
            }),

            setSelectedTaskIds: (taskIds) => set({ selectedTaskIds: taskIds }),

            clearTaskSelection: () => set({ selectedTaskIds: [] }),
        }),
        {
            name: 'pasos-v2-storage',
            storage: createJSONStorage(() => localStorage),
            merge: (persistedState, currentState) => {
                const persisted = (persistedState as Partial<AppState> | undefined) ?? {};
                return {
                    ...currentState,
                    ...persisted,
                    workspacePanelPreferences: normalizeWorkspacePanelPreferences(persisted.workspacePanelPreferences),
                };
            },
        }
    )
);

// Adapter for existing components to work with the active board
export const useBoardStore = () => {
    const store = useStore();

    if (!store.activeBoardId) {
        return {
            columns: [],
            tasks: [],
            addColumn: store.addColumn,
            deleteColumn: store.deleteColumn,
            updateColumn: store.updateColumn,
            addTask: store.addTask,
            updateTask: store.updateTask,
            deleteTask: store.deleteTask,
            moveTask: store.moveTask,
            store
        };
    }

    const activeBoard = store.boards.find(b => b.id === store.activeBoardId);

    // Fallback if no board exists at all (First run)
    if (!activeBoard) {
        return {
            columns: [],
            tasks: [],
            addColumn: store.addColumn,
            deleteColumn: store.deleteColumn,
            updateColumn: store.updateColumn,
            addTask: store.addTask,
            updateTask: store.updateTask,
            deleteTask: store.deleteTask,
            moveTask: store.moveTask,
            store
        };
    }

    return {
        columns: activeBoard.columns,
        tasks: activeBoard.tasks,
        addColumn: store.addColumn,
        deleteColumn: store.deleteColumn,
        updateColumn: store.updateColumn,
        addTask: store.addTask,
        updateTask: store.updateTask,
        deleteTask: store.deleteTask,
        moveTask: store.moveTask,
        store
    };
};
