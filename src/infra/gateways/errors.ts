
export class HttpError extends Error {
  constructor (error: Error) {
    super(`Erro no protocolo HTTP: ${error.message}`)
    this.name = 'HttpError'
    this.stack = error?.stack
  }
}
