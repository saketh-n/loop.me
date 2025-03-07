import { useFrame } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import { Vector3, Euler, Matrix4, Quaternion } from 'three';
import { useGameStore } from '../store/gameStore';
import { RigidBody } from '@react-three/rapier';
import { Character } from './Character';

const MOVEMENT_SPEED = 8; // Increased speed for better responsiveness
const MOUSE_SENSITIVITY = 0.002; // New sensitivity constant for mouse movement

// World boundaries
const WORLD_HEIGHT = 100;
const WORLD_BOTTOM = 0;
const PLATFORM_HEIGHT = 50;
const WORLD_OFFSET = 100; // Distance between mirrored elements

// Create audio element for damage sound
let damageSound: HTMLAudioElement;

const playDamageSound = () => {
  if (!damageSound) {
    damageSound = new Audio('/assets/minecraft-oof.mp3');
    damageSound.volume = 0.3; // Set volume to 30%
  }
  // Reset and play the sound
  damageSound.currentTime = 0;
  damageSound.play().catch(console.error); // Catch any autoplay issues
};

export function Player() {
  const rigidBodyRef = useRef<any>(null);
  const velocity = useRef(new Vector3());
  const cameraRotation = useRef(new Euler(0, 0, 0));
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const prevVelocity = useRef<number>(0);
  const { position, setPosition, takeDamage, isGameComplete } = useGameStore();
  
  // Add currentVelocity ref to track actual movement
  const currentVelocity = useRef(new Vector3());
  const quaternion = useRef(new Quaternion());

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
  
  // Set up mouse controls for camera
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === document.body) {
        // Update horizontal rotation normally
        cameraRotation.current.y += e.movementX * MOUSE_SENSITIVITY;
        
        // Clamp vertical rotation to ±75 degrees (±1.309 radians)
        const newXRotation = cameraRotation.current.x + e.movementY * MOUSE_SENSITIVITY;
        cameraRotation.current.x = Math.max(Math.min(newXRotation, 1.309), -1.309);

        // Update quaternion
        quaternion.current.setFromEuler(new Euler(cameraRotation.current.x, cameraRotation.current.y, 0, 'YXZ'));
      }
    };

    const handleClick = () => {
      if (document.pointerLockElement !== document.body) {
        document.body.requestPointerLock();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.body.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.body.removeEventListener('click', handleClick);
    };
  }, []);
  
  // Release cursor when game is complete
  useEffect(() => {
    if (isGameComplete && document.pointerLockElement === document.body) {
      document.exitPointerLock();
    }
  }, [isGameComplete]);
  
  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return;

    const worldPosition = rigidBodyRef.current.translation();
    const currentVel = rigidBodyRef.current.linvel();
    
    currentVelocity.current.set(currentVel.x, currentVel.y, currentVel.z);

    // Impact detection
    const currentVerticalVel = currentVel.y;
    if (!isGameComplete && prevVelocity.current < -10 && Math.abs(currentVerticalVel) < 1) {
      const impactVelocity = Math.abs(prevVelocity.current);
      const damage = Math.floor(impactVelocity * 2);
      takeDamage(damage);
      playDamageSound();
    }
    prevVelocity.current = currentVerticalVel;

    // World loop
    if (worldPosition.y <= WORLD_BOTTOM) {
      rigidBodyRef.current.setTranslation(
        { x: worldPosition.x, y: WORLD_HEIGHT, z: worldPosition.z },
        true
      );
      rigidBodyRef.current.setLinvel(currentVel, true);
    }

    // Movement
    if (!isGameComplete) {
      velocity.current.set(0, 0, 0);

      // Create movement vectors
      const forward = new Vector3(0, 0, -1);
      const right = new Vector3(1, 0, 0);

      // Apply quaternion rotation to movement vectors
      if (keysPressed.current['KeyW']) {
        forward.applyQuaternion(quaternion.current);
        forward.y = 0; // Keep movement horizontal
        forward.normalize();
        velocity.current.add(forward);
      }
      if (keysPressed.current['KeyS']) {
        forward.applyQuaternion(quaternion.current);
        forward.y = 0;
        forward.normalize();
        velocity.current.sub(forward);
      }
      if (keysPressed.current['KeyD']) {
        right.applyQuaternion(quaternion.current);
        right.y = 0;
        right.normalize();
        velocity.current.add(right);
      }
      if (keysPressed.current['KeyA']) {
        right.applyQuaternion(quaternion.current);
        right.y = 0;
        right.normalize();
        velocity.current.sub(right);
      }

      // Apply movement
      if (velocity.current.length() > 0) {
        velocity.current.normalize().multiplyScalar(MOVEMENT_SPEED);
        rigidBodyRef.current.setLinvel({ 
          x: velocity.current.x, 
          y: currentVel.y, 
          z: velocity.current.z 
        }, true);
      } else {
        rigidBodyRef.current.setLinvel({ 
          x: 0, 
          y: currentVel.y, 
          z: 0 
        }, true);
      }
    }

    // Update position in store
    setPosition([worldPosition.x, worldPosition.y, worldPosition.z]);

    // Camera update using quaternion
    const cameraOffset = new Vector3(0, 2, 12);
    cameraOffset.applyQuaternion(quaternion.current);

    state.camera.position.x = worldPosition.x + cameraOffset.x;
    state.camera.position.y = worldPosition.y + cameraOffset.y;
    state.camera.position.z = worldPosition.z + cameraOffset.z;

    state.camera.lookAt(worldPosition.x, worldPosition.y + 1, worldPosition.z);
  });

  return (
    <>
      {/* Main Player Character */}
      <RigidBody 
        ref={rigidBodyRef}
        position={[0, PLATFORM_HEIGHT + 2, 0]}
        colliders="cuboid"
        mass={1}
        lockRotations
        friction={0}
        enabledRotations={[false, false, false]}
        ccd={true}
      >
        <Character position={[0, 0, 0]} velocity={currentVelocity.current} />
      </RigidBody>

      {/* Mirror Character Above */}
      <group position={[
        position[0],
        position[1] <= WORLD_BOTTOM + 10 
          ? position[1] + WORLD_OFFSET - 10 
          : position[1] + WORLD_OFFSET,
        position[2]
      ]}>
        <Character position={[0, 0, 0]} velocity={currentVelocity.current} />
      </group>

      {/* Mirror Character Below */}
      <group position={[
        position[0],
        position[1] >= WORLD_HEIGHT - 10 
          ? position[1] - WORLD_OFFSET + 10 
          : position[1] - WORLD_OFFSET,
        position[2]
      ]}>
        <Character position={[0, 0, 0]} velocity={currentVelocity.current} />
      </group>
    </>
  );
} 