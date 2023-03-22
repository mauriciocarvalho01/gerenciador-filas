import { Moment } from '@/helpers'
import logger from '@/logs/logger'

export class SchedulerEntity {
  public _nextExecution!: string
  private readonly moment!: Moment

  constructor (initialTime?: string) {
    this.moment = new Moment(initialTime)
  }

  nextExecution = (alias: string): string => {
    logger.log(`Código Período: ${alias}`)
    if (alias === undefined || alias === null) throw new Error('Alias do Período Inválido')
    const valor = parseInt(alias)
    logger.log(`Valor Tempo: ${valor}`)
    if (valor === undefined) throw new Error('Valor referênte ao período inválido')
    const unidadeTempo = alias.replace(/[-/+/0-9]+/g, '')
    if (unidadeTempo === undefined) throw new Error('Unidade de Tempo inválida')
    logger.log(`Unidade Tempo: ${unidadeTempo}`)
    switch (unidadeTempo) {
      case 'd':
        this._nextExecution = this.moment.add(valor, 'day').format('YYYY-MM-DD HH:mm:ss')
        if (this.checkIfIsOld(this._nextExecution)) return new Moment().now().format('YYYY-MM-DD HH:mm:ss')
        return this._nextExecution
      case 's':
        this._nextExecution = this.moment.add(valor, 'week').format('YYYY-MM-DD HH:mm:ss')
        if (this.checkIfIsOld(this._nextExecution)) return this.moment.now().format('YYYY-MM-DD HH:mm:ss')
        return this._nextExecution
      case 'q':
        this._nextExecution = this.moment.add(valor * 15, 'day').format('YYYY-MM-DD HH:mm:ss')
        if (this.checkIfIsOld(this._nextExecution)) return this.moment.now().format('YYYY-MM-DD HH:mm:ss')
        return this._nextExecution
      case 'm':
        this._nextExecution = this.moment.add(valor, 'month').format('YYYY-MM-DD HH:mm:ss')
        if (this.checkIfIsOld(this._nextExecution)) return this.moment.now().format('YYYY-MM-DD HH:mm:ss')
        return this._nextExecution
      case 'b':
        this._nextExecution = this.moment.add(valor * 2, 'month').format('YYYY-MM-DD HH:mm:ss')
        if (this.checkIfIsOld(this._nextExecution)) return this.moment.now().format('YYYY-MM-DD HH:mm:ss')
        return this._nextExecution
      case 't':
        this._nextExecution = this.moment.add(valor * 3, 'month').format('YYYY-MM-DD HH:mm:ss')
        if (this.checkIfIsOld(this._nextExecution)) return this.moment.now().format('YYYY-MM-DD HH:mm:ss')
        return this._nextExecution
      case 'sm':
        this._nextExecution = this.moment.add(valor * 6, 'month').format('YYYY-MM-DD HH:mm:ss')
        if (this.checkIfIsOld(this._nextExecution)) return this.moment.now().format('YYYY-MM-DD HH:mm:ss')
        return this._nextExecution
      case 'a':
        this._nextExecution = this.moment.add(valor, 'year').format('YYYY-MM-DD HH:mm:ss')
        if (this.checkIfIsOld(this._nextExecution)) return this.moment.now().format('YYYY-MM-DD HH:mm:ss')
        return this._nextExecution
      default:
        throw new Error('Unidade de tempo inválida no cadastro')
    }
  }

  public readonly checkIfUpToDate = (initial: string, final: string): boolean => {
    const moment: Moment = new Moment()
    return moment.isBetween(initial, final)
  }

  public readonly checkIfIsOld = (nextExecution: string): boolean => {
    const moment: Moment = new Moment(nextExecution)
    const auxDate = moment.now().format('YYYY-MM-DD HH:mm:ss')
    return this.moment.isBefore(auxDate)
  }
}
