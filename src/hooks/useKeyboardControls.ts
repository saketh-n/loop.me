import { useState, useEffect } from 'react';

export type KeyboardControls = {
  moveForward: boolean;
  moveBackward: boolean;
  moveLeft: boolean;
  moveRight: boolean;
};

export const useKeyboardControls = (): KeyboardControls => {
  const [keys, setKeys] = useState<KeyboardControls>({
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          setKeys(prev => ({ ...prev, moveForward: true }));
          break;
        case 'KeyS':
        case 'ArrowDown':
          setKeys(prev => ({ ...prev, moveBackward: true }));
          break;
        case 'KeyA':
        case 'ArrowLeft':
          setKeys(prev => ({ ...prev, moveLeft: true }));
          break;
        case 'KeyD':
        case 'ArrowRight':
          setKeys(prev => ({ ...prev, moveRight: true }));
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          setKeys(prev => ({ ...prev, moveForward: false }));
          break;
        case 'KeyS':
        case 'ArrowDown':
          setKeys(prev => ({ ...prev, moveBackward: false }));
          break;
        case 'KeyA':
        case 'ArrowLeft':
          setKeys(prev => ({ ...prev, moveLeft: false }));
          break;
        case 'KeyD':
        case 'ArrowRight':
          setKeys(prev => ({ ...prev, moveRight: false }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return keys;
}; 