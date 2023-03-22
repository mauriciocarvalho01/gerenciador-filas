
import { SchedulerService } from '@/domain/use-cases'
import { Cron, ArigoGlobalApi, BrokerClient } from '@/domain/contracts/gateways'
import { MockProxy, mock } from 'jest-mock-extended'

describe('SchedulerService', () => {
  let sut: SchedulerService
  let cron: MockProxy<Cron>
  let arigoGlobalApi: MockProxy<ArigoGlobalApi>
  let brokerClient: MockProxy<BrokerClient>
  let schedulerData: ArigoGlobalApi.ReadOutput
  beforeAll(() => {
    cron = mock<Cron>()
    arigoGlobalApi = mock<ArigoGlobalApi>()
    brokerClient = mock<BrokerClient>()
    schedulerData = {
      pagina: 1,
      paginacao: 50,
      total_de_paginas: 1,
      total_registros: 1,
      registros: [
        {
          agendamento_id_agendamento: 62,
          agendamento_data_criacao: '2023-03-16 17:56:10',
          agendamento_data_inicial: '2023-02-15 17:20:48',
          agendamento_data_final: '2023-08-10 10:33:24',
          agendamento_data_ultima_execucao: '2023-03-09 17:06:26',
          agendamento_id_processos_parametros: 1,
          agendamento_id_periodos: 1,
          agendamento_id_app: 1,
          agendamento_id_clientes: 3,
          agendamento_nome: 'Fechamento análise dados Domínio',
          agendamento_id_status: 1,
          agendamento_tentativas: 3,
          agendamento_inicio_processamento: '2023-03-16 17:56:10',
          agendamento_processando: 1,
          agendamento_intervalo: 5,
          agendamento_sistema: 'avalon',
          periodos_id_periodos: 1,
          periodos_periodo: 1,
          periodos_alias: '1d',
          periodos_nome: 'Diário'
        }
      ]
    }
  })

  beforeEach(() => {
    sut = new SchedulerService(cron, arigoGlobalApi, brokerClient)
  })

  it('Should call startCron with correct params', async () => {
    await sut.perform()
    expect(cron.scheduledTask).toHaveBeenCalledWith(sut.observeSchedulers)
    expect(cron.scheduledTask).toHaveBeenCalledTimes(1)
  })

  it('Should call select with correct params', async () => {
    arigoGlobalApi.select.mockResolvedValueOnce(schedulerData)
    await sut.observeSchedulers()
    expect(arigoGlobalApi.select).toHaveBeenCalledWith({
      page: 1,
      andWhere: [
        { chave: 'agendamento_id_status', valor: '1' },
        { chave: 'agendamento_id_agendamento', valor: '62' },
        { chave: 'agendamento_processando', valor: '0' }
      ]
    })
  })

  it('should call SchedulerService when observeSchedulers returns undefined', async () => {
    arigoGlobalApi.select.mockResolvedValueOnce(undefined)
    const promise = await sut.observeSchedulers()
    expect(promise).toBeUndefined()
  })

  it('should call SchedulerService when extractSchedulers returns undefined', async () => {
    arigoGlobalApi.select.mockResolvedValueOnce(undefined)
    const promise = await sut.extractSchedulers(schedulerData)
    expect(promise).toBeUndefined()
  })
})
