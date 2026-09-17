import { activationScheduleForDate } from './activation-schedule';

describe('activation schedule UI', () => {
  it('shows only legacy business-hour slots', () => {
    expect(activationScheduleForDate('2026-09-17')).toEqual([
      '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    ]);
    expect(activationScheduleForDate('2026-09-18')).toEqual([
      '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00',
    ]);
  });

  it('does not render weekend slots', () => {
    expect(activationScheduleForDate('2026-09-19')).toEqual([]);
    expect(activationScheduleForDate('2026-09-20')).toEqual([]);
  });
});
