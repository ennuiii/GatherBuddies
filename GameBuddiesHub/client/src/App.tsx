import { useEffect, useRef, useState } from 'react'
import { createPhaserGame } from './PhaserGame'
import Bootstrap from './scenes/Bootstrap'

function App() {
  const gameRef = useRef<Phaser.Game | null>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!gameRef.current) {
      gameRef.current = createPhaserGame()

      // Wait for bootstrap scene to be ready
      const checkReady = setInterval(() => {
        const bootstrap = gameRef.current?.scene.getScene('bootstrap') as Bootstrap | undefined
        if (bootstrap && bootstrap.scene.isActive()) {
          setLoading(false)
          clearInterval(checkReady)
        }
      }, 100)

      return () => clearInterval(checkReady)
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
      }
    }
  }, [])

  const handleEnterHub = async () => {
    if (!gameRef.current) return

    setLoading(true)
    setError(null)

    try {
      const bootstrap = gameRef.current.scene.getScene('bootstrap') as Bootstrap
      const success = await bootstrap.launchGame()

      if (success) {
        setGameStarted(true)
      } else {
        setError('Failed to connect to server. Make sure the server is running on port 2567.')
      }
    } catch (err) {
      setError('Connection error. Please try again.')
      console.error('Failed to enter hub:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full h-screen bg-gray-900 relative">
      <div id="phaser-container" className="w-full h-full" />

      {/* Overlay UI - only show when game hasn't started */}
      {!gameStarted && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
          <div className="text-center p-8 bg-gray-800 rounded-lg shadow-xl">
            <h1 className="text-4xl font-bold text-white mb-4">GameBuddies Hub</h1>
            <p className="text-gray-400 mb-6">
              A virtual world to meet and play games with friends
            </p>

            {error && (
              <p className="text-red-400 mb-4 text-sm">{error}</p>
            )}

            <button
              onClick={handleEnterHub}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600
                         text-white font-semibold rounded-lg transition-colors duration-200"
            >
              {loading ? 'Loading...' : 'Enter Hub'}
            </button>

            <p className="text-gray-500 text-xs mt-4">
              Use WASD or Arrow keys to move
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
