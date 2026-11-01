export type RecoveryLink = { status: 'ok'; accessToken: string; refreshToken: string } | { status: 'expired' };

/** El correo de recuperación vuelve con los datos en el hash, donde también vive el router. */
export function parseRecoveryHash(hash: string): RecoveryLink | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  if (params.get('error_code') || params.get('error')) return { status: 'expired' };
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (params.get('type') !== 'recovery' || !accessToken || !refreshToken) return null;
  return { status: 'ok', accessToken, refreshToken };
}

/** Lee el enlace antes de que arranque el router y quita los tokens de la dirección. */
export function consumeRecoveryLink(): RecoveryLink | null {
  const link = parseRecoveryHash(window.location.hash);
  if (link) window.history.replaceState(null, '', `${window.location.pathname}#/settings`);
  return link;
}
