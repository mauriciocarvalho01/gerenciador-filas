export const env = {
  arigoDataApi: {
    environment: process.env.ENVIRONMENT,
    apiRootUrl: process.env.API_ROOT_URL,
    appSecret: process.env.APP_SECRET ?? '',
    appKey: process.env.APP_KEY ?? '',
    maxAttpAttemps: process.env.HTTP_MAX_ATTEMPS
  },
  messageBroker: {
    connectionName: process.env.APP_NAME,
    url: process.env.BROKER_ADDRESS
  },
  cron: {
    cronExpressionTime: process.env.CRON_EXPRESSION_TIME
  }
}
