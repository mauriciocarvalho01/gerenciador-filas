import { ArigoDataApi } from '@/infra/gateways/arigo-global-api'

export interface ArigoGlobalApi {
  connect: (environment: string) => ArigoDataApi
  token: (token: ArigoGlobalApi.ApiToken) => ArigoDataApi
  method: (method: string) => ArigoDataApi
  system: (system: string) => ArigoDataApi
  gateway: (gateway: string) => ArigoDataApi
  action: (action: string) => ArigoDataApi
  endPoint: (endPoint: string) => ArigoDataApi
  apiUrlFactory: () => string
  apiOptionsFactory: (requestOptions: ArigoGlobalApi.RequestOptions) => ArigoDataApi
  convertParamsForBody: (params: ArigoGlobalApi.AbstractSqlFilter) => ArigoGlobalApi.ApiBody
  convertParamsForFilterBody: (params: ArigoGlobalApi.AbstractSqlFilter) => ArigoGlobalApi.ApiFilterBody
  convertParamsForFilter: (params: ArigoGlobalApi.ReadInput) => ArigoGlobalApi.AbstractSqlFilter
  select: (params: ArigoGlobalApi.ReadInput) => Promise<ArigoGlobalApi.ReadOutput>
  // create: (params: ArigoGlobalApi.CreateInput) => void
  // update: (params: ArigoGlobalApi.UpdateInput) => void
  // delete: (params: ArigoGlobalApi.DeleteInput) => void
  replace: (params: ArigoGlobalApi.ReplaceInput) => Promise<ArigoGlobalApi.ReplaceOutput>
  send: <T>(params: ArigoGlobalApi.ApiFilterBody) => Promise<T>
}

export namespace ArigoGlobalApi {
  export type RequestOptions = {
    method?: string
    connect?: string
    system?: string
    gateway?: string
    action?: string
    endPoint?: string
    token?: ApiToken
  }

  export type ApiBody = {
    app_secret: string
    app_key: string
    validate: boolean
    params: any
  }

  export type ApiFilterBody = {
    app_secret: string
    app_key: string
    validate: boolean
    params: AbstractSqlFilter
  }

  export type ApiToken = {
    appSecret: string
    appKey: string
  }

  export type AbstractSqlFieldsParams<T = Record<string, unknown>> = {
    e?: T
    ou?: T
  }

  export type Fields = Record<string, { tipo: string, valor: any }>

  export type AbstractSqlFilter = {
    pagina: number
    filtro: {
      campos: ArigoGlobalApi.AbstractSqlFieldsParams<Fields> | undefined
    }
  }

  type AndWhere = {
    chave: any
    valor: any
  }
  type OrWhere = {
    chave: string
    valor: string
  }
  export type ReadInput = {
    page: number
    andWhere?: AndWhere[]
    orWhere?: OrWhere[]
  }

  export type CreateInput = {
    pagina: number
    andWhere?: AndWhere
    orWhere?: OrWhere
  }

  export type UpdateInput = {
    pagina: number
    andWhere?: AndWhere
    orWhere?: OrWhere
  }

  export type DeleteInput = {
    pagina: number
    andWhere?: AndWhere
    orWhere?: OrWhere
  }

  export type ReadOutput = undefined | {
    pagina: number
    paginacao: number
    total_de_paginas: number
    total_registros: number
    registros: any[]
  }

  export type CreateOutput = undefined | {
    pagina: number
    paginacao: number
    total_de_paginas: number
    total_registros: number
    registros: any[]
  }

  export type UpdateOutput = undefined | {
    pagina: number
    paginacao: number
    total_de_paginas: number
    total_registros: number
    registros: any[]
  }
  export type DeleteOutput = undefined | {
    pagina: number
    paginacao: number
    total_de_paginas: number
    total_registros: number
    registros: any[]
  }
  export type ReplaceOutput = undefined | {
    status: boolean
    message: string
  }

  export type ReplaceInput = any
}
