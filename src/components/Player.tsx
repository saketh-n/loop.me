import { useFrame } from '@react-three/fiber';
import { useRef, useEffect, useMemo, useCallback } from 'react';
import { Vector3, Euler, Matrix4, Quaternion } from 'three';
import { useGameStore } from '../store/gameStore';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import type { RigidBody as RigidBodyType } from '@dimforge/rapier3d-compat';
import type { CollisionEnterPayload, CollisionExitPayload } from '@react-three/rapier';
import { Character } from './Character';
import * as THREE from 'three';

const MOVEMENT_SPEED = 8; // Base walking speed
const RUNNING_SPEED = 12; // Running speed (1.5x base)
const SPRINTING_SPEED = 16; // Sprinting speed (2x base)
const ACCELERATION = 30; // How quickly to reach target speed
const DECELERATION = 20; // How quickly to slow down
const MOUSE_SENSITIVITY = 0.002;
const JUMP_FORCE = 4; // Reduced from 12 to 4 for more reasonable jumps
const TURN_SPEED = 8; // Speed of turning
const TURN_ACCELERATION = 15; // How quickly to change direction

// Physics constants
const GRAVITY = 25;
const TERMINAL_VELOCITY = -55;
const AIR_CONTROL = 0.2; // Reduced from 0.6 to 0.2 for less air control
const GROUND_FRICTION = 1.5;
const LINEAR_DAMPING = 0.8;

// Safe fall height threshold
const SAFE_FALL_VELOCITY = -15.8; // Velocity from falling 5 units with gravity of 25

// Wind physics
const WIND_DIRECTION = [0, 0, 0]; // NE to SW direction
const WIND_STRENGTH = 0; // Wind speed in m/s (about 0.45mph)
const WIND_GUST_STRENGTH = 0;

// World boundaries
const WORLD_HEIGHT = 100;
const WORLD_BOTTOM = 0;
const PLATFORM_HEIGHT = 50;
const WORLD_OFFSET = 100; // Distance between mirrored elements

// Camera constants
const CAMERA_DISTANCE = 12;
const CAMERA_HEIGHT = 2;

// Game constants
const ENDLESS_FALL_TIME = 20; // Time in seconds before showing endless fall dialog

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

// Add water physics constants
const WATER_RESISTANCE = 0.85; // Stronger resistance in water (was 0.92)
const WATER_MOVEMENT_FACTOR = 0.25; // Reduced movement speed in water (was 0.4)
const WATER_JUMP_FORCE_MULTIPLIER = 1.0; // Normal jump force in water
const WATER_CURRENT_SPEED = 3.0; // Speed of water current
const WATER_CURRENT_DIRECTION = new Vector3(1, 0, 0); // Current flows in +X direction

export function Player() {
  const rigidBodyRef = useRef<RigidBodyType>(null);
  const velocity = useRef(new Vector3());
  const verticalVelocity = useRef(0);
  const cameraRotation = useRef(new Euler(0, 0, 0));
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const prevVelocity = useRef<number>(0);
  const canJump = useRef(true);
  const lastGroundedTime = useRef(0);
  const { 
    position, 
    setPosition, 
    takeDamage, 
    isGameComplete,
    setFallTime,
    setEndlessFall,
    isEndlessFall,
    health,
    hasLegsEnabled,
    isGameFailed,
    levelConfig
  } = useGameStore();
  
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

  const time = useRef(0);

  // Wind settings from level config
  const windEnabled = levelConfig.wind.enabled;
  const windStrength = windEnabled && levelConfig.wind.strength ? levelConfig.wind.strength : 0;
  const windDirection = windEnabled && levelConfig.wind.direction ? levelConfig.wind.direction : new Vector3();
  const windGustStrength = windEnabled && levelConfig.wind.gustStrength ? levelConfig.wind.gustStrength : 0;

  // Get initial spawn position
  const spawnPosition = useMemo(() => {
    const offset = levelConfig.spawnOffset || [0, 0];
    return new Vector3(offset[0], levelConfig.spawnHeight + 2, offset[1]);
  }, [levelConfig]);

  // Check if player is in water (Level 4)
  const isInWater = useCallback((position: Vector3) => {
    if (levelConfig.id === 4) {
      const waterHeight = levelConfig.spawnHeight + 1.2; // Water is at 1.2 units above platform
      return position.y < waterHeight;
    }
    return false;
  }, [levelConfig]);

  const isInWaterSensor = useRef(false);

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
      if (document.pointerLockElement === document.body && health > 0) {
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
      if (health > 0 && document.pointerLockElement !== document.body) {
        document.body.requestPointerLock();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.body.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.body.removeEventListener('click', handleClick);
    };
  }, [health]);
  
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
  
  const handleCollisionEnter = useCallback((payload: CollisionEnterPayload) => {
    if (payload.other.collider.isSensor) {
      isInWaterSensor.current = true;
    }
  }, []);

  const handleCollisionExit = useCallback((payload: CollisionExitPayload) => {
    if (payload.other.collider.isSensor) {
      isInWaterSensor.current = false;
    }
  }, []);

  // Add collision event handlers
  useEffect(() => {
    if (!rigidBodyRef.current) return;

    // Lock rotations
    rigidBodyRef.current.setEnabled(true);
    rigidBodyRef.current.setEnabledRotations(false, false, false, true);
  }, []);
  
  useFrame((state, delta) => {
    if (health <= 0) return;  // Only check for health, remove isGameFailed check

    if (!rigidBodyRef.current) return;

    const worldPosition = rigidBodyRef.current.translation();
    const currentVel = rigidBodyRef.current.linvel();
    
    currentVelocity.current.set(currentVel.x, currentVel.y, currentVel.z);

    // Check if in water using sensor
    const playerInWater = isInWaterSensor.current;

    // Apply water current in Level 4
    if (playerInWater && levelConfig.id === 4) {
      const currentForce = WATER_CURRENT_DIRECTION.clone().multiplyScalar(WATER_CURRENT_SPEED * delta);
      currentVelocity.current.add(currentForce);
    }

    // Reset jump when grounded (using a stricter threshold)
    const isGrounded = Math.abs(currentVel.y) < 0.05;
    if (isGrounded) {
      canJump.current = true;
      verticalVelocity.current = 0;
      lastGroundedTime.current = state.clock.elapsedTime;
      // Reset fall time when grounded
      fallTimeRef.current = 0;
      setFallTime(0);
      if (isEndlessFall) {
        setEndlessFall(false);
      }

      // Impact detection (only when not in water and falling faster than safe velocity)
      if (!playerInWater && !isGameComplete && prevVelocity.current < SAFE_FALL_VELOCITY) {
        const impactVelocity = Math.abs(prevVelocity.current);
        const damage = Math.floor((impactVelocity - Math.abs(SAFE_FALL_VELOCITY)) * 2);
        if (damage > 0) {
          takeDamage(damage);
          playDamageSound();
        }
      }

      // If on a moving platform, inherit its velocity
      if (levelConfig.platformMovement) {
        const { speed, direction } = levelConfig.platformMovement;
        const platformVelocity = new Vector3(...direction).multiplyScalar(speed);
        currentVelocity.current.add(platformVelocity);
      }
    } else {
      // Update fall time when not grounded
      fallTimeRef.current += delta;
      setFallTime(fallTimeRef.current);
      if (!isEndlessFall && fallTimeRef.current > ENDLESS_FALL_TIME) {
        setEndlessFall(true);
      }
    }

    // Movement and physics updates only if game isn't failed
    if (!isGameFailed) {
      // World loop
      if (worldPosition.y <= WORLD_BOTTOM) {
        rigidBodyRef.current.setTranslation(
          { x: worldPosition.x, y: WORLD_HEIGHT, z: worldPosition.z },
          true
        );
        rigidBodyRef.current.setLinvel({ 
          x: currentVel.x, 
          y: verticalVelocity.current, 
          z: currentVel.z 
        }, true);
      }

      // Start with current velocity instead of resetting to zero
      velocity.current.copy(currentVelocity.current);

      // Apply gravity when in air (reduced in water)
      if (!isGrounded) {
        const gravityMultiplier = playerInWater ? 0.2 : 1;
        verticalVelocity.current = Math.max(
          TERMINAL_VELOCITY * (playerInWater ? 0.2 : 1),
          verticalVelocity.current - GRAVITY * gravityMultiplier * delta
        );
      }

      // Calculate air/water control factor
      const movementFactor = isGrounded ? 1 : (playerInWater ? 0.4 : AIR_CONTROL);

      // Movement
      if (!isGameComplete) {
        const moveDirection = new Vector3(0, 0, 0);
        
        // Handle jumping - allow continuous jumping in water with no cooldown
        if (keysPressed.current['Space'] && hasLegsEnabled) {
          if (playerInWater && canJump.current) {
            // Normal jump in water
            verticalVelocity.current = JUMP_FORCE * WATER_JUMP_FORCE_MULTIPLIER;
            canJump.current = false;
          } else if (canJump.current) {
            // Normal jump on ground
            verticalVelocity.current = JUMP_FORCE;
            canJump.current = false;
          }
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
          
          let currentSpeed = MOVEMENT_SPEED;
          if (keysPressed.current['ShiftLeft']) {
            currentSpeed = RUNNING_SPEED;
          } else if (keysPressed.current['ControlLeft']) {
            currentSpeed = SPRINTING_SPEED;
          }
          
          if (playerInWater) {
            currentSpeed *= 0.4;
          }
          
          if (playerInWater) {
            currentVelocity.current.multiplyScalar(WATER_RESISTANCE);
            currentSpeed *= WATER_MOVEMENT_FACTOR / 0.4; // Adjust for the previous water speed modification
          }

          targetVelocity.current.copy(moveDirection).multiplyScalar(currentSpeed);
        } else {
          targetVelocity.current.set(0, 0, 0);
        }

        // Velocity interpolation
        if (isGrounded || playerInWater) {
          const acceleration = moveDirection.lengthSq() > 0 ? ACCELERATION : DECELERATION;
          velocity.current.x = THREE.MathUtils.lerp(
            velocity.current.x,
            targetVelocity.current.x,
            1 - Math.exp(-acceleration * (playerInWater ? 0.7 : 1) * delta)
          );
          velocity.current.z = THREE.MathUtils.lerp(
            velocity.current.z,
            targetVelocity.current.z,
            1 - Math.exp(-acceleration * (playerInWater ? 0.7 : 1) * delta)
          );
        } else {
          const airVelocity = targetVelocity.current.clone().multiplyScalar(movementFactor * delta);
          velocity.current.x += airVelocity.x;
          velocity.current.z += airVelocity.z;
        }

        // Apply vertical velocity
        velocity.current.y = verticalVelocity.current;
        
        // Apply final velocity
        rigidBodyRef.current.setLinvel(velocity.current, true);
      }
    }

    // Camera updates always happen, even when game is failed
    // Update target position for smooth camera follow
    targetPosition.current.set(worldPosition.x, worldPosition.y, worldPosition.z);
    
    // Smoothly update camera position without physics influence
    const cameraSpeed = isGrounded ? 0.15 : 0.05;
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

    time.current += delta;
  });

  return (
    <>
      {/* Main Player Character */}
      <RigidBody 
        ref={rigidBodyRef}
        position={[spawnPosition.x, spawnPosition.y, spawnPosition.z]}
        colliders="cuboid"
        mass={1}
        lockRotations
        friction={GROUND_FRICTION}
        restitution={0}
        linearDamping={LINEAR_DAMPING}
        angularDamping={0.5}
        enabledRotations={[false, false, false]}
        ccd={true}
        onCollisionEnter={handleCollisionEnter}
        onCollisionExit={handleCollisionExit}
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