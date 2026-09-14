import { SocInactivationCancellationRegistry } from './soc-inactivation-cancellation';

describe('SocInactivationCancellationRegistry', () => {
  it('tracks cancellation only for the active execution', () => {
    const registry = new SocInactivationCancellationRegistry();
    registry.start('run-1');
    expect(registry.isCancelled('run-1')).toBe(false);
    registry.cancel('run-1');
    expect(registry.isCancelled('run-1')).toBe(true);
    registry.finish('run-1');
    expect(registry.isCancelled('run-1')).toBe(false);
  });
});
