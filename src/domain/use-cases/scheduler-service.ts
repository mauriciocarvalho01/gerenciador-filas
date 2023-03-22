/* eslint-disable @typescript-eslint/naming-convention */
import { Scheduler } from '@/domain/features'
import { OutdatedSchedulerError } from '@/domain/errors'
import { Cron, ArigoGlobalApi, BrokerClient } from '@/domain/contracts/gateways'
import { env } from '@/main/config'
import { Message, SchedulerEntity } from '@/domain/entities'
import { Moment } from '@/helpers'
import md5 from 'md5'
import logger from '@/logs/logger'

export class SchedulerService implements Scheduler {
  constructor(
    private readonly cron: Cron,
    private readonly arigoGlobalApi: ArigoGlobalApi,
    private readonly brokerClient: BrokerClient) {
    void this.brokerClient.brokerFactoryConnection({ url: env.messageBroker.url ?? '' })
  }

  perform = async (): Promise<Scheduler.Output> => {
    return await this.cron.start(this.observeSchedulers)
  }

  readonly observeSchedulers = async (): Scheduler.Output => {
    this.arigoGlobalApi.apiOptionsFactory({
      method: 'post',
      connect: 'dev',
      system: 'tools',
      gateway: 'api',
      action: 'read',
      endPoint: 'agendamento-periodos'
    })
    return await this.extractSchedulers(await this.arigoGlobalApi.select({
      page: 1,
      andWhere: [
        { chave: 'agendamento_id_status', valor: '1' },
        { chave: 'agendamento_processando', valor: '0' }
      ]
    }))
  }

  readonly extractSchedulers = async (schedulers: ArigoGlobalApi.ReadOutput): Promise<void> => {
    if (schedulers !== undefined) {
      const { total_registros, registros: agendamentos } = schedulers
      logger.info(`Agendamentos ativos e em espera: ${total_registros}`)
      for (const agendamento of agendamentos) {
        const authorized = await this.checkAuthorization(agendamento)
        const updatedState = await this.schedulerUpdateState(agendamento, 1)
        if (authorized && updatedState) {
          await this.cron.stop()
          logger.log('Agendamento autorizado')
          logger.log('Estado do agendamento alterado')
          logger.info('Processando...')
          await this.resolveBrokerProcess(agendamento)
          await this.cron.restart()
        }
      }
    }
  }

  private readonly checkAuthorization = async (scheduler: any): Promise<boolean> => {
    const {
      agendamento_data_inicial,
      agendamento_data_final,
      agendamento_inicio_processamento,
      agendamento_data_ultima_execucao,
      periodos_alias,
      agendamento_nome,
      agendamento_id_status,
      periodos_nome,
      agendamento_id_agendamento,
      agendamento_id_clientes
    } = scheduler
    const agendamentoEntity = new SchedulerEntity(agendamento_inicio_processamento)
    const isToDate = agendamentoEntity.checkIfUpToDate(agendamento_data_inicial, agendamento_data_final)
    if (!isToDate) throw new OutdatedSchedulerError(new Error('Agendamento desatualizado'))
    const moment = new Moment()
    logger.info(`Nome agendamento:${agendamento_nome}`)
    logger.info(`Agendamento Cliente[${agendamento_id_agendamento}][${agendamento_id_clientes}]`)
    logger.info(`Data atual: ${moment.now().format('YYYY-MM-DD HH:mm:ss')}`)
    logger.info(`Periodo configurado: ${periodos_nome}`)
    logger.info(`Data Inicial: ${agendamento_data_inicial}`)
    logger.info(`Data Final: ${agendamento_data_final}`)
    logger.info(`Último processamento inicializado: ${agendamento_inicio_processamento}`)
    logger.info(`Última execução finalizada: ${agendamento_data_ultima_execucao}`)
    const nextExecution = agendamentoEntity.nextExecution(periodos_alias)
    logger.info(`Próximo processamento: ${nextExecution}`)
    const authorized = moment.isAfter(nextExecution)
    logger.info(`Processamento status: ${agendamento_id_status}`)
    logger.info(`Processamento autorizado: ${authorized}`)
    if (!authorized) return false
    return true
  }

  readonly findProcessConfigOptions = async (scheduler: any, callback: Function): Promise<void> => {
    const { agendamento_sistema, agendamento_id_processos_parametros } = scheduler
    logger.info(`SISTEMA[${agendamento_sistema}] PARAMETROS[${agendamento_id_processos_parametros}]`)
    this.arigoGlobalApi.apiOptionsFactory({ system: agendamento_sistema, action: 'read', endPoint: 'processos-config' })
    const processos_config = await this.arigoGlobalApi.select({
      page: 1,
      andWhere: [
        { chave: 'processos-parametros_id_processos_parametros', valor: agendamento_id_processos_parametros }
      ]
    })
    if (!processos_config) await this.schedulerUpdateState(scheduler, 0)
    await this.findProcessOptions(processos_config, async (processoConfig: any) => await callback(processoConfig))
  }

  readonly findProcessOptions = async (processoConfig: ArigoGlobalApi.ReadOutput, callback: Function): Promise<void> => {
    if (processoConfig) {
      const { total_registros, registros: processos_config } = processoConfig
      logger.log(`Foram encontrados ${total_registros} processos_config`)
      for (const processo_config of processos_config) {
        const { processos_config_id_processos_config, processos_config_id_processos } = processo_config
        logger.info(`PROCESSOS CONFIG[${processos_config_id_processos_config}] PROCESSO[${processos_config_id_processos}]`)
        this.arigoGlobalApi.apiOptionsFactory({ system: 'avalon', action: 'read', endPoint: 'processos' })
        const processo = await this.arigoGlobalApi.select({
          page: 1,
          andWhere: [
            { chave: 'processos_id_processos', valor: processos_config_id_processos }
          ]
        })
        const processoConfig: any = { processo, processo_config }
        await callback(processoConfig)
      }
    }
  }

  private readonly resolveBrokerProcess = async (agendamento: any): Promise<any> => {
    return await this.findProcessConfigOptions(agendamento, async (processoConfig: any) => {
      if (!processoConfig.processo) {
        return await this.schedulerUpdateState(agendamento, 0)
      }
      const { total_registros, registros } = processoConfig.processo
      logger.log(`Processos encontrados: ${total_registros}`)
      const { processos_id_processos, processos_tipo, processos_tipo_nome, processos_processo, processos_fila } = registros[0]
      const processo = registros[0]
      const { agendamento_id_agendamento, agendamento_sistema } = agendamento
      logger.info(`ID PROCESSO[${processos_id_processos}] TIPO[${processos_tipo}]`)
      logger.info(`PROCESSO[${processos_processo}] FILA ATIVA[${processos_fila}]`)
      if (processos_fila !== undefined || processos_fila !== 0 || processos_fila !== '0') {
        const queuePrefix: string = processos_tipo
        const queueSufix: string = processos_processo
        const queuePosfix: string = agendamento_id_agendamento
        if (processos_tipo !== undefined && processos_processo !== undefined) {
          const queueName: string = `${queuePrefix}_${queueSufix}_${queuePosfix}`
          const exchangeName: string = processos_tipo_nome
          const routingKey = `${exchangeName}_${queueName}`
          const factoryProducerOptions: BrokerClient.FactoryProducerOptions = {
            exchangeOptions: { exchangeName, type: 'direct' },
            queueOptions: {
              queueName, options: { durable: true, persistent: true }
            },
            bindOptions: { queueName, exchangeName, routingKey }
          }
          logger.info(`QUEUE CONFIGURATION[${JSON.stringify(factoryProducerOptions)}]`)
          const brokerIsOk = await this.brokerClient.brokerFactoryProducer(factoryProducerOptions)
          if (brokerIsOk) {
            const now = new Moment().now().format('YYYY:MM:DD HH:mm:ss')
            const { grupo_terceiros_id_terceiros } = processoConfig.processo_config
            this.arigoGlobalApi.apiOptionsFactory({ system: agendamento_sistema, endPoint: 'terceiros' })
            const terceiros: ArigoGlobalApi.ReadOutput = await this.arigoGlobalApi.select({
              page: 1,
              andWhere: [
                { chave: 'terceiros_id_terceiros', valor: grupo_terceiros_id_terceiros }
              ]
            })
            if (terceiros !== undefined) {
              const { total_registros, registros } = terceiros
              logger.log(`Terceiros encontrados: ${total_registros}`)
              const { terceiros_id_terceiros, terceiros_inscricao } = registros[0]
              const terceiro = registros[0]
              logger.info(`TERCEIRO[${terceiros_id_terceiros}] INSCRICAO[${terceiros_inscricao}]`)
              const key = `${terceiros_id_terceiros}${terceiros_inscricao}${agendamento_id_agendamento}`
              const checksum = md5(key)
              if (!await this.inQueue(checksum)) {
                const message = new Message(now, checksum)
                message.agendamento = agendamento
                message.processo = processo
                message.terceiro = terceiro
                message.processo_config = processoConfig.processo_config
                const updateStateIsOk = await this.schedulerExecutionUpdateState(message)
                const brokerProducerIsOk = await this.brokerClient.brokerProducer({
                  exchange: exchangeName,
                  routingKey,
                  content: Buffer.from(JSON.stringify(message))
                })
                if (!updateStateIsOk || !brokerProducerIsOk) await this.schedulerUpdateState(agendamento, 0)
              } else {
                logger.warn('Essa mensagem já está inserida na fila de processamento')
              }
            }
          }
        }
      }
    })
  }

  private readonly inQueue = async (checksum: string): Promise<Boolean> => {
    this.arigoGlobalApi.apiOptionsFactory({ system: 'tools', action: 'read', endPoint: 'agendamento-execucao' })
    const schedulerExecution: ArigoGlobalApi.ReadOutput = await this.arigoGlobalApi.select({
      page: 1,
      andWhere: [
        { chave: 'agendamento-execucao_checksum', valor: checksum }
      ]
    })
    if (!schedulerExecution) return true
    const { total_registros } = schedulerExecution
    return total_registros > 0
  }

  private readonly schedulerUpdateState = async (scheduler: any, status: number): Promise<any> => {
    this.arigoGlobalApi.apiOptionsFactory({
      method: 'post',
      connect: 'dev',
      system: 'tools',
      gateway: 'api',
      action: 'replace',
      endPoint: 'agendamento'
    })
    const { agendamento_id_agendamento } = scheduler
    const now = new Moment().now().format('YYYY-MM-DDTHH:mm:ss')
    return await this.arigoGlobalApi.replace({ id_agendamento: agendamento_id_agendamento, processando: status, inicio_processamento: now })
  }

  private readonly schedulerExecutionUpdateState = async (message: Message): Promise<any> => {
    this.arigoGlobalApi.apiOptionsFactory({
      method: 'post',
      connect: 'dev',
      system: 'tools',
      gateway: 'api',
      action: 'replace',
      endPoint: 'agendamento-execucao'
    })
    const { agendamento_id_agendamento } = message.agendamento
    return await this.arigoGlobalApi.replace({ id_agendamento: agendamento_id_agendamento, requisicao: JSON.stringify(message), fila: '1', checksum: message.checksum })
  }
}
