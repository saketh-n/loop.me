import { Physics, RigidBody } from '@react-three/rapier';
import { DoubleSide, TextureLoader, RepeatWrapping, LinearFilter, LinearMipmapLinearFilter } from 'three';
import { Player } from './Player';
import { useLoader } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import { InteractiveGrass } from './InteractiveGrass';
import { WindParticles } from './WindParticles';

// World boundaries
const PLATFORM_HEIGHT = 50;
const WORLD_OFFSET = 100; // Distance between mirrored elements

export function GameScene() {
  // Load textures with error handling
  const grassTexture = useLoader(TextureLoader, '/textures/grass.jpg', undefined, (error) => {
    console.error('Failed to load grass texture:', error);
  });
  
  const soilTexture = useLoader(TextureLoader, '/textures/soil.jpg', undefined, (error) => {
    console.error('Failed to load soil texture:', error);
  });

  // Configure textures if they loaded successfully
  if (grassTexture) {
    grassTexture.wrapS = RepeatWrapping;
    grassTexture.wrapT = RepeatWrapping;
    grassTexture.repeat.set(6, 6); // Adjust repetition for natural look
    grassTexture.magFilter = LinearFilter;
    grassTexture.minFilter = LinearMipmapLinearFilter;
  }

  if (soilTexture) {
    soilTexture.wrapS = RepeatWrapping;
    soilTexture.wrapT = RepeatWrapping;
    soilTexture.repeat.set(3, 3); // Less repetition for soil
    soilTexture.magFilter = LinearFilter;
    soilTexture.minFilter = LinearMipmapLinearFilter;
  }

  const createPlatform = (basePosition: [number, number, number]) => (
    <group position={basePosition}>
      {/* Main block */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[20, 1, 20]} />
        <meshStandardMaterial 
          map={soilTexture}
          color={soilTexture ? '#ffffff' : '#8B4513'} // Fallback color
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* Grass layer */}
      <mesh position={[0, 0.501, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial 
          map={grassTexture}
          color={grassTexture ? '#ffffff' : '#228B22'} // Fallback color
          transparent={true}
          alphaTest={0.5}
          depthWrite={true}
          side={DoubleSide}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* Interactive grass */}
      <InteractiveGrass 
        position={[0, 0.5, 0]}
        count={2000}
        bounds={[9, 9]} // Slightly smaller than platform to avoid edge overflow
        height={0.4}
      />
    </group>
  );

  return (
    <Physics debug={false}>
      {/* Lights */}
      <ambientLight intensity={0.8} />
      <directionalLight 
        position={[100, 100, 20]} 
        intensity={1.5}
        castShadow
      />

      {/* Sky */}
      <Sky 
        distance={450000} // Increased for more realistic horizon
        sunPosition={[100, 100, 20]}
        inclination={0.6}
        azimuth={0.25}
      />

      {/* Wind Particles */}
      <WindParticles />

      {/* Main Platform (Physical) */}
      <RigidBody type="fixed" colliders="cuboid">
        {createPlatform([0, PLATFORM_HEIGHT, 0])}
      </RigidBody>

      {/* Visual Mirror Platforms */}
      <group>
        {/* Platform Above */}
        {createPlatform([0, PLATFORM_HEIGHT + WORLD_OFFSET, 0])}

        {/* Platform Below */}
        {createPlatform([0, PLATFORM_HEIGHT - WORLD_OFFSET, 0])}
      </group>

      {/* Player */}
      <Player />
    </Physics>
  );
} 