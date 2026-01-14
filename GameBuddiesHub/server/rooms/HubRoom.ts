import { Room, Client } from 'colyseus'
import { Dispatcher } from '@colyseus/command'
import { Player, HubState, Conversation } from './schema/HubState'
import { Message } from '../../types/Messages'
import { IRoomData } from '../../types/Rooms'
import PlayerUpdateCommand from './commands/PlayerUpdateCommand'
import PlayerUpdateNameCommand from './commands/PlayerUpdateNameCommand'
import { ArraySchema } from '@colyseus/schema'

export class HubRoom extends Room<HubState> {
  private dispatcher = new Dispatcher(this)
  private name: string = ''
  private description: string = ''
  private conversationCounter = 0

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

    // Handle character/avatar updates
    this.onMessage(Message.UPDATE_CHARACTER, (client, message: { character: string }) => {
      const player = this.state.players.get(client.sessionId)
      if (player) {
        player.character = message.character
        console.log(`[HubRoom] Player ${client.sessionId} updated character to: ${message.character.slice(0, 50)}...`)
      }
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

    // Handle START_CONVERSATION - create or join a conversation
    this.onMessage(
      Message.START_CONVERSATION,
      (client, message: { targetSessionId: string }) => {
        const { targetSessionId } = message
        const myPlayer = this.state.players.get(client.sessionId)
        const targetPlayer = this.state.players.get(targetSessionId)

        if (!myPlayer || !targetPlayer) {
          console.log(`[Conversation] Player not found: ${client.sessionId} or ${targetSessionId}`)
          return
        }

        // If target is already in a conversation, join it (if not locked)
        if (targetPlayer.conversationId) {
          const existingConv = this.state.conversations.get(targetPlayer.conversationId)
          if (existingConv && !existingConv.locked) {
            myPlayer.conversationId = targetPlayer.conversationId
            existingConv.playerIds.push(client.sessionId)
            console.log(`[Conversation] ${client.sessionId} joined existing conversation ${targetPlayer.conversationId}`)
            return
          } else if (existingConv?.locked) {
            console.log(`[Conversation] Cannot join locked conversation ${targetPlayer.conversationId}`)
            return
          }
        }

        // If I'm already in a conversation, add target to mine (if not locked)
        if (myPlayer.conversationId) {
          const existingConv = this.state.conversations.get(myPlayer.conversationId)
          if (existingConv && !existingConv.locked) {
            targetPlayer.conversationId = myPlayer.conversationId
            existingConv.playerIds.push(targetSessionId)
            console.log(`[Conversation] ${targetSessionId} joined existing conversation ${myPlayer.conversationId}`)
            return
          }
        }

        // Create new conversation
        const convId = `conv_${++this.conversationCounter}`
        const conversation = new Conversation()
        conversation.locked = false
        conversation.playerIds = new ArraySchema<string>(client.sessionId, targetSessionId)

        this.state.conversations.set(convId, conversation)
        myPlayer.conversationId = convId
        targetPlayer.conversationId = convId

        console.log(`[Conversation] Created new conversation ${convId} with ${client.sessionId} and ${targetSessionId}`)
      }
    )

    // Handle LEAVE_CONVERSATION - leave current conversation
    this.onMessage(Message.LEAVE_CONVERSATION, (client) => {
      const player = this.state.players.get(client.sessionId)
      if (!player || !player.conversationId) {
        return
      }

      const convId = player.conversationId
      const conversation = this.state.conversations.get(convId)

      if (conversation) {
        // Remove player from conversation
        const index = conversation.playerIds.indexOf(client.sessionId)
        if (index !== -1) {
          conversation.playerIds.splice(index, 1)
        }

        // If conversation is empty or has only 1 player, delete it
        if (conversation.playerIds.length <= 1) {
          // Clear conversationId from remaining player
          conversation.playerIds.forEach((playerId) => {
            const p = this.state.players.get(playerId)
            if (p) p.conversationId = ''
          })
          this.state.conversations.delete(convId)
          console.log(`[Conversation] Deleted empty conversation ${convId}`)
        }
      }

      player.conversationId = ''
      console.log(`[Conversation] ${client.sessionId} left conversation ${convId}`)
    })

    console.log(`HubRoom "${name}" created`)
  }

  onJoin(client: Client, options?: { playerName?: string; socketId?: string }) {
    console.log(`Player ${client.sessionId} joined with socketId: ${options?.socketId || 'none'}`)
    const player = new Player()
    player.name = options?.playerName || ''
    player.socketId = options?.socketId || ''
    this.state.players.set(client.sessionId, player)
    client.send(Message.SEND_ROOM_DATA, {
      id: this.roomId,
      name: this.name,
      description: this.description,
    })
  }

  onLeave(client: Client) {
    console.log(`Player ${client.sessionId} left`)
    const player = this.state.players.get(client.sessionId)

    // Clean up conversation membership
    if (player?.conversationId) {
      const conversation = this.state.conversations.get(player.conversationId)
      if (conversation) {
        const index = conversation.playerIds.indexOf(client.sessionId)
        if (index !== -1) {
          conversation.playerIds.splice(index, 1)
        }

        // If conversation is empty or has only 1 player, delete it
        if (conversation.playerIds.length <= 1) {
          conversation.playerIds.forEach((playerId) => {
            const p = this.state.players.get(playerId)
            if (p) p.conversationId = ''
          })
          this.state.conversations.delete(player.conversationId)
          console.log(`[Conversation] Deleted conversation ${player.conversationId} after player left`)
        }
      }
    }

    if (this.state.players.has(client.sessionId)) {
      this.state.players.delete(client.sessionId)
    }
  }

  onDispose() {
    console.log('HubRoom disposing...')
    this.dispatcher.stop()
  }
}
