import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useGetCandleClusters, getGetCandleClustersQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Flame } from 'lucide-react';

interface CandleMapProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  interactive?: boolean;
  onCandleClick?: (candleData: any) => void;
}

function MapFallback({ candles }: { candles: any[] }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#050810] via-[#0a0f1e] to-[#050810] relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.05)_0%,transparent_70%)] pointer-events-none" />
      {/* Scattered candle dots */}
      {candles.map((c, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${((c.lng + 180) / 360) * 100}%`,
            top: `${((90 - c.lat) / 180) * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            className="rounded-full animate-pulse"
            style={{
              width: c.isCluster ? `${Math.min(40, 10 + c.count * 2)}px` : '8px',
              height: c.isCluster ? `${Math.min(40, 10 + c.count * 2)}px` : '8px',
              background: 'radial-gradient(circle, #FFD700, #FF8C00)',
              boxShadow: '0 0 12px rgba(245,158,11,0.8)',
              opacity: 0.85,
            }}
          />
        </div>
      ))}
      <div className="relative z-10 text-center px-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Flame className="text-amber-400 w-8 h-8 animate-pulse" />
        </div>
        <p className="text-amber-400/80 text-sm font-medium">
          {candles.length > 0 ? `${candles.length} candles lit` : 'Interactive map loads in-browser'}
        </p>
      </div>
    </div>
  );
}

const CARTO_DARK_STYLE: any = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '&copy; CARTO &copy; OpenStreetMap',
    },
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster',
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

export function CandleMap({
  initialCenter = [20, 20],
  initialZoom = 2,
  interactive = true,
  onCandleClick
}: CandleMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const [webglError, setWebglError] = useState(false);

  const [bounds, setBounds] = useState<{ minLat: number; maxLat: number; minLng: number; maxLng: number } | null>(null);
  const [zoom, setZoom] = useState(initialZoom);

  const { data: clusters } = useGetCandleClusters(
    { zoom: Math.floor(zoom), ...bounds },
    { query: { queryKey: getGetCandleClustersQueryKey({ zoom: Math.floor(zoom), ...bounds }), enabled: !webglError || !!bounds } }
  );

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    // Pre-check WebGL support before attempting to initialize
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      setWebglError(true);
      return;
    }

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: mapContainer.current,
        style: CARTO_DARK_STYLE,
        center: initialCenter,
        zoom: initialZoom,
        interactive,
        attributionControl: false,
        // Repeat the world horizontally, so visitors can keep exploring east or west.
        renderWorldCopies: true,
        failIfMajorPerformanceCaveat: false,
      } as any);
    } catch (e) {
      setWebglError(true);
      return;
    }

    map.on('error', (e: any) => {
      if (e?.error?.message?.toLowerCase().includes('webgl')) {
        setWebglError(true);
        map.remove();
        mapRef.current = null;
      }
    });

    mapRef.current = map;

    const updateBounds = () => {
      const b = map.getBounds();
      setBounds({
        minLng: b.getWest(),
        maxLng: b.getEast(),
        minLat: b.getSouth(),
        maxLat: b.getNorth(),
      });
      setZoom(map.getZoom());
    };

    map.on('load', updateBounds);
    map.on('moveend', updateBounds);
    map.on('zoomend', updateBounds);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !clusters || webglError) return;
    const map = mapRef.current;

    const currentIds = new Set(
      clusters.map((c) =>
        c.isCluster ? `cluster-${c.lat}-${c.lng}` : `candle-${c.candleId}`
      )
    );
    Object.keys(markersRef.current).forEach((id) => {
      if (!currentIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    clusters.forEach((cluster) => {
      const id = cluster.isCluster
        ? `cluster-${cluster.lat}-${cluster.lng}`
        : `candle-${cluster.candleId}`;
      if (markersRef.current[id]) return;

      const el = document.createElement('div');

      if (cluster.isCluster) {
        const size = Math.max(32, Math.min(64, 20 + Math.log10(cluster.count + 1) * 15));
        el.style.cssText = `
          width: ${size}px; height: ${size}px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(245,158,11,0.3), rgba(245,158,11,0.1));
          border: 1px solid rgba(245,158,11,0.5);
          color: #F59E0B; font-weight: bold; font-size: 12px;
          box-shadow: 0 0 20px rgba(245,158,11,0.4);
          cursor: pointer;
        `;
        el.textContent = cluster.count >= 1000
          ? `${(cluster.count / 1000).toFixed(1)}k`
          : String(cluster.count);
        el.addEventListener('click', () => {
          map.flyTo({ center: [cluster.lng, cluster.lat], zoom: map.getZoom() + 2, duration: 800 });
        });
      } else {
        el.className = 'candle-marker';
        el.innerHTML = `
          <svg width="24" height="36" viewBox="0 0 24 36">
            <defs>
              <radialGradient id="fg-${id}" cx="50%" cy="60%" r="50%">
                <stop offset="0%" stop-color="#FFD700" stop-opacity="1"/>
                <stop offset="60%" stop-color="#FF8C00" stop-opacity="0.8"/>
                <stop offset="100%" stop-color="#FF4500" stop-opacity="0"/>
              </radialGradient>
            </defs>
            <ellipse cx="12" cy="14" rx="10" ry="12" fill="url(#fg-${id})" opacity="0.4"/>
            <path d="M12 2 C10 6 7 10 8 15 C9 19 11 21 12 22 C13 21 15 19 16 15 C17 10 14 6 12 2Z" fill="#FF8C00"/>
            <path d="M12 6 C11 9 9 12 10 16 C10.5 18 11.5 20 12 20 C12.5 20 13.5 18 14 16 C15 12 13 9 12 6Z" fill="#FFD700"/>
            <path d="M12 10 C11.5 12 11 14 11.5 16 C11.8 17.5 12 18.5 12 18.5 C12 18.5 12.2 17.5 12.5 16 C13 14 12.5 12 12 10Z" fill="white" opacity="0.6"/>
            <rect x="9" y="22" width="6" height="12" rx="1" fill="#E8D5A3" opacity="0.9"/>
            <rect x="9" y="22" width="6" height="4" rx="1" fill="#D4B896" opacity="0.6"/>
          </svg>
        `;
        if (onCandleClick) {
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            onCandleClick(cluster);
          });
        }
      }

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([cluster.lng, cluster.lat])
        .addTo(map);

      markersRef.current[id] = marker;
    });
  }, [clusters, onCandleClick, webglError]);

  if (webglError) {
    return <MapFallback candles={clusters ?? []} />;
  }

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}
