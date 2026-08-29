import 'reflect-metadata';

import {
  SCHEDULE_CRON_OPTIONS,
  SCHEDULER_NAME,
} from '@nestjs/schedule/dist/schedule.constants';

import { CronJobs } from './cron';

describe('CronJobs metadata', () => {
  const createInstance = () =>
    new CronJobs(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {
        setContext: jest.fn(),
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      } as any,
      {} as any,
    );

  it('keeps only the orchestrated midnight cron on the maintenance window', () => {
    const instance = createInstance();

    expect(
      Reflect.getMetadata(
        SCHEDULE_CRON_OPTIONS,
        instance.midnightMaintenanceWindow,
      ),
    ).toEqual({
      cronTime: '1 0 * * *',
      timeZone: 'America/Sao_Paulo',
    });
    expect(
      Reflect.getMetadata(
        SCHEDULER_NAME,
        instance.midnightMaintenanceWindow,
      ),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        SCHEDULE_CRON_OPTIONS,
        instance.midnightChangeStreamReset,
      ),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(SCHEDULE_CRON_OPTIONS, instance.clearDailyTickets),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        SCHEDULE_CRON_OPTIONS,
        instance.maintainOldSchedulingsBacklog,
      ),
    ).toBeUndefined();
  });

  it('runs the midnight maintenance steps in the expected order', async () => {
    const instance = createInstance();
    const order: string[] = [];

    jest
      .spyOn(instance, 'midnightChangeStreamReset')
      .mockImplementation(async () => void order.push('reset'));
    jest
      .spyOn(instance, 'clearDailyTickets')
      .mockImplementation(async () => void order.push('daily'));
    jest
      .spyOn(instance, 'maintainOldSchedulingsBacklog')
      .mockImplementation(async () => void order.push('backlog'));

    await instance.midnightMaintenanceWindow();

    expect(order).toEqual(['reset', 'daily', 'backlog']);
  });
});
