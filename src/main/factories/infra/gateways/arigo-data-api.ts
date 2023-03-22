import { makeHttpClient } from '@/main/factories/infra/gateways'
import { ArigoDataApi } from '@/infra/gateways'
import { env } from '@/main/config'

export const makeArigoDataApi = (): ArigoDataApi => {
  return new ArigoDataApi(
    {
      appSecret: env.arigoDataApi.appSecret,
      appKey: env.arigoDataApi.appKey
    },
    makeHttpClient())
}
