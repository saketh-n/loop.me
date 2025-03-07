import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CharacterProps {
  position: [number, number, number];
  velocity?: THREE.Vector3;
}

export function Character({ position, velocity = new THREE.Vector3() }: CharacterProps) {
  const group = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Mesh>(null);
  const rightLeg = useRef<THREE.Mesh>(null);
  const walkCycle = useRef(0);
  const targetRotation = useRef(0);
  
  useFrame((state, delta) => {
    if (!group.current || !leftLeg.current || !rightLeg.current) return;

    // Animate legs when moving
    const speed = new THREE.Vector3(velocity.x, 0, velocity.z).length();
    if (speed > 0.1) {
      walkCycle.current += delta * 10;
      // Leg swing animation
      leftLeg.current.position.x = -0.2;
      leftLeg.current.position.y = -0.5 + Math.sin(walkCycle.current) * 0.2;
      rightLeg.current.position.x = 0.2;
      rightLeg.current.position.y = -0.5 + Math.sin(walkCycle.current + Math.PI) * 0.2;

      // Update target rotation
      targetRotation.current = Math.atan2(velocity.x, velocity.z);
    } else {
      // Reset legs to standing position
      leftLeg.current.position.x = -0.2;
      leftLeg.current.position.y = -0.5;
      rightLeg.current.position.x = 0.2;
      rightLeg.current.position.y = -0.5;
    }

    // Smooth rotation interpolation
    if (group.current) {
      const currentRotation = group.current.rotation.y;
      const rotationDiff = targetRotation.current - currentRotation;
      
      // Normalize the rotation difference to prevent spinning more than 180 degrees
      const normalizedDiff = Math.atan2(Math.sin(rotationDiff), Math.cos(rotationDiff));
      
      // Smoothly interpolate the rotation
      group.current.rotation.y += normalizedDiff * delta * 10;
    }
  });
  
  return (
    <group ref={group} position={position}>
      {/* Body */}
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[0.5, 1.5, 0.25]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.75, 0]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#ffdbac" />
      </mesh>

      {/* Left Arm */}
      <mesh position={[-0.4, 0.75, 0]}>
        <boxGeometry args={[0.25, 1.5, 0.25]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>

      {/* Right Arm */}
      <mesh position={[0.4, 0.75, 0]}>
        <boxGeometry args={[0.25, 1.5, 0.25]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>

      {/* Left Leg */}
      <mesh ref={leftLeg} position={[-0.2, -0.5, 0]}>
        <boxGeometry args={[0.25, 1, 0.25]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Right Leg */}
      <mesh ref={rightLeg} position={[0.2, -0.5, 0]}>
        <boxGeometry args={[0.25, 1, 0.25]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  );
} 