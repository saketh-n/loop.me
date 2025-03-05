import { Canvas } from '@react-three/fiber';
import { GameScene } from './components/GameScene';
import { GameUI } from './components/GameUI';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        camera={{ 
          position: [0, 5, 8], 
          fov: 90,  // Wider field of view
          near: 0.1,
          far: 1000  // Increased far plane distance significantly
        }}
        style={{ background: 'skyblue' }}
      >
        <GameScene />
      </Canvas>
      <GameUI />
    </div>
  );
}

export default App;
