/*
 * Calendario: eventos con fecha y feeds iCal suscribibles.
 */
import { requestJson } from './http';
import type { ProCalendarEventResponse, ProCalendarFeedResponse } from './types';

export async function listCalendarEvents(filters?: {
    scopeType?: 'personal' | 'team';
    teamId?: string | null;
}): Promise<ProCalendarEventResponse[]> {
    const params = new URLSearchParams();
    if (filters?.scopeType) {
        params.set('scope_type', filters.scopeType);
    }
    if (filters?.teamId) {
        params.set('team_id', filters.teamId);
    }
    const query = params.toString();
    return requestJson<ProCalendarEventResponse[]>(`/calendar/events${query ? `?${query}` : ''}`, {
        method: 'GET',
    });
}

export async function listCalendarFeeds(): Promise<ProCalendarFeedResponse[]> {
    return requestJson<ProCalendarFeedResponse[]>('/calendar/feeds', {
        method: 'GET',
    });
}

export async function createCalendarFeed(payload: {
    name: string;
    scopeType?: 'personal' | 'team';
    teamId?: string;
    includeTaskDueDates?: boolean;
    includeAssignments?: boolean;
}): Promise<ProCalendarFeedResponse> {
    return requestJson<ProCalendarFeedResponse>('/calendar/feeds', {
        method: 'POST',
        body: JSON.stringify({
            name: payload.name,
            scope_type: payload.scopeType ?? 'personal',
            team_id: payload.teamId,
            include_task_due_dates: payload.includeTaskDueDates ?? true,
            include_assignments: payload.includeAssignments ?? true,
        }),
    });
}
