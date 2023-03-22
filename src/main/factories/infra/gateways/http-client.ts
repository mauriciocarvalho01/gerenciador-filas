import { AxiosHttpClient } from '@/infra/gateways'

export const makeHttpClient = (): AxiosHttpClient => {
  return new AxiosHttpClient()
}
