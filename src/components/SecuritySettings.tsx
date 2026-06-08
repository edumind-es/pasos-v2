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

import { useState } from 'react';
import { Shield, Lock, Unlock, Eye, EyeOff, AlertTriangle, Check } from 'lucide-react';
import {
    enableEncryption,
    disableEncryption,
    isEncryptionEnabled,
    verifyStoredPassword
} from '../utils/security';

interface SecuritySettingsProps {
    onClose: () => void;
}

export function SecuritySettings({ onClose }: SecuritySettingsProps) {
    const [encryptionEnabled, setEncryptionEnabled] = useState(isEncryptionEnabled());
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleEnableEncryption = () => {
        setError('');
        setSuccess('');

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        enableEncryption(password);
        setEncryptionEnabled(true);
        setPassword('');
        setConfirmPassword('');
        setSuccess('Encriptación activada correctamente');
    };

    const handleDisableEncryption = () => {
        setError('');
        setSuccess('');

        if (!verifyStoredPassword(currentPassword)) {
            setError('Contraseña incorrecta');
            return;
        }

        disableEncryption();
        setEncryptionEnabled(false);
        setCurrentPassword('');
        setSuccess('Encriptación desactivada');
    };

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="glass-panel max-w-md w-full mx-4 p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-lme-primary/20 flex items-center justify-center border border-lme-primary/30">
                            <Shield className="w-5 h-5 text-lme-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-lme-text">Proteccion local</h2>
                            <p className="text-xs text-lme-text-secondary">Refuerza los datos guardados en este navegador</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-lme-text-secondary hover:text-lme-text transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Encryption Status */}
                <div className={`p-4 rounded-lg border ${encryptionEnabled
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-yellow-500/10 border-yellow-500/30'
                    }`}>
                    <div className="flex items-center gap-3">
                        {encryptionEnabled ? (
                            <Lock className="w-5 h-5 text-green-400" />
                        ) : (
                            <Unlock className="w-5 h-5 text-yellow-400" />
                        )}
                        <div className="flex-1">
                            <p className="text-sm font-medium text-lme-text">
                                {encryptionEnabled ? 'Proteccion local activada' : 'Proteccion local desactivada'}
                            </p>
                            <p className="text-xs text-lme-text-secondary">
                                {encryptionEnabled
                                    ? 'Tus datos locales requieren una clave en este navegador'
                                    : 'Tus datos locales no tienen una capa adicional de proteccion'
                                }
                            </p>
                        </div>
                    </div>
                </div>

                {/* Warnings */}
                {!encryptionEnabled && (
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-lme-text-secondary">
                            Sin proteccion local, cualquier persona con acceso a tu navegador puede ver los datos guardados en este dispositivo.
                        </p>
                    </div>
                )}

                {/* Messages */}
                {error && (
                    <div className="p-3 rounded-lg bg-lme-danger/10 border border-lme-danger/30 text-sm text-lme-danger">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-2 text-sm text-green-400">
                        <Check className="w-4 h-4" />
                        {success}
                    </div>
                )}

                {/* Enable Encryption Form */}
                {!encryptionEnabled && (
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-lme-text">Activar proteccion local</h3>

                        <div className="space-y-2">
                            <label className="text-xs text-lme-text-secondary">Contraseña</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 bg-lme-surface-alt border border-lme-border rounded-lg text-sm text-lme-text focus:outline-none focus:border-lme-primary"
                                    placeholder="Mínimo 6 caracteres"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-lme-text-secondary hover:text-lme-text"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-lme-text-secondary">Confirmar Contraseña</label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-3 py-2 bg-lme-surface-alt border border-lme-border rounded-lg text-sm text-lme-text focus:outline-none focus:border-lme-primary"
                                placeholder="Repite la contraseña"
                            />
                        </div>

                        <button
                            onClick={handleEnableEncryption}
                            className="w-full px-4 py-2 bg-lme-primary hover:bg-lme-primary-dark rounded-lg text-sm font-medium text-white transition-colors"
                        >
                            Activar proteccion local
                        </button>
                    </div>
                )}

                {/* Disable Encryption Form */}
                {encryptionEnabled && (
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-lme-text">Desactivar proteccion local</h3>

                        <div className="space-y-2">
                            <label className="text-xs text-lme-text-secondary">Contraseña Actual</label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-3 py-2 bg-lme-surface-alt border border-lme-border rounded-lg text-sm text-lme-text focus:outline-none focus:border-lme-primary"
                                placeholder="Ingresa tu contraseña"
                            />
                        </div>

                        <button
                            onClick={handleDisableEncryption}
                            className="w-full px-4 py-2 bg-lme-danger/20 hover:bg-red-500/30 border border-lme-danger/30 rounded-lg text-sm font-medium text-lme-danger transition-colors"
                        >
                            Desactivar proteccion local
                        </button>
                    </div>
                )}

                {/* Info */}
                <div className="pt-4 border-t border-lme-border space-y-2">
                    <p className="text-xs text-lme-text-secondary">
                        <strong className="text-lme-text">Importante:</strong> Si olvidas la clave local, no podras recuperar esos datos del navegador. Guarda esa clave en un lugar seguro.
                    </p>
                    <p className="text-xs text-lme-text-secondary">
                        Esta capa protege solo el almacenamiento local del navegador. No sustituye la seguridad del backend ni equivale a cifrado extremo a extremo.
                    </p>
                </div>
            </div>
        </div>
    );
}
