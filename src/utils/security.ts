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

import CryptoJS from 'crypto-js';

/**
 * Security utilities for Pasos V2
 * Provides encryption/decryption and data validation
 */

// Default encryption key (replaced when user sets password)
const DEFAULT_KEY = 'pasos-v2-default-key-2024';

/**
 * Encrypt data with AES
 */
export const encrypt = (data: string, password?: string): string => {
    const key = password || DEFAULT_KEY;
    return CryptoJS.AES.encrypt(data, key).toString();
};

/**
 * Decrypt data with AES
 */
export const decrypt = (encryptedData: string, password?: string): string | null => {
    try {
        const key = password || DEFAULT_KEY;
        const bytes = CryptoJS.AES.decrypt(encryptedData, key);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted || null;
    } catch (error) {
        console.error('[Security] Decryption failed:', error);
        return null;
    }
};

/**
 * Hash password with SHA256
 */
export const hashPassword = (password: string): string => {
    return CryptoJS.SHA256(password).toString();
};

/**
 * Verify password against hash
 */
export const verifyPassword = (password: string, hash: string): boolean => {
    return hashPassword(password) === hash;
};

/**
 * Sanitize HTML to prevent XSS
 */
export const sanitizeHTML = (input: string): string => {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
};

/**
 * Validate URL format
 */
export const isValidURL = (url: string): boolean => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

/**
 * Sanitize URL (allow only http, https, youtube)
 */
export const sanitizeURL = (url: string): string | null => {
    if (!isValidURL(url)) return null;

    const parsed = new URL(url);
    const allowedProtocols = ['http:', 'https:'];

    if (!allowedProtocols.includes(parsed.protocol)) {
        return null;
    }

    return url;
};

/**
 * Generate secure random string
 */
export const generateSecureId = (): string => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Check if encryption is enabled
 */
export const isEncryptionEnabled = (): boolean => {
    return localStorage.getItem('pasos-encryption-enabled') === 'true';
};

/**
 * Enable encryption with password
 */
export const enableEncryption = (password: string): void => {
    const hash = hashPassword(password);
    localStorage.setItem('pasos-password-hash', hash);
    localStorage.setItem('pasos-encryption-enabled', 'true');
};

/**
 * Disable encryption
 */
export const disableEncryption = (): void => {
    localStorage.removeItem('pasos-password-hash');
    localStorage.removeItem('pasos-encryption-enabled');
};

/**
 * Verify stored password
 */
export const verifyStoredPassword = (password: string): boolean => {
    const storedHash = localStorage.getItem('pasos-password-hash');
    if (!storedHash) return false;
    return verifyPassword(password, storedHash);
};

/**
 * Export data with optional encryption
 */
export const exportSecureData = (data: object, password?: string): string => {
    const jsonData = JSON.stringify(data, null, 2);

    if (password) {
        const encrypted = encrypt(jsonData, password);
        return JSON.stringify({
            encrypted: true,
            version: '2.0.0',
            timestamp: Date.now(),
            data: encrypted
        }, null, 2);
    }

    return JSON.stringify({
        encrypted: false,
        version: '2.0.0',
        timestamp: Date.now(),
        data: jsonData
    }, null, 2);
};

/**
 * Import data with optional decryption
 */
export const importSecureData = (fileContent: string, password?: string): object | null => {
    try {
        const parsed = JSON.parse(fileContent);

        if (parsed.encrypted && password) {
            const decrypted = decrypt(parsed.data, password);
            if (!decrypted) {
                throw new Error('Invalid password');
            }
            return JSON.parse(decrypted);
        } else if (!parsed.encrypted) {
            return typeof parsed.data === 'string' ? JSON.parse(parsed.data) : parsed.data;
        }

        return null;
    } catch (error) {
        console.error('[Security] Import failed:', error);
        return null;
    }
};

/**
 * Validate file size
 */
export const validateFileSize = (size: number, maxSizeKB: number = 500): boolean => {
    return size <= maxSizeKB * 1024;
};

/**
 * Validate image file type
 */
export const validateImageType = (type: string): boolean => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    return allowedTypes.includes(type);
};

/**
 * Rate limiting helper
 */
export class RateLimiter {
    private attempts: Map<string, number[]> = new Map();
    private maxAttempts: number;
    private windowMs: number;

    constructor(maxAttempts: number = 5, windowMs: number = 60000) {
        this.maxAttempts = maxAttempts;
        this.windowMs = windowMs; // 1 minute default
    }

    check(key: string): boolean {
        const now = Date.now();
        const attempts = this.attempts.get(key) || [];

        // Remove old attempts outside window
        const validAttempts = attempts.filter(time => now - time < this.windowMs);

        if (validAttempts.length >= this.maxAttempts) {
            return false;
        }

        validAttempts.push(now);
        this.attempts.set(key, validAttempts);
        return true;
    }

    reset(key: string): void {
        this.attempts.delete(key);
    }
}

export const loginRateLimiter = new RateLimiter(5, 60000); // 5 attempts per minute
