// ============================================================
// Code Studio — Role Router (feature access control)
// ============================================================

export type UserRole = 'admin' | 'developer' | 'viewer' | 'guest';

export interface RolePermissions {
  canEdit: boolean;
  canDeploy: boolean;
  canManageSettings: boolean;
  canRunTerminal: boolean;
  canAccessAI: boolean;
  canInviteUsers: boolean;
  canDeleteFiles: boolean;
  canViewAnalytics: boolean;
  canExport: boolean;
}

const ROLE_MAP: Record<UserRole, RolePermissions> = {
  admin: {
    canEdit: true, canDeploy: true, canManageSettings: true,
    canRunTerminal: true, canAccessAI: true, canInviteUsers: true,
    canDeleteFiles: true, canViewAnalytics: true, canExport: true,
  },
  developer: {
    canEdit: true, canDeploy: true, canManageSettings: false,
    canRunTerminal: true, canAccessAI: true, canInviteUsers: false,
    canDeleteFiles: true, canViewAnalytics: true, canExport: true,
  },
  viewer: {
    canEdit: false, canDeploy: false, canManageSettings: false,
    canRunTerminal: false, canAccessAI: true, canInviteUsers: false,
    canDeleteFiles: false, canViewAnalytics: true, canExport: true,
  },
  guest: {
    canEdit: false, canDeploy: false, canManageSettings: false,
    canRunTerminal: false, canAccessAI: false, canInviteUsers: false,
    canDeleteFiles: false, canViewAnalytics: false, canExport: false,
  },
};

export function getPermissions(role: UserRole): RolePermissions {
  return { ...ROLE_MAP[role] };
}

export function hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
  return ROLE_MAP[role][permission];
}

export function isAtLeast(role: UserRole, minRole: UserRole): boolean {
  const hierarchy: UserRole[] = ['guest', 'viewer', 'developer', 'admin'];
  return hierarchy.indexOf(role) >= hierarchy.indexOf(minRole);
}

export function getAllRoles(): UserRole[] {
  return ['admin', 'developer', 'viewer', 'guest'];
}

// IDENTITY_SEAL: role=RoleRouter | inputs=UserRole | outputs=RolePermissions
