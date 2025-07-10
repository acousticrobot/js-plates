import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import * as THREE from 'three';
import earcut from 'earcut';
import { latLonToXYZ } from './sphere_math.js';
import { createPolygonPlate } from './poly_plates.js';


// Map SVG (x, y) to lat/lon (customize this)
function svgXYtoLatLon(x, y, width, height, latRange = [-90, 90], lonRange = [-180, 180]) {
  console.log("width, height:", width, height)
  const lon = lonRange[0] + (x / width) * (lonRange[1] - lonRange[0]);
  const lat = latRange[1] - (y / height) * (latRange[1] - latRange[0]); // Y down
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
            const points = subPath.getPoints(50); // Number of sampling points
            console.log('Sampled points:', points);

            if (points.length < 3) return;

            const latLonPolygon = points.map(p =>
              svgXYtoLatLon(p.x - minX, p.y - minY, width, height)
            );

            console.log('LatLon Polygon:', latLonPolygon);
            const plate = createPolygonPlate(latLonPolygon, color);
            plates.push(plate);
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
