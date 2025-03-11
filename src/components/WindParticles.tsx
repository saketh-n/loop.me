import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, BufferGeometry, Float32BufferAttribute, Points, PointsMaterial } from 'three';
import { useGameStore } from '../store/gameStore';

interface Particle {
  position: Vector3;
  velocity: Vector3;
  lifetime: number;
  maxLifetime: number;
}

const PARTICLE_COUNT = 4000;
const PARTICLE_SIZE = 0.08;
const SPAWN_RADIUS = 40;
const SPAWN_HEIGHT = 100;
const MIN_LIFETIME = 2;
const MAX_LIFETIME = 4;
const WIND_STRENGTH = 8;
const WIND_DIRECTION = new Vector3(-1, 0, 1).normalize(); // NE to SW (same as Player)
const WIND_GUST_FREQUENCY = 0.5;
const WIND_GUST_MAGNITUDE = 0.3;

export function WindParticles() {
  const particles = useRef<Particle[]>([]);
  const pointsRef = useRef<Points>(null);
  const geometryRef = useRef<BufferGeometry>(null);
  const positions = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 3));
  const opacities = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT));
  const playerPos = useGameStore((state) => state.position);
  const windTime = useRef(0);
  const windForce = useRef(WIND_DIRECTION.clone().multiplyScalar(WIND_STRENGTH));

  // Initialize particles if not already done
  if (particles.current.length === 0) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * SPAWN_RADIUS;
      const height = Math.random() * SPAWN_HEIGHT;
      
      particles.current.push({
        position: new Vector3(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        ),
        velocity: new Vector3(0, 0, 0),
        lifetime: Math.random() * MAX_LIFETIME,
        maxLifetime: MIN_LIFETIME + Math.random() * (MAX_LIFETIME - MIN_LIFETIME)
      });
    }
  }

  useFrame((state, delta) => {
    if (!geometryRef.current) return;

    // Update wind time for gusts
    windTime.current += delta;
    const gustFactor = 1 + Math.sin(windTime.current * WIND_GUST_FREQUENCY * Math.PI * 2) * WIND_GUST_MAGNITUDE;
    windForce.current.copy(WIND_DIRECTION).multiplyScalar(WIND_STRENGTH * gustFactor);

    // Update particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const particle = particles.current[i];
      
      // Update particle position based on wind (slower lerp for gentler movement)
      particle.velocity.lerp(windForce.current, 0.08);
      particle.position.add(particle.velocity.clone().multiplyScalar(delta));
      
      // Update lifetime and reset if needed
      particle.lifetime -= delta;
      if (particle.lifetime <= 0) {
        // Reset particle position around the player
        const angle = Math.random() * Math.PI * 2;
        const radius = SPAWN_RADIUS;
        const height = Math.random() * SPAWN_HEIGHT;
        
        // Spawn particles upwind from the player
        const spawnOffset = windForce.current.clone().normalize().multiplyScalar(-SPAWN_RADIUS);
        particle.position.set(
          playerPos[0] + Math.cos(angle) * radius + spawnOffset.x,
          height,
          playerPos[2] + Math.sin(angle) * radius + spawnOffset.z
        );
        particle.lifetime = particle.maxLifetime;
        particle.velocity.set(0, 0, 0);
      }

      // Update position buffer
      const idx = i * 3;
      positions.current[idx] = particle.position.x;
      positions.current[idx + 1] = particle.position.y;
      positions.current[idx + 2] = particle.position.z;
      
      // Update opacity based on lifetime, height, and wind strength
      const heightFactor = Math.min(1, particle.position.y / SPAWN_HEIGHT);
      const windFactor = particle.velocity.length() / WIND_STRENGTH;
      opacities.current[i] = (particle.lifetime / particle.maxLifetime) * 0.4 * heightFactor * windFactor;
    }

    // Update geometry
    geometryRef.current.setAttribute('position', new Float32BufferAttribute(positions.current, 3));
    geometryRef.current.setAttribute('opacity', new Float32BufferAttribute(opacities.current, 1));
    geometryRef.current.attributes.position.needsUpdate = true;
    geometryRef.current.attributes.opacity.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions.current}
          itemSize={3}
          args={[positions.current, 3]}
        />
        <bufferAttribute
          attach="attributes-opacity"
          count={PARTICLE_COUNT}
          array={opacities.current}
          itemSize={1}
          args={[opacities.current, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={PARTICLE_SIZE}
        color="#ffffff"
        transparent
        depthWrite={false}
        vertexColors
        opacity={0.6}
      />
    </points>
  );
} 