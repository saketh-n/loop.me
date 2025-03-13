import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';

interface SkyboxConfig {
  type: 'dawn' | 'day' | 'night';
  color: string;
  fogColor?: string;
  fogDensity?: number;
}

interface SkyboxProps {
  skyboxConfig: SkyboxConfig;
}

export const Skybox = ({ skyboxConfig }: SkyboxProps) => {
  const meshRef = useRef<Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <>
      <mesh ref={meshRef} scale={[1000, 1000, 1000]}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial color={skyboxConfig.color} side={1} fog={false} />
      </mesh>
      {skyboxConfig.fogColor && (
        <fog
          attach="fog"
          args={[skyboxConfig.fogColor, 0, skyboxConfig.fogDensity || 0.02]}
        />
      )}
    </>
  );
}; 