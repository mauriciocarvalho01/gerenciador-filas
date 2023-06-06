import { ArigoGlobalApi } from '@/domain/contracts/gateways'
import { HttpClient } from '@/infra/gateways'
import logger from '@/logs/logger'

export class ArigoDataApi implements ArigoGlobalApi {
  private appSecret: string = ''
  private appKey: string = ''
  private rootUrl: string = 'https://environment.arigo.com.br'
  private systemUri: string = ''
  private gatewayUri: string = ''
  private actionUri: string = ''
  private endPoinUri: string = ''
  private httpMethod: string = ''
  private apiBody!: ArigoGlobalApi.ApiFilterBody
  constructor(private readonly apiToken: ArigoGlobalApi.ApiToken, private readonly httpClient: HttpClient) {
    this.appSecret = apiToken.appSecret
    this.appKey = apiToken.appKey
    this.apiBody = {
      app_secret: this.appSecret,
      app_key: this.appKey,
      validate: false,
      params: {
        pagina: 0,
        filtro: {
          campos: {
            e: undefined,
            ou: undefined
          }
        }
      }
    }
  }

  get getAppSecret(): string {
    return this.appSecret
  }
  get getAppKey(): string {
    return this.appKey
  }

  method = (method: string): ArigoDataApi => {
    this.httpMethod = method
    return this
  }

  connect = (environment: string): ArigoDataApi => {
    this.rootUrl = this.rootUrl.replace(/environment/g, environment)
    return this
  }

  system = (system: string): ArigoDataApi => {
    this.systemUri = system
    return this
  }

  gateway = (gateway: string): ArigoDataApi => {
    this.gatewayUri = gateway
    return this
  }

  action = (action: string): ArigoDataApi => {
    this.actionUri = action
    return this
  }

  endPoint = (endPoint: string): ArigoDataApi => {
    this.endPoinUri = endPoint
    return this
  }

  token = (token: ArigoGlobalApi.ApiToken): ArigoDataApi => {
    this.apiBody.app_secret = token.appSecret
    this.apiBody.app_key = token.appKey
    return this
  }

  apiUrlFactory = (): string => `${this.rootUrl}/${this.systemUri}/${this.gatewayUri}/${this.actionUri}/${this.endPoinUri}`

  apiOptionsFactory = (requestOptions: ArigoGlobalApi.RequestOptions): ArigoDataApi => {
    const metodos: Record<string, Function> = {
      method: this.method,
      connect: this.connect,
      system: this.system,
      gateway: this.gateway,
      action: this.action,
      endPoint: this.endPoint,
      token: this.token
    }
    Object.keys(requestOptions).forEach((requestOption, index) => {
      const httpOptions = Object.values(requestOptions)
      metodos[requestOption](httpOptions[index])
    })
    return this
  }

  convertParamsForFilterBody = (params: ArigoGlobalApi.AbstractSqlFilter): ArigoGlobalApi.ApiFilterBody => {
    this.apiBody.params = params
    return this.apiBody
  }

  convertParamsForBody = (params: any): ArigoGlobalApi.ApiBody => {
    this.apiBody.params = params
    return this.apiBody
  }

  convertParamsForFilter = ({ page, andWhere, orWhere }: ArigoGlobalApi.ReadInput): ArigoGlobalApi.AbstractSqlFilter => {
    const fields: ArigoGlobalApi.AbstractSqlFieldsParams<ArigoGlobalApi.Fields> = {
      e: (andWhere !== undefined) ? {} : undefined,
      ou: (orWhere !== undefined) ? {} : undefined
    }
    return {
      pagina: page,
      filtro: {
        campos: {
          ...andWhere?.reduce((fields, where) => {
            if (fields.e !== undefined) {
              fields.e[where.chave] = {
                tipo: 'IGUAL',
                valor: where.valor
              }
            }
            return fields
          }, fields),
          ...orWhere?.reduce((fields, where) => {
            if (fields.ou !== undefined) {
              fields.ou[where.chave] = {
                tipo: 'IGUAL',
                valor: where.valor
              }
            }
            return fields
          }, fields)
        }
      }
    }
  }

  select = async (params: ArigoGlobalApi.ReadInput): Promise<ArigoGlobalApi.ReadOutput> => {
    const apiResponse: any = await this.send(this.convertParamsForFilterBody(this.convertParamsForFilter(params)))
    if (apiResponse !== undefined) return apiResponse
    return undefined
  }

  update = async (params: ArigoGlobalApi.UpdateInput): Promise<ArigoGlobalApi.UpdateOutput> => {
    const apiResponse: any = await this.send(this.convertParamsForBody(params))
    if (apiResponse !== undefined) return apiResponse
    return undefined
  }

  replace = async (params: ArigoGlobalApi.ReplaceInput): Promise<ArigoGlobalApi.ReplaceOutput> => {
    const apiResponse: any = await this.send(this.convertParamsForBody(params))
    if (apiResponse !== undefined) return apiResponse
    return undefined
  }

  send = async <T>(params: ArigoGlobalApi.ApiBody): Promise<T> => {
    const options: HttpClient.HttpOptions = {
      method: this.httpMethod,
      body: JSON.stringify(params)
    }
    logger.log(`Url fabricated ${this.apiUrlFactory()}`)
    logger.log(`Body: ${JSON.stringify(params)}`)
    return await this.httpClient.sendHook({
      url: this.apiUrlFactory(),
      retryIndex: 0,
      timeout: 4000,
      options
    })
  }
}
