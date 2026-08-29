/*
 * Tipos de la API Pro de Pasos (DTOs snake_case tal y como los expone el backend).
 */
import type { Board } from '../../store/boardStore';

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
    completed_task_ids: string[];
    help_task_ids: string[];
    validated_task_ids: string[];
    evidence_entries: ProTaskEvidenceEntryResponse[];
    feedback_entries: ProTaskFeedbackEntryResponse[];
    progress_percent: number;
    last_access_at: string;
}
