export type TeamInviteStatus = 'pending' | 'sent' | 'accepted' | 'revoked' | 'expired';

export type TeamMembershipStatus = 'active' | 'inactive' | 'removed';

export interface TeamInvite {
  id: number;
  business_id: number;
  business_name?: string;
  email_normalized: string;
  role_key: string;
  status: TeamInviteStatus;
  expires_at: string;
  invited_by_user_id?: number;
  accepted_by_user_id?: number | null;
  accepted_at?: string | null;
  revoked_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface InvitePreview {
  valid: boolean;
  token: string;
  business_id: number;
  business_name: string;
  role_key: string;
  email: string;
  expires_at: string;
  status: TeamInviteStatus;
  reason?: string;
  has_account: boolean;
}

export interface TeamMembership {
  id: number;
  user_id: number;
  business_id: number;
  business_name?: string;
  role_key: string;
  status: TeamMembershipStatus;
  invited_via_invite_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateInviteInput {
  email: string;
  role_key: string;
  business_id: number;
}

export interface InviteAcceptanceResult {
  success: boolean;
  membership?: TeamMembership;
  active_business_id?: number;
  message?: string;
}
