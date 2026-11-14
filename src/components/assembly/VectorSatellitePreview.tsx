/**
 * VectorSatellitePreview.tsx — Live preview of the satellite being assembled.
 *
 * Draws the build with `drawSatellite` on a canvas, over a grid backdrop. The ship floats
 * gently and its engine flickers; with reduced motion on, it is drawn once and held still.
 * It redraws the moment any part changes.
 */

import { useEffect, useRef } from 'react';
import { drawSatellite, satelliteBounds, type SatelliteParts } from '../../art';
import { useReducedMotion } from '../ui/hooks';

export interface VectorSatellitePreviewProps {
  parts: SatelliteParts;
  /** Callsign shown under the ship. */
  name?: string;
  /** Show the laser's rangefinder beam. */
  beam?: boolean;
  className?: string;
}

export function VectorSatellitePreview({ parts, name, beam = true, className }: VectorSatellitePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const partsRef = useRef(parts);
  partsRef.current = parts;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;

    const resize = (): void => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const frame = (ms: number): void => {
      const t = reduced ? 0 : ms / 1000;
      ctx.clearRect(0, 0, width, height);

      const p = partsRef.current;
      const b = satelliteBounds(p, 1);
      const spanX = b.right - b.left;
      const spanY = b.bottom - b.top;
      const scale = Math.min((width * 0.82) / spanX, (height * 0.72) / spanY, 2.4);
      // Centre the whole drawing (flame to nose) rather than just the chassis.
      const cx = width / 2 - ((b.left + b.right) / 2) * scale;
      const bob = reduced ? 0 : Math.sin(t * 1.3) * 4;
      // Centre the whole drawing (antenna to laser), not just the body, so a tall antenna doesn't push it low.
      const cy = height * 0.46 - ((b.top + b.bottom) / 2) * scale + bob;

      drawSatellite(ctx, p, { x: cx, y: cy, scale, t, thrust: reduced ? 0.5 : 0.55 + 0.1 * Math.sin(t * 2), beam, rotation: reduced ? 0 : Math.sin(t * 0.9) * 0.025 });

      if (!reduced) raf = requestAnimationFrame(frame);
    };

    const onResize = (): void => {
      resize();
      if (reduced) frame(0);
    };
    resize();
    raf = requestAnimationFrame(frame);
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
    // With reduced motion there is no animation loop, so re-run (and repaint once) on a new build.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, beam, reduced ? parts : null]);

  return (
    <div className={`mo-asm__preview${className ? ` ${className}` : ''}`}>
      <canvas
        ref={canvasRef}
        className="mo-asm__canvas"
        role="img"
        aria-label={`Preview of satellite ${name ?? ''}: ${parts.body}, ${parts.antenna}, ${parts.laser}, ${parts.thruster}`}
      />
      <div className="mo-asm__grid" aria-hidden="true" />
      {name ? <p className="mo-asm__callsign">{name}</p> : null}
    </div>
  );
}

export default VectorSatellitePreview;
