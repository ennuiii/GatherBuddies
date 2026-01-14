import { Schema, ArraySchema, MapSchema } from '@colyseus/schema'

export interface IPlayer extends Schema {
  name: string
  x: number
  y: number
  anim: string
  conversationId: string
  socketId: string
  // Character key (legacy) or JSON-serialized avatar config
  character: string
}

export interface IChatMessage extends Schema {
  author: string
  createdAt: number
  content: string
}

export interface IConversation extends Schema {
  locked: boolean
  playerIds: ArraySchema<string>
}

export interface IHubState extends Schema {
  players: MapSchema<IPlayer>
  chatMessages: ArraySchema<IChatMessage>
  conversations: MapSchema<IConversation>
}
