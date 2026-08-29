/*
 * Organizaciones, equipos y membresías (Pasos Claustro).
 */
import { requestJson } from './http';
import type {
    ProOrgMembershipResponse,
    ProOrganizationResponse,
    ProTeamMembershipResponse,
    ProTeamResponse,
} from './types';

export async function listOrganizations(): Promise<ProOrganizationResponse[]> {
    return requestJson<ProOrganizationResponse[]>('/organizations', {
        method: 'GET',
    });
}

export async function createOrganization(payload: {
    name: string;
    slug?: string;
    planType?: 'school' | 'district' | 'pilot';
}): Promise<ProOrganizationResponse> {
    return requestJson<ProOrganizationResponse>('/organizations', {
        method: 'POST',
        body: JSON.stringify({
            name: payload.name,
            slug: payload.slug,
            plan_type: payload.planType ?? 'school',
        }),
    });
}

export async function listOrganizationTeams(organizationId: string): Promise<ProTeamResponse[]> {
    return requestJson<ProTeamResponse[]>(`/organizations/${encodeURIComponent(organizationId)}/teams`, {
        method: 'GET',
    });
}

/** Borrado seguro: archiva la organización (y sus equipos). Recuperable, no destructivo. */
export async function deleteOrganization(organizationId: string): Promise<void> {
    await requestJson<void>(`/organizations/${encodeURIComponent(organizationId)}`, {
        method: 'DELETE',
    });
}

/** Borrado seguro: archiva un equipo dentro de su organización. */
export async function deleteOrganizationTeam(organizationId: string, teamId: string): Promise<void> {
    await requestJson<void>(
        `/organizations/${encodeURIComponent(organizationId)}/teams/${encodeURIComponent(teamId)}`,
        { method: 'DELETE' },
    );
}

export async function createOrganizationTeam(
    organizationId: string,
    payload: {
        name: string;
        slug?: string;
        teamType?: 'cycle' | 'department' | 'leadership' | 'project' | 'support' | 'custom';
        visibility?: 'private' | 'organization';
    },
): Promise<ProTeamResponse> {
    return requestJson<ProTeamResponse>(`/organizations/${encodeURIComponent(organizationId)}/teams`, {
        method: 'POST',
        body: JSON.stringify({
            name: payload.name,
            slug: payload.slug,
            team_type: payload.teamType ?? 'custom',
            visibility: payload.visibility ?? 'private',
        }),
    });
}

export async function listTeamMembers(teamId: string): Promise<ProTeamMembershipResponse[]> {
    return requestJson<ProTeamMembershipResponse[]>(`/teams/${encodeURIComponent(teamId)}/members`, {
        method: 'GET',
    });
}

export async function addTeamMember(
    teamId: string,
    payload: {
        userId?: string;
        userEmail?: string;
        userCode?: string;
        role?: 'owner' | 'editor' | 'viewer';
    },
): Promise<ProTeamMembershipResponse> {
    return requestJson<ProTeamMembershipResponse>(`/teams/${encodeURIComponent(teamId)}/members`, {
        method: 'POST',
        body: JSON.stringify({
            user_id: payload.userId,
            user_email: payload.userEmail,
            user_code: payload.userCode,
            role: payload.role ?? 'viewer',
        }),
    });
}

export async function updateTeamMemberRole(
    teamId: string,
    userId: string,
    role: 'owner' | 'editor' | 'viewer',
): Promise<ProTeamMembershipResponse> {
    return requestJson<ProTeamMembershipResponse>(
        `/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(userId)}`,
        { method: 'PUT', body: JSON.stringify({ role }) },
    );
}

export async function removeTeamMember(teamId: string, userId: string): Promise<void> {
    await requestJson<void>(
        `/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(userId)}`,
        { method: 'DELETE' },
    );
}

export async function listOrgMembers(organizationId: string): Promise<ProOrgMembershipResponse[]> {
    return requestJson<ProOrgMembershipResponse[]>(
        `/organizations/${encodeURIComponent(organizationId)}/members`,
    );
}

export async function updateOrgMemberRole(
    organizationId: string,
    userId: string,
    role: 'organization_admin' | 'leadership' | 'teacher' | 'member',
): Promise<ProOrgMembershipResponse> {
    return requestJson<ProOrgMembershipResponse>(
        `/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(userId)}`,
        { method: 'PUT', body: JSON.stringify({ role }) },
    );
}

export async function removeOrgMember(organizationId: string, userId: string): Promise<void> {
    await requestJson<void>(
        `/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(userId)}`,
        { method: 'DELETE' },
    );
}
