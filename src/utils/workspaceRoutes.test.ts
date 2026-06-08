import { describe, expect, it } from 'vitest';
import { getBoardWorkspacePath, getWorkspaceModeFromPath, getWorkspaceSubPath } from './workspaceRoutes';

describe('workspaceRoutes', () => {
    it('detects organization routes from pathname', () => {
        expect(getWorkspaceModeFromPath('/organizacion')).toBe('organization');
        expect(getWorkspaceModeFromPath('/organizacion/timeline')).toBe('organization');
        expect(getWorkspaceModeFromPath('/aula')).toBe('classroom');
    });

    it('builds nested paths without duplicating slashes', () => {
        expect(getWorkspaceSubPath('classroom', 'agenda')).toBe('/aula/agenda');
        expect(getWorkspaceSubPath('organization', '/centro')).toBe('/organizacion/centro');
    });

    it('routes organization boards to the organization workspace', () => {
        expect(getBoardWorkspacePath({ organizationId: 'org-1', teamId: undefined, contextType: 'organization' })).toBe('/organizacion');
        expect(getBoardWorkspacePath({ organizationId: undefined, teamId: undefined, contextType: 'personal' })).toBe('/aula');
    });
});
