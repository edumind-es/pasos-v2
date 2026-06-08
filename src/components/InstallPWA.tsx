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

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches);

    useEffect(() => {
        if (isInstalled) {
            return;
        }

        const dismissedUntil = Number(localStorage.getItem('pwa-install-dismissed') || '0');
        const handler = (e: Event) => {
            if (Date.now() < dismissedUntil) {
                return;
            }
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Show install button after 3 seconds
            setTimeout(() => {
                setShowInstallPrompt(true);
            }, 3000);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Listen for successful installation
        const installedHandler = () => {
            console.log('[PWA] App instalada exitosamente');
            setIsInstalled(true);
            setShowInstallPrompt(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('appinstalled', installedHandler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('appinstalled', installedHandler);
        };
    }, [isInstalled]);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user's response
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`[PWA] Usuario ${outcome === 'accepted' ? 'aceptó' : 'rechazó'} instalar`);

        if (outcome === 'accepted') {
            setShowInstallPrompt(false);
        }

        // Clear the deferredPrompt
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowInstallPrompt(false);
        // Show again in 7 days
        localStorage.setItem('pwa-install-dismissed', String(Date.now() + DISMISS_MS));
    };

    // Don't show if already installed or dismissed recently
    if (isInstalled || !showInstallPrompt) return null;

    return (
        <div className="fixed bottom-6 right-6 z-modal animate-in slide-in-from-bottom-5 fade-in duration-500">
            <div className="glass-panel border border-lme-primary/30 rounded-2xl p-4 shadow-2xl max-w-sm">
                <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-lme-primary/20 flex items-center justify-center flex-shrink-0 border border-lme-primary/30">
                        <Download className="w-6 h-6 text-lme-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-lme-text mb-1">
                            ¡Instala Pasos!
                        </h3>
                        <p className="text-xs text-lme-text-secondary mb-3">
                            Accede rápidamente y trabaja sin conexión
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleInstallClick}
                                className="flex-1 px-3 py-2 bg-lme-primary hover:bg-lme-primary-dark text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                Instalar
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="px-3 py-2 text-lme-text-secondary hover:text-lme-text text-sm font-medium rounded-lg transition-colors"
                            >
                                Después
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="text-lme-text-secondary hover:text-lme-text transition-colors"
                        aria-label="Cerrar"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
