import { SchedulerEntity } from '@/domain/entities'

describe('Agendamento', () => {
  let sut: SchedulerEntity

  beforeEach(() => {
    sut = new SchedulerEntity('2023-03-21 16:54:47')
  })

  it('should call Agendamento nextExecution returns válid date', async () => {
    const date = sut.nextExecution('1d')
    expect(date).toEqual('2023-03-22 16:54:47')
  })

  it('should call Agendamento nextExecution returns throws', async () => {
    try {
      sut.nextExecution('error')
    } catch (error: any) {
      expect(error.message).toEqual('Unidade de tempo inválida no cadastro')
    }
  })
})
