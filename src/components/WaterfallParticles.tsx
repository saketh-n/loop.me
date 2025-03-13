import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, BufferGeometry, Float32BufferAttribute, Points, PointsMaterial, AdditiveBlending } from 'three';

interface WaterfallParticlesProps {
  position: [number, number, number];
  width: number;
  height: number;
}

interface Particle {
  position: Vector3;
  velocity: Vector3;
  spiral: number;
  life: number;
  size: number;
}

const PARTICLE_COUNT = 2000;
const PARTICLE_SIZE = 0.15;
const FALL_SPEED = 15;
const SPIRAL_SPEED = 2;
const SPAWN_RATE = 0.2;

export function WaterfallParticles({ position, width, height }: WaterfallParticlesProps) {
  const particles = useRef<Particle[]>([]);
  const pointsRef = useRef<Points>(null);
  const geometryRef = useRef<BufferGeometry>(null);
  const positions = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 3));
  const opacities = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT));
  const sizes = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT));

  // Initialize particles if not already done
  if (particles.current.length === 0) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = (Math.random() - 0.5) * (width - 0.2);
      particles.current.push({
        position: new Vector3(x, 0, 0),
        velocity: new Vector3(0, -FALL_SPEED * (0.8 + Math.random() * 0.4), 0),
        spiral: Math.random() * Math.PI * 2,
        life: Math.random(),
        size: PARTICLE_SIZE * (0.8 + Math.random() * 0.4)
      });
    }
  }

  useFrame((state, delta) => {
    if (!geometryRef.current) return;

    // Update particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const particle = particles.current[i];
      
      // Update particle position
      particle.position.y += particle.velocity.y * delta;
      
      // Determine if this is a side waterfall based on position
      const isSideWaterfall = Math.abs(position[0]) > Math.abs(position[2]);
      
      // Spiral motion aligned with waterfall face
      particle.spiral += SPIRAL_SPEED * delta;
      const spiralRadius = 0.1;
      
      if (isSideWaterfall) {
        // For east/west waterfalls, spiral in Y-Z plane
        particle.position.x = position[0];
        particle.position.z = position[2] + Math.cos(particle.spiral) * spiralRadius;
      } else {
        // For north/south waterfalls, spiral in X-Y plane
        particle.position.x = position[0] + Math.cos(particle.spiral) * spiralRadius;
        particle.position.z = position[2];
      }

      // Reset particle if it falls too far
      if (particle.position.y < position[1] - height) {
        particle.position.y = position[1];
        if (isSideWaterfall) {
          particle.position.x = position[0];
          particle.position.z = position[2] + (Math.random() - 0.5) * (width - 0.2);
        } else {
          particle.position.x = position[0] + (Math.random() - 0.5) * (width - 0.2);
          particle.position.z = position[2];
        }
        particle.spiral = Math.random() * Math.PI * 2;
      }

      // Update position buffer
      const idx = i * 3;
      positions.current[idx] = particle.position.x;
      positions.current[idx + 1] = particle.position.y;
      positions.current[idx + 2] = particle.position.z;

      // Fade out as particles fall and add pulsing effect
      const heightFactor = Math.max(0, 1 - Math.abs(particle.position.y - position[1]) / height);
      const pulseEffect = 0.7 + 0.3 * Math.sin(state.clock.elapsedTime * 5 + particle.spiral);
      opacities.current[i] = heightFactor * pulseEffect;
      sizes.current[i] = particle.size * (0.8 + 0.2 * pulseEffect);
    }

    // Update geometry
    geometryRef.current.setAttribute('position', new Float32BufferAttribute(positions.current, 3));
    geometryRef.current.setAttribute('opacity', new Float32BufferAttribute(opacities.current, 1));
    geometryRef.current.setAttribute('size', new Float32BufferAttribute(sizes.current, 1));
    geometryRef.current.attributes.position.needsUpdate = true;
    geometryRef.current.attributes.opacity.needsUpdate = true;
    geometryRef.current.attributes.size.needsUpdate = true;
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
        <bufferAttribute
          attach="attributes-size"
          count={PARTICLE_COUNT}
          array={sizes.current}
          itemSize={1}
          args={[sizes.current, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={PARTICLE_SIZE}
        color="#6ba4c7"
        transparent
        depthWrite={false}
        opacity={0.8}
        blending={AdditiveBlending}
        vertexColors
        sizeAttenuation
      />
    </points>
  );
} 