// Helper functions for authentication token management

/**
 * Set authentication token in both localStorage and cookie
 * @param token JWT token
 */
export function setAuthToken(token: string) {
  // Set in localStorage for client-side access
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
  
  // Set in cookie for server-side middleware access
  // Cookie expires in 7 days
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  
  document.cookie = `token=${token}; path=/; expires=${expires.toUTCString()}; SameSite=Lax; Secure`;
}

/**
 * Remove authentication token from both localStorage and cookie
 */
export function removeAuthToken() {
  // Remove from localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
  
  // Remove cookie by setting expired date
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure';
}

/**
 * Get authentication token from localStorage
 * @returns token or null
 */
export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
}

/**
 * Check if user is authenticated
 * @returns boolean
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}
