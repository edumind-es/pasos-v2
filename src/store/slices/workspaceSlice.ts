/*
 * Slice de workspace: tema visual, estado de sincronización Pro,
 * contexto organización/equipo y preferencias de paneles.
 */
import type { StateCreator } from 'zustand';
import type { ThemeName } from '../../utils/themes';
import {
    normalizeWorkspacePanelPreferences,
    type ProSyncState,
    type VisualMode,
    type WorkspacePanelKey,
    type WorkspacePanelPreference,
} from '../types';
import type { AppState } from '../boardStore';

export interface WorkspaceSlice {
    currentTheme: ThemeName;
    visualMode: VisualMode;
    proSyncState: ProSyncState;
    lastProSyncAt: string | null;
    lastProSyncError: string | null;
    currentOrganizationId: string | null;
    currentTeamId: string | null;
    workspacePanelPreferences: Record<WorkspacePanelKey, WorkspacePanelPreference>;

    setTheme: (theme: ThemeName) => void;
    setVisualMode: (mode: VisualMode) => void;
    setProSyncStatus: (status: ProSyncState, options?: { at?: string | null; error?: string | null }) => void;
    setCurrentOrganization: (organizationId: string | null) => void;
    setCurrentTeam: (teamId: string | null) => void;
    clearWorkspaceContext: () => void;
    setWorkspacePanelPreference: (panel: WorkspacePanelKey, updates: Partial<WorkspacePanelPreference>) => void;
    resetWorkspacePanelPreferences: () => void;
}

export const createWorkspaceSlice: StateCreator<AppState, [['zustand/persist', unknown]], [], WorkspaceSlice> = (set) => ({
    currentTheme: 'professional',
    visualMode: 'eink',
    proSyncState: 'idle',
    lastProSyncAt: null,
    lastProSyncError: null,
    currentOrganizationId: null,
    currentTeamId: null,
    workspacePanelPreferences: normalizeWorkspacePanelPreferences(),

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
    setWorkspacePanelPreference: (panel, updates) => set(state => {
        const normalized = normalizeWorkspacePanelPreferences(state.workspacePanelPreferences);
        return {
            workspacePanelPreferences: {
                ...normalized,
                [panel]: {
                    ...normalized[panel],
                    ...updates,
                },
            },
        };
    }),
    resetWorkspacePanelPreferences: () => set({
        workspacePanelPreferences: normalizeWorkspacePanelPreferences(),
    }),
});
