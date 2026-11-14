/**
 * planetTextureWorker.ts — Builds planet textures off the main thread.
 *
 * Generating a texture is millions of noise evaluations, which froze the page for up to a couple of
 * seconds when it ran on the main thread. Here it runs in a Web Worker on an OffscreenCanvas, and the
 * finished pixel buffers are handed back without copying. The main-thread side is textureLoader.ts.
 */

import { buildPlanetTexture, type PlanetTexture, type SphereArtId } from './planetTextures';

export interface TextureRequest {
  id: SphereArtId;
}

export type TextureResponse = { id: SphereArtId; tex: PlanetTexture } | { id: SphereArtId; error: string };

const scope = self as unknown as {
  onmessage: ((e: MessageEvent<TextureRequest>) => void) | null;
  postMessage: (message: TextureResponse, transfer: Transferable[]) => void;
};

scope.onmessage = (e) => {
  const { id } = e.data;
  try {
    const tex = buildPlanetTexture(id);
    const transfer = [tex.data.buffer, tex.lights?.buffer, tex.clouds?.buffer].filter(
      (b): b is ArrayBuffer => b instanceof ArrayBuffer,
    );
    scope.postMessage({ id, tex }, transfer);
  } catch (err) {
    scope.postMessage({ id, error: err instanceof Error ? err.message : String(err) }, []);
  }
};
