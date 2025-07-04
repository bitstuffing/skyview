import React, { useEffect } from 'react';

interface Satellite {
  id: string;
  name: string;
  noradId: number;
  color: string;
}

interface SatelliteSelectorProps {
  satellites: Satellite[];
  enabledSatellites: string[];
  orbitDuration: number;
  onSatelliteToggle: (satelliteId: string) => void;
  onOrbitDurationChange: (duration: number) => void;
}

export const SatelliteSelector: React.FC<SatelliteSelectorProps> = ({
  satellites,
  enabledSatellites = [],
  orbitDuration,
  onSatelliteToggle = () => {
    // toggle enable satellite
    console.warn('onSatelliteToggle not implemented');
  },
  onOrbitDurationChange,
}) => {
  // Make enabledSatellites global (window-scoped) and update on toggle
  useEffect(() => {
    (window as any).enabledSatellites = enabledSatellites;
  }, [enabledSatellites]);

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
      maxHeight: '80vh',
      overflowY: 'auto',
    }}>
      <h3 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>
        Satellite Tracker
      </h3>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: 'bold' }}>
          Satellites:
        </label>
        
        {satellites.map((sat) => (
          <div key={sat.id} style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '10px',
            padding: '8px',
            borderRadius: '5px',
            backgroundColor: enabledSatellites.includes(sat.id) ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
            border: `1px solid ${enabledSatellites.includes(sat.id) ? sat.color : 'transparent'}`,
            transition: 'all 0.2s ease',
          }}>
            <input
              type="checkbox"
              id={`satellite-${sat.id}`}
              checked={enabledSatellites.includes(sat.id)}
              onChange={() => onSatelliteToggle(sat.id)}
              style={{
                marginRight: '10px',
                transform: 'scale(1.2)',
                cursor: 'pointer',
              }}
            />
            
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: sat.color,
              marginRight: '10px',
              opacity: enabledSatellites.includes(sat.id) ? 1 : 0.3,
            }} />
            
            <label 
              htmlFor={`satellite-${sat.id}`}
              style={{
                fontSize: '13px',
                cursor: 'pointer',
                opacity: enabledSatellites.includes(sat.id) ? 1 : 0.6,
                flex: 1,
              }}
            >
              {sat.name}
            </label>
            
            <span style={{
              fontSize: '11px',
              color: '#999',
              marginLeft: '8px',
            }}>
              {sat.noradId}
            </span>
          </div>
        ))}
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
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

      <div style={{
        marginTop: '15px',
        padding: '10px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '5px',
        fontSize: '12px',
        color: '#ccc',
      }}>
        <strong>Active:</strong> {enabledSatellites.length} of {satellites.length} satellites
      </div>
    </div>
  );
};