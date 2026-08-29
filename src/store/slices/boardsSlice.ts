/*
 * Slice de tableros: tableros, plantillas, columnas, tareas,
 * papelera con restauración y selección múltiple.
 */
import type { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { getDefaultBoardType, getDefaultColumnsForBoardType, isSupportedBoardType, type SupportedBoardType } from '../../utils/boardPresets';
import type {
    Board,
    BoardContextType,
    BoardTemplate,
    BoardTemplateCategory,
    DeletedTaskEntry,
    Task,
} from '../types';
import type { AppState } from '../boardStore';

export interface CreateBoardOptions {
    organizationId?: string | null;
    teamId?: string | null;
    contextType?: BoardContextType;
    boardType?: SupportedBoardType | string | null;
}

export interface BoardsSlice {
    boards: Board[];
    boardTemplates: BoardTemplate[];
    deletedTasks: DeletedTaskEntry[];
    activeBoardId: string | null;
    selectedTaskIds: string[];

    // Gestión de tableros
    createBoard: (title: string, ownerId?: string, options?: CreateBoardOptions) => void;
    createBoardFromTemplate: (template: Pick<BoardTemplate, 'title' | 'columns' | 'tasks'>, options?: { title?: string; ownerId?: string } & CreateBoardOptions) => void;
    duplicateBoard: (boardId: string, title?: string, ownerId?: string) => void;
    deleteBoard: (boardId: string) => void;
    setActiveBoard: (boardId: string | null) => void;
    updateBoardTitle: (boardId: string, title: string) => void;
    mergeBoardsForOwner: (ownerId: string, boards: Board[]) => void;
    saveBoardAsTemplate: (boardId: string, template: { title: string; description?: string; category?: BoardTemplateCategory }) => void;
    deleteBoardTemplate: (templateId: string) => void;
    importBoard: (board: Board) => void;

    // Acciones sobre el tablero activo
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

    // Selección múltiple
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

export const createBoardsSlice: StateCreator<AppState, [['zustand/persist', unknown]], [], BoardsSlice> = (set, get) => ({
    boards: [],
    boardTemplates: [],
    deletedTasks: [],
    activeBoardId: null,
    selectedTaskIds: [],

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

    // Mutaciones de columnas
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

    // Mutaciones de tareas
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
        // Inserta la copia justo después de la última tarea de la misma columna
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

    // Selección múltiple
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
});
