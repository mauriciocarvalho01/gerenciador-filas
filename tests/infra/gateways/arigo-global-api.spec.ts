import { ArigoDataApi, HttpClient } from '@/infra/gateways'
import { mock, MockProxy } from 'jest-mock-extended'
import logger from '@/logs/logger'

describe('ArigoGlobalApi', () => {
  let httpClient: MockProxy<HttpClient>
  let arigoDataApi: MockProxy<ArigoDataApi>
  let sut: ArigoDataApi

  beforeAll(() => {
    httpClient = mock()
    arigoDataApi = mock()
  })
  beforeEach(() => {
    jest.clearAllMocks()
    sut = new ArigoDataApi({ appSecret: 'any_secret', appKey: 'any_key' }, httpClient)
  })

  it('should call ArigoGlobalApi when apiOptionsFactory and apiUrlFactory correct execution', async () => {
    sut.apiOptionsFactory({
      method: 'post',
      connect: 'dev',
      system: 'tools',
      gateway: 'api',
      action: 'read',
      endPoint: 'agendamento-periodos',
      token: { appSecret: 'any_secret', appKey: 'any_key' }
    })
    expect(sut.apiUrlFactory()).toBe('https://dev.arigo.com.br/tools/api/read/agendamento-periodos')
  })

  it('should call HttpClient when sendHook correct params', async () => {
    const body = {
      app_secret: 'any_secret',
      app_key: 'any_key',
      validate: false,
      params: {
        pagina: 1,
        filtro: {
          campos: {
            e: {
              agendamento_id_status: {
                tipo: 'IGUAL',
                valor: '1'
              }
            }
          }
        }
      }
    }
    const httpOptions = {
      url: 'https://dev.arigo.com.br/tools/api/read/agendamento-periodos',
      retryIndex: 0,
      timeout: 4000,
      options: {
        method: 'post',
        body: JSON.stringify(body)
      }
    }
    httpClient.sendHook.mockResolvedValueOnce({ any: 'any_data' })
    sut.method('post')
      .connect('dev')
      .system('tools')
      .gateway('api')
      .action('read')
      .endPoint('agendamento-periodos')
      .token({ appSecret: 'any_secret', appKey: 'any_key' })
    await sut.select({
      page: 1,
      andWhere: [
        { chave: 'agendamento_id_status', valor: '1' }
      ]
    })
    expect(httpClient.sendHook).toHaveBeenCalledWith(httpOptions)
  })

  it('should call HttpClient when sendHook returns data', async () => {
    httpClient.sendHook.mockResolvedValueOnce({ any: 'any_data' })

    const sendHook: any = await sut.send({
      app_secret: 'any_app_secret',
      app_key: 'any_app_key',
      validate: true,
      params: {
        pagina: 1,
        filtro: {
          campos: {
            e: {
              agendamento_id_status: {
                tipo: 'IGUAL',
                valor: '1'
              }
            }
          }
        }
      }
    })

    expect(sendHook).toEqual({ any: 'any_data' })
  })

  it('should call HttpClient when sendHook returns undefined', async () => {
    httpClient.sendHook.mockResolvedValueOnce(undefined)
    sut.method('post')
      .connect('dev')
      .system('tools')
      .gateway('api')
      .action('read')
      .endPoint('agendamento-periodos')
      .token({ appSecret: 'any_secret', appKey: 'any_key' })
    const data = await sut.select({
      page: 1,
      andWhere: [
        { chave: 'agendamento_id_status', valor: '1' }
      ]
    })
    expect(data).toEqual(undefined)
  })

  it('should call ArigoDataApi when select returns undefined', async () => {
    arigoDataApi.send.mockResolvedValueOnce(undefined)

    sut.method('post')
      .connect('dev')
      .system('tools')
      .gateway('api')
      .action('read')
      .endPoint('agendamento-periodos')
      .token({ appSecret: 'any_secret', appKey: 'any_key' })

    const data = await sut.select({
      page: 1,
      andWhere: [
        { chave: 'agendamento_id_status', valor: '1' }
      ]
    })
    expect(data).toEqual(undefined)
  })

  it('should call ArigoDataApi when select returns data', async () => {
    httpClient.sendHook.mockResolvedValueOnce({ any: 'any_data' })
    arigoDataApi.send.mockResolvedValueOnce({ any: 'any_data' })

    sut.method('post')
      .connect('dev')
      .system('tools')
      .gateway('api')
      .action('read')
      .endPoint('agendamento-periodos')
      .token({ appSecret: 'any_secret', appKey: 'any_key' })

    const data = await sut.select({
      page: 1,
      andWhere: [
        { chave: 'agendamento_id_status', valor: '1' }
      ]
    })
    expect(data).toEqual({ any: 'any_data' })
  })

  it('should call ArigoDataApi change HttpOptions state', async () => {
    sut.apiOptionsFactory({
      method: 'post',
      connect: 'dev',
      system: 'tools',
      gateway: 'api',
      action: 'read',
      endPoint: 'agendamento-periodos',
      token: {
        appSecret: '904c94e9993e11eb900000155d016d96',
        appKey: '8485003970470'
      }
    })

    expect(sut.apiUrlFactory()).toEqual('https://dev.arigo.com.br/tools/api/read/agendamento-periodos')

    sut.apiOptionsFactory({
      method: 'post',
      connect: 'dev',
      system: 'avalon',
      gateway: 'api',
      action: 'read',
      endPoint: 'processos-config',
      token: {
        appSecret: '904c94e9993e11eb900000155d016d96',
        appKey: '8485003970470'
      }
    })

    expect(sut.apiUrlFactory()).toEqual('https://dev.arigo.com.br/avalon/api/read/processos-config')

    const logSpy = jest.spyOn(logger, 'log')

    await sut.select({
      page: 1,
      andWhere: [
        { chave: 'agendamento_id_status', valor: '1' }
      ]
    })
    expect(logSpy).toBeCalledWith('Url fabricated https://dev.arigo.com.br/avalon/api/read/processos-config')
  })
})
