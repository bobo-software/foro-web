import { create } from 'zustand';
import { teamService } from '@/services/teamService';
import type {
  CreateInviteInput,
  InviteAcceptanceResult,
  InvitePreview,
  TeamInvite,
  TeamMembership,
} from '@/types/team';

interface TeamState {
  invites: TeamInvite[];
  members: TeamMembership[];
  invitePreview: InvitePreview | null;
  isLoading: boolean;
  error: string | null;
  createInvite: (input: CreateInviteInput) => Promise<TeamInvite | null>;
  fetchInvites: (businessId: number) => Promise<void>;
  revokeInvite: (inviteId: number, businessId: number) => Promise<void>;
  resendInvite: (inviteId: number) => Promise<boolean>;
  fetchInvitePreview: (token: string) => Promise<InvitePreview | null>;
  acceptInvite: (token: string) => Promise<InviteAcceptanceResult | null>;
  fetchMembers: (businessId: number) => Promise<void>;
  updateMemberRole: (membershipId: number, roleKey: string, businessId: number) => Promise<void>;
  removeMember: (membershipId: number, businessId: number) => Promise<void>;
  clearError: () => void;
}

export const useTeamStore = create<TeamState>((set) => ({
  invites: [],
  members: [],
  invitePreview: null,
  isLoading: false,
  error: null,

  async createInvite(input) {
    set({ isLoading: true, error: null });
    try {
      const created = await teamService.createInvite(input);
      set((state) => ({ invites: [created, ...state.invites], isLoading: false }));
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create invite';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  async fetchInvites(businessId) {
    set({ isLoading: true, error: null });
    try {
      const invites = await teamService.listInvites(businessId);
      set({ invites, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load invites';
      set({ error: message, isLoading: false, invites: [] });
    }
  },

  async revokeInvite(inviteId, businessId) {
    set({ isLoading: true, error: null });
    try {
      await teamService.revokeInvite(inviteId);
      const invites = await teamService.listInvites(businessId);
      set({ invites, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to revoke invite';
      set({ error: message, isLoading: false });
    }
  },

  async resendInvite(inviteId) {
    set({ isLoading: true, error: null });
    try {
      await teamService.resendInvite(inviteId);
      set({ isLoading: false });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resend invite';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  async fetchInvitePreview(token) {
    set({ isLoading: true, error: null });
    try {
      const invitePreview = await teamService.previewInvite(token);
      set({ invitePreview, isLoading: false });
      return invitePreview;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid or expired invite';
      set({ error: message, isLoading: false, invitePreview: null });
      return null;
    }
  },

  async acceptInvite(token) {
    set({ isLoading: true, error: null });
    try {
      const result = await teamService.acceptInvite(token);
      set({ isLoading: false });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to accept invite';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  async fetchMembers(businessId) {
    set({ isLoading: true, error: null });
    try {
      const members = await teamService.listMembers(businessId);
      set({ members, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load team members';
      set({ error: message, isLoading: false, members: [] });
    }
  },

  async updateMemberRole(membershipId, roleKey, businessId) {
    set({ isLoading: true, error: null });
    try {
      await teamService.updateMemberRole(membershipId, roleKey);
      const members = await teamService.listMembers(businessId);
      set({ members, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update role';
      set({ error: message, isLoading: false });
    }
  },

  async removeMember(membershipId, businessId) {
    set({ isLoading: true, error: null });
    try {
      await teamService.removeMember(membershipId);
      const members = await teamService.listMembers(businessId);
      set({ members, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove member';
      set({ error: message, isLoading: false });
    }
  },

  clearError() {
    set({ error: null });
  },
}));
