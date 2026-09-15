import { HistoryImportCancellationRegistry } from './history-import-cancellation';

describe('HistoryImportCancellationRegistry', () => {
  it('tracks cancellation only for an active import', () => {
    const registry = new HistoryImportCancellationRegistry();

    registry.start('import-1');
    expect(registry.isCancelled('import-1')).toBe(false);

    registry.cancel('import-1');
    expect(registry.isCancelled('import-1')).toBe(true);

    registry.finish('import-1');
    expect(registry.isCancelled('import-1')).toBe(false);
  });
});
