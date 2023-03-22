export interface BrokerClient {
  brokerFactoryConnection: (connectionOptions: BrokerClient.ConnectionOptions) => Promise<boolean>
  brokerFactoryProducer: (factoryProducerOptions: BrokerClient.FactoryProducerOptions) => Promise<boolean>
  brokerProducer: (producerOptions: BrokerClient.PublishOptions) => Promise<boolean>
}

export namespace BrokerClient {
  export type FactoryProducerOptions = {
    exchangeOptions: ExchangeOptions
    queueOptions: QueueOptions
    bindOptions: BindOptions
  }

  export type ConnectionOptions = {
    url: string
    config?: any
  }

  export type ExchangeOptions = {
    exchangeName: string
    type: string
  }

  export type QueueOptions = {
    queueName: string
    options?: any
  }

  export type BindOptions = {
    queueName: string
    exchangeName: string
    routingKey: string
  }

  export type PublishOptions = {
    exchange: string
    routingKey: string
    content: Buffer
    options?: any
  }
}
