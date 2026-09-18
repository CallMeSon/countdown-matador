import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); },
}));

describe('root page', () => {
  it('redirect ke /control', async () => {
    const Root = (await import('@/app/page')).default;
    expect(() => Root()).toThrow('REDIRECT:/control');
  });
});
