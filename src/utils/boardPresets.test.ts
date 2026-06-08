import { describe, expect, it } from 'vitest';
import { getBoardTypeOptions, getDefaultBoardType, getDefaultColumnsForBoardType } from './boardPresets';

describe('boardPresets', () => {
    it('returns team-specific options for team context', () => {
        const options = getBoardTypeOptions('team');
        expect(options.map((option) => option.value)).toEqual([
            'team_coordination',
            'meeting_followup',
            'department_project',
        ]);
    });

    it('returns a stable default type for organization context', () => {
        expect(getDefaultBoardType('organization')).toBe('organization_project');
    });

    it('builds extended coordination columns for team boards', () => {
        expect(getDefaultColumnsForBoardType('team_coordination').map((column) => column.title)).toEqual([
            'Pendiente',
            'En marcha',
            'Bloqueado',
            'Cerrado',
        ]);
    });
});
