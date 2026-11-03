import { describe, expect, it } from 'vitest';
import { consumeRecoveryLink, parseRecoveryHash } from './recovery';

describe('enlace de recuperación', () => {
  it('reconoce un enlace válido', () => {
    expect(parseRecoveryHash('#access_token=a&refresh_token=r&type=recovery')).toEqual({ status: 'ok', accessToken: 'a', refreshToken: 'r' });
  });

  it('reconoce un enlace vencido', () => {
    expect(parseRecoveryHash('#error=access_denied&error_code=otp_expired')).toEqual({ status: 'expired' });
  });

  it.each(['', '#/tasks', '#finance', '#access_token=a&refresh_token=r&type=signup', '#access_token=a&type=recovery'])('ignora %s', (hash) => {
    expect(parseRecoveryHash(hash)).toBeNull();
  });

  it('quita los tokens de la dirección', () => {
    window.location.hash = '#access_token=secreto&refresh_token=r&type=recovery';
    expect(consumeRecoveryLink()?.status).toBe('ok');
    expect(window.location.href).not.toContain('secreto');
    expect(window.location.hash).toBe('#/settings');
  });

  it('no toca una ruta normal', () => {
    window.location.hash = '#/tasks';
    expect(consumeRecoveryLink()).toBeNull();
    expect(window.location.hash).toBe('#/tasks');
  });
});
