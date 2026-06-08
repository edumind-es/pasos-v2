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

import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Type, Palette, Plus, Minus } from 'lucide-react';

type FontFamily = 'comic' | 'opendyslexic' | 'nunito' | 'system';

interface AccessibilitySettings {
    fontSize: number; // 14-30px
    fontFamily: FontFamily;
}

const FONT_OPTIONS = {
    comic: { label: 'Comic Neue', family: '"Comic Neue", "Comic Sans MS", cursive' },
    opendyslexic: { label: 'OpenDyslexic', family: '"OpenDyslexic", sans-serif' },
    nunito: { label: 'Nunito', family: '"Nunito", sans-serif' },
    system: { label: 'Sistema', family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
};

function getStoredAccessibilitySettings(): AccessibilitySettings {
    const saved = localStorage.getItem('pasos-accessibility');
    if (!saved) {
        return {
            fontSize: 18,
            fontFamily: 'comic'
        };
    }

    try {
        return JSON.parse(saved) as AccessibilitySettings;
    } catch {
        return {
            fontSize: 18,
            fontFamily: 'comic'
        };
    }
}

export function AccessibilityControls() {
    const [settings, setSettings] = useState<AccessibilitySettings>(() => getStoredAccessibilitySettings());
    const [showMenu, setShowMenu] = useState(false);
    const [pos, setPos] = useState<{ top: number; right: number }>({ top: 68, right: 8 });
    const btnRef = useRef<HTMLButtonElement>(null);

    const applySettings = (newSettings: AccessibilitySettings) => {
        document.documentElement.style.setProperty('--user-font-size', `${newSettings.fontSize}px`);
        document.documentElement.style.setProperty('--user-font-family', FONT_OPTIONS[newSettings.fontFamily].family);
        localStorage.setItem('pasos-accessibility', JSON.stringify(newSettings));
    };

    useEffect(() => {
        applySettings(settings);
    }, [settings]);

    const handleFontSizeChange = (delta: number) => {
        const newSize = Math.max(14, Math.min(30, settings.fontSize + delta));
        const newSettings = { ...settings, fontSize: newSize };
        setSettings(newSettings);
    };

    const handleFontFamilyChange = (family: FontFamily) => {
        const newSettings = { ...settings, fontFamily: family };
        setSettings(newSettings);
        setShowMenu(false);
    };

    const handleOpen = () => {
        if (!showMenu && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
        }
        setShowMenu(v => !v);
    };

    return (
        <>
            <button
                ref={btnRef}
                onClick={handleOpen}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-line hover:bg-white/5 transition-colors text-sm font-medium"
                title="Opciones de accesibilidad"
            >
                <Type className="w-4 h-4" />
            </button>

            {showMenu && createPortal(
                <>
                    <div className="fixed inset-0" style={{ zIndex: 490 }} onClick={() => setShowMenu(false)} />
                    <div
                        className="fixed w-80 bg-lme-surface-alt border border-lme-border rounded-xl shadow-2xl p-4 animate-scale-in"
                        style={{ top: pos.top, right: pos.right, zIndex: 500 }}
                    >
                        {/* Font Size Control */}
                        <div className="mb-4">
                            <label className="text-xs font-bold text-sub uppercase mb-2 block">
                                Tamaño de Letra
                            </label>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleFontSizeChange(-2)}
                                    className="p-2 bg-lme-surface rounded-lg hover:bg-lme-primary/10 transition-colors border border-lme-border"
                                    disabled={settings.fontSize <= 14}
                                >
                                    <Minus className="w-5 h-5" />
                                </button>
                                <div className="flex-1 text-center">
                                    <div className="text-2xl font-bold text-ink">{settings.fontSize}px</div>
                                    <div className="text-xs text-sub">
                                        {settings.fontSize < 16 ? 'Pequeño' : settings.fontSize < 22 ? 'Normal' : 'Grande'}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleFontSizeChange(2)}
                                    className="p-2 bg-lme-surface rounded-lg hover:bg-lme-primary/10 transition-colors border border-lme-border"
                                    disabled={settings.fontSize >= 30}
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <hr className="border-lme-border mb-4" />

                        {/* Font Family Control */}
                        <div>
                            <label className="text-xs font-bold text-sub uppercase mb-2 block flex items-center gap-2">
                                <Palette className="w-3 h-3" />
                                Tipo de Letra
                            </label>
                            <div className="space-y-2">
                                {Object.entries(FONT_OPTIONS).map(([key, option]) => (
                                    <button
                                        key={key}
                                        onClick={() => handleFontFamilyChange(key as FontFamily)}
                                        className={`w-full text-left px-3 py-2 rounded-lg transition-all ${settings.fontFamily === key
                                            ? 'bg-mint/10 border-2 border-mint text-mint font-bold'
                                            : 'bg-lme-surface border border-lme-border text-ink hover:bg-white/5'
                                            }`}
                                        style={{ fontFamily: option.family }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span>{option.label}</span>
                                            {settings.fontFamily === key && (
                                                <div className="w-2 h-2 rounded-full bg-mint" />
                                            )}
                                        </div>
                                        <div className="text-xs mt-1" style={{ fontFamily: option.family }}>
                                            abc ABC 123
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="mt-4 p-3 bg-black/10 rounded-lg border border-lme-border">
                            <p className="text-xs text-sub mb-1">Vista previa:</p>
                            <p
                                className="text-ink"
                                style={{
                                    fontSize: `${settings.fontSize}px`,
                                    fontFamily: FONT_OPTIONS[settings.fontFamily].family
                                }}
                            >
                                El zorro veloz salta 🦊
                            </p>
                        </div>
                    </div>
                </>,
                document.body
            )}
        </>
    );
}
