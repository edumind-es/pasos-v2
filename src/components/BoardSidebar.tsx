import { useStore, type Board, type Column } from '../store/boardStore';
import { SidebarIconStrip } from './SidebarIconStrip';
import { CLASSROOM_SIDEBAR_PANELS, ORG_SIDEBAR_PANELS, type SidebarPanelDef } from './sidebarPanels';
import { ClassroomQuickCreate } from './ClassroomQuickCreate';
import { BoardInsightsPanel } from './BoardInsightsPanel';
import { WorkspaceContextBar } from './WorkspaceContextBar';
import { TeamActivityPanel } from './TeamActivityPanel';
import { TeamCoordinationPanel } from './TeamCoordinationPanel';
import { TeamMeetingPanel } from './TeamMeetingPanel';
import type { ProBoardInsightsResponse } from '../services/pasosApi';
import type { ShareSource } from '../hooks/useShareBoard';
import type { SharedBoard } from '../utils/shareCode';
import type { SupportedBoardType } from '../utils/boardPresets';

interface Props {
    board: Board;
    isProUser: boolean;
    isClassroomWorkspace: boolean;
    isReadOnlyBoard: boolean;
    canCreateBoardInWorkspace: boolean;
    columns: Column[];
    activePanel: string | null;
    onChangePanel: (panel: string | null) => void;
    onQuickCreateTask: (columnId: string, title: string) => void;
    onRequestCreateBoard: (boardType?: SupportedBoardType | null) => void;
    onSelectLearner: (learnerKey: string | null) => void;
    shareCode: string | null;
    shareSource: ShareSource;
    shareExpiresAt: string | null;
    existingShare: SharedBoard | undefined;
    remoteInsights: ProBoardInsightsResponse | null;
    remoteInsightsLoading: boolean;
    remoteInsightsError: string | null;
}

/**
 * Sidebar del tablero: tira de iconos + panel expandido según workspace
 * (aula: entrada rápida y seguimiento; claustro: contexto y paneles de equipo).
 */
export function BoardSidebar({
    board,
    isProUser,
    isClassroomWorkspace,
    isReadOnlyBoard,
    canCreateBoardInWorkspace,
    columns,
    activePanel,
    onChangePanel,
    onQuickCreateTask,
    onRequestCreateBoard,
    onSelectLearner,
    shareCode,
    shareSource,
    shareExpiresAt,
    existingShare,
    remoteInsights,
    remoteInsightsLoading,
    remoteInsightsError,
}: Props) {
    const {
        proSyncState,
        lastProSyncAt,
        lastProSyncError,
        workspacePanelPreferences,
        setWorkspacePanelPreference,
    } = useStore();

    const isTeamBoard = board.contextType === 'team' && isProUser && !isClassroomWorkspace;
    const sidebarPanels: SidebarPanelDef[] = isClassroomWorkspace
        ? CLASSROOM_SIDEBAR_PANELS.map((p) => ({ ...p, available: true }))
        : ORG_SIDEBAR_PANELS.map((p) => ({
            ...p,
            available: p.key === 'workspace_context' || isTeamBoard,
        }));

    const activeDef = sidebarPanels.find((p) => p.key === activePanel);

    const renderPanelContent = () => {
        if (!activePanel) return null;
        if (isClassroomWorkspace) {
            if (activePanel === 'quick_create') {
                return (
                    <ClassroomQuickCreate
                        columns={columns}
                        disabled={isReadOnlyBoard}
                        onCreate={onQuickCreateTask}
                    />
                );
            }
            return (
                <BoardInsightsPanel
                    board={board}
                    shareCode={shareCode ?? existingShare?.code ?? null}
                    shareSource={shareCode ? shareSource : (existingShare ? 'local' : shareSource)}
                    shareExpiresAt={shareExpiresAt ?? existingShare?.expiresAt ?? null}
                    proSyncState={proSyncState}
                    lastProSyncAt={lastProSyncAt}
                    lastProSyncError={lastProSyncError}
                    remoteInsights={remoteInsights}
                    remoteInsightsLoading={remoteInsightsLoading}
                    remoteInsightsError={remoteInsightsError}
                    onSelectLearner={onSelectLearner}
                    panelPreferences={{
                        teacher_summary: workspacePanelPreferences.teacher_summary,
                        teacher_share_sync: workspacePanelPreferences.teacher_share_sync,
                        teacher_recent_activity: workspacePanelPreferences.teacher_recent_activity,
                        teacher_learners: workspacePanelPreferences.teacher_learners,
                    }}
                    onUpdatePanelPreference={setWorkspacePanelPreference}
                />
            );
        }
        if (activePanel === 'workspace_context') {
            return (
                <WorkspaceContextBar
                    allowPersonalWorkspace={false}
                    onRequestCreateBoard={(boardType) => {
                        if (!canCreateBoardInWorkspace) return;
                        onRequestCreateBoard(boardType ?? null);
                    }}
                />
            );
        }
        if (activePanel === 'team_coordination') return <TeamCoordinationPanel board={board} />;
        if (activePanel === 'team_meeting') return <TeamMeetingPanel board={board} readOnly={isReadOnlyBoard} />;
        if (activePanel === 'team_activity') return <TeamActivityPanel board={board} readOnly={isReadOnlyBoard} />;
        return null;
    };

    return (
        <>
            {/* Panel expandido */}
            {activePanel && activeDef && (
                <aside className="pasos-sidebar hidden xl:flex flex-col flex-1 min-w-0 border-l border-lme-border/50 overflow-y-auto animate-in slide-in-from-right-4 duration-200" style={{ maxHeight: 'calc(100vh - 5rem)' }}>
                    <div className="flex items-center px-4 py-3 border-b border-lme-border/50 shrink-0">
                        <div>
                            <p className="text-xs font-bold text-ink">{activeDef.label}</p>
                            <p className="text-[11px] text-sub mt-0.5 leading-4">{activeDef.help}</p>
                        </div>
                    </div>
                    <div className="p-4 flex flex-col gap-4">
                        {renderPanelContent()}
                    </div>
                </aside>
            )}
            {/* Tira de iconos */}
            <SidebarIconStrip
                panels={sidebarPanels}
                activePanel={activePanel}
                onToggle={(key) => onChangePanel(activePanel === key ? null : key)}
                onShowKanban={() => onChangePanel(null)}
            />
        </>
    );
}
