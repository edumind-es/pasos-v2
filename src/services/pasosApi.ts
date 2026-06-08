import type { Board } from '../store/boardStore';

const API_BASE = (import.meta.env.VITE_PASOS_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api/v1';
const ACCESS_TOKEN_KEY = 'pasos-pro-access-token';
const CSRF_COOKIE_NAME = 'pasos_csrf';

interface ErrorEnvelope {
    error?: {
        code?: string;
        message?: string;
    };
}

export interface ProUserResponse {
    id: string;
    email: string;
    display_name: string | null;
    workspace_code: string;
}

export interface ProAuthTokenResponse {
    access_token: string;
    token_type: 'bearer';
    expires_at: string;
    mode: 'pro';
    user: ProUserResponse;
}

export interface ProBoardSnapshot {
    columns: Board['columns'];
    tasks: Board['tasks'];
}

export interface ProBoardResponse {
    id: string;
    title: string;
    owner_id: string;
    organization_id: string | null;
    team_id: string | null;
    context_type: 'personal' | 'organization' | 'team' | null;
    board_type: string | null;
    snapshot: ProBoardSnapshot;
    role: 'owner' | 'editor' | 'viewer';
    created_at: string;
    updated_at: string;
}

export interface ProShareResponse {
    code: string;
    permission: 'viewer' | 'editor';
    expires_at: string;
    url: string;
}

export interface ProShareResolveResponse {
    code: string;
    permission: 'viewer' | 'editor';
    expires_at: string;
    board: ProBoardResponse;
}

export interface ProBoardActivityEventResponse {
    id: string;
    event_type: string;
    actor_type: string;
    actor_id: string | null;
    actor_label: string | null;
    metadata: Record<string, string | number | boolean | null>;
    occurred_at: string;
}

export interface ProTaskEvidenceEntryResponse {
    task_id: string;
    note: string | null;
    url: string | null;
    submitted_at: string;
}

export interface ProTaskFeedbackEntryResponse {
    task_id: string;
    message: string;
    status: 'comment' | 'needs_revision' | 'validated';
    author_label: string | null;
    created_at: string;
}

export interface ProTimelineItemResponse {
    task_id: string;
    board_id: string;
    board_title: string;
    title: string;
    task_type: 'task' | 'learning_step' | 'evidence' | 'agreement' | 'document' | 'resource' | 'incident' | 'milestone';
    owner_label: string | null;
    effort_points: number;
    column_title: string | null;
    dependency_task_ids: string[];
    blocked_by_task_ids: string[];
    start_at: string | null;
    end_at: string | null;
    is_blocked: boolean;
    is_delayed: boolean;
    is_milestone: boolean;
    is_completed: boolean;
    context_type: 'personal' | 'organization' | 'team' | null;
    organization_id: string | null;
    team_id: string | null;
}

export interface ProTimelineAlertResponse {
    alert_type: 'blocked' | 'delayed' | 'milestone_at_risk';
    severity: 'warning' | 'critical';
    task_id: string;
    board_id: string;
    board_title: string;
    title: string;
    owner_label: string | null;
    message: string;
}

export interface ProTimelineCapacityResponse {
    owner_label: string;
    task_count: number;
    effort_points: number;
    blocked_count: number;
    delayed_count: number;
}

export interface ProTimelineOverviewResponse {
    scope_type: 'personal' | 'organization' | 'team';
    organization_id: string | null;
    team_id: string | null;
    board_id: string | null;
    item_count: number;
    blocked_count: number;
    delayed_count: number;
    milestone_risk_count: number;
    items: ProTimelineItemResponse[];
    alerts: ProTimelineAlertResponse[];
    capacities: ProTimelineCapacityResponse[];
}

export interface ProExecutiveSummaryResponse {
    total_boards: number;
    total_tasks: number;
    completed_tasks: number;
    progress_percent: number;
    blocked_count: number;
    delayed_count: number;
    overdue_milestone_count: number;
    pending_document_count: number;
    recurrent_blocker_count: number;
}

export interface ProExecutiveTeamMetricResponse {
    team_id: string | null;
    team_name: string;
    board_count: number;
    total_tasks: number;
    completed_tasks: number;
    progress_percent: number;
    blocked_count: number;
    delayed_count: number;
    overdue_milestone_count: number;
    pending_document_count: number;
}

export interface ProExecutiveOwnerMetricResponse {
    owner_label: string;
    board_count: number;
    task_count: number;
    effort_points: number;
    blocked_count: number;
    delayed_count: number;
}

export interface ProExecutiveProjectProgressResponse {
    board_id: string;
    board_title: string;
    team_id: string | null;
    team_name: string | null;
    board_type: string | null;
    total_tasks: number;
    completed_tasks: number;
    progress_percent: number;
    blocked_count: number;
    delayed_count: number;
    overdue_milestone_count: number;
    pending_document_count: number;
    updated_at: string;
}

export interface ProExecutiveRecurringBlockerResponse {
    blocker_label: string;
    blocked_task_count: number;
    board_count: number;
    board_titles: string[];
    owner_labels: string[];
}

export interface ProExecutivePendingDocumentResponse {
    document_id: string;
    board_id: string;
    board_title: string;
    team_id: string | null;
    team_name: string | null;
    title: string;
    status: 'draft' | 'in_review' | 'approved' | 'published';
    author_label: string | null;
    updated_at: string;
    age_days: number;
}

export interface ProExecutiveOverdueMilestoneResponse {
    task_id: string;
    board_id: string;
    board_title: string;
    team_id: string | null;
    team_name: string | null;
    title: string;
    owner_label: string | null;
    due_at: string;
    delayed_days: number;
    blocked_by_task_ids: string[];
}

export interface ProExecutiveDashboardResponse {
    scope_type: 'personal' | 'organization' | 'team';
    organization_id: string | null;
    team_id: string | null;
    board_id: string | null;
    owner_label: string | null;
    period_days: number;
    generated_at: string;
    summary: ProExecutiveSummaryResponse;
    teams: ProExecutiveTeamMetricResponse[];
    owners: ProExecutiveOwnerMetricResponse[];
    projects: ProExecutiveProjectProgressResponse[];
    recurring_blockers: ProExecutiveRecurringBlockerResponse[];
    pending_documents: ProExecutivePendingDocumentResponse[];
    overdue_milestones: ProExecutiveOverdueMilestoneResponse[];
}

export interface ProBoardLearnerInsightResponse {
    learner_key: string;
    learner_label: string | null;
    share_code: string | null;
    completed_count: number;
    total_tasks: number;
    progress_percent: number;
    last_event_type: string | null;
    last_access_at: string;
    help_task_count: number;
    evidence_count: number;
    feedback_count: number;
    validated_count: number;
    help_task_ids: string[];
    validated_task_ids: string[];
    evidence_entries: ProTaskEvidenceEntryResponse[];
    feedback_entries: ProTaskFeedbackEntryResponse[];
}

export interface ProBoardInsightsResponse {
    board_id: string;
    board_title: string;
    total_tasks: number;
    active_share_count: number;
    share_access_count: number;
    learner_count: number;
    completed_learners: number;
    learners: ProBoardLearnerInsightResponse[];
    recent_events: ProBoardActivityEventResponse[];
}

export interface ProOrganizationResponse {
    id: string;
    name: string;
    slug: string;
    plan_type: 'school' | 'district' | 'pilot';
    is_active: boolean;
    role: 'organization_admin' | 'leadership' | 'member';
    created_at: string;
    updated_at: string;
}

export interface ProTeamResponse {
    id: string;
    organization_id: string;
    name: string;
    slug: string;
    team_type: 'cycle' | 'department' | 'leadership' | 'project' | 'support' | 'custom';
    visibility: 'private' | 'organization';
    is_archived: boolean;
    role: 'owner' | 'editor' | 'viewer' | null;
    created_at: string;
    updated_at: string;
}

export interface ProTeamMembershipResponse {
    id: string;
    team_id: string;
    user: ProUserResponse;
    role: 'owner' | 'editor' | 'viewer';
    status: 'active';
    created_at: string;
    updated_at: string;
}

export interface ProOrgMembershipResponse {
    id: string;
    organization_id: string;
    user: ProUserResponse;
    role: 'organization_admin' | 'leadership' | 'teacher' | 'member';
    status: 'active';
    created_at: string;
    updated_at: string;
}

export interface ProLearningAssignmentResponse {
    id: string;
    board_id: string;
    board_title: string;
    organization_id: string | null;
    team_id: string | null;
    target_type: 'student' | 'group';
    target_label: string;
    target_key: string | null;
    due_date: string | null;
    status: 'active' | 'completed' | 'archived';
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface ProBoardCommentResponse {
    id: string;
    board_id: string;
    author_id: string;
    author_label: string | null;
    message: string;
    mentions: string[];
    created_at: string;
    updated_at: string;
}

export interface ProBoardMeetingResponse {
    id: string;
    board_id: string;
    author_id: string;
    author_label: string | null;
    title: string;
    summary: string | null;
    decisions: string[];
    linked_task_ids: string[];
    created_at: string;
    updated_at: string;
}

export interface ProBoardDocumentResponse {
    id: string;
    board_id: string;
    author_id: string;
    author_label: string | null;
    title: string;
    kind: 'note' | 'link' | 'file' | 'image' | 'audio' | 'video' | 'embed';
    status: 'draft' | 'in_review' | 'approved' | 'published';
    description: string | null;
    url: string | null;
    content: string | null;
    linked_task_ids: string[];
    tags: string[];
    current_version: number;
    created_at: string;
    updated_at: string;
}

export interface ProBoardDocumentVersionResponse {
    id: string;
    document_id: string;
    board_id: string;
    author_id: string;
    version_number: number;
    title: string;
    kind: 'note' | 'link' | 'file' | 'image' | 'audio' | 'video' | 'embed';
    status: 'draft' | 'in_review' | 'approved' | 'published';
    description: string | null;
    url: string | null;
    content: string | null;
    linked_task_ids: string[];
    tags: string[];
    created_at: string;
    updated_at: string;
}

export interface ProCalendarFeedResponse {
    id: string;
    name: string;
    scope_type: 'personal' | 'team';
    organization_id: string | null;
    team_id: string | null;
    include_task_due_dates: boolean;
    include_assignments: boolean;
    is_active: boolean;
    url: string;
    created_at: string;
    updated_at: string;
}

export interface ProCalendarEventResponse {
    id: string;
    event_type: 'task_due' | 'assignment_due';
    title: string;
    description: string | null;
    start_at: string;
    end_at: string;
    board_id: string;
    board_title: string;
    organization_id: string | null;
    team_id: string | null;
    target_label: string | null;
}

export interface ShareActivityPayload {
    learner_key: string;
    learner_label?: string;
    event_type: 'accessed' | 'progress_updated' | 'board_completed';
    completed_task_ids: string[];
    help_task_ids?: string[];
    evidence_entries?: Array<{
        task_id: string;
        note?: string;
        url?: string;
        submitted_at: string;
    }>;
    last_access_at?: string;
}

export interface ShareActivityResponse {
    code: string;
    learner_key: string;
    learner_label: string | null;
    completed_task_ids: string[];
    help_task_ids: string[];
    validated_task_ids: string[];
    evidence_entries: ProTaskEvidenceEntryResponse[];
    feedback_entries: ProTaskFeedbackEntryResponse[];
    progress_percent: number;
    last_access_at: string;
}

export class PasosApiError extends Error {
    status: number;
    code: string;

    constructor(message: string, status: number, code = 'api_error') {
        super(message);
        this.name = 'PasosApiError';
        this.status = status;
        this.code = code;
    }
}

let refreshPromise: Promise<ProAuthTokenResponse> | null = null;

function getStoredAccessToken(): string | null {
    try {
        return sessionStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {
        return null;
    }
}

function storeAccessToken(accessToken: string | null): void {
    try {
        if (accessToken) {
            sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        } else {
            sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        }
    } catch {
        // Ignore storage failures in restricted environments.
    }
}

function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const cookies = document.cookie ? document.cookie.split('; ') : [];
    for (const cookie of cookies) {
        const [cookieName, ...valueParts] = cookie.split('=');
        if (cookieName === name) {
            return decodeURIComponent(valueParts.join('='));
        }
    }
    return null;
}

async function toApiError(response: Response): Promise<PasosApiError> {
    let message = `La API devolvio ${response.status}`;
    let code = 'api_error';

    try {
        const payload = await response.json() as ErrorEnvelope;
        if (payload.error?.message) {
            message = payload.error.message;
        }
        if (payload.error?.code) {
            code = payload.error.code;
        }
    } catch {
        if (response.statusText) {
            message = response.statusText;
        }
    }

    return new PasosApiError(message, response.status, code);
}

async function requestJson<T>(
    path: string,
    init: RequestInit = {},
    retryOnUnauthorized = true,
): Promise<T> {
    const headers = new Headers(init.headers);
    if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const accessToken = getStoredAccessToken();
    if (accessToken && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const response = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers,
        credentials: 'include',
    });

    if (response.status === 401 && retryOnUnauthorized) {
        try {
            await refreshProSession();
            return requestJson<T>(path, init, false);
        } catch {
            storeAccessToken(null);
        }
    }

    if (!response.ok) {
        throw await toApiError(response);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}

async function requestText(
    path: string,
    init: RequestInit = {},
    retryOnUnauthorized = true,
): Promise<string> {
    const headers = new Headers(init.headers);
    const accessToken = getStoredAccessToken();
    if (accessToken && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const response = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers,
        credentials: 'include',
    });

    if (response.status === 401 && retryOnUnauthorized) {
        try {
            await refreshProSession();
            return requestText(path, init, false);
        } catch {
            storeAccessToken(null);
        }
    }

    if (!response.ok) {
        throw await toApiError(response);
    }

    return response.text();
}

async function authenticate(
    path: '/auth/login' | '/auth/register',
    payload: Record<string, unknown>,
): Promise<ProAuthTokenResponse> {
    const response = await requestJson<ProAuthTokenResponse>(path, {
        method: 'POST',
        body: JSON.stringify(payload),
    }, false);
    storeAccessToken(response.access_token);
    return response;
}

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

export function getApiErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof PasosApiError) {
        return error.message;
    }
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return fallback;
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

export async function registerProUser(payload: {
    email: string;
    displayName?: string;
    password: string;
}): Promise<ProAuthTokenResponse> {
    return authenticate('/auth/register', {
        email: payload.email,
        display_name: payload.displayName || undefined,
        password: payload.password,
    });
}

export async function loginProUser(payload: {
    email: string;
    password: string;
}): Promise<ProAuthTokenResponse> {
    return authenticate('/auth/login', {
        email: payload.email,
        password: payload.password,
    });
}

async function refreshProSessionPayload(): Promise<ProAuthTokenResponse> {
    if (!refreshPromise) {
        refreshPromise = (async () => {
            const csrfToken = getCookie(CSRF_COOKIE_NAME);
            const headers = new Headers({
                'Content-Type': 'application/json',
            });

            if (csrfToken) {
                headers.set('X-CSRF-Token', csrfToken);
            }

            const response = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers,
                body: JSON.stringify({}),
                credentials: 'include',
            });

            if (!response.ok) {
                throw await toApiError(response);
            }

            const payload = await response.json() as ProAuthTokenResponse;
            storeAccessToken(payload.access_token);
            return payload;
        })().finally(() => {
            refreshPromise = null;
        });
    }

    return refreshPromise;
}

export async function refreshProSession(): Promise<string> {
    const payload = await refreshProSessionPayload();
    return payload.access_token;
}

export async function startSsoLogin(next = '/'): Promise<void> {
    const safeNext = next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/api/') ? next : '/';
    const targetUrl = `${API_BASE}/auth/oidc/start?next=${encodeURIComponent(safeNext)}`;

    try {
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(registration => registration.unregister()));
        }
    } catch {
        // A stale service worker must never block the SSO redirect.
    }

    window.location.assign(targetUrl);
}

export async function completeSsoLogin(): Promise<ProAuthTokenResponse> {
    return refreshProSessionPayload();
}

export async function logoutProUser(): Promise<void> {
    const csrfToken = getCookie(CSRF_COOKIE_NAME);
    const headers = new Headers({
        'Content-Type': 'application/json',
    });

    if (csrfToken) {
        headers.set('X-CSRF-Token', csrfToken);
    }

    try {
        await requestJson<{ status: string }>('/auth/logout', {
            method: 'POST',
            headers,
            body: JSON.stringify({}),
        }, false);
    } finally {
        storeAccessToken(null);
    }
}

export async function getCurrentProUser(): Promise<ProUserResponse> {
    return requestJson<ProUserResponse>('/auth/me');
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

export async function getExecutiveDashboard(filters?: {
    organizationId?: string | null;
    teamId?: string | null;
    boardId?: string | null;
    ownerLabel?: string | null;
    periodDays?: number;
}): Promise<ProExecutiveDashboardResponse> {
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
    return requestJson<ProExecutiveDashboardResponse>(`/executive/dashboard${query ? `?${query}` : ''}`, {
        method: 'GET',
    });
}

export async function exportExecutiveDashboardCsv(filters?: {
    organizationId?: string | null;
    teamId?: string | null;
    boardId?: string | null;
    ownerLabel?: string | null;
    periodDays?: number;
}): Promise<string> {
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
    return requestText(`/executive/dashboard.csv${query ? `?${query}` : ''}`, {
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
