import { Room, Client } from 'colyseus'
import { Dispatcher } from '@colyseus/command'
import { Player, HubState } from './schema/HubState'
import { Message } from '../../types/Messages'
import { IRoomData } from '../../types/Rooms'
import PlayerUpdateCommand from './commands/PlayerUpdateCommand'
import PlayerUpdateNameCommand from './commands/PlayerUpdateNameCommand'

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

    // Handle player position/animation updates
    this.onMessage(
      Message.UPDATE_PLAYER,
      (client, message: { x: number; y: number; anim: string }) => {
        this.dispatcher.dispatch(new PlayerUpdateCommand(), {
          client,
          x: message.x,
          y: message.y,
          anim: message.anim,
        })
      }
    )

    // Handle player name updates
    this.onMessage(Message.UPDATE_PLAYER_NAME, (client, message: { name: string }) => {
      this.dispatcher.dispatch(new PlayerUpdateNameCommand(), {
        client,
        name: message.name,
      })
    })

    // Handle game invites - broadcast to nearby players
    this.onMessage(
      Message.GAME_INVITE,
      (client, message: {
        gameType: string
        gameName: string
        hubRoomCode: string
        targetPlayers: string[]
        inviterName: string
      }) => {
        const { gameType, gameName, hubRoomCode, targetPlayers, inviterName } = message

        // Send invite to each target player
        targetPlayers.forEach((targetSessionId) => {
          const targetClient = this.clients.find((c) => c.sessionId === targetSessionId)
          if (targetClient) {
            targetClient.send(Message.GAME_INVITE, {
              gameType,
              gameName,
              hubRoomCode,
              inviterName,
              inviterSessionId: client.sessionId,
            })
            console.log(`Game invite sent to ${targetSessionId} for ${gameName}`)
          }
        })
      }
    )

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
