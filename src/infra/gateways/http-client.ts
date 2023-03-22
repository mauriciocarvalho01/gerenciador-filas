import { AxiosResponse } from 'axios'

export interface HttpClient {
  sendHook: <T>(input: HttpClient.HttpClientOptions) => Promise<T>
}

export namespace HttpClient {
  export type HttpClientOptions = {
    url: string
    retryIndex: number
    timeout: number
    options: HttpOptions
  }
  export type HttpOptionsBody = any | undefined
  export type HttpOptions = RequestInit
  export type HttpResponse = AxiosResponse
}
