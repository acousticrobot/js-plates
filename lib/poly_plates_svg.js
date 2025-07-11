import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import * as THREE from 'three';
import earcut from 'earcut';
import { latLonToXYZ } from './sphere_math.js';
import { createPolygonPlate } from './poly_plates.js';

// Map SVG (x, y) to lat/lon using direct coordinate mapping
function svgXYtoLatLon(x, y, width, height) {
  // Scale factor to make the shape more visible
  const scale = 1.0;
  
  // Calculate the position relative to the center of the SVG
  const x_rel = x - 180;
  const y_rel = y - 90;
  
  // Convert to lat/lon with scaling
  const lon = x_rel * scale;
  const lat = -y_rel * scale; // Flip y-axis for correct orientation
  
  // Clamp latitude to valid range [-90, 90]
  const clampedLat = Math.max(-90, Math.min(90, lat));
  
  return [clampedLat, lon];
}

async function createPolygonPlatesFromSVG(svgUrl, color = 0x00ccff) {
  const loader = new SVGLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      svgUrl,
      (data) => {
        console.log('SVG loaded:', data);
        const { paths } = data;

        // Use SVG's actual viewBox
        const svgBox = [0, 0, 360, 180];
        const [minX, minY, width, height] = svgBox;

        const plates = [];

        paths.forEach(path => {
          path.subPaths.forEach(subPath => {
            // Sample points with moderate density
            const points = subPath.getPoints(250);
            console.log('Path points:', points.length, points[0]);

            if (points.length < 3) return;

            // Convert to lat/lon coordinates
            const latLonPoints = points.map(p => {
              const [lat, lon] = svgXYtoLatLon(p.x, p.y, width, height);
              return [lat, lon];
            });

            console.log('LatLon Points:', latLonPoints.length, latLonPoints[0]);
            const plate = createPolygonPlate(latLonPoints, color);
            if (plate) {
              console.log('Created plate:', plate);
              plates.push(plate);
            }
          });
        });

        resolve(plates);
      },
      undefined,
      (error) => reject(error)
    );
  });
}

export { createPolygonPlatesFromSVG }
