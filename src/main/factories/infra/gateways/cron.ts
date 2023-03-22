import { CronJob } from '@/infra/gateways'

export const makeCron = (): CronJob => {
  return new CronJob()
}
