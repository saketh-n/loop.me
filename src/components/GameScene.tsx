import { Physics, RigidBody } from '@react-three/rapier';
import { DoubleSide } from 'three';
import { Player } from './Player';

// World boundaries
const PLATFORM_HEIGHT = 50;
const WORLD_OFFSET = 100; // Distance between mirrored elements

export function GameScene() {
  return (
    <Physics debug={false}>
      {/* Lights */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      {/* Main Platform (Physical) */}
      <RigidBody type="fixed" colliders="trimesh">
        <mesh position={[0, PLATFORM_HEIGHT, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#808080" side={DoubleSide} />
        </mesh>
      </RigidBody>

      {/* Visual Mirror Platforms */}
      <group>
        {/* Platform Above */}
        <mesh 
          position={[0, PLATFORM_HEIGHT + WORLD_OFFSET, 0]} 
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#808080" side={DoubleSide} />
        </mesh>

        {/* Platform Below */}
        <mesh 
          position={[0, PLATFORM_HEIGHT - WORLD_OFFSET, 0]} 
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#808080" side={DoubleSide} />
        </mesh>
      </group>

      {/* Player */}
      <Player />

      {/* Camera Controls - removed since we're handling camera in Player component */}
    </Physics>
  );
} 