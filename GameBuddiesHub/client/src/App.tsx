import { useEffect, useRef } from 'react'
import { createPhaserGame } from './PhaserGame'

function App() {
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!gameRef.current) {
      gameRef.current = createPhaserGame()
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
      }
    }
  }, [])

  return (
    <div className="w-full h-screen bg-gray-900">
      <div id="phaser-container" className="w-full h-full" />
    </div>
  )
}

export default App
