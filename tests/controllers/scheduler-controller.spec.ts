import { SchedulerController } from '@/application/controllers'
import { SchedulerService } from '@/domain/use-cases'
import { mock, MockProxy } from 'jest-mock-extended'
import logger from '@/logs/logger'

describe('SchedulerController', () => {
  let sut: SchedulerController
  let schedulerService: MockProxy<SchedulerService>

  beforeAll(() => {
    schedulerService = mock()
  })
  beforeEach(() => {
    sut = new SchedulerController(schedulerService)
  })

  it('should SchedulerService observeSchedulers is called', async () => {
    await sut.perform()
    expect(schedulerService.observeSchedulers).toHaveBeenCalledTimes(1)
  })

  it('should SchedulerService observeSchedulers is called', async () => {
    await sut.perform()
    expect(schedulerService.observeSchedulers).toHaveBeenCalledTimes(1)
  })

  it('should SchedulerService observeSchedulers throws', async () => {
    const logSpy = jest.spyOn(logger, 'log')
    schedulerService.observeSchedulers.mockImplementation(() => {
      throw new Error('Error')
    })
    await sut.perform()
    expect(logSpy).toHaveBeenCalledWith('Error')
  })
})
