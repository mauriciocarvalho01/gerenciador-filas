import { makeScheduler } from '@/main/factories/domain/use-cases'
import { SchedulerController } from '@/application/controllers'

export const makeSchedulerController = (): SchedulerController => {
  return new SchedulerController(makeScheduler())
}
