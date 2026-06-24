const TOKEN_KEY = 'genesys_token';
const ENVIRONMENT_KEY = 'genesys_environment';
const CODE_VERIFIER_KEY = 'pkce_code_verifier';

/** Lock para evitar intercambios concurrentes del mismo code (Strict Mode / double-mount) */
let exchangeInProgress: Promise<string> | null = null;

/**
 * Genera un code_verifier random de 128 caracteres.
 * Usa crypto.getRandomValues (disponible en todos los browsers modernos).
 */
function generateCodeVerifier(length = 128): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return base64UrlEncode(array).slice(0, length);
}

/**
 * Computa el code_challenge = Base64URL(SHA-256(code_verifier))
 */
async function computeCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Base64 URL-safe encoding (sin padding, con - y _ en vez de + y /)
 */
function base64UrlEncode(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Intercambia el authorization code por un access_token usando PKCE.
 */
async function exchangeCodeForToken(
  code: string,
  clientId: string,
  redirectUri: string,
  codeVerifier: string,
  environment: string
): Promise<string> {
  const tokenUrl = `https://login.${environment}/oauth/token`;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error('No access_token in token response');
  }

  return data.access_token;
}

/**
 * Validate token by calling Genesys Cloud `/api/v2/users/me?expand=groups`.
 * Returns user name, id, and group IDs.
 * Throws if validation fails.
 */
export async function validateToken(
  token: string,
  environment: string
): Promise<{ name: string; id: string; groupIds: string[] }> {
  const response = await fetch(
    `https://api.${environment}/api/v2/users/me?expand=groups`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Token validation failed with status ${response.status}`);
  }

  const data = await response.json();
  const groupIds = Array.isArray(data.groups)
    ? data.groups.map((g: { id: string }) => g.id)
    : [];

  return { name: data.name ?? '', id: data.id ?? '', groupIds };
}

/**
 * Flujo principal de autenticación con Authorization Code + PKCE.
 *
 * Maneja 3 casos:
 * 1. Token guardado en localStorage → valida (prioridad máxima)
 * 2. Callback con ?code= → intercambia por token
 * 3. Sin token → inicia flujo PKCE (redirige a Genesys)
 */
export async function loginWithPKCE(
  clientId: string,
  environment: string
): Promise<{ name: string; id: string; groupIds: string[]; token: string }> {
  localStorage.setItem(ENVIRONMENT_KEY, environment);

  const redirectUri = window.location.origin + window.location.pathname;

  // --- CASO 1: Hay token guardado → validar (cubre re-ejecuciones por Strict Mode) ---
  const storedToken = localStorage.getItem(TOKEN_KEY);
  if (storedToken) {
    // Limpiar ?code= de la URL si quedó del redirect anterior
    const currentParams = new URLSearchParams(window.location.search);
    if (currentParams.has('code')) {
      window.history.replaceState(null, '', redirectUri);
    }

    try {
      const userInfo = await validateToken(storedToken, environment);
      return { ...userInfo, token: storedToken };
    } catch {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  // --- CASO 2: Estamos en el callback (URL tiene ?code=) ---
  const urlParams = new URLSearchParams(window.location.search);
  const authCode = urlParams.get('code');

  if (authCode) {
    // Reutilizar intercambio en progreso si ya hay uno (Strict Mode ejecuta useEffect 2 veces)
    if (exchangeInProgress) {
      const token = await exchangeInProgress;
      const userInfo = await validateToken(token, environment);
      return { ...userInfo, token };
    }

    const codeVerifier = sessionStorage.getItem(CODE_VERIFIER_KEY);
    if (!codeVerifier) {
      throw new Error('No se encontró el code_verifier. Recarga la página para reiniciar el flujo.');
    }

    // Iniciar intercambio con lock — no borrar el verifier hasta que sea exitoso
    exchangeInProgress = exchangeCodeForToken(
      authCode, clientId, redirectUri, codeVerifier, environment
    );

    try {
      const token = await exchangeInProgress;

      // Intercambio exitoso — ahora sí limpiar
      sessionStorage.removeItem(CODE_VERIFIER_KEY);
      localStorage.setItem(TOKEN_KEY, token);
      window.history.replaceState(null, '', redirectUri);

      const userInfo = await validateToken(token, environment);
      return { ...userInfo, token };
    } finally {
      exchangeInProgress = null;
    }
  }

  // --- CASO 3: No hay token ni code → iniciar flujo PKCE ---
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await computeCodeChallenge(codeVerifier);

  sessionStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);

  const authUrl =
    `https://login.${environment}/oauth/authorize` +
    `?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&code_challenge_method=S256` +
    `&code_challenge=${encodeURIComponent(codeChallenge)}`;

  window.location.href = authUrl;

  // La página navega — esta promesa nunca se resuelve
  return new Promise(() => {});
}

/**
 * Remove token from localStorage.
 */
export function clearToken(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
}
