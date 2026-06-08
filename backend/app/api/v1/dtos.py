from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints
from typing_extensions import Annotated

StrictId = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)]
StrictTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=160)]
StrictName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
StrongPassword = Annotated[str, StringConstraints(min_length=12, max_length=128)]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ErrorEnvelope(StrictModel):
    error: dict[str, Any]


class HealthResponse(StrictModel):
    status: Literal["ok"]
    app: str
    version: str
    environment: str
    timestamp: datetime


class UserResponse(StrictModel):
    id: StrictId
    email: EmailStr
    display_name: str | None = None
    workspace_code: Annotated[str, StringConstraints(strip_whitespace=True, min_length=6, max_length=16)]


class AuthRegisterRequest(StrictModel):
    email: EmailStr
    display_name: StrictName | None = None
    password: StrongPassword


class AuthLoginRequest(StrictModel):
    email: EmailStr
    password: StrongPassword


class AuthRefreshRequest(StrictModel):
    refresh_token: str | None = None


class AuthLogoutRequest(StrictModel):
    refresh_token: str | None = None


class AuthTokenResponse(StrictModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_at: datetime
    mode: Literal["pro"] = "pro"
    user: UserResponse


class AttachmentDTO(StrictModel):
    id: StrictId
    kind: Literal["link", "image", "video", "file"]
    url: str = Field(min_length=1, max_length=4096)
    title: str | None = Field(default=None, max_length=255)


class PictogramDTO(StrictModel):
    id: int
    url: str = Field(min_length=1, max_length=2048)
    title: str = Field(min_length=1, max_length=255)


class TaskEvidenceEntryDTO(StrictModel):
    task_id: StrictId
    note: str | None = Field(default=None, max_length=1000)
    url: str | None = Field(default=None, max_length=4096)
    submitted_at: datetime


class TaskFeedbackEntryDTO(StrictModel):
    task_id: StrictId
    message: str = Field(min_length=1, max_length=1500)
    status: Literal["comment", "needs_revision", "validated"]
    author_label: str | None = Field(default=None, max_length=120)
    created_at: datetime


class TaskSnapshotDTO(StrictModel):
    id: StrictId
    columnId: StrictId
    title: StrictTitle
    description: str | None = Field(default=None, max_length=5000)
    labels: list[Annotated[str, StringConstraints(max_length=32)]] = Field(default_factory=list)
    color: str | None = Field(default=None, max_length=32)
    icon: str | None = Field(default=None, max_length=2048)
    taskType: Literal["task", "learning_step", "evidence", "agreement", "document", "resource", "incident", "milestone"] | None = None
    pictograms: list[PictogramDTO] = Field(default_factory=list)
    attachments: list[AttachmentDTO] = Field(default_factory=list)
    durationSeconds: int | None = Field(default=None, ge=0, le=86400)
    objective: str | None = Field(default=None, max_length=1000)
    supportText: str | None = Field(default=None, max_length=1500)
    expectedEvidence: str | None = Field(default=None, max_length=1000)
    nextStep: str | None = Field(default=None, max_length=500)
    pedagogicalStatus: Literal["not_started", "in_progress", "needs_help", "ready_for_review", "validated"] | None = None
    startDate: datetime | None = None
    dueDate: datetime | None = None
    dependencyTaskIds: list[StrictId] = Field(default_factory=list, max_length=50)
    ownerLabel: str | None = Field(default=None, max_length=120)
    effortPoints: int | None = Field(default=None, ge=0, le=100)
    createdAt: int = Field(ge=0)


class ColumnSnapshotDTO(StrictModel):
    id: StrictId
    title: StrictTitle
    order: int = Field(ge=0)


class BoardSnapshotDTO(StrictModel):
    columns: list[ColumnSnapshotDTO]
    tasks: list[TaskSnapshotDTO]


class BoardCreateRequest(StrictModel):
    id: str | None = None
    title: StrictTitle
    snapshot: BoardSnapshotDTO
    organization_id: StrictId | None = None
    team_id: StrictId | None = None
    context_type: Literal["personal", "organization", "team"] | None = None
    board_type: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=32)] | None = None


class BoardUpdateRequest(StrictModel):
    title: StrictTitle
    snapshot: BoardSnapshotDTO
    organization_id: StrictId | None = None
    team_id: StrictId | None = None
    context_type: Literal["personal", "organization", "team"] | None = None
    board_type: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=32)] | None = None


class BoardResponse(StrictModel):
    id: str
    title: str
    owner_id: StrictId
    organization_id: StrictId | None = None
    team_id: StrictId | None = None
    context_type: Literal["personal", "organization", "team"] | None = None
    board_type: str | None = None
    snapshot: BoardSnapshotDTO
    role: Literal["owner", "editor", "viewer"]
    created_at: datetime
    updated_at: datetime


class ShareCreateRequest(StrictModel):
    permission: Literal["viewer", "editor"] = "viewer"
    ttl_hours: int = Field(default=168, ge=1, le=720)
    max_uses: int | None = Field(default=None, ge=1, le=100000)
    allow_anonymous: bool = True


class ShareResponse(StrictModel):
    code: str
    permission: Literal["viewer", "editor"]
    expires_at: datetime
    url: str


class ShareResolveResponse(StrictModel):
    code: str
    permission: Literal["viewer", "editor"]
    expires_at: datetime
    board: BoardResponse


class ShareActivityRequest(StrictModel):
    learner_key: StrictId
    learner_label: StrictName | None = None
    event_type: Literal["accessed", "progress_updated", "board_completed"]
    completed_task_ids: list[StrictId] = Field(default_factory=list)
    help_task_ids: list[StrictId] = Field(default_factory=list)
    evidence_entries: list[TaskEvidenceEntryDTO] = Field(default_factory=list)
    last_access_at: datetime | None = None


class ShareActivityResponse(StrictModel):
    code: str
    learner_key: StrictId
    learner_label: str | None = None
    completed_task_ids: list[StrictId]
    help_task_ids: list[StrictId] = Field(default_factory=list)
    validated_task_ids: list[StrictId] = Field(default_factory=list)
    evidence_entries: list[TaskEvidenceEntryDTO] = Field(default_factory=list)
    feedback_entries: list[TaskFeedbackEntryDTO] = Field(default_factory=list)
    progress_percent: int = Field(ge=0, le=100)
    last_access_at: datetime


class BoardActivityEventResponse(StrictModel):
    id: StrictId
    event_type: str
    actor_type: str
    actor_id: str | None = None
    actor_label: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    occurred_at: datetime


class BoardLearnerInsightResponse(StrictModel):
    learner_key: StrictId
    learner_label: str | None = None
    share_code: str | None = None
    completed_count: int = Field(ge=0)
    total_tasks: int = Field(ge=0)
    progress_percent: int = Field(ge=0, le=100)
    last_event_type: str | None = None
    last_access_at: datetime
    help_task_count: int = Field(ge=0)
    evidence_count: int = Field(ge=0)
    feedback_count: int = Field(ge=0)
    validated_count: int = Field(ge=0)
    help_task_ids: list[StrictId] = Field(default_factory=list)
    validated_task_ids: list[StrictId] = Field(default_factory=list)
    evidence_entries: list[TaskEvidenceEntryDTO] = Field(default_factory=list)
    feedback_entries: list[TaskFeedbackEntryDTO] = Field(default_factory=list)


class BoardInsightsResponse(StrictModel):
    board_id: StrictId
    board_title: str
    total_tasks: int = Field(ge=0)
    active_share_count: int = Field(ge=0)
    share_access_count: int = Field(ge=0)
    learner_count: int = Field(ge=0)
    completed_learners: int = Field(ge=0)
    learners: list[BoardLearnerInsightResponse] = Field(default_factory=list)
    recent_events: list[BoardActivityEventResponse] = Field(default_factory=list)


class LearnerFeedbackRequest(StrictModel):
    share_code: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=32)]
    learner_key: StrictId
    task_id: StrictId
    message: str = Field(min_length=1, max_length=1500)
    status: Literal["comment", "needs_revision", "validated"] = "comment"
    resolve_help_request: bool = True


class LearningAssignmentCreateRequest(StrictModel):
    target_type: Literal["student", "group"] = "student"
    target_label: StrictTitle
    target_key: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)] | None = None
    due_date: datetime | None = None
    notes: str | None = Field(default=None, max_length=1500)


class LearningAssignmentResponse(StrictModel):
    id: StrictId
    board_id: StrictId
    board_title: str
    organization_id: StrictId | None = None
    team_id: StrictId | None = None
    target_type: Literal["student", "group"]
    target_label: str
    target_key: str | None = None
    due_date: datetime | None = None
    status: Literal["active", "completed", "archived"]
    notes: str | None = None
    created_at: datetime
    updated_at: datetime


class BoardCommentCreateRequest(StrictModel):
    message: str = Field(min_length=1, max_length=2000)


class BoardCommentResponse(StrictModel):
    id: StrictId
    board_id: StrictId
    author_id: StrictId
    author_label: str | None = None
    message: str
    mentions: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class BoardMeetingCreateRequest(StrictModel):
    title: StrictTitle
    summary: str | None = Field(default=None, max_length=5000)
    decisions: list[Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]] = Field(default_factory=list, max_length=30)
    linked_task_ids: list[StrictId] = Field(default_factory=list, max_length=100)


class BoardMeetingResponse(StrictModel):
    id: StrictId
    board_id: StrictId
    author_id: StrictId
    author_label: str | None = None
    title: str
    summary: str | None = None
    decisions: list[str] = Field(default_factory=list)
    linked_task_ids: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class OrganizationCreateRequest(StrictModel):
    name: StrictTitle
    slug: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)] | None = None
    plan_type: Literal["school", "district", "pilot"] = "school"


class OrganizationResponse(StrictModel):
    id: StrictId
    name: StrictTitle
    slug: str
    plan_type: str
    is_active: bool
    role: Literal["organization_admin", "leadership", "member"]
    created_at: datetime
    updated_at: datetime


class TeamCreateRequest(StrictModel):
    name: StrictTitle
    slug: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)] | None = None
    team_type: Literal["cycle", "department", "leadership", "project", "support", "custom"] = "custom"
    visibility: Literal["private", "organization"] = "private"


class TeamResponse(StrictModel):
    id: StrictId
    organization_id: StrictId
    name: StrictTitle
    slug: str
    team_type: str
    visibility: str
    is_archived: bool
    role: Literal["owner", "editor", "viewer"] | None = None
    created_at: datetime
    updated_at: datetime


class TeamMemberRoleUpdateRequest(StrictModel):
    role: Literal["owner", "editor", "viewer"]


class OrgMemberRoleUpdateRequest(StrictModel):
    role: Literal["organization_admin", "leadership", "teacher", "member"]


class OrgMembershipResponse(StrictModel):
    id: StrictId
    organization_id: StrictId
    user: UserResponse
    role: Literal["organization_admin", "leadership", "teacher", "member"]
    status: Literal["active"]
    created_at: datetime
    updated_at: datetime


class TeamMembershipCreateRequest(StrictModel):
    user_id: StrictId | None = None
    user_email: EmailStr | None = None
    user_code: Annotated[str, StringConstraints(strip_whitespace=True, min_length=6, max_length=16)] | None = None
    role: Literal["owner", "editor", "viewer"] = "viewer"


class TeamMembershipResponse(StrictModel):
    id: StrictId
    team_id: StrictId
    user: UserResponse
    role: Literal["owner", "editor", "viewer"]
    status: Literal["active"]
    created_at: datetime
    updated_at: datetime


class BoardDocumentCreateRequest(StrictModel):
    title: StrictTitle
    kind: Literal["note", "link", "file", "image", "audio", "video", "embed"] = "note"
    status: Literal["draft", "in_review", "approved", "published"] = "draft"
    description: str | None = Field(default=None, max_length=2000)
    url: str | None = Field(default=None, max_length=4096)
    content: str | None = Field(default=None, max_length=20000)
    linked_task_ids: list[StrictId] = Field(default_factory=list, max_length=100)
    tags: list[Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]] = Field(default_factory=list, max_length=30)


class BoardDocumentUpdateRequest(StrictModel):
    title: StrictTitle
    kind: Literal["note", "link", "file", "image", "audio", "video", "embed"]
    status: Literal["draft", "in_review", "approved", "published"]
    description: str | None = Field(default=None, max_length=2000)
    url: str | None = Field(default=None, max_length=4096)
    content: str | None = Field(default=None, max_length=20000)
    linked_task_ids: list[StrictId] = Field(default_factory=list, max_length=100)
    tags: list[Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]] = Field(default_factory=list, max_length=30)


class BoardDocumentResponse(StrictModel):
    id: StrictId
    board_id: StrictId
    author_id: StrictId
    author_label: str | None = None
    title: StrictTitle
    kind: Literal["note", "link", "file", "image", "audio", "video", "embed"]
    status: Literal["draft", "in_review", "approved", "published"]
    description: str | None = None
    url: str | None = None
    content: str | None = None
    linked_task_ids: list[StrictId] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    current_version: int = Field(ge=1)
    created_at: datetime
    updated_at: datetime


class BoardDocumentVersionResponse(StrictModel):
    id: StrictId
    document_id: StrictId
    board_id: StrictId
    author_id: StrictId
    version_number: int = Field(ge=1)
    title: StrictTitle
    kind: Literal["note", "link", "file", "image", "audio", "video", "embed"]
    status: Literal["draft", "in_review", "approved", "published"]
    description: str | None = None
    url: str | None = None
    content: str | None = None
    linked_task_ids: list[StrictId] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class CalendarFeedCreateRequest(StrictModel):
    name: StrictTitle
    scope_type: Literal["personal", "team"] = "personal"
    team_id: StrictId | None = None
    include_task_due_dates: bool = True
    include_assignments: bool = True


class CalendarFeedResponse(StrictModel):
    id: StrictId
    name: StrictTitle
    scope_type: Literal["personal", "team"]
    organization_id: StrictId | None = None
    team_id: StrictId | None = None
    include_task_due_dates: bool = True
    include_assignments: bool = True
    is_active: bool
    url: str = Field(min_length=1, max_length=4096)
    created_at: datetime
    updated_at: datetime


class CalendarEventResponse(StrictModel):
    id: StrictId
    event_type: Literal["task_due", "assignment_due"]
    title: StrictTitle
    description: str | None = Field(default=None, max_length=4000)
    start_at: datetime
    end_at: datetime
    board_id: StrictId
    board_title: StrictTitle
    organization_id: StrictId | None = None
    team_id: StrictId | None = None
    target_label: str | None = Field(default=None, max_length=160)


class TimelineItemResponse(StrictModel):
    task_id: StrictId
    board_id: StrictId
    board_title: StrictTitle
    title: StrictTitle
    task_type: Literal["task", "learning_step", "evidence", "agreement", "document", "resource", "incident", "milestone"]
    owner_label: str | None = Field(default=None, max_length=120)
    effort_points: int = Field(default=0, ge=0, le=100)
    column_title: str | None = Field(default=None, max_length=160)
    dependency_task_ids: list[StrictId] = Field(default_factory=list)
    blocked_by_task_ids: list[StrictId] = Field(default_factory=list)
    start_at: datetime | None = None
    end_at: datetime | None = None
    is_blocked: bool
    is_delayed: bool
    is_milestone: bool
    is_completed: bool
    context_type: Literal["personal", "organization", "team"] | None = None
    organization_id: StrictId | None = None
    team_id: StrictId | None = None


class TimelineAlertResponse(StrictModel):
    alert_type: Literal["blocked", "delayed", "milestone_at_risk"]
    severity: Literal["warning", "critical"]
    task_id: StrictId
    board_id: StrictId
    board_title: StrictTitle
    title: StrictTitle
    owner_label: str | None = Field(default=None, max_length=120)
    message: str = Field(min_length=1, max_length=500)


class TimelineCapacityResponse(StrictModel):
    owner_label: str = Field(min_length=1, max_length=120)
    task_count: int = Field(ge=0)
    effort_points: int = Field(ge=0)
    blocked_count: int = Field(ge=0)
    delayed_count: int = Field(ge=0)


class TimelineOverviewResponse(StrictModel):
    scope_type: Literal["personal", "organization", "team"]
    organization_id: StrictId | None = None
    team_id: StrictId | None = None
    board_id: StrictId | None = None
    item_count: int = Field(ge=0)
    blocked_count: int = Field(ge=0)
    delayed_count: int = Field(ge=0)
    milestone_risk_count: int = Field(ge=0)
    items: list[TimelineItemResponse] = Field(default_factory=list)
    alerts: list[TimelineAlertResponse] = Field(default_factory=list)
    capacities: list[TimelineCapacityResponse] = Field(default_factory=list)


class ExecutiveSummaryResponse(StrictModel):
    total_boards: int = Field(ge=0)
    total_tasks: int = Field(ge=0)
    completed_tasks: int = Field(ge=0)
    progress_percent: int = Field(ge=0, le=100)
    blocked_count: int = Field(ge=0)
    delayed_count: int = Field(ge=0)
    overdue_milestone_count: int = Field(ge=0)
    pending_document_count: int = Field(ge=0)
    recurrent_blocker_count: int = Field(ge=0)


class ExecutiveTeamMetricResponse(StrictModel):
    team_id: StrictId | None = None
    team_name: str = Field(min_length=1, max_length=160)
    board_count: int = Field(ge=0)
    total_tasks: int = Field(ge=0)
    completed_tasks: int = Field(ge=0)
    progress_percent: int = Field(ge=0, le=100)
    blocked_count: int = Field(ge=0)
    delayed_count: int = Field(ge=0)
    overdue_milestone_count: int = Field(ge=0)
    pending_document_count: int = Field(ge=0)


class ExecutiveOwnerMetricResponse(StrictModel):
    owner_label: str = Field(min_length=1, max_length=120)
    board_count: int = Field(ge=0)
    task_count: int = Field(ge=0)
    effort_points: int = Field(ge=0)
    blocked_count: int = Field(ge=0)
    delayed_count: int = Field(ge=0)


class ExecutiveProjectProgressResponse(StrictModel):
    board_id: StrictId
    board_title: StrictTitle
    team_id: StrictId | None = None
    team_name: str | None = Field(default=None, max_length=160)
    board_type: str | None = Field(default=None, max_length=32)
    total_tasks: int = Field(ge=0)
    completed_tasks: int = Field(ge=0)
    progress_percent: int = Field(ge=0, le=100)
    blocked_count: int = Field(ge=0)
    delayed_count: int = Field(ge=0)
    overdue_milestone_count: int = Field(ge=0)
    pending_document_count: int = Field(ge=0)
    updated_at: datetime


class ExecutiveRecurringBlockerResponse(StrictModel):
    blocker_label: StrictTitle
    blocked_task_count: int = Field(ge=0)
    board_count: int = Field(ge=0)
    board_titles: list[str] = Field(default_factory=list, max_length=50)
    owner_labels: list[str] = Field(default_factory=list, max_length=100)


class ExecutivePendingDocumentResponse(StrictModel):
    document_id: StrictId
    board_id: StrictId
    board_title: StrictTitle
    team_id: StrictId | None = None
    team_name: str | None = Field(default=None, max_length=160)
    title: StrictTitle
    status: Literal["draft", "in_review", "approved", "published"]
    author_label: str | None = Field(default=None, max_length=120)
    updated_at: datetime
    age_days: int = Field(ge=0)


class ExecutiveOverdueMilestoneResponse(StrictModel):
    task_id: StrictId
    board_id: StrictId
    board_title: StrictTitle
    team_id: StrictId | None = None
    team_name: str | None = Field(default=None, max_length=160)
    title: StrictTitle
    owner_label: str | None = Field(default=None, max_length=120)
    due_at: datetime
    delayed_days: int = Field(ge=0)
    blocked_by_task_ids: list[StrictId] = Field(default_factory=list)


class ExecutiveDashboardResponse(StrictModel):
    scope_type: Literal["personal", "organization", "team"]
    organization_id: StrictId | None = None
    team_id: StrictId | None = None
    board_id: StrictId | None = None
    owner_label: str | None = Field(default=None, max_length=120)
    period_days: int = Field(ge=7, le=180)
    generated_at: datetime
    summary: ExecutiveSummaryResponse
    teams: list[ExecutiveTeamMetricResponse] = Field(default_factory=list)
    owners: list[ExecutiveOwnerMetricResponse] = Field(default_factory=list)
    projects: list[ExecutiveProjectProgressResponse] = Field(default_factory=list)
    recurring_blockers: list[ExecutiveRecurringBlockerResponse] = Field(default_factory=list)
    pending_documents: list[ExecutivePendingDocumentResponse] = Field(default_factory=list)
    overdue_milestones: list[ExecutiveOverdueMilestoneResponse] = Field(default_factory=list)
