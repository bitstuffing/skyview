import React, { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";
import * as satellite from "satellite.js";

interface ISSProps {
  scene: THREE.Scene;
  earthRadius: number;
  orbitDuration?: number;
  visible?: boolean;
  color?: string;
}

export interface ISSRef {
  updatePosition: () => void;
  syncRotation: (earthRotation: THREE.Euler) => void;
  setVisible: (visible: boolean) => void;
}

export const ISS = forwardRef<ISSRef, ISSProps>(({ 
  scene, 
  earthRadius, 
  orbitDuration = 95,
  visible = true,
  color = "#ff0000"
}, ref) => {
  const issRef = useRef<THREE.Mesh | null>(null);
  const orbitGroupRef = useRef<THREE.Group | null>(null);
  const satrecRef = useRef<satellite.SatRec | null>(null);
  const orbitPointsRef = useRef<THREE.Vector3[]>([]);
  const orbitLineRef = useRef<THREE.Line | null>(null);
  const predictedOrbitRef = useRef<THREE.Line | null>(null);

  const KM_TO_UNITS = earthRadius / 6371;

  useEffect(() => {
    const orbitGroup = new THREE.Group();
    orbitGroupRef.current = orbitGroup;
    scene.add(orbitGroup);

    const issMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(color) });
    const iss = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 16),
      issMaterial
    );
    
    iss.rotation.y = THREE.MathUtils.degToRad(180);
    iss.rotation.x = THREE.MathUtils.degToRad(180);
    
    issRef.current = iss;
    orbitGroup.add(iss);

    fetchTLEData();

    return () => {
      if (orbitGroupRef.current) {
        scene.remove(orbitGroupRef.current);
      }
    };
  }, [scene, earthRadius, color]);

  useEffect(() => {
    if (issRef.current) {
      issRef.current.visible = visible;
    }
    if (orbitLineRef.current) {
      orbitLineRef.current.visible = visible;
    }
    if (predictedOrbitRef.current) {
      predictedOrbitRef.current.visible = visible;
    }
  }, [visible]);

  useEffect(() => {
    if (satrecRef.current) {
      buildPredictedOrbit();
    }
  }, [orbitDuration]);

  const fetchTLEData = async () => {
    try {
      const response = await fetch('https://cors-anywhere.com/https://isstracker.pl/en/satellites/25544');
      const html = await response.text();
      
      const idTag = 'id="tle-details"';
      const idxId = html.indexOf(idTag);
      if (idxId < 0) {
        console.error('No #tle-details in the HTML');
        return;
      }

      const idxOpen = html.indexOf('>', idxId) + 1;
      const idxClose = html.indexOf('</textarea>', idxOpen);
      if (idxClose < 0) {
        console.error('Did not find </textarea> closing tag');
        return;
      }

      const content = html.substring(idxOpen, idxClose).trim();
      const lines = content.split('\n').map(l => l.trim());
      const tle1 = lines[1] || '';
      const tle2 = lines[2] || '';

      satrecRef.current = satellite.twoline2satrec(tle1, tle2);
      buildPredictedOrbit();
    } catch (error) {
      console.error('Error fetching TLE data:', error);
    }
  };

  const llhToVec3 = (lat: number, lon: number, altKm: number): THREE.Vector3 => {
    const R = earthRadius + altKm * KM_TO_UNITS;
    const lat2 = lat;
    const lon2 = lon - THREE.MathUtils.degToRad(-90);

    return new THREE.Vector3(
      R * Math.cos(lat2) * Math.sin(lon2),
      R * Math.sin(lat2),
      R * Math.cos(lat2) * Math.cos(lon2)
    );
  };

  const buildPredictedOrbit = () => {
    if (!satrecRef.current || !orbitGroupRef.current) return;

    if (predictedOrbitRef.current) {
      orbitGroupRef.current.remove(predictedOrbitRef.current);
      predictedOrbitRef.current.geometry.dispose();
      (predictedOrbitRef.current.material as THREE.Material).dispose();
    }

    const now = new Date();
    const stepSec = 30;
    const points: THREE.Vector3[] = [];

    for (let t = 0; t <= orbitDuration * 60; t += stepSec) {
      const date = new Date(now.getTime() + t * 1000);
      const { position } = satellite.propagate(satrecRef.current, date);
      
      if (!position) continue;

      const gmst = satellite.gstime(date);
      const geo = satellite.eciToGeodetic(position, gmst);
      points.push(llhToVec3(geo.latitude, geo.longitude, geo.height));
    }

    if (points.length > 0) {
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({ 
        color: new THREE.Color(color), 
        opacity: 0.7, 
        transparent: true 
      });
      predictedOrbitRef.current = new THREE.Line(geom, mat);
      orbitGroupRef.current.add(predictedOrbitRef.current);
    }
  };

  const updatePosition = () => {
    if (!satrecRef.current || !issRef.current) return;

    const now = new Date();
    const pv = satellite.propagate(satrecRef.current, now);
    if (!pv.position) return;

    const gmst = satellite.gstime(now);
    const geo = satellite.eciToGeodetic(pv.position, gmst);

    const R = earthRadius + geo.height * KM_TO_UNITS;
    const lat = geo.latitude;
    const lon = geo.longitude;
    const lat2 = lat;
    const lon2 = lon - THREE.MathUtils.degToRad(-90);

    issRef.current.position.set(
      R * Math.cos(lat2) * Math.sin(lon2),
      R * Math.sin(lat2),
      R * Math.cos(lat2) * Math.cos(lon2)
    );

    orbitPointsRef.current.push(issRef.current.position.clone());
    if (orbitPointsRef.current.length > 500) {
      orbitPointsRef.current.shift();
    }

    if (!orbitLineRef.current && orbitPointsRef.current.length === 500 && orbitGroupRef.current) {
      const geom = new THREE.BufferGeometry().setFromPoints(orbitPointsRef.current);
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color(color),
        depthTest: false,
      });
      orbitLineRef.current = new THREE.Line(geom, mat);
      orbitGroupRef.current.add(orbitLineRef.current);
    }

    if (orbitLineRef.current) {
      (orbitLineRef.current.geometry as THREE.BufferGeometry)
        .setFromPoints(orbitPointsRef.current);
      (orbitLineRef.current.geometry as THREE.BufferGeometry)
        .attributes.position.needsUpdate = true;
    }
  };

  const syncRotation = (earthRotation: THREE.Euler) => {
    if (orbitGroupRef.current) {
      orbitGroupRef.current.rotation.copy(earthRotation);
    }
  };

  const setVisible = (visible: boolean) => {
    if (issRef.current) issRef.current.visible = visible;
    if (orbitLineRef.current) orbitLineRef.current.visible = visible;
    if (predictedOrbitRef.current) predictedOrbitRef.current.visible = visible;
  };

  useImperativeHandle(ref, () => ({
    updatePosition,
    syncRotation,
    setVisible
  }));

  return null;
});

export default ISS;