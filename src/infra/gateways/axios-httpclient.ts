import { HttpClient, HttpError } from '@/infra/gateways'
import axios, { AxiosResponse, AxiosRequestConfig, AxiosError } from 'axios'
import { env } from '@/main/config'
import https from 'https'
import logger from '@/logs/logger'

type Input = HttpClient.HttpClientOptions

export class AxiosHttpClient implements HttpClient {
  private readonly maxAttpAttemps: number = 0
  constructor () {
    this.maxAttpAttemps = parseInt(env.arigoDataApi.maxAttpAttemps ?? '0')
  }

  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const httpsAgent = new https.Agent({ keepAlive: true })
    const response: AxiosResponse<T> = await axios.get(url, { ...config, httpsAgent })
    return response.data
  }

  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const httpsAgent = new https.Agent({ keepAlive: true })
    const response: AxiosResponse<T> = await axios.post(url, data, { ...config, httpsAgent })
    return response.data
  }

  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const httpsAgent = new https.Agent({ keepAlive: true })
    const response: AxiosResponse<T> = await axios.put(url, data, { ...config, httpsAgent })
    return response.data
  }

  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const httpsAgent = new https.Agent({ keepAlive: true })
    const response: AxiosResponse<T> = await axios.delete(url, { ...config, httpsAgent })
    return response.data
  }

  public async sendHook<T = any>(httpOptions: Input): Promise<T> {
    const { url, retryIndex, timeout, options } = httpOptions
    logger.log(`Request Url: ${url ?? 'Url não encontrada'}`)
    return await this.call(options.method)(url, options.body, { timeout })
      .then(async (axiosResponse: AxiosResponse<T> | PromiseLike<AxiosResponse<T>>) => {
        return axiosResponse
      })
      .catch(async (error: AxiosError): Promise<any> => {
        logger.log(`HTTP ERROR: ${error.message}`)
        logger.log(`HTTP OPTIONS: ${JSON.stringify(httpOptions)}`)
        if (retryIndex < this.maxAttpAttemps) {
          ++httpOptions.retryIndex
          logger.log(`Refazendo a requisição...${retryIndex | 0}`)
          return await this.sendHook(httpOptions)
        }
        throw new Error('Não foi possível concluir a requisição')
      })
  }

  private readonly call = (method: string | undefined): Function => {
    const methods: Record<string, Function> = {
      get: this.get,
      post: this.post,
      put: this.put,
      delete: this.delete
    }
    if (methods[method ?? 'get'] !== undefined) return methods[method ?? 'get']
    throw new HttpError(new Error('Método inválido'))
  }
}
