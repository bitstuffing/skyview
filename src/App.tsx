import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import * as satellite from "satellite.js";
import { SatelliteSelector } from "./components/SatelliteSelector";

// Just a dummy constellation data to mock components
const AVAILABLE_SATELLITES = [
  { id: 'iss', name: 'International Space Station (ISS)', noradId: 25544, color: '#ff0000' },
  { id: 'hubble', name: 'Hubble Space Telescope', noradId: 20580, color: '#00ff00' },
  { id: 'tiangong', name: 'Tiangong Space Station', noradId: 48274, color: '#0000ff' },
  { id: 'starlink', name: 'Starlink-1007', noradId: 44713, color: '#ffff00' },
];

export function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSatellite, setSelectedSatellite] = useState('iss');
  const [orbitDuration, setOrbitDuration] = useState(95);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    
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
    
    const coordinateSystem = {
      rotateTo(lat: number, lon: number) {
        const latRad = THREE.MathUtils.degToRad(lat);
        const lonRad = THREE.MathUtils.degToRad(lon);
        earth.rotation.x = latRad;
        earth.rotation.y = THREE.MathUtils.degToRad(-90) - lonRad;
      }
    };
    coordinateSystem.rotateTo(41.38, -3.72);

    scene.add(earth);

    const getCurrentSatellite = () => 
      AVAILABLE_SATELLITES.find(sat => sat.id === selectedSatellite) || AVAILABLE_SATELLITES[0];

    const satelliteMaterial = new THREE.MeshBasicMaterial({ 
      color: new THREE.Color(getCurrentSatellite().color) 
    });
    const satelliteMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 16),
      satelliteMaterial
    );

    camera.position.z = 10;
    var tle1 = "";
    var tle2 = "";

    let isMouseDown = false;
    let autoRotate = true;
    let mouseX = 0;
    let mouseY = 0;
    let previousMouseX = 0;
    let previousMouseY = 0;
    let rotationVelocityX = 0;
    let rotationVelocityY = 0;
    const rotationSensitivity = 0.005;
    const dampingFactor = 0.95;

    const onMouseDown = (event: MouseEvent) => {
      isMouseDown = true;
      autoRotate = false;
      mouseX = event.clientX;
      mouseY = event.clientY;
      previousMouseX = mouseX;
      previousMouseY = mouseY;
      rotationVelocityX = 0;
      rotationVelocityY = 0;
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isMouseDown) return;

      mouseX = event.clientX;
      mouseY = event.clientY;

      const deltaX = mouseX - previousMouseX;
      const deltaY = mouseY - previousMouseY;

      rotationVelocityY = deltaX * rotationSensitivity;
      rotationVelocityX = deltaY * rotationSensitivity;

      previousMouseX = mouseX;
      previousMouseY = mouseY;
    };

    const onMouseUp = () => {
      isMouseDown = false;
      setTimeout(() => {
        if (!isMouseDown) {
          autoRotate = true;
        }
      }, 2000);
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    const fetchTLEData = async (noradId: number) => {
      try {
        const response = await fetch(`https://cors-anywhere.com/https://isstracker.pl/en/satellites/${noradId}`);
        const html = await response.text();
        
        const idTag = 'id="tle-details"';
        const idxId = html.indexOf(idTag);
        if (idxId < 0) {
          console.error('No #tle-details in the HTML');
          return null;
        }

        const idxOpen = html.indexOf('>', idxId) + 1;
        const idxClose = html.indexOf('</textarea>', idxOpen);
        if (idxClose < 0) {
          console.error('Did not find </textarea> closing tag');
          return null;
        }

        const content = html.substring(idxOpen, idxClose).trim();
        const lines = content.split('\n').map(l => l.trim());
        
        return {
          tle1: lines[1] || '',
          tle2: lines[2] || ''
        };
      } catch (error) {
        console.error('Error fetching TLE data:', error);
        return null;
      }
    };

    satelliteMesh.rotation.y = THREE.MathUtils.degToRad(180);
    satelliteMesh.rotation.x = THREE.MathUtils.degToRad(180);
  
    const orbitGroup = new THREE.Group();
    scene.add(orbitGroup);
    orbitGroup.add(satelliteMesh);

    let frameId: number;
    let satrec: satellite.SatRec | null = null;
    const orbitPoints: THREE.Vector3[] = [];
    let orbitLine: THREE.Line | null = null;
    let predictedOrbitLine: THREE.Line | null = null;

    const EARTH_RADIUS = 5;
    const KM_TO_UNITS  = EARTH_RADIUS / 6371;

    function llhToVec3(lat: number, lon: number, altKm: number): THREE.Vector3 {
      const R = EARTH_RADIUS + altKm * KM_TO_UNITS;
      const lat2 = lat;
      const lon2 = lon - THREE.MathUtils.degToRad(-90);

      return new THREE.Vector3(
        R * Math.cos(lat2) * Math.sin(lon2),
        R * Math.sin(lat2),
        R * Math.cos(lat2) * Math.cos(lon2)
      );
    }

    function buildPredictedOrbit() {
      if (!satrec) return;
      
      if (predictedOrbitLine) {
        orbitGroup.remove(predictedOrbitLine);
        predictedOrbitLine = null;
      }

      const now = new Date();
      const minutesAhead = orbitDuration;
      const stepSec = 30;
      const points: THREE.Vector3[] = [];
    
      for (let t = 0; t <= minutesAhead*60; t += stepSec) {
        const date = new Date(now.getTime() + t*1000);
    
        const { position } = satellite.propagate(satrec, date);
        if (!position) continue;
    
        const gmst = satellite.gstime(date);
        const geo = satellite.eciToGeodetic(position, gmst);
    
        points.push(
          llhToVec3(geo.latitude, geo.longitude, geo.height)
        );
      }
    
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const currentSat = getCurrentSatellite();
      const mat = new THREE.LineBasicMaterial({ 
        color: new THREE.Color(currentSat.color),
        opacity: 0.7,
        transparent: true
      });
      predictedOrbitLine = new THREE.Line(geom, mat);
      orbitGroup.add(predictedOrbitLine);
    }
    
    function updateSatellite() {
      if (!satrec) return;

      const now = new Date();
      const pv = satellite.propagate(satrec, now);
      if (!pv.position) return;

      const gmst = satellite.gstime(now);
      const geo = satellite.eciToGeodetic(pv.position, gmst);

      const R = EARTH_RADIUS + geo.height * KM_TO_UNITS;
      const lat = geo.latitude;
      const lon = geo.longitude;
      var lat2 = lat;
      var lon2 = lon - THREE.MathUtils.degToRad(-90);

      satelliteMesh.position.set(
        R * Math.cos(lat2) * Math.sin(lon2),
        R * Math.sin(lat2),
        R * Math.cos(lat2) * Math.cos(lon2)
      );

      orbitPoints.push(satelliteMesh.position.clone());
      if (orbitPoints.length > 500) orbitPoints.shift();

      if (!orbitLine && orbitPoints.length == 500) {
        const geom = new THREE.BufferGeometry().setFromPoints(orbitPoints);
        const currentSat = getCurrentSatellite();
        const mat = new THREE.LineBasicMaterial({
          color: new THREE.Color(currentSat.color),
          depthTest: false, 
        });
        orbitLine = new THREE.Line(geom, mat);
        orbitGroup.add(orbitLine);
      }

      if (orbitLine) {
        (orbitLine.geometry as THREE.BufferGeometry)
          .setFromPoints(orbitPoints);
        (orbitLine.geometry as THREE.BufferGeometry)
          .attributes.position.needsUpdate = true;
      }
    }

    const loadSatellite = async () => {
      const currentSat = getCurrentSatellite();
      const tleData = await fetchTLEData(currentSat.noradId);
      
      if (tleData) {
        tle1 = tleData.tle1;
        tle2 = tleData.tle2;
        satrec = satellite.twoline2satrec(tle1, tle2);
        
        satelliteMaterial.color.setHex(currentSat.color);
        
        orbitPoints.length = 0;
        if (orbitLine) {
          orbitGroup.remove(orbitLine);
          orbitLine = null;
        }
        
        buildPredictedOrbit();
        
        if (!frameId) {
          animate();
        }
      }
    };

    function animate() {
      updateSatellite();
      
      if (autoRotate) {
        earth.rotation.y += 0.01;
      } else {
        earth.rotation.y += rotationVelocityY;
        earth.rotation.x += rotationVelocityX;
        
        rotationVelocityY *= dampingFactor;
        rotationVelocityX *= dampingFactor;
        
        if (Math.abs(rotationVelocityY) < 0.001) rotationVelocityY = 0;
        if (Math.abs(rotationVelocityX) < 0.001) rotationVelocityX = 0;
      }
      
      orbitGroup.rotation.copy(earth.rotation);
      
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }

    const onResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener("resize", onResize);

    loadSatellite();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.dispose();
      scene.clear();
      if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [selectedSatellite, orbitDuration]); // Dependencias para recargar cuando cambien

  const handleSatelliteChange = (satelliteId: string) => {
    setSelectedSatellite(satelliteId);
  };

  const handleOrbitDurationChange = (duration: number) => {
    setOrbitDuration(duration);
  };

  return (
    <div
      ref={mountRef}
      style={{
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        backgroundColor: "black",
        position: "relative",
        cursor: "grab",
      }}
    >
      <SatelliteSelector
        satellites={AVAILABLE_SATELLITES}
        selectedSatellite={selectedSatellite}
        orbitDuration={orbitDuration}
        onSatelliteChange={handleSatelliteChange}
        onOrbitDurationChange={handleOrbitDurationChange}
      />
      
      {loading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "white",
            fontSize: "24px",
          }}
        >
          Loading...
        </div>
      )}
    </div>
  );
}

export default App;