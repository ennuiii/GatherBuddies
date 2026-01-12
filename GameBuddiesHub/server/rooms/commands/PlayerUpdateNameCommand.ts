import { Command } from '@colyseus/command'
import { Client } from 'colyseus'
import { IHubState } from '../../../types/IHubState'

type Payload = {
  client: Client
  name: string
}

export default class PlayerUpdateNameCommand extends Command<IHubState, Payload> {
  execute(data: Payload) {
    const { client, name } = data

    const player = this.room.state.players.get(client.sessionId)

    if (!player) return

    // Validate payload before updating
    if (typeof name === 'string' && name.length > 0) {
      player.name = name
    }
  }
}
