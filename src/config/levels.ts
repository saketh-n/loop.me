import { Vector3 } from 'three';

interface WindConfig {
  enabled: boolean;
  direction?: Vector3;
  strength?: number;
  gustStrength?: number;
}

interface SkyboxConfig {
  timeOfDay: 'day' | 'sunrise' | 'sunset';
  inclination: number;
  azimuth: number;
}

interface GrassConfig {
  enabled: boolean;
  density: number;  // Number of grass blades per unit area
}

export interface LevelConfig {
  id: number;
  name: string;
  description: string;
  platformDimensions: [number, number]; // [width, depth]
  spawnHeight: number;
  wind: WindConfig;
  skybox: SkyboxConfig;
  grass: GrassConfig;
}

export const levels: LevelConfig[] = [
  {
    id: 1,
    name: "Windy Heights",
    description: "A square platform with challenging wind conditions",
    platformDimensions: [20, 20],
    spawnHeight: 50,
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
  }
]; 