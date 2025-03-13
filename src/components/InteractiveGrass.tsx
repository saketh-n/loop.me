import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, InstancedMesh, Object3D, MeshStandardMaterial, BufferGeometry, BufferAttribute, DoubleSide } from 'three';
import { useGameStore } from '../store/gameStore';

interface InteractiveGrassProps {
  count?: number;
  bounds?: [number, number];
  height?: number;
  position: [number, number, number];
}

export function InteractiveGrass({ 
  count = 1000, 
  bounds = [10, 10],
  height = 0.5,
  position 
}: InteractiveGrassProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const grassMaterial = useRef<MeshStandardMaterial>(null);
  const playerPosition = useGameStore((state) => state.position);
  const dummy = useMemo(() => new Object3D(), []);
  const originalPositions = useRef<Vector3[]>([]);
  const timeOffsets = useRef<number[]>([]);

  // Create grass blade geometry
  const geometry = useMemo(() => {
    const geo = new BufferGeometry();
    const thickness = 0.01; // Thickness of the grass blade
    
    // Define vertices for a 3D grass blade
    const vertices = new Float32Array([
      // Front face
      -0.05, 0, thickness/2,     // base left
      0.05, 0, thickness/2,      // base right
      -0.02, height, thickness/2, // top left
      0.02, height, thickness/2,  // top right

      // Back face
      -0.05, 0, -thickness/2,     // base left
      0.05, 0, -thickness/2,      // base right
      -0.02, height, -thickness/2, // top left
      0.02, height, -thickness/2,  // top right

      // Side faces vertices
      -0.05, 0, -thickness/2,      // left side
      -0.05, 0, thickness/2,
      -0.02, height, -thickness/2,
      -0.02, height, thickness/2,

      0.05, 0, -thickness/2,      // right side
      0.05, 0, thickness/2,
      0.02, height, -thickness/2,
      0.02, height, thickness/2
    ]);
    
    const indices = new Uint16Array([
      // Front face
      0, 1, 2,
      1, 3, 2,
      // Back face
      5, 4, 6,
      5, 6, 7,
      // Left side
      8, 9, 10,
      9, 11, 10,
      // Right side
      12, 13, 14,
      13, 15, 14
    ]);

    // UV coordinates for all faces
    const uvs = new Float32Array([
      // Front face
      0, 0,
      1, 0,
      0, 1,
      1, 1,
      // Back face
      0, 0,
      1, 0,
      0, 1,
      1, 1,
      // Left side
      0, 0,
      1, 0,
      0, 1,
      1, 1,
      // Right side
      0, 0,
      1, 0,
      0, 1,
      1, 1
    ]);

    // Calculate normals for proper lighting
    const normals = new Float32Array([
      // Front face normals
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,
      // Back face normals
      0, 0, -1,
      0, 0, -1,
      0, 0, -1,
      0, 0, -1,
      // Left side normals
      -1, 0, 0,
      -1, 0, 0,
      -1, 0, 0,
      -1, 0, 0,
      // Right side normals
      1, 0, 0,
      1, 0, 0,
      1, 0, 0,
      1, 0, 0
    ]);

    geo.setAttribute('position', new BufferAttribute(vertices, 3));
    geo.setAttribute('normal', new BufferAttribute(normals, 3));
    geo.setAttribute('uv', new BufferAttribute(uvs, 2));
    geo.setIndex(new BufferAttribute(indices, 1));
    
    return geo;
  }, [height]);

  // Initialize grass positions with random rotations
  useMemo(() => {
    console.log('Bounds:', bounds);
    for (let i = 0; i < count; i++) {
      // Calculate position within the bounds
      const x = (Math.random() - 0.5) * bounds[0];
      const z = (Math.random() - 0.5) * bounds[1];
      
      // Store the original position
      originalPositions.current.push(new Vector3(x, 0, z));
      timeOffsets.current.push(Math.random() * Math.PI * 2);
    }
  }, [count, bounds]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();
    const [px, py, pz] = playerPosition;
    const playerPos = new Vector3(px, py, pz);

    // Update each grass blade
    for (let i = 0; i < count; i++) {
      const originalPos = originalPositions.current[i];
      dummy.position.copy(originalPos);
      dummy.position.add(new Vector3(position[0], position[1], position[2]));

      // Add random initial rotation around Y axis for variety
      dummy.rotation.y = timeOffsets.current[i];

      // Calculate distance to player
      const distanceToPlayer = dummy.position.distanceTo(playerPos);
      const influence = Math.max(0, 1 - distanceToPlayer / 2); // 2-unit radius of influence

      // Wind movement
      const windAngle = Math.sin(time + timeOffsets.current[i]) * 0.1;
      
      // Combine wind and player influence
      if (influence > 0) {
        const directionToPlayer = dummy.position.clone().sub(playerPos).normalize();
        const playerBend = influence * 0.5;
        dummy.rotation.x = playerBend * directionToPlayer.z;
        dummy.rotation.z = -playerBend * directionToPlayer.x;
      } else {
        dummy.rotation.x = Math.sin(time + timeOffsets.current[i]) * 0.1;
        dummy.rotation.z = Math.cos(time + timeOffsets.current[i]) * 0.1;
      }

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, null!, count]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        ref={grassMaterial}
        color="#4a8505"
        roughness={0.8}
        metalness={0}
        side={DoubleSide}
        transparent={true}
        alphaTest={0.5}
      />
    </instancedMesh>
  );
} 