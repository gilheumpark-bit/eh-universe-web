import {
  isAdmin,
  isPlanetOwner,
  canManagePlanet,
  canWritePlanetLog,
  canCreateSettlement,
  canViewVisibility,
} from '@/lib/network-permissions';
import type { UserRecord, PlanetRecord } from '@/lib/network-types';

const adminUser: UserRecord = {
  id: 'u1',
  nickname: 'Admin',
  role: 'admin',
  badges: [],
  planetCount: 0,
  createdAt: '',
  updatedAt: '',
};

const memberUser: UserRecord = {
  id: 'u2',
  nickname: 'Member',
  role: 'member',
  badges: [],
  planetCount: 0,
  createdAt: '',
  updatedAt: '',
};

const planet = {
  id: 'p1',
  ownerId: 'u2',
  name: 'TestPlanet',
  genre: 'SF',
  civilizationLevel: 'high',
  goal: 'maintain',
  status: 'maintain',
  visibility: 'public',
  summary: '',
  representativeTags: [],
  coreRules: [],
  stats: { logCount: 0, settlementCount: 0, lastLogAt: null, lastSettlementAt: null },
  createdAt: '',
  updatedAt: '',
} as PlanetRecord;

describe('network-permissions', () => {
  describe('isAdmin', () => {
    it('returns true for admin role', () => {
      expect(isAdmin(adminUser)).toBe(true);
    });
    it('returns false for member role', () => {
      expect(isAdmin(memberUser)).toBe(false);
    });
    it('returns false for null', () => {
      expect(isAdmin(null)).toBe(false);
    });
  });

  describe('isPlanetOwner', () => {
    it('returns true when userId matches planet ownerId', () => {
      expect(isPlanetOwner('u2', planet)).toBe(true);
    });
    it('returns false when userId differs', () => {
      expect(isPlanetOwner('u99', planet)).toBe(false);
    });
    it('returns false for null userId', () => {
      expect(isPlanetOwner(null, planet)).toBe(false);
    });
    it('returns false for undefined userId', () => {
      expect(isPlanetOwner(undefined, planet)).toBe(false);
    });
    it('returns false for empty string userId', () => {
      expect(isPlanetOwner('', planet)).toBe(false);
    });
    it('returns false when the planet ownerId is empty', () => {
      expect(isPlanetOwner('u2', { ...planet, ownerId: '' } as PlanetRecord)).toBe(false);
    });
    it('returns false for null planet', () => {
      expect(isPlanetOwner('u2', null)).toBe(false);
    });
  });

  describe('canManagePlanet', () => {
    it('returns true for planet owner', () => {
      expect(canManagePlanet('u2', memberUser, planet)).toBe(true);
    });
    it('returns true for admin non-owner', () => {
      expect(canManagePlanet('u1', adminUser, planet)).toBe(true);
    });
    it('returns true when a user is both admin and owner', () => {
      expect(canManagePlanet('u2', { ...adminUser, id: 'u2' }, planet)).toBe(true);
    });
    it('returns false for non-owner member', () => {
      expect(canManagePlanet('u99', memberUser, planet)).toBe(false);
    });
  });

  describe('canWritePlanetLog', () => {
    it('delegates to canManagePlanet — owner can write', () => {
      expect(canWritePlanetLog('u2', memberUser, planet)).toBe(true);
    });
    it('non-owner member cannot write', () => {
      expect(canWritePlanetLog('u99', memberUser, planet)).toBe(false);
    });
  });

  describe('canCreateSettlement', () => {
    it('returns true for admin', () => {
      expect(canCreateSettlement(adminUser)).toBe(true);
    });
    it('returns false for member', () => {
      expect(canCreateSettlement(memberUser)).toBe(false);
    });
  });

  describe('canViewVisibility', () => {
    it('public is visible to everyone', () => {
      expect(canViewVisibility('public', { isAuthenticated: false, isOwner: false, isAdmin: false })).toBe(true);
    });
    it('members visibility requires authentication', () => {
      expect(canViewVisibility('members', { isAuthenticated: true, isOwner: false, isAdmin: false })).toBe(true);
      expect(canViewVisibility('members', { isAuthenticated: false, isOwner: false, isAdmin: false })).toBe(false);
    });
    it('members visibility allows owner', () => {
      expect(canViewVisibility('members', { isAuthenticated: false, isOwner: true, isAdmin: false })).toBe(true);
    });
    it('private visibility requires owner or admin', () => {
      expect(canViewVisibility('private', { isAuthenticated: true, isOwner: false, isAdmin: false })).toBe(false);
      expect(canViewVisibility('private', { isAuthenticated: false, isOwner: true, isAdmin: false })).toBe(true);
      expect(canViewVisibility('private', { isAuthenticated: false, isOwner: false, isAdmin: true })).toBe(true);
    });
  });
});
