import { ArigoGlobalApi } from '@/domain/contracts/gateways'

export interface Scheduler {
  perform: () => Promise<Scheduler.Output>
  readonly observeSchedulers: () => Scheduler.Output
  readonly extractSchedulers: (scheduler: ArigoGlobalApi.ReadOutput) => Scheduler.Output
  readonly findProcessConfigOptions: (scheduler: any, callback: Function) => Promise<void>
  readonly findProcessOptions: (processConfig: ArigoGlobalApi.ReadOutput, callback: Function) => Promise<void>
}

export namespace Scheduler {
  export type Output = Promise<void>
}
