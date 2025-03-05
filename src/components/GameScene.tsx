import { Physics, RigidBody } from '@react-three/rapier';
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

      {/* Main Platform */}
      <RigidBody type="fixed" colliders="trimesh">
        <mesh position={[0, PLATFORM_HEIGHT, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="green" />
        </mesh>
      </RigidBody>

      {/* Mirror Platform Above */}
      <mesh position={[0, PLATFORM_HEIGHT + WORLD_OFFSET, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="green" />
      </mesh>

      {/* Mirror Platform Below */}
      <mesh position={[0, PLATFORM_HEIGHT - WORLD_OFFSET, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="green" />
      </mesh>

      {/* Player */}
      <Player />

      {/* Camera Controls - removed since we're handling camera in Player component */}
    </Physics>
  );
} 