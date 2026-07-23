---
name: MapLibre WebGL fallback
description: MapLibre GL JS requires WebGL which is unavailable in the Replit preview sandbox; requires graceful fallback
---

## Rule

Always wrap MapLibre map initialization with a WebGL pre-check. If WebGL is unavailable, show a fallback UI instead of crashing.

**Why:** The Replit sandbox preview environment does not support WebGL context creation. MapLibre throws an uncaught error (`webglcontextcreationerror`) that crashes the React component tree if not handled. The app works correctly in real browsers.

**How to apply:**
1. Before `new maplibregl.Map(...)`, test: `const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl'); if (!gl) { setWebglError(true); return; }`
2. Wrap the `new maplibregl.Map(...)` call in a try-catch; on catch, set `webglError` state.
3. Also listen to `map.on('error', ...)` and detect webgl in the error message.
4. Render a dot-scatter fallback component when `webglError` is true, using the cluster data (lat/lng as % of viewport).
5. Pass `failIfMajorPerformanceCaveat: false` to the Map options to maximize compatibility.
