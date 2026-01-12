// @ts-expect-error - colyseus.js has ESM/types resolution issues
import { Client, Room } from 'colyseus.js'
import { phaserEvents, Event } from '../events/EventCenter'
import store from '../stores'
import { setSessionId } from '../stores/UserStore'

// Interface matching the server's IPlayer schema
interface IPlayer {
  name: string
  x: number
  y: number
  anim: string
  onChange?: (callback: () => void) => void
}

// IHubState interface for reference (used via any due to colyseus.js typing issues)
// interface IHubState {
//   players: {
//     onAdd: (callback: (player: IPlayer, key: string) => void) => void
//     onRemove: (callback: (player: IPlayer, key: string) => void) => void
//   }
// }

export default class Network {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private room?: Room<any>

  mySessionId!: string

  constructor() {
    const protocol = window.location.protocol.replace('http', 'ws')
    const endpoint =
      import.meta.env.VITE_SERVER_URL || `${protocol}//${window.location.hostname}:2567`
    this.client = new Client(endpoint)
  }

  async joinHub(): Promise<boolean> {
    try {
      this.room = await this.client.joinOrCreate('hub')
      this.mySessionId = this.room!.sessionId
      store.dispatch(setSessionId(this.room!.sessionId))
      this.initialize()
      console.log('Network: Joined hub room with sessionId:', this.mySessionId)
      return true
    } catch (error) {
      console.error('Network: Failed to join hub room:', error)
      return false
    }
  }

  private initialize() {
    if (!this.room) return

    // Listen for player additions
    this.room.state.players.onAdd((player: IPlayer, key: string) => {
      if (key === this.mySessionId) return

      // Track changes on each player using Colyseus schema onChange
      if (player.onChange) {
        player.onChange(() => {
          phaserEvents.emit(Event.PLAYER_UPDATED, key, player)
        })
      }

      // If player already has a name, emit joined event
      if (player.name) {
        phaserEvents.emit(Event.PLAYER_JOINED, player, key)
      }
    })

    // Listen for player removals
    this.room.state.players.onRemove((_player: IPlayer, key: string) => {
      phaserEvents.emit(Event.PLAYER_LEFT, key)
    })
  }

  // Send position updates to server
  updatePlayer(x: number, y: number, anim: string) {
    this.room?.send(0, { x, y, anim }) // Message.UPDATE_PLAYER = 0
  }

  // Send player name to server
  updatePlayerName(name: string) {
    this.room?.send(1, { name }) // Message.UPDATE_PLAYER_NAME = 1
  }

  // Event listener registration
  onPlayerJoined(
    callback: (player: { name: string; x: number; y: number; anim: string }, key: string) => void,
    context?: unknown
  ) {
    phaserEvents.on(Event.PLAYER_JOINED, callback, context)
  }

  onPlayerLeft(callback: (key: string) => void, context?: unknown) {
    phaserEvents.on(Event.PLAYER_LEFT, callback, context)
  }

  onPlayerUpdated(
    callback: (key: string, player: { name: string; x: number; y: number; anim: string }) => void,
    context?: unknown
  ) {
    phaserEvents.on(Event.PLAYER_UPDATED, callback, context)
  }

  onMyPlayerReady(callback: () => void, context?: unknown) {
    phaserEvents.on(Event.MY_PLAYER_READY, callback, context)
  }

  // Emit ready signal
  readyToConnect() {
    phaserEvents.emit(Event.MY_PLAYER_READY)
  }

  disconnect() {
    this.room?.leave()
  }
}
