import { useFrame } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import { Vector3, Euler, Matrix4, Quaternion } from 'three';
import { useGameStore } from '../store/gameStore';
import { RigidBody } from '@react-three/rapier';
import { Character } from './Character';
import * as THREE from 'three';

const MOVEMENT_SPEED = 8; // Base walking speed
const RUNNING_SPEED = 12; // Running speed (1.5x base)
const SPRINTING_SPEED = 16; // Sprinting speed (2x base)
const ACCELERATION = 30; // How quickly to reach target speed
const DECELERATION = 20; // How quickly to slow down
const MOUSE_SENSITIVITY = 0.002;
const JUMP_FORCE = 4;
const TURN_SPEED = 8; // Speed of turning
const TURN_ACCELERATION = 15; // How quickly to change direction

// Physics constants
const GRAVITY = 9.81; // Acceleration due to gravity (m/s²)
const TERMINAL_VELOCITY = 53; // Terminal velocity in m/s (roughly 120mph)
const AIR_CONTROL = 0.08; // Realistic air control (about 8% of vertical speed)

// Wind physics
const WIND_DIRECTION = new Vector3(-1, 0, 1).normalize(); // NE to SW direction
const WIND_STRENGTH = 1; // Wind speed in m/s (about 0.45mph)

// World boundaries
const WORLD_HEIGHT = 100;
const WORLD_BOTTOM = 0;
const PLATFORM_HEIGHT = 50;
const WORLD_OFFSET = 100; // Distance between mirrored elements

// Camera constants
const CAMERA_DISTANCE = 12;
const CAMERA_HEIGHT = 2;

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

// Constants
const ENDLESS_FALL_TIME = 30; // Time in seconds before showing endless fall dialog

export function Player() {
  const rigidBodyRef = useRef<any>(null);
  const velocity = useRef(new Vector3());
  const verticalVelocity = useRef(0);
  const cameraRotation = useRef(new Euler(0, 0, 0));
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const prevVelocity = useRef<number>(0);
  const canJump = useRef(true);
  const { 
    position, 
    setPosition, 
    takeDamage, 
    isGameComplete,
    setFallTime,
    setEndlessFall,
    isEndlessFall,
    health
  } = useGameStore();
  const hasLegsEnabled = useGameStore((state) => state.hasLegsEnabled);
  
  const currentVelocity = useRef(new Vector3());
  const cameraQuaternion = useRef(new Quaternion());
  const movementQuaternion = useRef(new Quaternion());
  const cameraPosition = useRef(new Vector3());
  const targetPosition = useRef(new Vector3(0, PLATFORM_HEIGHT + 2, 0));
  const targetVelocity = useRef(new Vector3());

  // Camera state
  const cameraAngleHorizontal = useRef(0);
  const cameraAngleVertical = useRef(0);

  const fallTimeRef = useRef(0);

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
      if (document.pointerLockElement === document.body && !isGameComplete && health > 0) {
        // Update camera angles
        cameraAngleHorizontal.current += e.movementX * MOUSE_SENSITIVITY;
        // Start at π/2 (behind character) and constrain between 15 and 180 degrees
        cameraAngleVertical.current = Math.max(
          0.26, // 15 degrees
          Math.min(Math.PI, // 180 degrees
            cameraAngleVertical.current - e.movementY * MOUSE_SENSITIVITY // Invert Y movement
          )
        );

        // Update movement quaternion based on horizontal rotation only
        movementQuaternion.current.setFromEuler(new Euler(0, cameraAngleHorizontal.current, 0, 'YXZ'));
      }
    };

    const handleClick = () => {
      if (!isGameComplete && health > 0 && document.pointerLockElement !== document.body) {
        document.body.requestPointerLock();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.body.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.body.removeEventListener('click', handleClick);
    };
  }, [isGameComplete, health]);
  
  // Release cursor when game is complete or health is 0
  useEffect(() => {
    if ((isGameComplete || health === 0) && document.pointerLockElement === document.body) {
      document.exitPointerLock();
    }
  }, [isGameComplete, health]);
  
  // Initialize camera angle to be behind character
  useEffect(() => {
    cameraAngleVertical.current = Math.PI / 2; // 90 degrees - directly behind
  }, []);
  
  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return;

    const worldPosition = rigidBodyRef.current.translation();
    const currentVel = rigidBodyRef.current.linvel();
    
    currentVelocity.current.set(currentVel.x, currentVel.y, currentVel.z);

    // Reset jump when grounded (using a stricter threshold)
    const isGrounded = Math.abs(currentVel.y) < 0.05;
    if (isGrounded) {
      canJump.current = true;
      verticalVelocity.current = 0;
      // Reset fall time when grounded
      fallTimeRef.current = 0;
      setFallTime(0);
      if (isEndlessFall) {
        setEndlessFall(false);
      }
    } else {
      // Update fall time when in air
      fallTimeRef.current += delta;
      setFallTime(fallTimeRef.current);
      
      // Check for endless fall
      if (fallTimeRef.current >= ENDLESS_FALL_TIME && !isEndlessFall) {
        setEndlessFall(true);
      }
    }

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
      // Preserve horizontal velocity but maintain vertical velocity for continuous acceleration
      rigidBodyRef.current.setLinvel({ 
        x: currentVel.x, 
        y: verticalVelocity.current, 
        z: currentVel.z 
      }, true);
    }

    // Start with current velocity instead of resetting to zero
    velocity.current.copy(currentVelocity.current);

    // Apply gravity when in air
    if (!isGrounded) {
      // Apply gravity
      verticalVelocity.current = Math.max(
        -TERMINAL_VELOCITY,
        verticalVelocity.current - GRAVITY * delta
      );

      // Apply wind - constant force in wind direction
      const windVelocity = WIND_DIRECTION.clone().multiplyScalar(WIND_STRENGTH * delta);
      velocity.current.add(windVelocity);
    }

    // Calculate air control factor - scales with vertical speed
    const verticalSpeed = Math.abs(currentVel.y);
    const airControlFactor = isGrounded ? 1 : (AIR_CONTROL * (verticalSpeed / TERMINAL_VELOCITY));

    // Movement
    if (!isGameComplete) {
      // Calculate target movement direction
      const moveDirection = new Vector3(0, 0, 0);
      
      // Handle jumping - only when grounded and legs aren't broken
      if (keysPressed.current['Space'] && canJump.current && isGrounded && hasLegsEnabled) {
        verticalVelocity.current = JUMP_FORCE;
        velocity.current.y = JUMP_FORCE;
        canJump.current = false;
      }

      // Only allow movement if legs are enabled
      if (hasLegsEnabled) {
        if (keysPressed.current['KeyW']) moveDirection.z -= 1;
        if (keysPressed.current['KeyS']) moveDirection.z += 1;
        if (keysPressed.current['KeyD']) moveDirection.x += 1;
        if (keysPressed.current['KeyA']) moveDirection.x -= 1;
      }
      
      if (moveDirection.lengthSq() > 0) {
        moveDirection.normalize();
        moveDirection.applyQuaternion(movementQuaternion.current);
        moveDirection.y = 0;
        
        // Determine target speed
        let currentSpeed = MOVEMENT_SPEED;
        if (keysPressed.current['ShiftLeft']) {
          currentSpeed = RUNNING_SPEED;
        } else if (keysPressed.current['ControlLeft']) {
          currentSpeed = SPRINTING_SPEED;
        }
        
        // Set target velocity
        targetVelocity.current.copy(moveDirection).multiplyScalar(currentSpeed);
      } else {
        // No input, so target zero velocity
        targetVelocity.current.set(0, 0, 0);
      }

      // Smoothly interpolate current velocity towards target
      if (isGrounded) {
        const acceleration = moveDirection.lengthSq() > 0 ? ACCELERATION : DECELERATION;
        velocity.current.x = THREE.MathUtils.lerp(
          velocity.current.x,
          targetVelocity.current.x,
          1 - Math.exp(-acceleration * delta)
        );
        velocity.current.z = THREE.MathUtils.lerp(
          velocity.current.z,
          targetVelocity.current.z,
          1 - Math.exp(-acceleration * delta)
        );
      } else {
        // In air, add to existing velocity with air control
        const airVelocity = targetVelocity.current.clone().multiplyScalar(airControlFactor * delta);
        velocity.current.x += airVelocity.x;
        velocity.current.z += airVelocity.z;
        
        // Clamp horizontal velocity
        const horizontalVel = new Vector3(velocity.current.x, 0, velocity.current.z);
        const currentSpeed = keysPressed.current['ShiftLeft'] ? RUNNING_SPEED :
                           keysPressed.current['ControlLeft'] ? SPRINTING_SPEED :
                           MOVEMENT_SPEED;
        if (horizontalVel.length() > currentSpeed) {
          horizontalVel.normalize().multiplyScalar(currentSpeed);
          velocity.current.x = horizontalVel.x;
          velocity.current.z = horizontalVel.z;
        }
      }

      // Always preserve vertical velocity
      velocity.current.y = verticalVelocity.current;
      
      // Apply final velocity
      rigidBodyRef.current.setLinvel({ 
        x: velocity.current.x, 
        y: velocity.current.y, 
        z: velocity.current.z 
      }, true);
    }

    // Update target position for smooth camera follow
    targetPosition.current.set(worldPosition.x, worldPosition.y, worldPosition.z);
    
    // Smoothly update camera position without physics influence
    const cameraSpeed = isGrounded ? 0.15 : 0.05; // Slower follow when in air for stability
    cameraPosition.current.lerp(targetPosition.current, cameraSpeed);

    // Update camera position using spherical coordinates
    const theta = cameraAngleHorizontal.current;
    const phi = cameraAngleVertical.current;
    
    // Calculate camera position relative to player
    cameraPosition.current.set(
      CAMERA_DISTANCE * Math.sin(phi) * Math.sin(theta),
      CAMERA_DISTANCE * Math.cos(phi) + CAMERA_HEIGHT,
      CAMERA_DISTANCE * Math.sin(phi) * Math.cos(theta)
    );

    // Add player position to get world space camera position
    cameraPosition.current.add(new Vector3(worldPosition.x, worldPosition.y, worldPosition.z));

    // Update camera
    state.camera.position.copy(cameraPosition.current);
    state.camera.lookAt(worldPosition.x, worldPosition.y + 1, worldPosition.z);

    // Update position in store
    setPosition([worldPosition.x, worldPosition.y, worldPosition.z]);
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
        friction={1.5}
        restitution={0}
        linearDamping={0.8}
        angularDamping={0.5}
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