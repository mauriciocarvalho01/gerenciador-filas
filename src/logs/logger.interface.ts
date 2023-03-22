export interface Logger {
  log: (log: string) => void
  line: (line: string) => void
  error: (error: string) => void
  warn: (warn: string) => void
  info: (info: string) => void
}
