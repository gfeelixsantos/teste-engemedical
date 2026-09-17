import { activationScheduleForDate, isActivationMeetingSlot } from './activation-schedule';

describe('activation schedule', () => {
  it('offers hourly slots from 09:00 to 18:00 Monday through Thursday', () => {
    expect(activationScheduleForDate('2026-09-17')).toEqual([
      '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    ]);
  });

  it('ends Friday availability at 17:00', () => {
    expect(activationScheduleForDate('2026-09-18')).toEqual([
      '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00',
    ]);
  });

  it('never offers Saturday or Sunday', () => {
    expect(activationScheduleForDate('2026-09-19')).toEqual([]);
    expect(activationScheduleForDate('2026-09-20')).toEqual([]);
  });

  it('accepts only one-hour slots inside the configured business windows', () => {
    expect(isActivationMeetingSlot('2026-09-17T13:00:00-03:00', '2026-09-17T14:00:00-03:00')).toBe(true);
    expect(isActivationMeetingSlot('2026-09-17T12:00:00-03:00', '2026-09-17T13:00:00-03:00')).toBe(false);
    expect(isActivationMeetingSlot('2026-09-20T13:00:00-03:00', '2026-09-20T14:00:00-03:00')).toBe(false);
  });
});
