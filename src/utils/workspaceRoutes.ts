import type { Board, BoardContextType } from '../store/boardStore';

export type WorkspaceMode = 'classroom' | 'organization';

type RoutedBoardLike = Pick<Board, 'organizationId' | 'teamId' | 'contextType'> | null | undefined;

function normalizeSuffix(suffix?: string): string {
    if (!suffix) return '';
    return suffix.startsWith('/') ? suffix : `/${suffix}`;
}

export function getWorkspaceModeFromPath(pathname: string): WorkspaceMode {
    return pathname.startsWith('/organizacion') ? 'organization' : 'classroom';
}

export function getWorkspaceRootPath(mode: WorkspaceMode): string {
    return mode === 'organization' ? '/organizacion' : '/aula';
}

export function getWorkspaceSubPath(mode: WorkspaceMode, suffix?: string): string {
    return `${getWorkspaceRootPath(mode)}${normalizeSuffix(suffix)}`;
}

export function getWorkspaceModeFromBoard(board: RoutedBoardLike): WorkspaceMode {
    const contextType: BoardContextType | undefined = board?.contextType;
    if (board?.teamId || board?.organizationId || contextType === 'team' || contextType === 'organization') {
        return 'organization';
    }
    return 'classroom';
}

export function getBoardWorkspacePath(board: RoutedBoardLike): string {
    return getWorkspaceRootPath(getWorkspaceModeFromBoard(board));
}

export function matchesWorkspaceContext(
    board: Board,
    isProUser: boolean,
    ownerId: string | null,
    organizationId: string | null,
    teamId: string | null,
    allowPersonalWorkspace = true,
): boolean {
    if (!isProUser) {
        return ownerId ? board.ownerId === ownerId : false;
    }
    if (teamId) return board.teamId === teamId;
    if (organizationId) return board.organizationId === organizationId && !board.teamId;
    if (!allowPersonalWorkspace) return false;
    return !board.organizationId && !board.teamId;
}
