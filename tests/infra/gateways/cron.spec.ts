import { CronJob } from '@/infra/gateways'
import { mock, MockProxy } from 'jest-mock-extended'
import * as cron from 'node-cron'
import logger from '@/logs/logger'

jest.mock('node-cron')

describe('Cron', () => {
  let sut: CronJob
  let fakeNodeCron: jest.Mocked<typeof cron>
  let taskCron: MockProxy<cron.ScheduledTask>
  beforeAll(() => {
    taskCron = mock()
    fakeNodeCron = cron as jest.Mocked<typeof cron>
    fakeNodeCron.schedule.mockImplementation(() => taskCron)
  })
  beforeEach(() => {
    sut = new CronJob()
  })

  it('should call Cron when schedule correct params', async () => {
    const job = jest.fn(() => { })
    await sut.scheduledTask(job)

    expect(fakeNodeCron.schedule).toHaveBeenCalledWith('* * * * *', job, {
      scheduled: false
    })
  })

  it('should call Cron when schedule is activate', async () => {
    const logSpy = jest.spyOn(logger, 'log')
    const job = jest.fn(() => { })
    await sut.scheduledTask(job)
    expect(logSpy).toHaveBeenCalledWith('Cron is running')
  })
})
