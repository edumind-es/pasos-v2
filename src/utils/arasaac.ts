/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import type { Pictogram } from '../store/boardStore';

const ARASAAC_API_BASE = 'https://api.arasaac.org/v1/pictograms';
const ARASAAC_STATIC_BASE = 'https://static.arasaac.org/pictograms';

interface ArasaacSearchResult {
    _id: number;
}

export async function searchPictograms(query: string): Promise<Pictogram[]> {
    if (!query || query.length < 2) return [];

    try {
        const res = await fetch(`${ARASAAC_API_BASE}/es/search/${encodeURIComponent(query)}`);
        if (!res.ok) return [];

        const data = await res.json() as ArasaacSearchResult[];
        return data.map((p) => ({
            id: p._id,
            title: query, // Or use p.keywords[0].keyword if available
            url: `${ARASAAC_STATIC_BASE}/${p._id}/${p._id}_500.png`
        }));
    } catch (e) {
        console.error('ARASAAC Search Error:', e);
        return [];
    }
}

export async function getBestPictogramMatch(term: string): Promise<Pictogram | null> {
    // 1. Clean term and Stopwords
    const STOPWORDS = ['la', 'el', 'las', 'los', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'en', 'para', 'con', 'y', 'o', 'que', 'a'];

    // Helper to clean and filter
    const clean = (text: string) => {
        return text.toLowerCase()
            .replace(/[.,;:]/g, '')
            .split(' ')
            .filter(w => !STOPWORDS.includes(w) && w.length > 2)
            .join(' ');
    };

    const cleanTerm = clean(term);

    // Strategy 1: Search exact (original, then clean)
    let results = await searchPictograms(term);

    if (results.length === 0 && cleanTerm !== term.toLowerCase()) {
        results = await searchPictograms(cleanTerm);
    }

    // Strategy 2: If no results, try individual significant words
    if (results.length === 0 && cleanTerm.includes(' ')) {
        const words = cleanTerm.split(' ');

        // Priority: First word (often Verb in imperative) -> Last word (often Object)
        // Try First word (Verb)
        if (words.length > 0) {
            results = await searchPictograms(words[0]);
        }

        // Try Last word (Object) if first failed
        if (results.length === 0 && words.length > 1) {
            results = await searchPictograms(words[words.length - 1]);
        }
    }

    if (results.length > 0) {
        return results[0];
    }

    return null;
}

function extractSequenceTerms(title: string): string[] {
    const normalized = title
        .replace(/[()]/g, ' ')
        .replace(/->/g, ' | ')
        .replace(/[;,/]+/g, ' | ')
        .replace(/\s+(y luego|y después|luego|después|entonces|y|e|o)\s+/gi, ' | ')
        .replace(/\s+/g, ' ')
        .trim();

    return normalized
        .split('|')
        .map(part => part.trim())
        .filter(part => part.length > 2);
}

export async function autoAssignPictogramsToTasks(tasks: { title: string, pictograms?: Pictogram[], icon?: string }[]): Promise<void> {
    // Modify tasks in place or return new array?
    // Since we usually pass a state object that will be cloned, let's just process it.

    // Limit concurrency to avoid spamming API too hard if many tasks
    // For MVP, sequential or small batch is fine.

    for (const task of tasks) {
        if ((task.pictograms?.length ?? 0) > 0) {
            if (!task.icon) {
                task.icon = task.pictograms![0].url;
            }
            continue;
        }

        const sequenceTerms = extractSequenceTerms(task.title);
        const searchTerms = sequenceTerms.length > 1 ? sequenceTerms : [task.title];
        const matches: Pictogram[] = [];
        const seen = new Set<number>();

        for (const term of searchTerms.slice(0, 4)) {
            const match = await getBestPictogramMatch(term);
            if (match && !seen.has(match.id)) {
                seen.add(match.id);
                matches.push(match);
            }
        }

        if (matches.length > 0) {
            task.pictograms = matches;
            task.icon = matches[0].url;
        }
    }
}
