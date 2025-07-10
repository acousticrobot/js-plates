import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import * as THREE from 'three';
import earcut from 'earcut';
import { latLonToXYZ } from './sphere_math.js';
import { createPolygonPlate } from './poly_plates.js';


// Map SVG (x, y) to lat/lon (customize this)
function svgXYtoLatLon(x, y, width, height, latRange = [-90, 90], lonRange = [-180, 180]) {
  // Direct mapping from SVG coordinates to lat/lon
  // For 360x180 SVG, each unit = 1 degree
  const lon = x - 180; // Convert [0,360] to [-180,180]
  const lat = 90 - y;  // Convert [0,180] to [90,-90] (SVG Y is inverted)
  
  return [lat, lon];
}

// Main SVG loader + polygon plate function
async function createPolygonPlatesFromSVG(svgUrl, color = 0x00ccff) {
  const loader = new SVGLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      svgUrl,
      (data) => {
        console.log('SVG loaded:', data);
        const { paths } = data;

        // Get bounding box of full SVG
        const svgBox = data.xml.attributes.viewBox?.value.split(' ').map(parseFloat) ||
                       [0, 0, 100, 100]; // fallback
        const [minX, minY, width, height] = svgBox;

        const plates = [];

        paths.forEach(path => {
          path.subPaths.forEach(subPath => {
            // Generate points along the edges and inside the rectangle
            const numPointsX = 30; // Increased points along longitude
            const numPointsY = 15; // Increased points along latitude
            const points = [];
            
            // Generate a grid of points with spherical interpolation
            for (let iy = 0; iy <= numPointsY; iy++) {
              for (let ix = 0; ix <= numPointsX; ix++) {
                const t = ix / numPointsX;
                const s = iy / numPointsY;
                
                // Add slight spherical bulge to better follow the sphere's surface
                const bulge = Math.sin(Math.PI * t) * Math.sin(Math.PI * s) * 0.02;
                points.push({
                  x: 120 + (180 - 120) * t,
                  y: 45 + (75 - 45) * s + bulge
                });
              }
            }

            if (points.length < 3) return;

            const latLonPolygon = points.map(p =>
              svgXYtoLatLon(p.x - minX, p.y - minY, width, height)
            );

            const plate = createPolygonPlate(latLonPolygon, color);
            if (plate) plates.push(plate);
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
