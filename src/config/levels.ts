import { Vector3 } from 'three';

interface WindConfig {
  enabled: boolean;
  direction?: Vector3;
  strength?: number;
  gustStrength?: number;
}

interface SkyboxConfig {
  timeOfDay: 'day' | 'sunrise' | 'sunset' | 'night';
  inclination: number;
  azimuth: number;
}

interface GrassConfig {
  enabled: boolean;
  density: number;  // Number of grass blades per unit area
}

interface CollapseConfig {
  enabled: boolean;
  segments: number;  // Number of segments to split platform into
  intervalSeconds: number;  // Time between each segment collapse
}

export interface LevelConfig {
  id: number;
  name: string;
  description: string;
  platformDimensions: [number, number]; // [width, depth]
  spawnHeight: number;
  spawnOffset?: [number, number]; // [x, z] offset from platform center
  wind: WindConfig;
  skybox: SkyboxConfig;
  grass: GrassConfig;
  platformMovement?: {
    speed: number;  // Units per second
    direction: [number, number, number];  // Normalized direction vector
  };
  collapse?: CollapseConfig;
}

export const levels: LevelConfig[] = [
  {
    id: 1,
    name: "Windy Heights",
    description: "A square platform with challenging wind conditions",
    platformDimensions: [20, 20],
    spawnHeight: 50,
    spawnOffset: [0, 0],  // Center spawn
    wind: {
      enabled: true,
      direction: new Vector3(-1, 0, 1).normalize(),
      strength: 10,
      gustStrength: 6
    },
    skybox: {
      timeOfDay: 'day',
      inclination: 0.6,
      azimuth: 0.25
    },
    grass: {
      enabled: true,
      density: 5  // 5 blades per square unit
    }
  },
  {
    id: 2,
    name: "Narrow Edge",
    description: "A precarious path with no wind - pure platforming challenge",
    platformDimensions: [5, 20],
    spawnHeight: 50,
    spawnOffset: [0, -8],  // Spawn closer to the back of the platform
    wind: {
      enabled: false,
      direction: new Vector3(0, 0, 0),
      strength: 0,
      gustStrength: 0
    },
    skybox: {
      timeOfDay: 'sunset',
      inclination: 0.5,
      azimuth: 0.15
    },
    grass: {
      enabled: true,
      density: 5
    }
  },
  {
    id: 3,
    name: "Midnight Run",
    description: "A collapsing platform under the stars - better move quick!",
    platformDimensions: [20, 20],
    spawnHeight: 50,
    spawnOffset: [0, 8],  // Start at the back of the platform
    wind: {
      enabled: false,
      direction: new Vector3(0, 0, 0),
      strength: 0,
      gustStrength: 0
    },
    skybox: {
      timeOfDay: 'night',
      inclination: 0.3,
      azimuth: 0.5
    },
    grass: {
      enabled: false,
      density: 0
    },
    collapse: {
      enabled: true,
      segments: 4,  // Platform will collapse in 5 parts
      intervalSeconds: 2  // One segment collapses every 3 seconds
    }
  }
]; 