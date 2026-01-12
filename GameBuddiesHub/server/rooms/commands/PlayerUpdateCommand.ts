import { Command } from '@colyseus/command'
import { Client } from 'colyseus'
import { IHubState } from '../../../types/IHubState'

type Payload = {
  client: Client
  x: number
  y: number
  anim: string
}

export default class PlayerUpdateCommand extends Command<IHubState, Payload> {
  execute(data: Payload) {
    const { client, x, y, anim } = data

    const player = this.room.state.players.get(client.sessionId)

    if (!player) return

    // Validate payload before updating
    if (typeof x === 'number' && typeof y === 'number' && typeof anim === 'string') {
      player.x = x
      player.y = y
      player.anim = anim
    }
  }
}
