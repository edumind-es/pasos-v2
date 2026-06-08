export type AppEventLevel = 'info' | 'warning' | 'error';

export interface AppEvent {
    id: string;
    type: string;
    level: AppEventLevel;
    message: string;
    createdAt: string;
    metadata?: Record<string, string | number | boolean | null>;
}

export const APP_EVENTS_KEY = 'pasos-app-events';
const MAX_EVENTS = 120;

function safeReadEvents(): AppEvent[] {
    try {
        const raw = localStorage.getItem(APP_EVENTS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as AppEvent[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function safeWriteEvents(events: AppEvent[]): void {
    try {
        localStorage.setItem(APP_EVENTS_KEY, JSON.stringify(events));
    } catch {
        // Ignore quota and storage failures.
    }
}

export function logAppEvent(event: Omit<AppEvent, 'id' | 'createdAt'>): AppEvent {
    const entry: AppEvent = {
        ...event,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
    };

    const nextEvents = [entry, ...safeReadEvents()].slice(0, MAX_EVENTS);
    safeWriteEvents(nextEvents);

    const shouldLogToConsole = import.meta.env.DEV || event.level === 'error';
    if (!shouldLogToConsole) {
        return entry;
    }

    if (event.level === 'error') {
        console.error(`[pasos] ${event.type}: ${event.message}`, event.metadata ?? {});
    } else if (event.level === 'warning') {
        console.warn(`[pasos] ${event.type}: ${event.message}`, event.metadata ?? {});
    } else {
        console.info(`[pasos] ${event.type}: ${event.message}`, event.metadata ?? {});
    }

    return entry;
}

export function getRecentAppEvents(limit = 8): AppEvent[] {
    return safeReadEvents().slice(0, limit);
}

export function getAllAppEvents(): AppEvent[] {
    return safeReadEvents();
}

export function clearAppEvents(): void {
    safeWriteEvents([]);
}
