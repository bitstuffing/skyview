import React, { useRef, useEffect, useState } from "react";
import { useThreeScene } from "./hooks/useThreeScene";
import { useMouseControls } from "./hooks/useMouseControls";
import { SatelliteSelector } from "./components/SatelliteSelector";
import { GenericSatellite, SatelliteRef } from "./constellation/GenericSatellite";

const AVAILABLE_SATELLITES = [
  { id: 'iss', name: 'International Space Station (ISS)', noradId: 25544, color: '#ff0000' },
  { id: 'hubble', name: 'Hubble Space Telescope', noradId: 20580, color: '#00ff00' },
  { id: 'tiangong', name: 'Tiangong Space Station', noradId: 48274, color: '#0000ff' },
  { id: 'starlink', name: 'Starlink-1007', noradId: 44713, color: '#ffff00' },
];

export function App() {
  const [loading, setLoading] = useState(true);
  const [selectedSatellite, setSelectedSatellite] = useState('iss');
  const [orbitDuration, setOrbitDuration] = useState(95);
  
  const { mountRef, scene, renderer, camera, earth } = useThreeScene(loading, setLoading);
  const { updateRotation, earthRotation } = useMouseControls(earth);
  
  const satelliteRefs = useRef<{ [key: string]: SatelliteRef | null }>({});

  useEffect(() => {
    if (!scene || !renderer || !camera) return;

    let frameId: number;

    const animate = () => {
      updateRotation();

      Object.values(satelliteRefs.current).forEach(satRef => {
        if (satRef) {
          satRef.updatePosition();
          if (earthRotation) {
            satRef.syncRotation(earthRotation);
          }
        }
      });

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [scene, renderer, camera, updateRotation, earthRotation]);

  const handleSatelliteChange = (satelliteId: string) => {
    setSelectedSatellite(satelliteId);
  };

  const handleOrbitDurationChange = (duration: number) => {
    setOrbitDuration(duration);
  };

  const getCurrentSatellite = () => 
    AVAILABLE_SATELLITES.find(sat => sat.id === selectedSatellite) || AVAILABLE_SATELLITES[0];

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

      {scene && AVAILABLE_SATELLITES.map(satellite => (
        <GenericSatellite
          key={satellite.id}
          ref={(ref) => { satelliteRefs.current[satellite.id] = ref; }}
          scene={scene}
          earthRadius={5}
          noradId={satellite.noradId}
          color={satellite.color}
          orbitDuration={orbitDuration}
          visible={satellite.id === selectedSatellite}
        />
      ))}
      
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