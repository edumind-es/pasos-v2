import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it, beforeEach } from 'vitest';
import { StorageControlCenter } from './StorageControlCenter';
import { useStore } from '../store/boardStore';

describe('StorageControlCenter', () => {
    beforeEach(() => {
        useStore.setState({
            users: [],
            boards: [],
            boardTemplates: [],
            deletedTasks: [],
            currentUser: null,
            activeBoardId: null,
            currentTheme: 'professional',
            visualMode: 'eink',
            selectedTaskIds: [],
            proSyncState: 'idle',
            lastProSyncAt: null,
            lastProSyncError: null,
        });
    });

    it('has no obvious accessibility violations', async () => {
        const { container } = render(<StorageControlCenter onClose={() => undefined} />);
        const results = await axe(container);
        expect(results.violations).toHaveLength(0);
    });
});
