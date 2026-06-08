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

import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useStore } from './store/boardStore';
import { VisualModeManager } from './components/VisualModeManager';
import { ProSessionManager } from './components/ProSessionManager';

const BoardView = lazy(() => import('./pages/BoardView'));
const WorkspaceHomeView = lazy(() => import('./pages/WorkspaceHomeView'));
const PresentView = lazy(() => import('./pages/PresentView'));
const SequenceView = lazy(() => import('./pages/SequenceView'));
const TodayView = lazy(() => import('./pages/TodayView'));
const AgendaView = lazy(() => import('./pages/AgendaView'));
const TimelineView = lazy(() => import('./pages/TimelineView'));
const ExecutiveDashboardView = lazy(() => import('./pages/ExecutiveDashboardView'));
const AccessCodePage = lazy(() => import('./pages/AccessCodePage'));
const SharedBoardView = lazy(() => import('./pages/SharedBoardView'));
const Login = lazy(() => import('./pages/Login'));
const InstallPWA = lazy(() => import('./components/InstallPWA').then((module) => ({ default: module.InstallPWA })));
const FAQ = lazy(() => import('./components/FAQ').then((module) => ({ default: module.FAQ })));
const EDUmindFooter = lazy(() => import('./components/EDUmindFooter'));
const EinkModeSelector = lazy(() => import('./components/EinkModeSelector').then((module) => ({ default: module.EinkModeSelector })));

function isBoardEmbed(location: ReturnType<typeof useLocation>): boolean {
  const params = new URLSearchParams(location.search);
  return params.get('embed') === '1' || params.get('board') === '1';
}

function EmbedAuthFallback() {
  const location = useLocation();
  const [startingSso, setStartingSso] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStartingSso(true);
      const next = `${location.pathname}${location.search}`;
      if (typeof window !== 'undefined' && window.parent !== window) {
        window.parent.postMessage({ type: 'board:auth:login', next }, '*');
      }
      window.location.assign(`/api/v1/auth/oidc/start?next=${encodeURIComponent(next)}`);
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (typeof window === 'undefined' || window.parent === window) return;
    window.parent.postMessage({
      type: 'board:ready',
      appId: 'pasos',
      status: startingSso ? 'sso_starting' : 'restoring_session',
    }, '*');
  }, [startingSso]);

  return (
    <div className="min-h-screen bg-lme-background flex flex-col items-center justify-center gap-4 px-6 text-center">
      <img src="/icons/icon-192.png" alt="Pasos" className="w-20 h-20 rounded-3xl shadow-2xl" />
      <div>
        <p className="text-lg font-bold text-ink">Conectando Pasos con EDUmind Board</p>
        <p className="mt-2 text-sm text-sub">
          {startingSso ? 'Abriendo SSO EDUmind...' : 'Restaurando la sesion del docente...'}
        </p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useStore();
  const location = useLocation();

  if (!currentUser) {
    if (isBoardEmbed(location)) {
      return <EmbedAuthFallback />;
    }
    return <Navigate to={`/login${location.search}`} replace />;
  }

  return <>{children}</>;
}

function AppFallback() {
  return (
    <div className="min-h-screen bg-lme-background flex flex-col items-center justify-center gap-6">
      <img
        src="/icons/icon-192.png"
        alt="Pasos"
        className="w-24 h-24 rounded-3xl shadow-2xl animate-pulse"
      />
      <div className="text-center">
        <p className="text-lg font-bold text-ink">Pasos</p>
        <p className="text-sm text-sub mt-1">Cargando espacio de trabajo…</p>
      </div>
    </div>
  );
}

function EmbedModeManager() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const embedded = params.get('embed') === '1' || params.get('board') === '1';
    document.body.dataset.edumindEmbed = embedded ? 'true' : 'false';
    return () => {
      delete document.body.dataset.edumindEmbed;
    };
  }, []);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <EmbedModeManager />
      <VisualModeManager />
      <ProSessionManager />
      <Suspense fallback={<AppFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Rutas para estudiantes - SIN autenticación */}
          <Route path="/codigo" element={<AccessCodePage />} />
          <Route path="/compartir/:code" element={<SharedBoardView />} />

          {/* Rutas del docente - CON autenticación */}
          <Route path="/" element={
            <ProtectedRoute>
              <WorkspaceHomeView />
            </ProtectedRoute>
          } />
          <Route path="/aula" element={
            <ProtectedRoute>
              <BoardView />
            </ProtectedRoute>
          } />
          <Route path="/organizacion" element={
            <ProtectedRoute>
              <BoardView />
            </ProtectedRoute>
          } />
          <Route path="/aula/present" element={
            <ProtectedRoute>
              <PresentView />
            </ProtectedRoute>
          } />
          <Route path="/aula/secuencia" element={
            <ProtectedRoute>
              <SequenceView />
            </ProtectedRoute>
          } />
          <Route path="/aula/hoy" element={
            <ProtectedRoute>
              <TodayView />
            </ProtectedRoute>
          } />
          <Route path="/aula/agenda" element={
            <ProtectedRoute>
              <AgendaView />
            </ProtectedRoute>
          } />
          <Route path="/aula/timeline" element={
            <ProtectedRoute>
              <TimelineView />
            </ProtectedRoute>
          } />
          <Route path="/organizacion/agenda" element={
            <ProtectedRoute>
              <AgendaView />
            </ProtectedRoute>
          } />
          <Route path="/organizacion/timeline" element={
            <ProtectedRoute>
              <TimelineView />
            </ProtectedRoute>
          } />
          <Route path="/organizacion/centro" element={
            <ProtectedRoute>
              <ExecutiveDashboardView />
            </ProtectedRoute>
          } />
          <Route path="/present" element={<Navigate to="/aula/present" replace />} />
          <Route path="/secuencia" element={<Navigate to="/aula/secuencia" replace />} />
          <Route path="/hoy" element={<Navigate to="/aula/hoy" replace />} />
          <Route path="/agenda" element={<Navigate to="/aula/agenda" replace />} />
          <Route path="/timeline" element={<Navigate to="/aula/timeline" replace />} />
          <Route path="/executive" element={<Navigate to="/organizacion/centro" replace />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>

        <InstallPWA />
        <EinkModeSelector />
        <FAQ />
        <EDUmindFooter
          appName="Pasos"
          version="2.1.0"
          versionStage="Stable"
          feedbackUrl="https://github.com/edumind-es/pasos/issues"
          homeHref="/"
          locale="es"
          hideNavigation={true}
        />
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
