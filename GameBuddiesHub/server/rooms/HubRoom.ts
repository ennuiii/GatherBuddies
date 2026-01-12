import { Room, Client } from 'colyseus'
import { Dispatcher } from '@colyseus/command'
import { Player, HubState } from './schema/HubState'
import { Message } from '../../types/Messages'
import { IRoomData } from '../../types/Rooms'

export class HubRoom extends Room<HubState> {
  private dispatcher = new Dispatcher(this)
  private name: string = ''
  private description: string = ''

  onCreate(options: IRoomData) {
    const { name, description, autoDispose } = options
    this.name = name
    this.description = description
    this.autoDispose = autoDispose

    this.setMetadata({ name, description })
    this.setState(new HubState())

    // Message handlers will be added in Task 3
    console.log(`HubRoom "${name}" created`)
  }

  onJoin(client: Client) {
    console.log(`Player ${client.sessionId} joined`)
    this.state.players.set(client.sessionId, new Player())
    client.send(Message.SEND_ROOM_DATA, {
      id: this.roomId,
      name: this.name,
      description: this.description,
    })
  }

  onLeave(client: Client) {
    console.log(`Player ${client.sessionId} left`)
    if (this.state.players.has(client.sessionId)) {
      this.state.players.delete(client.sessionId)
    }
  }

  onDispose() {
    console.log('HubRoom disposing...')
    this.dispatcher.stop()
  }
}
