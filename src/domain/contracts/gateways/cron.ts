export interface Cron {
  start: (params: Cron.Input) => Cron.Output
  restart: () => Cron.Output
  stop: () => Cron.Output
}

export namespace Cron {
  export type Input = Function
  export type Output = Promise<void>
}
