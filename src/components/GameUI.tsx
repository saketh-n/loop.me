import { useGameStore } from '../store/gameStore';
import { useState, useEffect, useRef } from 'react';

export function GameUI() {
  const health = useGameStore((state) => state.health);
  const maxHealth = useGameStore((state) => state.maxHealth);
  const isGameComplete = useGameStore((state) => state.isGameComplete);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showDamageFlash, setShowDamageFlash] = useState(false);
  const prevHealth = useRef(health);
  
  // Health regeneration (only when game is not complete)
  useEffect(() => {
    if (isGameComplete) return;
    
    const interval = setInterval(() => {
      if (health < maxHealth) {
        useGameStore.getState().takeDamage(-40); // Negative damage = healing
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [health, maxHealth, isGameComplete]);

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
      {/* Victory Screen */}
      {isGameComplete && (
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
            Congratulations you have beat the level!
          </h1>
          <button 
            onClick={() => window.location.reload()}
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
            PROCEED
          </button>
        </div>
      )}

      {/* Damage Flash Overlay */}
      {showDamageFlash && !isGameComplete && (
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
      {showInstructions && !isGameComplete && (
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