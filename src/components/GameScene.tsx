import { Physics, RigidBody } from '@react-three/rapier';
import { DoubleSide, TextureLoader, RepeatWrapping, LinearFilter, LinearMipmapLinearFilter, Vector3 } from 'three';
import { Player } from './Player';
import { useLoader, useFrame } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';
import { InteractiveGrass } from './InteractiveGrass';
import { WindParticles } from './WindParticles';
import { Water } from './Water';
import { WaterfallParticles } from './WaterfallParticles';
import { useGameStore } from '../store/gameStore';
import { CuboidCollider } from '@react-three/rapier';
import { useRef, useState, useEffect } from 'react';

export function GameScene() {
  const levelConfig = useGameStore((state) => state.levelConfig);
  const platformRef = useRef<any>(null);
  const platformPosition = useRef(new Vector3(0, levelConfig.spawnHeight, 0));
  const [collapsingSegments, setCollapsingSegments] = useState<number[]>([]);
  const [warningSegments, setWarningSegments] = useState<number[]>([]);
  const [removedSegments, setRemovedSegments] = useState<number[]>([]);
  const segmentRefs = useRef<any[]>([]);
  const gameStartTime = useRef(Date.now());
  
  // Initialize segment refs if this is a collapsing level
  useEffect(() => {
    if (levelConfig.collapse?.enabled) {
      segmentRefs.current = Array(levelConfig.collapse.segments).fill(null);
      gameStartTime.current = Date.now();
      setCollapsingSegments([]);
      setWarningSegments([]);
      setRemovedSegments([]);
    }
  }, [levelConfig]);

  // Handle platform collapse
  useEffect(() => {
    if (!levelConfig.collapse?.enabled) return;

    const checkCollapse = () => {
      const elapsedSeconds = (Date.now() - gameStartTime.current) / 1000;
      const segmentToCollapse = Math.floor(elapsedSeconds / levelConfig.collapse!.intervalSeconds);
      
      // Show warning 1 second before collapse
      const warningSegment = Math.floor((elapsedSeconds + 1) / levelConfig.collapse!.intervalSeconds);
      
      if (warningSegment < levelConfig.collapse!.segments && 
          !warningSegments.includes(warningSegment) &&
          !collapsingSegments.includes(warningSegment)) {
        setWarningSegments(prev => [...prev, warningSegment]);
      }
      
      if (segmentToCollapse < levelConfig.collapse!.segments && 
          !collapsingSegments.includes(segmentToCollapse)) {
        setCollapsingSegments(prev => [...prev, segmentToCollapse]);
        setWarningSegments(prev => prev.filter(s => s !== segmentToCollapse));
      }
    };

    const interval = setInterval(checkCollapse, 100); // Check more frequently for smoother warnings
    return () => clearInterval(interval);
  }, [levelConfig, collapsingSegments, warningSegments]);

  // Check for fallen segments
  useFrame(() => {
    if (!levelConfig.collapse?.enabled) return;

    collapsingSegments.forEach(index => {
      if (segmentRefs.current[index] && !removedSegments.includes(index)) {
        const position = segmentRefs.current[index].translation();
        if (position.y < -100) {
          setRemovedSegments(prev => [...prev, index]);
        }
      }
    });
  });

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

  // Platform movement logic
  useFrame((state, delta) => {
    if (platformRef.current && levelConfig.platformMovement) {
      const { speed, direction } = levelConfig.platformMovement;
      const movement = new Vector3(...direction).multiplyScalar(speed * delta);
      platformPosition.current.add(movement);
      platformRef.current.setTranslation({
        x: platformPosition.current.x,
        y: platformPosition.current.y,
        z: platformPosition.current.z
      });
    }
  });

  const createPlatformSegment = (index: number, totalSegments: number, basePosition: [number, number, number]) => {
    const segmentDepth = levelConfig.platformDimensions[1] / totalSegments;
    const zOffset = (index - (totalSegments - 1) / 2) * segmentDepth;
    const isCollapsing = collapsingSegments.includes(index);
    const isWarning = warningSegments.includes(index);
    const isRemoved = removedSegments.includes(index);

    // Don't render removed segments
    if (isRemoved) return null;

    return (
      <RigidBody
        ref={(el: any) => { segmentRefs.current[index] = el }}
        type={isCollapsing ? "dynamic" : "fixed"}
        position={[basePosition[0], basePosition[1], basePosition[2] + zOffset]}
        key={`platform-segment-${index}`}
        colliders="cuboid"
        mass={1}
        restitution={0}
      >
        <mesh>
          <boxGeometry args={[levelConfig.platformDimensions[0], 1, segmentDepth]} />
          <meshStandardMaterial 
            map={soilTexture}
            color={isWarning ? '#ff6b6b' : (soilTexture ? '#ffffff' : '#8B4513')}
            roughness={0.9}
            metalness={0}
            emissive={isWarning || isCollapsing ? '#ff0000' : '#000000'}
            emissiveIntensity={isWarning ? 0.5 : (isCollapsing ? 0.3 : 0)}
          />
        </mesh>
        {levelConfig.grass.enabled && (
          <>
            <mesh position={[0, 0.501, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[levelConfig.platformDimensions[0], segmentDepth]} />
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
            <InteractiveGrass 
              key={`grass-${index}`}
              position={[0, 0.5, 0]}
              count={Math.floor(levelConfig.platformDimensions[0] * segmentDepth * levelConfig.grass.density)}
              bounds={[levelConfig.platformDimensions[0], segmentDepth]}
              height={0.4}
            />
          </>
        )}
      </RigidBody>
    );
  };

  const createPlatform = (basePosition: [number, number, number]) => {
    if (levelConfig.collapse?.enabled) {
      return (
        <group>
          {Array.from({ length: levelConfig.collapse.segments }, (_, i) => 
            createPlatformSegment(i, levelConfig.collapse!.segments, basePosition)
          )}
        </group>
      );
    }

    // Regular non-collapsing platform
    return (
      <>
        <RigidBody type="fixed" position={basePosition}>
          <CuboidCollider 
            args={[
              levelConfig.platformDimensions[0] * 0.5,
              0.5,
              levelConfig.platformDimensions[1] * 0.5
            ]} 
          />
          <group>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[levelConfig.platformDimensions[0], 1, levelConfig.platformDimensions[1]]} />
              <meshStandardMaterial 
                map={levelConfig.id !== 4 ? soilTexture : null}
                color={levelConfig.id === 4 ? '#ffffff' : (soilTexture ? '#ffffff' : '#8B4513')}
                roughness={0.9}
                metalness={0}
              />
            </mesh>

            {/* Center pole for Level 4 */}
            {levelConfig.id === 4 && (
              <mesh position={[0, 5.5, 0]}>
                <boxGeometry args={[0.5, 10, 0.5]} />
                <meshStandardMaterial
                  color="#ffffff"
                  roughness={0.9}
                  metalness={0}
                />
              </mesh>
            )}

            {levelConfig.grass.enabled && (
              <>
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
              </>
            )}
          </group>
        </RigidBody>

        {/* Water volume - completely separate from physics */}
        {levelConfig.id === 4 && (
          <group>
            <mesh 
              position={[0, levelConfig.spawnHeight + 0.6, 0]}
              key="water-main"
            >
              <boxGeometry 
                args={[
                  levelConfig.platformDimensions[0] + 1, 
                  1.2,  // knee height
                  levelConfig.platformDimensions[1] + 1
                ]} 
              />
              <meshStandardMaterial 
                color="#4a6d8c" 
                transparent 
                opacity={0.6}
                side={DoubleSide}
              />
            </mesh>
          </group>
        )}
      </>
    );
  };

  // Get sky configuration based on time of day
  const getSkyConfig = () => {
    switch (levelConfig.skybox.timeOfDay) {
      case 'sunrise':
        return { distance: 450000, sunPosition: [0, 5, 100] as [number, number, number] };
      case 'sunset':
        return { distance: 450000, sunPosition: [-100, 5, -50] as [number, number, number] };
      case 'night':
        return { distance: 450000, sunPosition: [-100, -100, -100] as [number, number, number] };
      default: // day
        return { distance: 450000, sunPosition: [100, 100, 20] as [number, number, number] };
    }
  };

  const skyConfig = getSkyConfig();
  const isNight = levelConfig.skybox.timeOfDay === 'night';

  console.log('Platform Dimensions:', levelConfig.platformDimensions);

  return (
    <Physics debug={true}>
      {/* Lights */}
      <ambientLight intensity={isNight ? 0.1 : 0.8} />
      {/* Moon light for night time */}
      {isNight ? (
        <>
          <directionalLight 
            position={[50, 50, -50]} 
            intensity={0.3}
            color="#b4c4db"
          />
          <pointLight
            position={[30, 50, -20]}
            intensity={1}
            color="#b4c4db"
            distance={200}
          />
          <Stars 
            radius={100} 
            depth={50} 
            count={5000} 
            factor={4} 
            saturation={0} 
            fade 
            speed={1}
          />
        </>
      ) : (
        <directionalLight 
          position={skyConfig.sunPosition} 
          intensity={1.5}
          castShadow
        />
      )}

      {/* Sky */}
      <Sky 
        distance={skyConfig.distance}
        sunPosition={skyConfig.sunPosition}
        inclination={levelConfig.skybox.inclination}
        azimuth={levelConfig.skybox.azimuth}
        mieCoefficient={isNight ? 0.005 : 0.005}
        mieDirectionalG={isNight ? 0.7 : 0.8}
        rayleigh={isNight ? 0.5 : 2}
        turbidity={isNight ? 1 : 10}
      />

      {/* Wind Particles */}
      {levelConfig.wind.enabled && <WindParticles />}

      {/* Main Platform (Physical) */}
      {!levelConfig.collapse?.enabled ? (
        <RigidBody 
          type={levelConfig.platformMovement ? "kinematicPosition" : "fixed"}
          ref={platformRef}
          position={[0, levelConfig.spawnHeight, 0]}
          key={`platform-rigid-${levelConfig.id}`}
        >
          <CuboidCollider 
            key={`collider-${levelConfig.platformDimensions[0]}-${levelConfig.platformDimensions[1]}`}
            args={[
              levelConfig.platformDimensions[0] * 0.5,
              0.5,
              levelConfig.platformDimensions[1] * 0.5
            ]} 
          />
          {createPlatform([0, 0, 0])}
        </RigidBody>
      ) : (
        createPlatform([0, levelConfig.spawnHeight, 0])
      )}

      {/* Visual Mirror Platforms */}
      <group key={`mirrors-${levelConfig.id}`}>
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