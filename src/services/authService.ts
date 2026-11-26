/**
 * Auth Service
 * Register/login/logout against foro-api's JWT auth (`/api/v1/auth/*`).
 */

import { foroApiClient } from '../backend';
import useAuthStore from '../stores/data/AuthStore';
import { TokenManager } from './TokenManager';
import { API_CONFIG } from '../config/api.config';
import type { SessionUser } from '../types/Types';

export interface RegisterPayload {
  name: string;
  last_name?: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

interface ApiUser {
  id: number;
  name: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  isSuperAdmin?: boolean;
}

export interface AuthTokensResponse {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
}

function mapApiUserToSessionUser(payload: AuthTokensResponse): SessionUser {
  const { user, accessToken } = payload;
  const fullName = [user.name, user.lastName].filter(Boolean).join(' ').trim() || user.name;

  return {
    id: user.id,
    email: user.email ?? '',
    accessToken,
    name: fullName,
    full_name: fullName,
    first_name: user.name,
    last_name: user.lastName ?? undefined,
    phone: user.phone,
    isSuperAdmin: user.isSuperAdmin ?? false,
  };
}

/** Stores tokens and signs the user into the auth store from a foro-api auth payload. */
export function applyAuthSession(payload: AuthTokensResponse): SessionUser {
  const sessionUser = mapApiUserToSessionUser(payload);
  TokenManager.setAccessToken(payload.accessToken);
  TokenManager.setRefreshToken(payload.refreshToken);
  useAuthStore.getState().login(sessionUser);
  return sessionUser;
}

/**
 * foro-api has no OTP/email-verification flow (unlike the old Skaftin backend).
 * Kept as `false` so callers built around this flag keep working unchanged.
 */
export function authPayloadNeedsOtpVerification(): boolean {
  return false;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<SessionUser> {
    const store = useAuthStore.getState();
    store.setLoading(true);
    store.clearError();

    try {
      const response = await foroApiClient.post<AuthTokensResponse>(API_CONFIG.endpoints.register, {
        name: payload.name,
        lastName: payload.last_name,
        email: payload.email,
        password: payload.password,
        phone: payload.phone,
      });
      if (!response.data?.user || !response.data?.accessToken) {
        throw new Error('Invalid register response');
      }

      const sessionUser = applyAuthSession(response.data);
      store.setLoading(false);
      return sessionUser;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      store.setError(message);
      store.setLoading(false);
      throw err;
    }
  },

  async login(payload: LoginPayload): Promise<SessionUser> {
    const store = useAuthStore.getState();
    store.setLoading(true);
    store.clearError();

    try {
      const response = await foroApiClient.post<AuthTokensResponse>(API_CONFIG.endpoints.login, {
        email: payload.username,
        password: payload.password,
      });
      if (!response.data?.user || !response.data?.accessToken) {
        throw new Error('Invalid login response');
      }

      const sessionUser = applyAuthSession(response.data);
      store.setLoading(false);
      return sessionUser;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      store.setError(message);
      store.setLoading(false);
      throw err;
    }
  },

  logout(): void {
    void useAuthStore.getState().logout();
  },

  /**
   * Three-step OTP reset flow on foro-api:
   *   forgot-password (emails a 6-digit code, valid 15 min)
   *   → verify-forgot-password-otp (exchanges the code for a reset token)
   *   → reset-password (writes the new bcrypt hash and revokes all refresh tokens).
   *
   * Forgot-password answers 404 when no active account exists for the email, so
   * the page can tell the user instead of silently pretending a mail went out.
   */
  async forgotPassword(email: string): Promise<void> {
    const store = useAuthStore.getState();
    store.setLoading(true);
    store.clearError();

    try {
      await foroApiClient.post(API_CONFIG.endpoints.forgotPassword, { email: email.trim() });
      store.setLoading(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset code';
      store.setError(message);
      store.setLoading(false);
      throw err;
    }
  },

  async verifyForgotPasswordOtp(email: string, otp: string): Promise<{ reset_token: string }> {
    const store = useAuthStore.getState();
    store.setLoading(true);
    store.clearError();

    try {
      const response = await foroApiClient.post<{ resetToken: string; expiresInMinutes: number }>(
        API_CONFIG.endpoints.verifyForgotPasswordOtp,
        { email: email.trim(), otp: otp.trim() },
      );
      if (!response.data?.resetToken) {
        throw new Error('Invalid or expired code');
      }
      store.setLoading(false);
      return { reset_token: response.data.resetToken };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid or expired code';
      store.setError(message);
      store.setLoading(false);
      throw err;
    }
  },

  async resetPasswordWithToken(email: string, resetToken: string, newPassword: string): Promise<void> {
    const store = useAuthStore.getState();
    store.setLoading(true);
    store.clearError();

    try {
      await foroApiClient.post(API_CONFIG.endpoints.resetPassword, {
        email: email.trim(),
        resetToken,
        newPassword,
      });
      store.setLoading(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset password';
      store.setError(message);
      store.setLoading(false);
      throw err;
    }
  },

  /**
   * Signup OTP verification is not part of foro-api's auth model — accounts are
   * created active, so the legacy VerifyOtp page has nothing to call.
   */
  async verifyOtp(_userId: number, _otp: string): Promise<never> {
    throw new Error('OTP verification is not available — this account is already active.');
  },

  async resendOtp(_userId: number, _method: 'email' | 'sms' = 'email'): Promise<never> {
    throw new Error('OTP verification is not available.');
  },

  getUser(): SessionUser | null {
    return useAuthStore.getState().sessionUser;
  },

  isAuthenticated(): boolean {
    const state = useAuthStore.getState();
    return !!(state.sessionUser?.accessToken || state.accessToken);
  },

  getToken(): string | null {
    return TokenManager.getAccessToken();
  },

  async verifySession(): Promise<boolean> {
    return useAuthStore.getState().verifySession();
  },
};
