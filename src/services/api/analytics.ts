/*
 * Analítica institucional: cronograma (timeline) y cuadro de mando ejecutivo.
 */
import { requestJson, requestText } from './http';
import type { ProExecutiveDashboardResponse, ProTimelineOverviewResponse } from './types';

export interface ExecutiveDashboardFilters {
    organizationId?: string | null;
    teamId?: string | null;
    boardId?: string | null;
    ownerLabel?: string | null;
    periodDays?: number;
}

function toExecutiveQuery(filters?: ExecutiveDashboardFilters): string {
    const params = new URLSearchParams();
    if (filters?.organizationId) {
        params.set('organization_id', filters.organizationId);
    }
    if (filters?.teamId) {
        params.set('team_id', filters.teamId);
    }
    if (filters?.boardId) {
        params.set('board_id', filters.boardId);
    }
    if (filters?.ownerLabel) {
        params.set('owner_label', filters.ownerLabel);
    }
    if (filters?.periodDays) {
        params.set('period_days', String(filters.periodDays));
    }
    const query = params.toString();
    return query ? `?${query}` : '';
}

export async function getTimelineOverview(filters?: {
    organizationId?: string | null;
    teamId?: string | null;
    boardId?: string | null;
}): Promise<ProTimelineOverviewResponse> {
    const params = new URLSearchParams();
    if (filters?.organizationId) {
        params.set('organization_id', filters.organizationId);
    }
    if (filters?.teamId) {
        params.set('team_id', filters.teamId);
    }
    if (filters?.boardId) {
        params.set('board_id', filters.boardId);
    }
    const query = params.toString();
    return requestJson<ProTimelineOverviewResponse>(`/timeline/overview${query ? `?${query}` : ''}`, {
        method: 'GET',
    });
}

export async function getExecutiveDashboard(filters?: ExecutiveDashboardFilters): Promise<ProExecutiveDashboardResponse> {
    return requestJson<ProExecutiveDashboardResponse>(`/executive/dashboard${toExecutiveQuery(filters)}`, {
        method: 'GET',
    });
}

export async function exportExecutiveDashboardCsv(filters?: ExecutiveDashboardFilters): Promise<string> {
    return requestText(`/executive/dashboard.csv${toExecutiveQuery(filters)}`, {
        method: 'GET',
    });
}
