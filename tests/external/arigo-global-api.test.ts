import { env } from '@/main/config/env'
import { ArigoDataApi, AxiosHttpClient } from '@/infra/gateways'

describe('ArigoGlobalApi', () => {
  let httpClient: AxiosHttpClient
  let sut: ArigoDataApi

  beforeAll(() => {
    httpClient = new AxiosHttpClient()
  })
  beforeEach(() => {
    jest.clearAllMocks()
    sut = new ArigoDataApi({ appSecret: env.arigoDataApi.appSecret, appKey: env.arigoDataApi.appKey }, httpClient)
  })

  it('should call ArigoGlobalApi when select returns schedulers if status is active', async () => {
    sut.apiOptionsFactory({
      method: 'post',
      connect: 'dev',
      system: 'tools',
      gateway: 'api',
      action: 'read',
      endPoint: 'agendamento-periodos',
      token: { appSecret: env.arigoDataApi.appSecret, appKey: env.arigoDataApi.appKey }
    })
    const schedulers = await sut.select({
      page: 1,
      andWhere: [
        { chave: 'agendamento_id_status', valor: '1' }
      ]
    })
    expect(schedulers?.registros.length).toBeGreaterThanOrEqual(0)
  })

  it('should call ArigoGlobalApi when select rerurn undefined if token is invalid', async () => {
    sut.apiOptionsFactory({
      method: 'post',
      connect: 'dev',
      system: 'tools',
      gateway: 'api',
      action: 'read',
      endPoint: 'agendamento-periodos',
      token: { appSecret: 'invalid_secret', appKey: 'invalid_key' }
    })
    const schedulers = await sut.select({
      page: 1,
      andWhere: [
        { chave: 'agendamento_id_status', valor: '1' }
      ]
    })
    expect(schedulers).toBeUndefined()
  })

  it('should call ArigoGlobalApi when select returns undefined if HttpOptions method is invalid', async () => {
    try {
      sut.apiOptionsFactory({
        method: 'invalid_method',
        connect: 'dev',
        system: 'tools',
        gateway: 'api',
        action: 'read',
        endPoint: 'agendamento-periodos',
        token: { appSecret: 'invalid_secret', appKey: 'invalid_key' }
      })
      await sut.select({
        page: 1,
        andWhere: [
          { chave: 'agendamento_id_status', valor: '1' }
        ]
      })
    } catch (error: any) {
      expect(error.message).toEqual('Erro no protocolo HTTP: Método inválido')
    }
  })

  it('should call ArigoGlobalApi when select returns undefined if HttpOptions endPoint is invalid', async () => {
    try {
      sut.apiOptionsFactory({
        method: 'post',
        connect: 'dev',
        system: 'tools',
        gateway: 'api',
        action: 'read',
        endPoint: 'invalid_endPoint',
        token: { appSecret: 'invalid_secret', appKey: 'invalid_key' }
      })
      await sut.select({
        page: 1,
        andWhere: [
          { chave: 'agendamento_id_status', valor: '1' }
        ]
      })
    } catch (error: any) {
      expect(error.message).toEqual('Erro no protocolo HTTP: Método inválido')
    }
  })
})
