import { Schema, ArraySchema, MapSchema, type } from '@colyseus/schema'
import { IPlayer, IHubState, IChatMessage } from '../../../types/IHubState'

export class Player extends Schema implements IPlayer {
  @type('string') name = ''
  @type('number') x = 400
  @type('number') y = 300
  @type('string') anim = 'idle_down'
}

export class ChatMessage extends Schema implements IChatMessage {
  @type('string') author = ''
  @type('number') createdAt = new Date().getTime()
  @type('string') content = ''
}

export class HubState extends Schema implements IHubState {
  @type({ map: Player })
  players = new MapSchema<Player>()

  @type([ChatMessage])
  chatMessages = new ArraySchema<ChatMessage>()
}
