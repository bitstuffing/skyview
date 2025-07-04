import React from 'react';

interface Satellite {
  id: string;
  name: string;
  noradId: number;
  color: string;
}

interface SatelliteSelectorProps {
  satellites: Satellite[];
  selectedSatellite: string;
  orbitDuration: number;
  onSatelliteChange: (satelliteId: string) => void;
  onOrbitDurationChange: (duration: number) => void;
}

export const SatelliteSelector: React.FC<SatelliteSelectorProps> = ({
  satellites,
  selectedSatellite,
  orbitDuration,
  onSatelliteChange,
  onOrbitDurationChange,
}) => {
  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      background: 'rgba(0, 0, 0, 0.8)',
      padding: '20px',
      borderRadius: '10px',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      minWidth: '300px',
      zIndex: 1000,
    }}>
      <h3 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>
        Satellite Tracker
      </h3>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
          Select Satellite:
        </label>
        <select
          value={selectedSatellite}
          onChange={(e) => onSatelliteChange(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '5px',
            border: 'none',
            backgroundColor: '#333',
            color: 'white',
            fontSize: '14px',
          }}
        >
          {satellites.map((sat) => (
            <option key={sat.id} value={sat.id}>
              {sat.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
          Orbit Duration: {orbitDuration} minutes
        </label>
        <input
          type="range"
          min="30"
          max="200"
          value={orbitDuration}
          onChange={(e) => onOrbitDurationChange(Number(e.target.value))}
          style={{
            width: '100%',
            height: '6px',
            borderRadius: '3px',
            background: '#333',
            outline: 'none',
            cursor: 'pointer',
          }}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#ccc',
          marginTop: '5px',
        }}>
          <span>30 min</span>
          <span>200 min</span>
        </div>
      </div>
    </div>
  );
};