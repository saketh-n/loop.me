import { useFrame } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import { Vector3, Euler } from 'three';
import { useGameStore } from '../store/gameStore';
import { RigidBody, CuboidCollider } from '@react-three/rapier';

const MOVEMENT_SPEED = 8; // Increased speed for better responsiveness
const CAMERA_ROTATION_SPEED = 0.03;
const MAX_VERTICAL_ROTATION = Math.PI * 0.45; // Increased to ~81 degrees

// World boundaries
const WORLD_HEIGHT = 100;
const WORLD_BOTTOM = 0;
const PLATFORM_HEIGHT = 50;
const WORLD_OFFSET = 100; // Distance between mirrored elements

export function Player() {
  const rigidBodyRef = useRef<any>(null);
  const velocity = useRef(new Vector3());
  const cameraRotation = useRef(new Euler(0, 0, 0));
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const prevVelocity = useRef<number>(0);
  const { position, setPosition, takeDamage, isGameComplete } = useGameStore();
  
  // Set up keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return;

    const worldPosition = rigidBodyRef.current.translation();
    const currentVel = rigidBodyRef.current.linvel();

    // Check for sudden velocity changes (impacts)
    const currentVerticalVel = currentVel.y;
    if (!isGameComplete && prevVelocity.current < -10 && Math.abs(currentVerticalVel) < 1) {
      // We had a high negative velocity that suddenly became ~0
      // This means we hit something! Calculate damage based on previous velocity
      const impactVelocity = Math.abs(prevVelocity.current);
      const damage = Math.floor(impactVelocity * 2);
      takeDamage(damage);
    }
    prevVelocity.current = currentVerticalVel;

    // Simple world loop
    if (worldPosition.y <= WORLD_BOTTOM) {
      rigidBodyRef.current.setTranslation(
        { x: worldPosition.x, y: WORLD_HEIGHT, z: worldPosition.z },
        true
      );
      // Maintain velocity through the teleport
      rigidBodyRef.current.setLinvel(currentVel, true);
    }

    // Get current rotation for movement direction
    const rotation = cameraRotation.current.y;

    // Camera rotation keys (Arrow keys)
    const isLeftPressed = keysPressed.current['ArrowLeft'];
    const isRightPressed = keysPressed.current['ArrowRight'];
    const isUpPressed = keysPressed.current['ArrowUp'];
    const isDownPressed = keysPressed.current['ArrowDown'];

    // Update camera rotation with increased limits
    if (isLeftPressed) cameraRotation.current.y += CAMERA_ROTATION_SPEED;
    if (isRightPressed) cameraRotation.current.y -= CAMERA_ROTATION_SPEED;
    if (isUpPressed) cameraRotation.current.x = Math.max(cameraRotation.current.x - CAMERA_ROTATION_SPEED, -MAX_VERTICAL_ROTATION);
    if (isDownPressed) cameraRotation.current.x = Math.min(cameraRotation.current.x + CAMERA_ROTATION_SPEED, MAX_VERTICAL_ROTATION);

    // Only allow movement if game is not complete
    if (!isGameComplete) {
      // Calculate movement direction
      velocity.current.set(0, 0, 0);

      if (keysPressed.current['KeyW']) {
        velocity.current.x += Math.sin(rotation);
        velocity.current.z += Math.cos(rotation);
      }
      if (keysPressed.current['KeyS']) {
        velocity.current.x -= Math.sin(rotation);
        velocity.current.z -= Math.cos(rotation);
      }
      if (keysPressed.current['KeyA']) {
        velocity.current.x += Math.cos(rotation);
        velocity.current.z -= Math.sin(rotation);
      }
      if (keysPressed.current['KeyD']) {
        velocity.current.x -= Math.cos(rotation);
        velocity.current.z += Math.sin(rotation);
      }

      // Apply movement
      if (velocity.current.length() > 0) {
        velocity.current.normalize().multiplyScalar(MOVEMENT_SPEED);
        const currentVel = rigidBodyRef.current.linvel();
        rigidBodyRef.current.setLinvel({ 
          x: velocity.current.x, 
          y: currentVel.y, 
          z: velocity.current.z 
        }, true);
      } else {
        // Apply friction when no keys are pressed
        const currentVel = rigidBodyRef.current.linvel();
        rigidBodyRef.current.setLinvel({ 
          x: 0, 
          y: currentVel.y, 
          z: 0 
        }, true);
      }
    }

    // Update position in store
    setPosition([worldPosition.x, worldPosition.y, worldPosition.z]);

    // Update camera position with dynamic adjustments
    const verticalRotation = cameraRotation.current.x;
    
    // Adjust camera distance and height based on vertical rotation
    const baseDistance = 8;
    const baseHeight = 5;
    
    // Dynamic camera adjustments
    const rotationFactor = Math.abs(verticalRotation) / MAX_VERTICAL_ROTATION;
    const cameraDistance = baseDistance * (1 + rotationFactor * 0.5); // Increase distance when looking up/down
    const cameraHeight = baseHeight * (1 - rotationFactor * 0.5); // Decrease height when looking up/down

    let adjustedY = worldPosition.y;
    
    // Adjust camera when near world boundaries
    if (worldPosition.y <= WORLD_BOTTOM + 10) {
      const blend = (worldPosition.y - WORLD_BOTTOM) / 10;
      adjustedY = blend * worldPosition.y + (1 - blend) * (WORLD_HEIGHT - 10);
    } else if (worldPosition.y >= WORLD_HEIGHT - 10) {
      const blend = (WORLD_HEIGHT - worldPosition.y) / 10;
      adjustedY = blend * worldPosition.y + (1 - blend) * (WORLD_BOTTOM + 10);
    }

    // Update camera position with dynamic adjustments
    state.camera.position.x = worldPosition.x - Math.sin(rotation) * cameraDistance;
    state.camera.position.y = adjustedY + cameraHeight + Math.sin(verticalRotation) * cameraDistance * 1.5;
    state.camera.position.z = worldPosition.z - Math.cos(rotation) * cameraDistance;
    
    // Adjust lookAt target based on vertical rotation
    const lookAtHeight = verticalRotation < 0 ? 2 : 0; // Look higher when looking up
    state.camera.lookAt(worldPosition.x, worldPosition.y + lookAtHeight, worldPosition.z);
  });

  return (
    <>
      {/* Main Player Cube */}
      <RigidBody 
        ref={rigidBodyRef}
        position={[0, PLATFORM_HEIGHT + 1, 0]}
        colliders="cuboid"
        mass={1}
        lockRotations
        friction={0}
        enabledRotations={[false, false, false]}
        ccd={true}
      >
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="red" />
        </mesh>
      </RigidBody>

      {/* Mirror Cube Above */}
      <mesh position={[
        position[0],
        position[1] <= WORLD_BOTTOM + 10 
          ? position[1] + WORLD_OFFSET - 10 
          : position[1] + WORLD_OFFSET,
        position[2]
      ]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="red" />
      </mesh>

      {/* Mirror Cube Below */}
      <mesh position={[
        position[0],
        position[1] >= WORLD_HEIGHT - 10 
          ? position[1] - WORLD_OFFSET + 10 
          : position[1] - WORLD_OFFSET,
        position[2]
      ]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="red" />
      </mesh>
    </>
  );
} 