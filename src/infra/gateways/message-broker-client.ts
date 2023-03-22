import { BrokerClient } from '@/domain/contracts/gateways'
import amqplib from 'amqplib'
import logger from '@/logs/logger'

export class MessageBrokerClient implements BrokerClient {
  private connection!: amqplib.Connection
  private channel!: amqplib.Channel
  constructor (private readonly brokerClient: any) { }

  public connect = async (connectionOptions: BrokerClient.ConnectionOptions): Promise<amqplib.Connection> => {
    this.connection = await this.brokerClient.connect(connectionOptions.url, connectionOptions.config)
    return this.connection
  }

  public createChannel = async (): Promise<amqplib.Channel> => {
    this.channel = await this.connection.createChannel()
    return this.channel
  }

  public createExchange = async (exchangeOptions: BrokerClient.ExchangeOptions): Promise<amqplib.Replies.AssertExchange> => {
    return await this.channel.assertExchange(exchangeOptions.exchangeName, exchangeOptions.type)
  }

  public createQueue = async (queueOptions: BrokerClient.QueueOptions): Promise<amqplib.Replies.AssertQueue> => {
    return await this.channel.assertQueue(queueOptions.queueName, queueOptions.options)
  }

  public createBind = async (bindOptions: BrokerClient.BindOptions): Promise<amqplib.Replies.Empty> => {
    return await this.channel.bindQueue(bindOptions.queueName, bindOptions.exchangeName, bindOptions.routingKey)
  }

  public brokerFactoryConnection = async (connectionOptions: BrokerClient.ConnectionOptions): Promise<any> => {
    try {
      await this.connect(connectionOptions)
      await this.createChannel()
    } catch (error: any) {
      logger.log(error.message)
      return false
    }
  }

  public brokerFactoryProducer = async (factoryProducerOptions: BrokerClient.FactoryProducerOptions): Promise<boolean> => {
    try {
      const exchangeOptions: BrokerClient.ExchangeOptions = factoryProducerOptions.exchangeOptions
      await this.createExchange(exchangeOptions)
      const queueOptions: BrokerClient.QueueOptions = factoryProducerOptions.queueOptions
      await this.createQueue(queueOptions)
      const bindOptions: BrokerClient.BindOptions = factoryProducerOptions.bindOptions
      await this.createBind(bindOptions)
      return true
    } catch (error: any) {
      logger.log(error.message)
      return false
    }
  }

  public brokerProducer = async (producerOptions: BrokerClient.PublishOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolve(this.channel.publish(producerOptions.exchange, producerOptions.routingKey, producerOptions.content, {
        persistent: true
      }))
    })
  }
}
