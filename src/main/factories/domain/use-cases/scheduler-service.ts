import { makeArigoDataApi, makeCron, makeMessageBroker } from '@/main/factories/infra/gateways'
import { SchedulerService } from '@/domain/use-cases'

export const makeScheduler = (): SchedulerService => {
  return new SchedulerService(
    makeCron(),
    makeArigoDataApi(),
    makeMessageBroker()
  )
}
