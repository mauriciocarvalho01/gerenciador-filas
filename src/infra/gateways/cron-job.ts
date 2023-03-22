import { Cron } from '@/domain/contracts/gateways'
import * as cron from 'node-cron'
import logger from '@/logs/logger'
import { env } from '@/main/config'

type cronFunc = string | ((now: Date | 'manual' | 'init') => void)

export class CronJob implements Cron {
  private cronTask!: cron.ScheduledTask
  start = async (job: Function): Promise<void> => {
    const task: cronFunc = job as cronFunc
    this.cronTask = cron.schedule(env.cron.cronExpressionTime ?? '', task, {
      scheduled: false
    })
    logger.info('Cron está online!')
    logger.info(`Cron configurado[${env.cron.cronExpressionTime}]`)
    return this.cronTask.start()
  }

  public restart = async (): Promise<void> => {
    this.cronTask.start()
    logger.info('Cron está online!')
  }

  public stop = async (): Promise<void> => {
    this.cronTask.stop()
    logger.info('Cron está offline!')
  }
}
