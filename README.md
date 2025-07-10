## Introduction

js plates is a program leveraging three.js to create tectonic plates on a sphere.

## To run

// Start the server with:

`npx vite`

and [view in the browser](http://localhost:5173/)

### Next Steps (Suggested Order)

- [x] Build createPolygonPlatesFromSVG to load a polygon from an svg
- [x] Add SVG import path via SVGLoader and mapping to lat/lon.
- [x] Test triangulation and display on sphere.
- [ ] Debug: Why is the polygon not on the surface of the sphere?
- [ ] Add deformation support via vertex updates.

## Docs

- [three.js](https://threejs.org/manual/#en/)

## Initial Setup

[these docs](https://threejs.org/manual/#en/installation)

npm install --save-dev three
npm install --save-dev vite
npm install --save-dev earcut