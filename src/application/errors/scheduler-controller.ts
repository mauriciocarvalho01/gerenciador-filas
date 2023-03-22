export class SchedulerError extends Error {
  constructor(error: Error) {
    super(error.message)
    this.name = 'SchedulerError'
    this.stack = error?.stack
  }
}
