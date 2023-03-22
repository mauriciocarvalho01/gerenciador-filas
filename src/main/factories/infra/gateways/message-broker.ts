import { MessageBrokerClient } from '@/infra/gateways'
import amqplib from 'amqplib'

export const makeMessageBroker = (): MessageBrokerClient => {
  return new MessageBrokerClient(amqplib)
}
