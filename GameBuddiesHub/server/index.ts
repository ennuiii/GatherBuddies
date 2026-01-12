import http from 'http'
import express from 'express'
import cors from 'cors'
import { Server } from 'colyseus'
import { monitor } from '@colyseus/monitor'
import { RoomType } from '../types/Rooms'
import { HubRoom } from './rooms/HubRoom'

const port = Number(process.env.PORT || 2567)
const app = express()

app.use(cors())
app.use(express.json())

const server = http.createServer(app)
const gameServer = new Server({
  server,
})

// Register room handlers
gameServer.define(RoomType.HUB, HubRoom, {
  name: 'GameBuddies Hub',
  description: 'The main hub where players gather before games',
  autoDispose: false,
})

// Register Colyseus monitor AFTER registering room handlers
app.use('/colyseus', monitor())

gameServer.listen(port)
console.log(`Listening on ws://localhost:${port}`)
