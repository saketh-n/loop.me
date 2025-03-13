import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, ShaderMaterial, Vector3, DoubleSide } from 'three';

interface WaterProps {
  position: [number, number, number];
  dimensions: [number, number];
  color?: string;
  rotation?: [number, number, number];
}

// Water shader for a more realistic water effect
const waterVertexShader = `
  uniform float time;
  varying vec2 vUv;
  varying float noise;

  void main() {
    vUv = uv;
    
    // Simple wave animation
    float wave = sin(position.x * 0.5 + time) * 0.1 +
                cos(position.z * 0.5 + time * 0.8) * 0.1;
    
    vec3 pos = position;
    pos.y += wave;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const waterFragmentShader = `
  uniform vec3 waterColor;
  varying vec2 vUv;

  void main() {
    // Add some variation to the water color
    float depth = smoothstep(0.0, 1.0, vUv.y);
    vec3 color = mix(waterColor * 1.2, waterColor * 0.8, depth);
    
    gl_FragColor = vec4(color, 0.6); // Semi-transparent water
  }
`;

export function Water({ position, dimensions, color = '#4a6d8c', rotation = [0, 0, 0] }: WaterProps) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  
  // Convert color string to RGB vector
  const colorVector = new Vector3();
  const colorInt = parseInt(color.replace('#', ''), 16);
  colorVector.setX(((colorInt >> 16) & 255) / 255);
  colorVector.setY(((colorInt >> 8) & 255) / 255);
  colorVector.setZ((colorInt & 255) / 255);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Front face */}
      <mesh
        ref={meshRef}
      >
        <planeGeometry args={dimensions} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={waterVertexShader}
          fragmentShader={waterFragmentShader}
          transparent={true}
          uniforms={{
            time: { value: 0 },
            waterColor: { value: colorVector }
          }}
          side={DoubleSide}
        />
      </mesh>

      {/* Side faces for thickness */}
      <group>
        {/* Top edge */}
        <mesh position={[0, dimensions[1]/2, -0.1]}>
          <boxGeometry args={[dimensions[0], 0.2, 0.2]} />
          <meshStandardMaterial color={color} transparent opacity={0.6} />
        </mesh>
        {/* Bottom edge */}
        <mesh position={[0, -dimensions[1]/2, -0.1]}>
          <boxGeometry args={[dimensions[0], 0.2, 0.2]} />
          <meshStandardMaterial color={color} transparent opacity={0.6} />
        </mesh>
        {/* Left edge */}
        <mesh position={[-dimensions[0]/2, 0, -0.1]}>
          <boxGeometry args={[0.2, dimensions[1], 0.2]} />
          <meshStandardMaterial color={color} transparent opacity={0.6} />
        </mesh>
        {/* Right edge */}
        <mesh position={[dimensions[0]/2, 0, -0.1]}>
          <boxGeometry args={[0.2, dimensions[1], 0.2]} />
          <meshStandardMaterial color={color} transparent opacity={0.6} />
        </mesh>
      </group>
    </group>
  );
} 