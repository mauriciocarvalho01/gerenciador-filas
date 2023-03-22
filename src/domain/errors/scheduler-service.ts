export class OutdatedSchedulerError extends Error {
  constructor(error: Error) {
    super(error.message)
    this.name = 'OutdatedSchedulerService'
    this.stack = error?.stack
  }
}
