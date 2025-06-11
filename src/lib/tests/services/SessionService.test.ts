import { describe, it, expect, vi } from 'vitest';
import { SessionService } from '../../services/SessionService';

function createAuthMock(session: any = null, user: any = null) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session } }),
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null })
    }
  } as any;
}

describe('SessionService', () => {
  it('returns nulls when no session', async () => {
    const svc = new SessionService(createAuthMock());
    const result = await svc.getSafeSession();
    expect(result).toEqual({ session: null, user: null });
  });

  it('returns session and user when present', async () => {
    const session = { id: 's1' } as any;
    const user = { id: 'u1', email: 'a@b.c' } as any;
    const svc = new SessionService(createAuthMock(session, user));
    const result = await svc.getSafeSession();
    expect(result.session).toEqual(session);
    expect(result.user).toEqual(user);
  });
});
