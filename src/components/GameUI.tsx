import { useGameStore } from '../store/gameStore';

export function GameUI() {
  const score = useGameStore((state) => state.score);

  return (
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
      <div style={{
        background: 'rgba(0, 0, 0, 0.5)',
        padding: '20px',
        borderRadius: '10px',
        maxWidth: '300px',
        margin: '0 auto',
      }}>
        <h2 style={{ margin: '0 0 10px 0' }}>Controls</h2>
        <p style={{ margin: '0 0 5px 0' }}>W - Move Forward</p>
        <p style={{ margin: '0 0 5px 0' }}>S - Move Backward</p>
        <p style={{ margin: '0 0 5px 0' }}>A - Move Left</p>
        <p style={{ margin: '0 0 5px 0' }}>D - Move Right</p>
        <h3 style={{ margin: '15px 0 5px 0' }}>Score: {score}</h3>
      </div>
    </div>
  );
} 