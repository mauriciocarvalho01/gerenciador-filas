import { Logger } from './logger.interface'
import { Moment } from '@/helpers'

// // red
// // console.log('\x1b[31m%s\x1b[0m', 'I am red')

// // green
// // console.log('\x1b[32m%s\x1b[0m', 'I am green')

// // yellow
// // console.log('\x1b[33m%s\x1b[0m', 'I am yellow')

// // blue
// // console.log('\x1b[34m%s\x1b[0m', 'I am blue')

// // magenta
// // console.log('\x1b[35m%s\x1b[0m', 'I am magenta')

// // cyan
// // console.log('\x1b[36m%s\x1b[0m', 'I am cyan')

class Registrador implements Logger {
  log = (log: string): void => {
    console.log('\x1b[32m%s\x1b[0m', `[LOG][${new Moment().now().format('YYYY-MM-DD HH:mm:ss')}]|${log}`)
  }

  line = (line: string): void => {
    console.log('\x1b[36m%s\x1b[0m', line)
  }

  error = (error: string): void => {
    console.error('\x1b[31m%s\x1b[0m', `[ERROR][${new Moment().now().format('YYYY-MM-DD HH:mm:ss')}]|${error}`)
  }

  warn = (warn: string): void => {
    console.warn('\x1b[33m%s\x1b[0m', `[AVISO][${new Moment().now().format('YYYY-MM-DD HH:mm:ss')}]|${warn}`)
  }

  info = (info: string): void => {
    console.info('\x1b[34m%s\x1b[0m', `[INFO][${new Moment().now().format('YYYY-MM-DD HH:mm:ss')}]|${info}`)
  }
}

export default new Registrador()
