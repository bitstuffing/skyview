import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import * as satellite from "satellite.js";

export function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

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
    // Only append if not already present
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

    // FINAL SOLUTION WITH ROTATION
    earth.rotation.y = THREE.MathUtils.degToRad(180);
    earth.rotation.x = THREE.MathUtils.degToRad(180);
    
    // Center to Spain (41.38°N, 3.72°W)
    const coordinateSystem = {
      rotateTo(lat: number, lon: number) {
        const latRad = THREE.MathUtils.degToRad(lat);
        const lonRad = THREE.MathUtils.degToRad(lon);
        earth.rotation.x = latRad;
        earth.rotation.y = THREE.MathUtils.degToRad(-90) - lonRad;
      }
    };
    // 41.38, -3.72
    // coordinateSystem.rotateTo(41.38, -3.72);
    coordinateSystem.rotateTo(0,0);

    scene.add(earth);

    const issMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const iss = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 16),
      issMaterial
    );
    //scene.add(iss);

    camera.position.z = 10;
    var tle1 = "";
    var tle2 = "";

    // fetch('https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE')
    //   .then(response => response.text())
    //   .then(data => {
    //     const lines = data.trim().split('\n');
    //     tle1 = lines[1].trim();
    //     tle2 = lines[2].trim();
    //   })
    //   .catch(error => console.error('Error fetching TLE data:', error));

    fetch('https://cors-anywhere.com/https://isstracker.pl/en/satellites/25544')
      .then(response => response.text())
      .then(html => {
        console.info("received!");
        // 1) locate the textarea by its id
        const idTag = 'id="tle-details"';
        const idxId = html.indexOf(idTag);
        if (idxId < 0) {
          console.error('No #tle-details in the HTML');
          console.error(html)
          return;
        }

        // 2) find the '>' that opens the content
        const idxOpen = html.indexOf('>', idxId) + 1;
        // 3) find the '</textarea>' that closes
        const idxClose = html.indexOf('</textarea>', idxOpen);
        if (idxClose < 0) {
          console.error('Did not find </textarea> closing tag');
          return;
        }

        // 4) extract and clean the content
        const content = html
          .substring(idxOpen, idxClose)
          .trim();        

        // 5) split lines and assign
        const lines = content.split('\n').map(l => l.trim());
        // lines[0] = "ISS (ZARYA)"
        tle1 = (lines[1] || '');
        tle2 = (lines[2] || '');

        satrec = satellite.twoline2satrec(tle1, tle2);

        buildPredictedOrbit();
        animate();
      })
      .catch(error => console.error('Error fetching TLE data:', error));


    iss.rotation.y = THREE.MathUtils.degToRad(180);
    iss.rotation.x = THREE.MathUtils.degToRad(180);
  
    // Create a group for the orbit
    const orbitGroup = new THREE.Group();
    scene.add(orbitGroup);
    orbitGroup.add(iss);


    let frameId: number;
    let satrec: satellite.SatRec | null = null;   // compiled satellite
    const orbitPoints: THREE.Vector3[] = [];
    let orbitLine: THREE.Line | null = null;

    
    // --- 1. Utilities ------------------------------------------
    const EARTH_RADIUS = 5;                 // your sphere is 5 units
    const KM_TO_UNITS  = EARTH_RADIUS / 6371;

    function llhToVec3(lat: number,
                  lon: number,
                  altKm: number): THREE.Vector3 {

  const R = EARTH_RADIUS + altKm * KM_TO_UNITS;
  
  // Apply the same correction you use for the ISS
  const lat2 = lat;
  const lon2 = lon - THREE.MathUtils.degToRad(-90); // Same correction as in updateISS

  return new THREE.Vector3(
    R * Math.cos(lat2) * Math.sin(lon2),
    R * Math.sin(lat2),
    R * Math.cos(lat2) * Math.cos(lon2)
  );
}

    function buildPredictedOrbit() {

      const now          = new Date();
      const minutesAhead = 100;          // ≃ 1 and a half orbits
      const stepSec      = 30;           // resolution 30 s
      const points: THREE.Vector3[] = [];
    
      for (let t = 0; t <= minutesAhead*60; t += stepSec) {
        const date = new Date(now.getTime() + t*1000);
    
        const { position } = satellite.propagate(satrec, date);
        if (!position) continue;
    
        const gmst = satellite.gstime(date);
        const geo  = satellite.eciToGeodetic(position, gmst);
    
        points.push(
          llhToVec3(geo.latitude, geo.longitude, geo.height)
        );
      }
    
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const mat  = new THREE.LineBasicMaterial({ color: 0xff0000 });
      const line = new THREE.Line(geom, mat);
      orbitGroup.add(line);
    }
    
    
    function updateISS() {

      if (!satrec) return;

      const now = new Date();
      satrec = satellite.twoline2satrec(tle1, tle2);
      const pv = satellite.propagate(satrec, now);
      if (!pv.position) return;

      const gmst = satellite.gstime(now);
      const geo = satellite.eciToGeodetic(pv.position, gmst);

      const R = (5 + (geo.height / 6371)) + 400/6371; // TODO, calculate the distance, to change R
      const lat = geo.latitude;
      const lon = geo.longitude;
      var lat2 = lat;
      var lon2 = lon - THREE.MathUtils.degToRad(-90);

      // Position relative to the orbit group
      iss.position.set(
        R * Math.cos(lat2) * Math.sin(lon2),
        R * Math.sin(lat2),
        R * Math.cos(lat2) * Math.cos(lon2)
      );

      /* ---------- Orbit trace ---------- */
      orbitPoints.push(iss.position.clone());
      if (orbitPoints.length > 500) orbitPoints.shift();

      // Create the line the first time there are ≥2 points
      if (!orbitLine && orbitPoints.length == 500) {
        console.info("Creating orbit line with points:", orbitPoints.length);
        const geom = new THREE.BufferGeometry().setFromPoints(orbitPoints);
        const mat  = new THREE.LineBasicMaterial({
          color: 0xff0000,
          depthTest: false, 
        });
        orbitLine  = new THREE.Line(geom, mat);
        orbitGroup.add(orbitLine);
      }

      // Update the existing line
      if (orbitLine) {
        (orbitLine.geometry as THREE.BufferGeometry)
          .setFromPoints(orbitPoints);
        (orbitLine.geometry as THREE.BufferGeometry)
          .attributes.position.needsUpdate = true;
      }
    }

    
    function animate() {
      updateISS();
      
      // ROTATE THE EARTH
      earth.rotation.y += 0.01; // Rotation speed
      
      // Keep the ISS in its relative orbit position
      orbitGroup.rotation.copy(earth.rotation);
      
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }
    // Start animation only if we have TLE data
    //animate();
    

    const onResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      scene.clear();
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

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
      }}
    >
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