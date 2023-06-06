import { SchedulerService } from '@/domain/use-cases'
import { SchedulerError } from '@/application/errors'
import logger from '@/logs/logger'

export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) { }

  async perform(): Promise<void> {
    return await this.schedulerService.observeSchedulers().then(() => {
      logger.info('Gerenciador de agendamentos está finalizado!')
    }).catch((error: Error) => {
      logger.error(error.message)
      throw new SchedulerError(new Error(error.message))
    })
  }
}
