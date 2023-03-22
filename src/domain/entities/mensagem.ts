export class Message {
  processo!: any
  terceiro!: any
  agendamento!: any
  processo_config!: any
  constructor (public readonly publishedAt: string, public checksum: string) { }
}
