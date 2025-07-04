export interface SatelliteConfig {
    id: string;
    name: string;
    noradId: number;
    color: string;
    enabled: boolean;
    category: string;
}
  
// TODO: Add more categories and satellites as needed
export let SATELLITE_CATALOG: SatelliteConfig[] = [
    // Space Stations
    { id: 'iss', name: 'International Space Station (ISS)', noradId: 25544, color: '#ff0000', enabled: true, category: 'Space Stations' },
    { id: 'tiangong', name: 'Tiangong Space Station', noradId: 48274, color: '#ff6600', enabled: false, category: 'Space Stations' },

    // Space Telescopes
    { id: 'hubble', name: 'Hubble Space Telescope', noradId: 20580, color: '#00ff00', enabled: false, category: 'Telescopes' },
    { id: 'jwst', name: 'James Webb Space Telescope', noradId: 50463, color: '#00ffff', enabled: false, category: 'Telescopes' },
    { id: 'spitzer', name: 'Spitzer Space Telescope', noradId: 27871, color: '#ff00ff', enabled: false, category: 'Telescopes' },

    // Starlink Constellations
    { id: 'starlink-1007', name: 'Starlink-1007', noradId: 44713, color: '#ffff00', enabled: false, category: 'Starlink' },
    { id: 'starlink-1019', name: 'Starlink-1019', noradId: 44714, color: '#ffff66', enabled: false, category: 'Starlink' },
    { id: 'starlink-1130', name: 'Starlink-1130', noradId: 45044, color: '#ffff99', enabled: false, category: 'Starlink' },

    // GPS/GNSS (TODO. Orbit is not accurate)
    { id: 'gps-biir-2', name: 'GPS BIIR-2 (PRN 13)', noradId: 24876, color: '#0066ff', enabled: false, category: 'Navigation' },
    { id: 'gps-biif-3', name: 'GPS BIIF-3 (PRN 06)', noradId: 39166, color: '#0099ff', enabled: false, category: 'Navigation' },

    // Communications
    { id: 'intelsat-901', name: 'Intelsat 901', noradId: 26038, color: '#9900ff', enabled: false, category: 'Communications' },
    { id: 'eutelsat-5WB', name: 'Eutelsat 5 West B', noradId: 42814, color: '#cc00ff', enabled: false, category: 'Communications' },

    // Earth Observation
    { id: 'landsat-8', name: 'Landsat 8', noradId: 39084, color: '#00cc00', enabled: false, category: 'Earth Observation' },
    { id: 'sentinel-1a', name: 'Sentinel-1A', noradId: 39634, color: '#66cc00', enabled: false, category: 'Earth Observation' },
    { id: 'aqua', name: 'Aqua', noradId: 27424, color: '#00cc66', enabled: false, category: 'Earth Observation' },
    { id: 'terra', name: 'Terra', noradId: 25994, color: '#00cc99', enabled: false, category: 'Earth Observation' },

    // Weather - TODO, extract from search results of https://isstracker.pl/en/satellites?f=1&q=NOAA&rok=0&cosmodrome=0&sat_group=0&cat=0&owner=0
    { id: 'noaa-15', name: 'NOAA-15', noradId: 25338, color: '#ff4400', enabled: true, category: 'Weather' },
    { id: 'noaa-16', name: 'NOAA-20', noradId: 43013, color: '#ff2200', enabled: true, category: 'Weather' },
    { id: 'noaa-17', name: 'NOAA-17 DEB', noradId: 49491, color: '#ff6600', enabled: true, category: 'Weather' },
    { id: 'noaa-18', name: 'NOAA-18', noradId: 28654, color: '#ff8800', enabled: true, category: 'Weather' },
    { id: 'noaa-19', name: 'NOAA-19', noradId: 33591, color: '#ffaa00', enabled: true, category: 'Weather' },
    { id: 'goes-16', name: 'GOES-16', noradId: 41866, color: '#ffcc66', enabled: false, category: 'Weather' },

    // Science
    { id: 'kepler', name: 'Kepler Space Telescope', noradId: 34380, color: '#6600cc', enabled: false, category: 'Science' },
    { id: 'tess', name: 'TESS', noradId: 43435, color: '#9966cc', enabled: false, category: 'Science' },
    { id: 'parker-solar', name: 'Parker Solar Probe', noradId: 43592, color: '#ff3300', enabled: false, category: 'Science' },
];
  
export const getSatelliteCategories = (): string[] => {
    return Array.from(new Set(SATELLITE_CATALOG.map(sat => sat.category))).sort();
};
  
export const getEnabledSatellites = (): SatelliteConfig[] => {
    return SATELLITE_CATALOG.filter(sat => sat.enabled);
};
  
export const getSatellitesByCategory = (category: string): SatelliteConfig[] => {
    return SATELLITE_CATALOG.filter(sat => sat.category === category);
};