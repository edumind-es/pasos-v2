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

/*
 * Barril de la API Pro. La implementación vive en src/services/api/,
 * organizada por dominio:
 *   - http.ts          → transporte, token, refresco de sesión, errores
 *   - auth.ts          → registro, login, SSO, sesión
 *   - boards.ts        → tableros, compartir, insights, asignaciones, comentarios, reuniones
 *   - documents.ts     → documentos de tablero y versiones
 *   - organizations.ts → organizaciones, equipos y membresías
 *   - calendar.ts      → eventos y feeds de calendario
 *   - analytics.ts     → cronograma y cuadro de mando ejecutivo
 *   - types.ts         → DTOs del backend
 */

export * from './api/types';
export { PasosApiError, getApiErrorMessage } from './api/http';
export * from './api/auth';
export * from './api/boards';
export * from './api/documents';
export * from './api/organizations';
export * from './api/calendar';
export * from './api/analytics';
