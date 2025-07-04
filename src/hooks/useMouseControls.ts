import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const useMouseControls = (earth: THREE.Mesh | null) => {
  const isMouseDownRef = useRef(false);
  const autoRotateRef = useRef(true);
  const mouseRef = useRef({ x: 0, y: 0, prevX: 0, prevY: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });

  const rotationSensitivity = 0.005;
  const dampingFactor = 0.95;

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      isMouseDownRef.current = true;
      autoRotateRef.current = false;
      mouseRef.current.x = event.clientX;
      mouseRef.current.y = event.clientY;
      mouseRef.current.prevX = mouseRef.current.x;
      mouseRef.current.prevY = mouseRef.current.y;
      velocityRef.current.x = 0;
      velocityRef.current.y = 0;
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isMouseDownRef.current) return;

      mouseRef.current.x = event.clientX;
      mouseRef.current.y = event.clientY;

      const deltaX = mouseRef.current.x - mouseRef.current.prevX;
      const deltaY = mouseRef.current.y - mouseRef.current.prevY;

      velocityRef.current.y = deltaX * rotationSensitivity;
      velocityRef.current.x = deltaY * rotationSensitivity;

      mouseRef.current.prevX = mouseRef.current.x;
      mouseRef.current.prevY = mouseRef.current.y;
    };

    const onMouseUp = () => {
      isMouseDownRef.current = false;
      setTimeout(() => {
        if (!isMouseDownRef.current) {
          autoRotateRef.current = true;
        }
      }, 2000);
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const updateRotation = () => {
    if (!earth) return;

    if (autoRotateRef.current) {
      earth.rotation.y += 0.01;
    } else {
      earth.rotation.y += velocityRef.current.y;
      earth.rotation.x += velocityRef.current.x;
      
      velocityRef.current.y *= dampingFactor;
      velocityRef.current.x *= dampingFactor;
      
      if (Math.abs(velocityRef.current.y) < 0.001) velocityRef.current.y = 0;
      if (Math.abs(velocityRef.current.x) < 0.001) velocityRef.current.x = 0;
    }
  };

  return { updateRotation, earthRotation: earth?.rotation };
};