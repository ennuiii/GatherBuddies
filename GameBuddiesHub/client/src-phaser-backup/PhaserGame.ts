import Phaser from 'phaser'
import Bootstrap from './scenes/Bootstrap'
import Game from './scenes/Game'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'phaser-container',
  backgroundColor: '#93cbee',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.ScaleModes.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  autoFocus: true,
  scene: [Bootstrap, Game],
}

export function createPhaserGame(): Phaser.Game {
  return new Phaser.Game(config)
}

export default config
