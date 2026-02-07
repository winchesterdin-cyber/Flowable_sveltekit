import { fetchApi } from './core';
import type { LoginRequest, RegisterRequest, User } from '$lib/types';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('api.auth');

export const authApi = {
  /**
   * Authenticate a user.
   * @param credentials - Login credentials (username/password).
   * @returns A promise that resolves to the login response.
   */
  async login(credentials: LoginRequest): Promise<{ message: string; user: User }> {
    log.debug('login called', { username: credentials.username });
    return fetchApi('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

  /**
   * Register a new user.
   * @param request - Registration details.
   * @returns A promise that resolves to the registration response.
   */
  async register(request: RegisterRequest): Promise<{ message: string; user: User }> {
    log.debug('register called', { username: request.username });
    return fetchApi('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  },

  /**
   * Logout the current user.
   */
  async logout(): Promise<void> {
    log.debug('logout called');
    await fetchApi('/api/auth/logout', { method: 'POST' });
  },

  /**
   * Clear all session cookies including HttpOnly cookies.
   * Used to recover from "Request Header Or Cookie Too Large" errors.
   */
  async clearSession(): Promise<{ message: string; details: string }> {
    log.debug('clearSession called');
    return fetchApi('/api/auth/clear-session', { method: 'POST' });
  },

  /**
   * Get the currently authenticated user.
   * @returns A promise that resolves to the current user.
   */
  async getCurrentUser(): Promise<User> {
    log.debug('getCurrentUser called');
    return fetchApi('/api/auth/me');
  },

  /**
   * Update the current user's profile.
   * @param request - The updated profile data.
   * @returns A promise that resolves to the updated user.
   */
  async updateProfile(request: {
    firstName: string;
    lastName: string;
    email: string;
  }): Promise<User> {
    log.debug('updateProfile called');
    return fetchApi('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(request)
    });
  }
};
