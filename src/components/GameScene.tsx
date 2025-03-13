import { Physics, RigidBody } from '@react-three/rapier';
import { DoubleSide, TextureLoader, RepeatWrapping, LinearFilter, LinearMipmapLinearFilter } from 'three';
import { Player } from './Player';
import { useLoader } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import { InteractiveGrass } from './InteractiveGrass';
import { WindParticles } from './WindParticles';
import { useGameStore } from '../store/gameStore';
import { CuboidCollider } from '@react-three/rapier';

export function GameScene() {
  const levelConfig = useGameStore((state) => state.levelConfig);
  
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
    grassTexture.repeat.set(6, 6);
    grassTexture.magFilter = LinearFilter;
    grassTexture.minFilter = LinearMipmapLinearFilter;
  }

  if (soilTexture) {
    soilTexture.wrapS = RepeatWrapping;
    soilTexture.wrapT = RepeatWrapping;
    soilTexture.repeat.set(3, 3);
    soilTexture.magFilter = LinearFilter;
    soilTexture.minFilter = LinearMipmapLinearFilter;
  }

  const createPlatform = (basePosition: [number, number, number]) => (
    <group position={basePosition}>
      {/* Main block */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[levelConfig.platformDimensions[0], 1, levelConfig.platformDimensions[1]]} />
        <meshStandardMaterial 
          map={soilTexture}
          color={soilTexture ? '#ffffff' : '#8B4513'}
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* Grass layer */}
      <mesh position={[0, 0.501, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[levelConfig.platformDimensions[0], levelConfig.platformDimensions[1]]} />
        <meshStandardMaterial 
          map={grassTexture}
          color={grassTexture ? '#ffffff' : '#228B22'}
          transparent={true}
          alphaTest={0.5}
          depthWrite={true}
          side={DoubleSide}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* Interactive grass */}
      {levelConfig.grass.enabled && (
        <InteractiveGrass 
          key={`grass-${levelConfig.platformDimensions[0]}-${levelConfig.platformDimensions[1]}`}
          position={[0, 0.5, 0]}
          count={Math.floor(levelConfig.platformDimensions[0] * levelConfig.platformDimensions[1] * levelConfig.grass.density)}
          bounds={[
            levelConfig.platformDimensions[0],
            levelConfig.platformDimensions[1]
          ]}
          height={0.4}
        />
      )}
    </group>
  );

  // Get sky configuration based on time of day
  const getSkyConfig = () => {
    switch (levelConfig.skybox.timeOfDay) {
      case 'sunrise':
        return { distance: 450000, sunPosition: [0, 5, 100] as [number, number, number] };
      case 'sunset':
        return { distance: 450000, sunPosition: [-100, 5, -50] as [number, number, number] };
      default: // day
        return { distance: 450000, sunPosition: [100, 100, 20] as [number, number, number] };
    }
  };

  const skyConfig = getSkyConfig();

  console.log('Platform Dimensions:', levelConfig.platformDimensions);

  return (
    <Physics debug={false}>
      {/* Lights */}
      <ambientLight intensity={0.8} />
      <directionalLight 
        position={skyConfig.sunPosition} 
        intensity={1.5}
        castShadow
      />

      {/* Sky */}
      <Sky 
        distance={skyConfig.distance}
        sunPosition={skyConfig.sunPosition}
        inclination={levelConfig.skybox.inclination}
        azimuth={levelConfig.skybox.azimuth}
      />

      {/* Wind Particles */}
      {levelConfig.wind.enabled && <WindParticles />}

      {/* Main Platform (Physical) */}
      <RigidBody 
        type="fixed"
        key={`platform-${levelConfig.platformDimensions[0]}-${levelConfig.platformDimensions[1]}`}
      >
        <CuboidCollider 
          key={`collider-${levelConfig.platformDimensions[0]}-${levelConfig.platformDimensions[1]}`}
          args={[
            levelConfig.platformDimensions[0] * 0.5, // Convert to half-width
            0.5, // half-height
            levelConfig.platformDimensions[1] * 0.5  // Convert to half-depth
          ]} 
          position={[0, levelConfig.spawnHeight, 0]}
        />
        {createPlatform([0, levelConfig.spawnHeight, 0])}
      </RigidBody>

      {/* Visual Mirror Platforms */}
      <group>
        {/* Platform Above */}
        {createPlatform([0, levelConfig.spawnHeight + 100, 0])}

        {/* Platform Below */}
        {createPlatform([0, levelConfig.spawnHeight - 100, 0])}
      </group>

      {/* Player */}
      <Player />
    </Physics>
  );
} 