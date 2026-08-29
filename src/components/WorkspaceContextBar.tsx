import { useEffect, useMemo, useState } from 'react';
import { Layers3, Plus, RefreshCw, Shield, Trash2, UserCog, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/boardStore';
import { InlineCreateDialog } from './InlineCreateDialog';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { KebabMenu } from './KebabMenu';
import {
    createOrganization,
    createOrganizationTeam,
    deleteOrganization,
    deleteOrganizationTeam,
    getApiErrorMessage,
    listOrgMembers,
    listOrganizations,
    listOrganizationTeams,
    removeOrgMember,
    updateOrgMemberRole,
    type ProOrgMembershipResponse,
    type ProOrganizationResponse,
    type ProTeamResponse,
} from '../services/pasosApi';
import { getBoardTypeOptions, type SupportedBoardType } from '../utils/boardPresets';
import { getWorkspaceSubPath } from '../utils/workspaceRoutes';
import { TeamMembersDialog } from './TeamMembersDialog';
import { logAppEvent } from '../services/appTelemetry';

const ROLE_LABELS: Record<string, string> = {
    organization_admin: 'Administración',
    leadership: 'Dirección',
    teacher: 'Docente',
    member: 'Miembro',
    owner: 'Propietario/a',
    editor: 'Editor/a',
    viewer: 'Solo lectura',
};

const PLAN_LABELS: Record<string, string> = {
    school: 'Centro',
    district: 'Distrito',
    pilot: 'Piloto',
};

const TEAM_TYPE_LABELS: Record<string, string> = {
    cycle: 'Ciclo',
    department: 'Departamento',
    leadership: 'Directivo',
    project: 'Proyecto',
    support: 'Apoyo',
    custom: 'Personalizado',
};

function roleLabel(role: string | undefined): string {
    if (!role) return '';
    return ROLE_LABELS[role] ?? role;
}

function normalizeWorkspaceName(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

interface DeleteTarget {
    kind: 'organización' | 'equipo';
    id: string;
    name: string;
    orgId?: string;
}

interface WorkspaceContextBarProps {
    onRequestCreateBoard?: (boardType?: SupportedBoardType) => void;
    allowPersonalWorkspace?: boolean;
}

export function WorkspaceContextBar({
    onRequestCreateBoard,
    allowPersonalWorkspace = true,
}: WorkspaceContextBarProps) {
    const {
        currentUser,
        currentOrganizationId,
        currentTeamId,
        setCurrentOrganization,
        setCurrentTeam,
    } = useStore();
    const [organizations, setOrganizations] = useState<ProOrganizationResponse[]>([]);
    const [teams, setTeams] = useState<ProTeamResponse[]>([]);
    const [loadingOrganizations, setLoadingOrganizations] = useState(false);
    const [loadingTeams, setLoadingTeams] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showCreateOrganization, setShowCreateOrganization] = useState(false);
    const [showCreateTeam, setShowCreateTeam] = useState(false);
    const [showMembersDialog, setShowMembersDialog] = useState(false);
    const [showOrgMembers, setShowOrgMembers] = useState(false);
    const [orgMembers, setOrgMembers] = useState<ProOrgMembershipResponse[]>([]);
    const [loadingOrgMembers, setLoadingOrgMembers] = useState(false);
    const [orgMemberError, setOrgMemberError] = useState<string | null>(null);
    const [changingOrgRole, setChangingOrgRole] = useState<string | null>(null);
    const [removingOrgMember, setRemovingOrgMember] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
    const [deleting, setDeleting] = useState(false);

    const selectedOrganization = useMemo(
        () => organizations.find((organization) => organization.id === currentOrganizationId) ?? null,
        [currentOrganizationId, organizations],
    );
    const selectedTeam = useMemo(
        () => teams.find((team) => team.id === currentTeamId) ?? null,
        [currentTeamId, teams],
    );
    const activeContextType = selectedTeam ? 'team' : selectedOrganization ? 'organization' : 'personal';
    const displayContextType = activeContextType === 'personal' && !allowPersonalWorkspace ? 'organization' : activeContextType;
    const quickCreateOptions = useMemo(
        () => getBoardTypeOptions(displayContextType),
        [displayContextType],
    );
    const canCreateBoardInContext = allowPersonalWorkspace || Boolean(selectedOrganization || selectedTeam);
    const canManageSelectedTeam = Boolean(
        selectedTeam
        && (
            selectedTeam.role === 'owner'
            || selectedOrganization?.role === 'organization_admin'
            || selectedOrganization?.role === 'leadership'
        )
    );
    const isOrgAdmin = selectedOrganization?.role === 'organization_admin' || selectedOrganization?.role === 'leadership';

    /** Solo un administrador puede eliminar la organización (coincide con el permiso del backend). */
    const canDeleteOrganization = (organization: ProOrganizationResponse) => organization.role === 'organization_admin';
    /** Owner del equipo o admin/dirección de la organización. */
    const canDeleteTeam = (team: ProTeamResponse) => Boolean(
        team.role === 'owner'
        || selectedOrganization?.role === 'organization_admin'
        || selectedOrganization?.role === 'leadership'
    );

    useEffect(() => {
        if (currentUser?.mode !== 'pro') {
            setOrganizations([]);
            setTeams([]);
            setError(null);
            return;
        }

        let cancelled = false;
        setLoadingOrganizations(true);
        listOrganizations()
            .then((payload) => {
                if (cancelled) return;
                setOrganizations(payload);
                setError(null);
                if (!payload.length || (currentOrganizationId && !payload.some((item) => item.id === currentOrganizationId))) {
                    setCurrentOrganization(null);
                }
            })
            .catch((issue) => {
                if (cancelled) return;
                setError(getApiErrorMessage(issue, 'No se pudieron cargar las organizaciones.'));
            })
            .finally(() => {
                if (!cancelled) {
                    setLoadingOrganizations(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [currentOrganizationId, currentUser?.mode, setCurrentOrganization]);

    useEffect(() => {
        if (currentUser?.mode !== 'pro' || !currentOrganizationId) {
            setTeams([]);
            return;
        }

        let cancelled = false;
        setLoadingTeams(true);
        listOrganizationTeams(currentOrganizationId)
            .then((payload) => {
                if (cancelled) return;
                setTeams(payload);
                setError(null);
                if (currentTeamId && !payload.some((team) => team.id === currentTeamId)) {
                    setCurrentTeam(null);
                }
            })
            .catch((issue) => {
                if (cancelled) return;
                setError(getApiErrorMessage(issue, 'No se pudieron cargar los equipos.'));
            })
            .finally(() => {
                if (!cancelled) {
                    setLoadingTeams(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [currentOrganizationId, currentTeamId, currentUser?.mode, setCurrentTeam]);

    if (currentUser?.mode !== 'pro') {
        return null;
    }

    const handleRefresh = async () => {
        setLoadingOrganizations(true);
        setLoadingTeams(true);
        setError(null);
        try {
            const nextOrganizations = await listOrganizations();
            setOrganizations(nextOrganizations);
            const nextOrganizationId = currentOrganizationId && nextOrganizations.some((item) => item.id === currentOrganizationId)
                ? currentOrganizationId
                : null;
            setCurrentOrganization(nextOrganizationId);
            if (nextOrganizationId) {
                const nextTeams = await listOrganizationTeams(nextOrganizationId);
                setTeams(nextTeams);
            } else {
                setTeams([]);
            }
        } catch (issue) {
            setError(getApiErrorMessage(issue, 'No se pudo refrescar el contexto Pro.'));
        } finally {
            setLoadingOrganizations(false);
            setLoadingTeams(false);
        }
    };

    const loadOrgMembers = async (orgId: string) => {
        setLoadingOrgMembers(true);
        setOrgMemberError(null);
        try {
            const payload = await listOrgMembers(orgId);
            setOrgMembers(payload);
        } catch (issue) {
            setOrgMemberError(getApiErrorMessage(issue, 'No se pudieron cargar los miembros.'));
        } finally {
            setLoadingOrgMembers(false);
        }
    };

    const handleToggleOrgMembers = () => {
        if (!showOrgMembers && selectedOrganization) {
            void loadOrgMembers(selectedOrganization.id);
        }
        setShowOrgMembers(v => !v);
    };

    const handleOrgRoleChange = async (memberId: string, userId: string, newRole: ProOrgMembershipResponse['role']) => {
        if (!selectedOrganization) return;
        setChangingOrgRole(memberId);
        setOrgMemberError(null);
        try {
            const updated = await updateOrgMemberRole(selectedOrganization.id, userId, newRole);
            setOrgMembers(prev => prev.map(m => m.id === memberId ? updated : m));
        } catch (issue) {
            setOrgMemberError(getApiErrorMessage(issue, 'No se pudo cambiar el rol.'));
        } finally {
            setChangingOrgRole(null);
        }
    };

    const handleRemoveOrgMember = async (memberId: string, userId: string, displayName: string) => {
        if (!selectedOrganization) return;
        if (!window.confirm(`¿Eliminar a ${displayName} de la organización?`)) return;
        setRemovingOrgMember(memberId);
        setOrgMemberError(null);
        try {
            await removeOrgMember(selectedOrganization.id, userId);
            setOrgMembers(prev => prev.filter(m => m.id !== memberId));
        } catch (issue) {
            setOrgMemberError(getApiErrorMessage(issue, 'No se pudo eliminar el miembro.'));
        } finally {
            setRemovingOrgMember(null);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        setError(null);
        try {
            if (deleteTarget.kind === 'organización') {
                await deleteOrganization(deleteTarget.id);
                setOrganizations(prev => prev.filter(o => o.id !== deleteTarget.id));
                if (currentOrganizationId === deleteTarget.id) {
                    setCurrentOrganization(null);
                    setTeams([]);
                }
                logAppEvent({
                    type: 'organization_archived',
                    level: 'info',
                    message: 'Se archivó una organización (borrado seguro).',
                    metadata: { organization_id: deleteTarget.id },
                });
            } else if (deleteTarget.orgId) {
                await deleteOrganizationTeam(deleteTarget.orgId, deleteTarget.id);
                setTeams(prev => prev.filter(t => t.id !== deleteTarget.id));
                if (currentTeamId === deleteTarget.id) {
                    setCurrentTeam(null);
                }
                logAppEvent({
                    type: 'team_archived',
                    level: 'info',
                    message: 'Se archivó un equipo (borrado seguro).',
                    metadata: { team_id: deleteTarget.id, organization_id: deleteTarget.orgId },
                });
            }
            setDeleteTarget(null);
        } catch (issue) {
            setError(getApiErrorMessage(issue, 'No se pudo eliminar. Inténtalo de nuevo.'));
        } finally {
            setDeleting(false);
        }
    };

    return (
        <>
            <section className="rounded-2xl border border-lme-border bg-lme-surface/60 p-4 sm:p-5">
                {/* ── Cabecera del espacio ── */}
                <div className="flex items-center justify-between gap-3 border-b-2 border-ink pb-3">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-fisico">Claustro</p>
                        <h2 className="mt-0.5 text-lg font-black text-ink">Organización y equipos</h2>
                    </div>
                    <button
                        type="button"
                        onClick={() => void handleRefresh()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-sub transition-colors hover:bg-white/5 hover:text-ink"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loadingOrganizations || loadingTeams ? 'animate-spin' : ''}`} />
                        Refrescar
                    </button>
                </div>

                {error && (
                    <p className="mt-3 rounded-lg border border-lme-danger/30 bg-lme-danger/10 px-3 py-2 text-sm text-lme-danger/85">{error}</p>
                )}

                {/* ── A · Organizaciones ── */}
                <div className="mt-4">
                    <div className="mb-2 flex items-baseline gap-2 border-b border-line pb-1.5">
                        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-fisico">A</span>
                        <h3 className="text-sm font-bold text-ink">Organizaciones</h3>
                        <span className="ml-auto font-mono text-[11px] uppercase tracking-wide text-sub">
                            {loadingOrganizations ? 'Cargando…' : `${organizations.length} disponibles`}
                        </span>
                    </div>
                    <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
                        {organizations.map((organization) => {
                            const isActive = organization.id === currentOrganizationId;
                            return (
                                <div
                                    key={organization.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setCurrentOrganization(isActive ? null : organization.id)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCurrentOrganization(isActive ? null : organization.id); } }}
                                    className={`flex min-h-[128px] cursor-pointer flex-col gap-2 rounded-lg border bg-lme-surface p-3 transition-colors hover:border-ink ${isActive ? 'border-ink border-l-[5px]' : 'border-lme-border'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="flex min-w-0 flex-1 items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-sub">
                                            <span className="h-2 w-2 shrink-0 rounded-full bg-sky" />
                                            <span className="truncate">{PLAN_LABELS[organization.plan_type] ?? organization.plan_type} · {roleLabel(organization.role)}</span>
                                        </span>
                                        {isActive && <span className="shrink-0 rounded border border-mint px-1.5 py-px font-mono text-[9px] uppercase tracking-wide text-mint">Activa</span>}
                                        <KebabMenu
                                            ariaLabel={`Acciones de ${organization.name}`}
                                            note={canDeleteOrganization(organization) ? undefined : 'Solo un administrador puede eliminarla.'}
                                            items={[
                                                ...(isOrgAdmin ? [{
                                                    label: 'Gestionar miembros',
                                                    icon: <Users className="h-4 w-4 text-sub" />,
                                                    onClick: () => { setCurrentOrganization(organization.id); handleToggleOrgMembers(); },
                                                }] : []),
                                                ...(canDeleteOrganization(organization) ? [{
                                                    label: 'Eliminar organización',
                                                    icon: <Trash2 className="h-4 w-4" />,
                                                    danger: true,
                                                    onClick: () => setDeleteTarget({ kind: 'organización', id: organization.id, name: organization.name }),
                                                }] : []),
                                            ]}
                                        />
                                    </div>
                                    <h4 className="text-base font-bold text-ink">{organization.name}</h4>
                                </div>
                            );
                        })}

                        <button
                            type="button"
                            onClick={() => setShowCreateOrganization(true)}
                            className="flex min-h-[128px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line bg-transparent p-3 text-sub transition-colors hover:border-ink hover:text-ink"
                        >
                            <Plus className="h-6 w-6" />
                            <span className="text-sm font-bold">Nueva organización</span>
                            <span className="font-mono text-[10px] uppercase tracking-wide text-sub">Centro · Distrito · Piloto</span>
                        </button>
                    </div>
                </div>

                {/* ── B · Equipos ── */}
                {selectedOrganization && (
                    <div className="mt-5">
                        <div className="mb-2 flex items-baseline gap-2 border-b border-line pb-1.5">
                            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-fisico">B</span>
                            <h3 className="text-sm font-bold text-ink">Equipos de {selectedOrganization.name}</h3>
                            <span className="ml-auto font-mono text-[11px] uppercase tracking-wide text-sub">
                                {loadingTeams ? 'Cargando…' : `${teams.length} disponibles`}
                            </span>
                        </div>
                        <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
                            {teams.map((team) => {
                                const isActive = team.id === currentTeamId;
                                return (
                                    <div
                                        key={team.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setCurrentTeam(isActive ? null : team.id)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCurrentTeam(isActive ? null : team.id); } }}
                                        className={`flex min-h-[128px] cursor-pointer flex-col gap-2 rounded-lg border bg-lme-surface p-3 transition-colors hover:border-ink ${isActive ? 'border-ink border-l-[5px]' : 'border-lme-border'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="flex min-w-0 flex-1 items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-sub">
                                                <span className="h-2 w-2 shrink-0 rounded-full bg-vio" />
                                                <span className="truncate">{TEAM_TYPE_LABELS[team.team_type] ?? team.team_type}</span>
                                            </span>
                                            {isActive && <span className="shrink-0 rounded border border-mint px-1.5 py-px font-mono text-[9px] uppercase tracking-wide text-mint">Activo</span>}
                                            <KebabMenu
                                                ariaLabel={`Acciones de ${team.name}`}
                                                note={canDeleteTeam(team) ? undefined : 'Necesitas ser propietario o dirección.'}
                                                items={[
                                                    {
                                                        label: 'Miembros del equipo',
                                                        icon: <Users className="h-4 w-4 text-sub" />,
                                                        onClick: () => { setCurrentTeam(team.id); setShowMembersDialog(true); },
                                                    },
                                                    ...(canDeleteTeam(team) ? [{
                                                        label: 'Eliminar equipo',
                                                        icon: <Trash2 className="h-4 w-4" />,
                                                        danger: true,
                                                        onClick: () => setDeleteTarget({ kind: 'equipo' as const, id: team.id, name: team.name, orgId: selectedOrganization.id }),
                                                    }] : []),
                                                ]}
                                            />
                                        </div>
                                        <h4 className="text-base font-bold text-ink">{team.name}</h4>
                                        {team.role && <p className="text-xs text-sub">{roleLabel(team.role)}</p>}
                                    </div>
                                );
                            })}

                            <button
                                type="button"
                                onClick={() => setShowCreateTeam(true)}
                                className="flex min-h-[128px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line bg-transparent p-3 text-sub transition-colors hover:border-ink hover:text-ink"
                            >
                                <Plus className="h-6 w-6" />
                                <span className="text-sm font-bold">Nuevo equipo</span>
                                <span className="font-mono text-[10px] uppercase tracking-wide text-sub">Ciclo · Departamento · Directivo</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* ── C · Crear tablero en el contexto activo ── */}
                {(selectedOrganization || selectedTeam || allowPersonalWorkspace) && (
                    <div className="mt-5">
                        <div className="mb-2 flex items-baseline gap-2 border-b border-line pb-1.5">
                            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-fisico">C</span>
                            <h3 className="text-sm font-bold text-ink">
                                Crear tablero{selectedTeam ? ` en «${selectedTeam.name}»` : selectedOrganization ? ` en ${selectedOrganization.name}` : ''}
                            </h3>
                        </div>
                        <div className="mb-3 flex flex-wrap gap-2">
                            {(selectedOrganization || selectedTeam) && (
                                <Link
                                    to={getWorkspaceSubPath('organization', 'centro')}
                                    className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-bold uppercase tracking-wide text-lme-background transition-colors hover:bg-interior"
                                >
                                    <Layers3 className="h-4 w-4" /> Panel ejecutivo
                                </Link>
                            )}
                            {selectedTeam && (
                                <button
                                    type="button"
                                    onClick={() => setShowMembersDialog(true)}
                                    disabled={!canManageSelectedTeam}
                                    className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <UserCog className="h-4 w-4" /> Miembros del equipo
                                </button>
                            )}
                        </div>
                        <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
                            {quickCreateOptions.map((option, index) => {
                                const accents = ['border-t-mental', 'border-t-interior', 'border-t-social', 'border-t-emocional'];
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => onRequestCreateBoard?.(option.value)}
                                        disabled={!canCreateBoardInContext}
                                        className={`rounded-lg border border-t-4 border-lme-border bg-lme-surface p-3 text-left transition-all hover:-translate-y-0.5 hover:border-ink disabled:cursor-not-allowed disabled:opacity-50 ${accents[index % accents.length]}`}
                                    >
                                        <span className="font-mono text-[10px] uppercase tracking-wide text-sub">Plantilla</span>
                                        <p className="mt-1 text-sm font-bold text-ink">{option.label}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </section>

            {showCreateOrganization && (
                <InlineCreateDialog
                    title="Crear organización"
                    confirmLabel="Crear organización"
                    placeholder="Nombre del centro u organización"
                    onClose={() => setShowCreateOrganization(false)}
                    onConfirm={async (value) => {
                        const existingOrganization = organizations.find(
                            (organization) => normalizeWorkspaceName(organization.name) === normalizeWorkspaceName(value)
                        );
                        if (existingOrganization) {
                            setCurrentOrganization(existingOrganization.id);
                            return;
                        }
                        const organization = await createOrganization({ name: value });
                        setOrganizations((current) => [organization, ...current.filter((item) => item.id !== organization.id)]);
                        setCurrentOrganization(organization.id);
                        logAppEvent({
                            type: 'organization_created',
                            level: 'info',
                            message: 'Se creó una nueva organización Pro.',
                            metadata: { organization_id: organization.id },
                        });
                    }}
                />
            )}

            {showCreateTeam && selectedOrganization && (
                <InlineCreateDialog
                    title="Crear equipo"
                    confirmLabel="Crear equipo"
                    placeholder="Nombre del equipo"
                    onClose={() => setShowCreateTeam(false)}
                    onConfirm={async (value) => {
                        const existingTeam = teams.find(
                            (team) => normalizeWorkspaceName(team.name) === normalizeWorkspaceName(value)
                        );
                        if (existingTeam) {
                            setCurrentTeam(existingTeam.id);
                            return;
                        }
                        const team = await createOrganizationTeam(selectedOrganization.id, { name: value });
                        setTeams((current) => [team, ...current.filter((item) => item.id !== team.id)]);
                        setCurrentTeam(team.id);
                        logAppEvent({
                            type: 'team_created',
                            level: 'info',
                            message: 'Se creó un nuevo equipo dentro de la organización activa.',
                            metadata: { team_id: team.id, organization_id: selectedOrganization.id },
                        });
                    }}
                />
            )}

            {deleteTarget && (
                <ConfirmDeleteDialog
                    kind={deleteTarget.kind}
                    name={deleteTarget.name}
                    warning={deleteTarget.kind === 'organización'
                        ? 'Sus equipos y todos sus tableros se archivarán (no se borran): recuperables durante 30 días. Los miembros perderán el acceso.'
                        : 'Sus tableros se archivarán (no se borran): recuperables durante 30 días desde la papelera del centro. Los miembros perderán el acceso al equipo.'}
                    busy={deleting}
                    onCancel={() => setDeleteTarget(null)}
                    onConfirm={() => void confirmDelete()}
                />
            )}

            {showMembersDialog && selectedTeam && (
                <TeamMembersDialog
                    team={selectedTeam}
                    canManage={canManageSelectedTeam}
                    onClose={() => setShowMembersDialog(false)}
                />
            )}

            {/* ── Panel expandible: miembros de la organización ── */}
            {showOrgMembers && selectedOrganization && (
                <div className="mt-4 rounded-2xl border border-lme-border bg-black/20 p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-sky" />
                            <h3 className="text-base font-bold text-ink">Miembros de {selectedOrganization.name}</h3>
                        </div>
                        <button type="button" onClick={() => setShowOrgMembers(false)} className="text-xs text-sub hover:text-ink transition-colors">Cerrar</button>
                    </div>

                    {orgMemberError && (
                        <div className="mb-3 rounded-xl border border-lme-danger/30 bg-lme-danger/10 p-3 text-xs text-lme-danger/80">{orgMemberError}</div>
                    )}

                    {loadingOrgMembers ? (
                        <p className="text-sm text-sub">Cargando miembros…</p>
                    ) : orgMembers.length === 0 ? (
                        <p className="text-sm text-sub">No hay miembros adicionales registrados.</p>
                    ) : (
                        <div className="space-y-2">
                            {orgMembers.map((member) => {
                                const isSelf = member.user.email === currentUser?.email;
                                const displayName = member.user.display_name || member.user.email;
                                const isChanging = changingOrgRole === member.id;
                                const isRemoving = removingOrgMember === member.id;
                                return (
                                    <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl border border-lme-border bg-lme-surface/30 px-3 py-2.5">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
                                            <p className="truncate text-[11px] text-sub">{member.user.email}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {isOrgAdmin && !isSelf ? (
                                                <select
                                                    value={member.role}
                                                    disabled={isChanging || isRemoving}
                                                    onChange={(e) => void handleOrgRoleChange(member.id, member.user.id, e.target.value as ProOrgMembershipResponse['role'])}
                                                    className="rounded-xl border border-line bg-black/20 px-3 py-1.5 text-xs text-ink focus:border-sky focus:outline-none disabled:opacity-50"
                                                >
                                                    <option value="member">Miembro</option>
                                                    <option value="teacher">Docente</option>
                                                    <option value="leadership">Dirección</option>
                                                    <option value="organization_admin">Administración</option>
                                                </select>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold text-ink">
                                                    <Shield className="h-3 w-3 text-mint" />
                                                    {roleLabel(member.role)}
                                                    {isSelf && <span className="text-sub ml-1">(tú)</span>}
                                                </span>
                                            )}
                                            {isOrgAdmin && !isSelf && (
                                                <button
                                                    type="button"
                                                    disabled={isChanging || isRemoving}
                                                    onClick={() => void handleRemoveOrgMember(member.id, member.user.id, displayName)}
                                                    title={`Eliminar a ${displayName} de la organización`}
                                                    className="rounded-lg p-1.5 text-sub hover:text-lme-danger transition-colors disabled:opacity-50"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
