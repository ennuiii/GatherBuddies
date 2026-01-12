import { Schema, ArraySchema, MapSchema } from '@colyseus/schema'

export interface IPlayer extends Schema {
  name: string
  x: number
  y: number
  anim: string
}

export interface IChatMessage extends Schema {
  author: string
  createdAt: number
  content: string
}

export interface IHubState extends Schema {
  players: MapSchema<IPlayer>
  chatMessages: ArraySchema<IChatMessage>
}
