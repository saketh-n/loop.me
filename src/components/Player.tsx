import { useFrame } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import { Vector3, Euler, Matrix4 } from 'three';
import { useGameStore } from '../store/gameStore';
import { RigidBody, CuboidCollider } from '@react-three/rapier';

const MOVEMENT_SPEED = 8; // Increased speed for better responsiveness
const MOUSE_SENSITIVITY = 0.002; // New sensitivity constant for mouse movement
const JUMP_FORCE = 10; // New constant for jump strength
const VELOCITY_EPSILON = 0.1; // Threshold to consider velocity as "zero"

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
        // Update rotations without any bounds
        cameraRotation.current.y -= e.movementX * MOUSE_SENSITIVITY;
        cameraRotation.current.x -= e.movementY * MOUSE_SENSITIVITY;
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
      playDamageSound();
    }
    prevVelocity.current = currentVerticalVel;

    // Handle jumping
    if (!isGameComplete && keysPressed.current['Space'] && Math.abs(currentVerticalVel) < VELOCITY_EPSILON) {
      rigidBodyRef.current.setLinvel({ 
        x: currentVel.x, 
        y: JUMP_FORCE, 
        z: currentVel.z 
      }, true);
      keysPressed.current['Space'] = false; // Prevent holding space
    }

    // Simple world loop
    if (worldPosition.y <= WORLD_BOTTOM) {
      rigidBodyRef.current.setTranslation(
        { x: worldPosition.x, y: WORLD_HEIGHT, z: worldPosition.z },
        true
      );
      // Maintain velocity through the teleport
      rigidBodyRef.current.setLinvel(currentVel, true);
    }

    // Only allow movement if game is not complete
    if (!isGameComplete) {
      // Calculate movement direction
      velocity.current.set(0, 0, 0);

      if (keysPressed.current['KeyW']) {
        velocity.current.x += Math.sin(cameraRotation.current.y);
        velocity.current.z += Math.cos(cameraRotation.current.y);
      }
      if (keysPressed.current['KeyS']) {
        velocity.current.x -= Math.sin(cameraRotation.current.y);
        velocity.current.z -= Math.cos(cameraRotation.current.y);
      }
      if (keysPressed.current['KeyA']) {
        velocity.current.x += Math.cos(cameraRotation.current.y);
        velocity.current.z -= Math.sin(cameraRotation.current.y);
      }
      if (keysPressed.current['KeyD']) {
        velocity.current.x -= Math.cos(cameraRotation.current.y);
        velocity.current.z += Math.sin(cameraRotation.current.y);
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

    // Create rotation matrix for full 360° rotation
    const rotationMatrix = new Matrix4();
    rotationMatrix.makeRotationY(cameraRotation.current.y);
    rotationMatrix.multiply(new Matrix4().makeRotationX(cameraRotation.current.x));

    // Calculate camera offset
    const cameraOffset = new Vector3(0, 0, 8); // Start with camera behind player
    cameraOffset.applyMatrix4(rotationMatrix); // Apply full rotation

    // Set camera position
    state.camera.position.x = worldPosition.x + cameraOffset.x;
    state.camera.position.y = worldPosition.y + cameraOffset.y;
    state.camera.position.z = worldPosition.z + cameraOffset.z;

    // Make camera look at player
    state.camera.lookAt(worldPosition.x, worldPosition.y, worldPosition.z);
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