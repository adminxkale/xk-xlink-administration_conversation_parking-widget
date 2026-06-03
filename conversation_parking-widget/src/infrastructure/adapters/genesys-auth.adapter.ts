const TOKEN_KEY = 'genesys_token';
const ENVIRONMENT_KEY = 'genesys_environment';

/**
 * Extract access token from URL hash, query params, or localStorage.
 * If found in hash/query, stores it in localStorage.
 * Returns the first token found, or null if none.
 */
export function extractToken(): string | null {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash;
  if (hash) {
    const hashParams = new URLSearchParams(hash.substring(1));
    const hashToken = hashParams.get('access_token');
    if (hashToken) {
      localStorage.setItem(TOKEN_KEY, hashToken);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      return hashToken;
    }
  }

  const queryParams = new URLSearchParams(window.location.search);
  const queryToken = queryParams.get('access_token');
  if (queryToken) {
    localStorage.setItem(TOKEN_KEY, queryToken);
    queryParams.delete('access_token');
    const remaining = queryParams.toString();
    window.history.replaceState(null, '', window.location.pathname + (remaining ? `?${remaining}` : ''));
    return queryToken;
  }

  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Validate token by calling Genesys Cloud `/api/v2/users/me?expand=groups`.
 * Returns user name, id, and group IDs.
 * Throws if validation fails.
 */
export async function validateToken(
  token: string,
  environment?: string
): Promise<{ name: string; id: string; groupIds: string[] }> {
  const resolvedEnvironment =
    environment ?? (typeof window !== 'undefined' ? localStorage.getItem(ENVIRONMENT_KEY) : null);

  if (!resolvedEnvironment) {
    throw new Error('Genesys environment is not available.');
  }

  const response = await fetch(
    `https://api.${resolvedEnvironment}/api/v2/users/me?expand=groups`,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );

  if (!response.ok) {
    throw new Error(`Token validation failed with status ${response.status}`);
  }

  const data = await response.json();
  const groupIds = Array.isArray(data.groups) ? data.groups.map((g: { id: string }) => g.id) : [];
  return { name: data.name ?? '', id: data.id ?? '', groupIds };
}

/**
 * Redirect to Genesys Cloud OAuth login page using implicit grant flow.
 * Receives clientId and environment dynamically from tenant resolution.
 */
export function redirectToLogin(clientId: string, environment: string): void {
  localStorage.setItem(ENVIRONMENT_KEY, environment);
  const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
  window.location.href =
    `https://login.${environment}/oauth/authorize` +
    `?response_type=token&client_id=${clientId}&redirect_uri=${redirectUri}`;
}

/**
 * Remove token from localStorage.
 */
export function clearToken(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
}
