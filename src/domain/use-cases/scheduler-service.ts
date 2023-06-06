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
    Promise.resolve(this.brokerClient.brokerFactoryConnection({
      url: env.messageBroker.url ?? '',
      config: { clientProperties: { connection_name: env.messageBroker.connectionName } }
    }))
  }

  perform = async (): Promise<Scheduler.Output> => {
    return await this.cron.start(this.observeSchedulers)
  }

  readonly observeSchedulers = async (): Scheduler.Output => {
    this.arigoGlobalApi.apiOptionsFactory({
      method: 'post',
      connect: env.arigoDataApi.environment,
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
    if (schedulers) {
      const { total_registros, registros: agendamentos } = schedulers
      logger.info(`Agendamentos ativos em espera: ${total_registros}`)
      const schedulersBatch = []
      for (const agendamento of agendamentos) {
        const { agendamento_id_agendamento, agendamento_id_clientes, agendamento_sistema } = agendamento
        logger.line(`-------------------------------------------------- AGENDAMENTO[${agendamento_id_agendamento}] -----------------------------------------------------`)
        this.arigoGlobalApi.apiOptionsFactory({
          method: 'post',
          connect: env.arigoDataApi.environment,
          system: 'tools',
          gateway: 'api',
          action: 'read',
          endPoint: 'token',
          token: {
            appSecret: env.arigoDataApi.appSecret,
            appKey: env.arigoDataApi.appKey
          }
        })
        const clientTokens = await this.arigoGlobalApi.select({
          page: 1,
          andWhere: [
            { chave: 'clientes_id_clientes', valor: agendamento_id_clientes },
            { chave: 'sistema_link', valor: agendamento_sistema }
          ]
        })

        if (clientTokens) {
          const { total_registros, registros: tokens } = clientTokens
          if (total_registros > 0) {
            const authorized = await this.checkAuthorization(agendamento)
            if (authorized) {
              await this.cron.stop()
              logger.log('Agendamento autorizado')
              logger.log('Estado do agendamento alterado')
              logger.info('Processando...')
              schedulersBatch.push(this.execute({ ...agendamento, ...tokens[0] }))
            }
          }
        } else {
          logger.warn(`Não encontrado token do cliente para esse sistema: ${agendamento_sistema}`)
        }
      }
      await Promise.all(schedulersBatch);
    }
  }

  private readonly execute = (scheduler: ArigoGlobalApi.ReadOutput): Promise<void> => {
    return new Promise<void>(() => {
      this.resolveBrokerProcess(scheduler).then(async () => {
        const updatedState = await this.schedulerUpdateState(scheduler, 1)
        if (updatedState) {
          await this.cron.restart()
        }
      }).catch(async (error) => {
        logger.error(error.message)
        const updatedState = await this.schedulerUpdateState(scheduler, 0)
        if (updatedState) {
          await this.cron.restart()
        }
      })
    })
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
    const agendamentoEntity = new SchedulerEntity(agendamento_inicio_processamento, agendamento_data_inicial)
    const isToDate = agendamentoEntity.checkIfUpToDate(agendamento_data_inicial, agendamento_data_final)
    if (!isToDate) {
      await this.schedulerUpdateState(scheduler, 0)
      logger.warn(`Agendamento desatualizado: ${JSON.stringify(scheduler)}`)
    }
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
    const { token_token_secret, token_token_key, agendamento_sistema, agendamento_id_processos_parametros } = scheduler
    logger.info(`SISTEMA[${agendamento_sistema}] PARAMETROS[${agendamento_id_processos_parametros}]`)
    this.arigoGlobalApi.apiOptionsFactory({
      token: { appSecret: token_token_secret, appKey: token_token_key },
      method: 'post',
      system: agendamento_sistema,
      action: 'read',
      endPoint: 'processos-config'
    })
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
        this.arigoGlobalApi.apiOptionsFactory({ method: 'post', system: 'avalon', action: 'read', endPoint: 'processos' })
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
      const { token_token_secret, token_token_key, agendamento_id_agendamento, agendamento_sistema } = agendamento
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
            this.arigoGlobalApi.apiOptionsFactory({
              token: { appSecret: token_token_secret, appKey: token_token_key },
              method: 'post',
              system: agendamento_sistema,
              action: 'read',
              endPoint: 'terceiros'
            })
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
                if (!updateStateIsOk || !brokerProducerIsOk) {
                  await this.schedulerUpdateState(agendamento, 0)
                  this.brokerClient.closeChannel()
                }
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
    this.arigoGlobalApi.apiOptionsFactory({ method: 'post', system: 'tools', action: 'read', endPoint: 'agendamento-execucao' })
    const schedulerExecution: ArigoGlobalApi.ReadOutput = await this.arigoGlobalApi.select({
      page: 1,
      andWhere: [
        { chave: 'agendamento-execucao_checksum', valor: checksum },
        { chave: 'agendamento-execucao_fila', valor: '1' }
      ]
    })
    if (!schedulerExecution) return true
    const { total_registros } = schedulerExecution
    return total_registros > 0
  }

  private readonly schedulerUpdateState = async (scheduler: any, status: number): Promise<any> => {
    const { agendamento_id_agendamento, agendamento_inicio_processamento } = scheduler
    this.arigoGlobalApi.apiOptionsFactory({
      method: 'put',
      connect: 'dev',
      system: 'tools',
      gateway: 'api',
      action: 'update',
      endPoint: `agendamento/${agendamento_id_agendamento}`
    })
    const now = new Moment().now().format('YYYY-MM-DDTHH:mm:ss')
    return await this.arigoGlobalApi.update({ processando: status, inicio_processamento: status !== 0 ? now : agendamento_inicio_processamento })
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
