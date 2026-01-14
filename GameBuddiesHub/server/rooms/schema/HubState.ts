import { Schema, ArraySchema, MapSchema, type } from '@colyseus/schema'
import { IPlayer, IHubState, IChatMessage, IConversation } from '../../../types/IHubState'

export class Player extends Schema implements IPlayer {
  @type('string') name = ''
  @type('number') x = 400
  @type('number') y = 300
  @type('string') anim = 'idle_down'
  @type('string') conversationId = ''
  @type('string') socketId = ''
  // JSON-serialized avatar config (set by client on spawn)
  @type('string') character = ''
}

export class ChatMessage extends Schema implements IChatMessage {
  @type('string') author = ''
  @type('number') createdAt = new Date().getTime()
  @type('string') content = ''
}

export class Conversation extends Schema implements IConversation {
  @type('boolean') locked = false
  @type(['string']) playerIds = new ArraySchema<string>()
}

export class HubState extends Schema implements IHubState {
  @type({ map: Player })
  players = new MapSchema<Player>()

  @type([ChatMessage])
  chatMessages = new ArraySchema<ChatMessage>()

  @type({ map: Conversation })
  conversations = new MapSchema<Conversation>()
}
