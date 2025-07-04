import { useRef, useEffect } from 'react';
import * as THREE from 'three';

export const useThreeScene = (loading: boolean, setLoading: (loading: boolean) => void) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const earthRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 10;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    rendererRef.current = renderer;

    if (!mountRef.current.contains(renderer.domElement)) {
      mountRef.current.appendChild(renderer.domElement);
    }

    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load(
      "https://unpkg.com/worldwindjs@1.7.0/build/dist/images/BMNG_world.topo.bathy.200405.3.2048x1024.jpg",
      () => setLoading(false),
      undefined,
      (error) => {
        console.error("Error loading texture", error);
        setLoading(false);
      }
    );

    const earthMat = new THREE.MeshBasicMaterial({
      map: earthTexture,
      transparent: true,
      opacity: 0.6,
    });

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(5, 64, 64),
      earthMat
    );

    earth.rotation.y = THREE.MathUtils.degToRad(180);
    earth.rotation.x = THREE.MathUtils.degToRad(180);
    earthRef.current = earth;
    scene.add(earth);

    // Spain coordinates
    const coordinateSystem = {
      rotateTo(lat: number, lon: number) {
        const latRad = THREE.MathUtils.degToRad(lat);
        const lonRad = THREE.MathUtils.degToRad(lon);
        earth.rotation.x = latRad;
        earth.rotation.y = THREE.MathUtils.degToRad(-90) - lonRad;
      }
    };
    coordinateSystem.rotateTo(41.38, -3.72);

    const onResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      scene.clear();
      if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [setLoading]);

  return {
    mountRef,
    scene: sceneRef.current,
    renderer: rendererRef.current,
    camera: cameraRef.current,
    earth: earthRef.current
  };
};