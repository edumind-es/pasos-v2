/*
 * Slice de sesión: usuarios conocidos, usuario actual, login y logout.
 */
import type { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { AccessMode, User, UserRole } from '../types';
import type { AppState } from '../boardStore';

export interface LoginOptions {
    mode?: AccessMode;
    email?: string;
    remoteId?: string;
    workspaceCode?: string;
}

export interface SessionSlice {
    users: User[];
    currentUser: User | null;

    login: (username: string, role: UserRole, options?: LoginOptions) => User | null;
    logout: () => void;
}

export const createSessionSlice: StateCreator<AppState, [['zustand/persist', unknown]], [], SessionSlice> = (set, get) => ({
    users: [],
    currentUser: null,

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

        // Reclama los tableros creados sin sesión o con el nombre como alias
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
});
