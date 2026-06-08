/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuna
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

import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, RotateCcw } from 'lucide-react';

type NoiseLevelId = 'biblioteca' | 'pareja' | 'pequeno-grupo' | 'trabajo-grupo' | 'clase' | 'debate' | 'patio';

const NOISE_LEVELS: Array<{ id: NoiseLevelId; label: string; multiplier: number }> = [
    { id: 'biblioteca', label: 'Biblioteca', multiplier: 1.15 },
    { id: 'pareja', label: 'Pareja', multiplier: 1.35 },
    { id: 'pequeno-grupo', label: 'Pequeno grupo', multiplier: 1.6 },
    { id: 'trabajo-grupo', label: 'Trabajo grupo', multiplier: 1.9 },
    { id: 'clase', label: 'Clase', multiplier: 2.3 },
    { id: 'debate', label: 'Debate', multiplier: 2.8 },
    { id: 'patio', label: 'Patio', multiplier: 3.3 }
];

const BASELINE_STORAGE_KEY = 'pasos-sound-baseline';
const LEVEL_STORAGE_KEY = 'pasos-sound-level';

function computeRms(data: Uint8Array<ArrayBuffer>) {
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) {
        const normalized = (data[i] - 128) / 128;
        sum += normalized * normalized;
    }
    return Math.sqrt(sum / data.length);
}

interface SoundMeterProps {
    className?: string;
    variant?: 'compact' | 'expanded';
}

export function SoundMeter({ className = '', variant = 'compact' }: SoundMeterProps) {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [rms, setRms] = useState(0);
    const [baseline, setBaseline] = useState<number | null>(() => {
        const stored = localStorage.getItem(BASELINE_STORAGE_KEY);
        return stored ? Number(stored) : null;
    });
    const [targetLevel, setTargetLevel] = useState<NoiseLevelId>(() => {
        return (localStorage.getItem(LEVEL_STORAGE_KEY) as NoiseLevelId) || 'biblioteca';
    });
    const [isCalibrating, setIsCalibrating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
    const rafRef = useRef<number | null>(null);

    const maxMultiplier = NOISE_LEVELS[NOISE_LEVELS.length - 1].multiplier;
    const selectedLevel = NOISE_LEVELS.find(level => level.id === targetLevel) || NOISE_LEVELS[0];

    useEffect(() => {
        if (!stream) return undefined;

        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        dataRef.current = new Uint8Array(analyser.fftSize) as Uint8Array<ArrayBuffer>;

        const tick = () => {
            if (analyserRef.current && dataRef.current) {
                analyserRef.current.getByteTimeDomainData(dataRef.current);
                setRms(computeRms(dataRef.current));
            }
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            audioContext.close();
        };
    }, [stream]);

    useEffect(() => {
        return () => {
            stream?.getTracks().forEach(track => track.stop());
        };
    }, [stream]);

    useEffect(() => {
        localStorage.setItem(LEVEL_STORAGE_KEY, targetLevel);
    }, [targetLevel]);

    const requestMic = async () => {
        setError(null);
        try {
            const media = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStream(media);
        } catch (err) {
            console.error(err);
            setError('Permiso de microfono no disponible.');
        }
    };

    const stopMic = () => {
        stream?.getTracks().forEach(track => track.stop());
        setStream(null);
    };

    const startCalibration = () => {
        if (!analyserRef.current || !dataRef.current) return;
        setIsCalibrating(true);
        const samples: number[] = [];
        const start = performance.now();

        const sample = () => {
            if (!analyserRef.current || !dataRef.current) return;
            analyserRef.current.getByteTimeDomainData(dataRef.current);
            samples.push(computeRms(dataRef.current));
            if (performance.now() - start < 2000) {
                requestAnimationFrame(sample);
                return;
            }
            const average = samples.reduce((acc, value) => acc + value, 0) / Math.max(1, samples.length);
            setBaseline(average || 0.02);
            localStorage.setItem(BASELINE_STORAGE_KEY, String(average || 0.02));
            setIsCalibrating(false);
        };

        sample();
    };

    const normalized = baseline ? Math.min(rms / (baseline * maxMultiplier), 1) : Math.min(rms * 4, 1);
    const threshold = baseline ? baseline * selectedLevel.multiplier : 0;
    const thresholdPercent = baseline ? Math.min((selectedLevel.multiplier / maxMultiplier) * 100, 100) : 0;
    const isLoud = baseline ? rms > threshold : false;

    const statusLabel = useMemo(() => {
        if (!baseline) return 'Calibra para empezar';
        if (isLoud) return 'Supera el nivel elegido';
        return 'Nivel correcto';
    }, [baseline, isLoud]);

    const isExpanded = variant === 'expanded';

    return (
        <div className={`bg-lme-surface-alt border border-lme-border rounded-2xl shadow-xl w-full ${isExpanded ? 'p-6' : 'p-4'} ${className}`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className={`${isExpanded ? 'text-base' : 'text-sm'} font-semibold text-ink`}>Medidor de sonido</p>
                    <p className={`${isExpanded ? 'text-sm' : 'text-xs'} text-sub`}>Nivel objetivo: {selectedLevel.label}</p>
                </div>
                {stream ? (
                    <button onClick={stopMic} className="p-2 rounded-full bg-black/30 text-sub hover:text-white transition-colors">
                        <MicOff className="w-4 h-4" />
                    </button>
                ) : (
                    <button onClick={requestMic} className="p-2 rounded-full bg-black/30 text-sub hover:text-white transition-colors">
                        <Mic className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className={isExpanded ? 'mt-6' : 'mt-4'}>
                <div className={`${isExpanded ? 'h-4' : 'h-3'} rounded-full bg-black/30 relative overflow-hidden`}>
                    <div
                        className={`h-full transition-all ${isLoud ? 'bg-lme-danger' : 'bg-mint'}`}
                        style={{ width: `${Math.round(normalized * 100)}%` }}
                    />
                    {baseline && (
                        <span
                            className="absolute top-0 h-full w-0.5 bg-white/70"
                            style={{ left: `${thresholdPercent}%` }}
                        />
                    )}
                </div>
                <div className={`mt-2 flex items-center justify-between ${isExpanded ? 'text-sm' : 'text-xs'} text-sub`}>
                    <span>{statusLabel}</span>
                    {baseline && <span>Base: {(baseline * 100).toFixed(1)}</span>}
                </div>
            </div>

            <div className={`${isExpanded ? 'mt-5' : 'mt-4'} flex items-center gap-2`}>
                <select
                    value={targetLevel}
                    onChange={e => setTargetLevel(e.target.value as NoiseLevelId)}
                    className={`flex-1 bg-lme-surface border border-line rounded-lg px-3 py-2 focus:outline-none focus:border-mint text-ink ${isExpanded ? 'text-sm' : 'text-xs'}`}
                >
                    {NOISE_LEVELS.map(level => (
                        <option key={level.id} value={level.id}>
                            {level.label}
                        </option>
                    ))}
                </select>
                <button
                    onClick={startCalibration}
                    disabled={!stream || isCalibrating}
                    className={`px-3 py-2 font-medium rounded-lg border border-line text-sub hover:text-ink hover:border-sky transition-colors disabled:opacity-50 ${isExpanded ? 'text-sm' : 'text-xs'}`}
                >
                    <span className="inline-flex items-center gap-1">
                        <RotateCcw className="w-3.5 h-3.5" />
                        {isCalibrating ? 'Calibrando...' : 'Calibrar'}
                    </span>
                </button>
            </div>

            {error && (
                <p className="mt-2 text-xs text-lme-danger">{error}</p>
            )}
        </div>
    );
}
