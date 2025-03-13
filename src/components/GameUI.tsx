import { useGameStore } from '../store/gameStore';
import { useState, useEffect, useRef } from 'react';

export function GameUI() {
  const health = useGameStore((state) => state.health);
  const maxHealth = useGameStore((state) => state.maxHealth);
  const isGameComplete = useGameStore((state) => state.isGameComplete);
  const isGameFailed = useGameStore((state) => state.isGameFailed);
  const fallTime = useGameStore((state) => state.fallTime);
  const isEndlessFall = useGameStore((state) => state.isEndlessFall);
  const nextLevel = useGameStore((state) => state.nextLevel);
  const currentLevel = useGameStore((state) => state.currentLevel);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showDamageFlash, setShowDamageFlash] = useState(false);
  const [showFailureDialog, setShowFailureDialog] = useState(true);
  const [showEndlessFallDialog, setShowEndlessFallDialog] = useState(true);
  const prevHealth = useRef(health);
  
  // Damage flash effect
  useEffect(() => {
    if (health < prevHealth.current) {
      setShowDamageFlash(true);
      setTimeout(() => setShowDamageFlash(false), 100);
    }
    prevHealth.current = health;
  }, [health]);

  // Handle keyboard controls for tutorial and instructions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'x') {
        setShowInstructions(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRestart = () => {
    window.location.reload();
  };

  const handleProceed = () => {
    nextLevel();
  };

  // Tutorial Content
  const renderTutorialContent = () => {
    return (
      <div style={{
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '20px',
        borderRadius: '10px',
        maxWidth: '400px',
        margin: '0 auto',
      }}>
        <h2 style={{ margin: '0 0 15px 0', fontSize: '24px', textAlign: 'center' }}>
          Welcome to loop.me
        </h2>
        
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#ff6b6b' }}>Objective</h3>
          <p style={{ margin: '0 0 5px 0', fontSize: '16px' }}>
            Your goal is to bring your health bar to 0 by falling and taking damage.
          </p>
          <p style={{ margin: '0 0 5px 0', fontSize: '16px' }}>
            The world loops vertically - falling off the bottom brings you back to the top!
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#4ecdc4' }}>Controls</h3>
          <p style={{ margin: '0 0 5px 0' }}>Mouse - Look around</p>
          <p style={{ margin: '0 0 5px 0' }}>W - Move Forward</p>
          <p style={{ margin: '0 0 5px 0' }}>S - Move Backward</p>
          <p style={{ margin: '0 0 5px 0' }}>A - Move Left</p>
          <p style={{ margin: '0 0 5px 0' }}>D - Move Right</p>
          <p style={{ margin: '0 0 5px 0' }}>Space - Jump</p>
          <p style={{ margin: '0 0 5px 0' }}>Shift - Run (1.5x Speed)</p>
          <p style={{ margin: '0 0 5px 0' }}>Control - Sprint (2x Speed)</p>
          <p style={{ margin: '0 0 5px 0' }}>X - Toggle Instructions</p>
          <p style={{ margin: '0 0 5px 0' }}>ESC - Release Mouse</p>
        </div>

        <p style={{ 
          margin: '10px 0 0 0', 
          fontSize: '14px', 
          opacity: 0.8, 
          textAlign: 'center',
          fontStyle: 'italic'
        }}>
          Click anywhere to start controlling the camera
        </p>
      </div>
    );
  };

  return (
    <>
      {/* Victory Screen - Show when health is 0 */}
      {health === 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          zIndex: 1000,
        }}>
          <h1 style={{ 
            fontSize: '48px',
            marginBottom: '20px',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
          }}>
            {currentLevel === 2 ? "You Won!" : "Congratulations you have beat the level!"}
          </h1>
          <button 
            onClick={currentLevel === 2 ? handleRestart : handleProceed}
            style={{
              padding: '15px 30px',
              fontSize: '24px',
              backgroundColor: 'white',
              color: 'black',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              boxShadow: '2px 2px 4px rgba(0,0,0,0.3)',
              transition: 'transform 0.1s',
              fontWeight: 'bold',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {currentLevel === 2 ? "PLAY AGAIN" : "PROCEED"}
          </button>
        </div>
      )}

      {/* Failure Dialog - Show only when legs are broken AND health > 0 */}
      {isGameFailed && health > 0 && showFailureDialog && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          padding: '20px',
          borderRadius: '10px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          zIndex: 1000,
          minWidth: '300px',
          textAlign: 'center',
          boxShadow: '0 0 20px rgba(0,0,0,0.5)',
        }}>
          <h2 style={{ 
            fontSize: '24px',
            marginBottom: '15px',
            color: '#ff6b6b'
          }}>
            You are unable to proceed
          </h2>
          <div style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center'
          }}>
            <button 
              onClick={() => setShowFailureDialog(false)}
              style={{
                padding: '8px 16px',
                fontSize: '16px',
                backgroundColor: '#4a4a4a',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#666666'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#4a4a4a'}
            >
              Dismiss
            </button>
            <button 
              onClick={handleRestart}
              style={{
                padding: '8px 16px',
                fontSize: '16px',
                backgroundColor: '#ff6b6b',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ff8585'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ff6b6b'}
            >
              Restart
            </button>
          </div>
        </div>
      )}

      {/* Endless Fall Dialog */}
      {isEndlessFall && health > 0 && showEndlessFallDialog && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          padding: '20px',
          borderRadius: '10px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          zIndex: 1000,
          minWidth: '300px',
          textAlign: 'center',
          boxShadow: '0 0 20px rgba(0,0,0,0.5)',
        }}>
          <h2 style={{ 
            fontSize: '24px',
            marginBottom: '15px',
            color: '#ff6b6b'
          }}>
            You seem to be in an unwinnable situation
          </h2>
          <div style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center'
          }}>
            <button 
              onClick={() => setShowEndlessFallDialog(false)}
              style={{
                padding: '8px 16px',
                fontSize: '16px',
                backgroundColor: '#4a4a4a',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#666666'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#4a4a4a'}
            >
              Continue
            </button>
            <button 
              onClick={handleRestart}
              style={{
                padding: '8px 16px',
                fontSize: '16px',
                backgroundColor: '#ff6b6b',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ff8585'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ff6b6b'}
            >
              Give Up?
            </button>
          </div>
        </div>
      )}

      {/* Fall Timer Display (for testing) */}
      {fallTime > 0 && (
        <div style={{
          position: 'fixed',
          top: 60,
          right: 20,
          padding: '10px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          borderRadius: '5px',
          fontFamily: 'monospace',
          fontSize: '16px',
        }}>
          Fall Time: {fallTime.toFixed(1)}s
        </div>
      )}

      {/* Damage Flash Overlay */}
      {showDamageFlash && health > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 0, 0, 0.3)',
          pointerEvents: 'none',
          zIndex: 1000,
        }} />
      )}

      {/* Health Bar */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        width: '600px',
        height: '20px',
        background: 'rgba(0, 0, 0, 0.5)',
        border: '2px solid white',
        borderRadius: '10px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${(health / maxHealth) * 100}%`,
          height: '100%',
          background: 'red',
          transition: 'width 0.3s ease-in-out',
        }} />
      </div>

      {/* Tutorial/Instructions */}
      {showInstructions && health > 0 && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          padding: '20px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          pointerEvents: 'none',
        }}>
          {renderTutorialContent()}
        </div>
      )}
    </>
  );
} 