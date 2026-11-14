import { audioManager } from './engine/audioManager';
import { createRoot } from 'react-dom/client';
import App from './App';
import { MISSIONS } from './data/missions';
import { getBody } from './data/celestialBodies';
import { useAssemblyStore } from './store/useAssemblyStore';
import { useGameStore } from './store/useGameStore';
const q = new URLSearchParams(location.search);
const idx = Number(q.get('m') ?? 0);
const m = MISSIONS[idx] as any;
m.segmentSeconds = Number(q.get('seg') ?? 3);
if (q.get('easy') !== '0') m.tier = 1;
useAssemblyStore.getState().setPart('body', 'body-bulwark');
useGameStore.setState({ currentScreen: (q.get('screen') as any) ?? 'explore', selectedMissionId: m.id });
createRoot(document.getElementById('root')!).render(<App />);
const names: string[] = m.targetIds.map((id: string) => getBody(id)?.name ?? id);
let ni = 0, idxc = 0, cur = '';
const key = (code: string, k: string, type: 'keydown' | 'keyup') => window.dispatchEvent(new KeyboardEvent(type, { code, key: k, bubbles: true }));
let dir = 0;
setInterval(() => {
  key('ArrowUp', 'ArrowUp', 'keyup'); key('ArrowDown', 'ArrowDown', 'keyup');
  dir = (dir + 1) % 4;
  if (dir === 1) key('ArrowUp', 'ArrowUp', 'keydown');
  if (dir === 3) key('ArrowDown', 'ArrowDown', 'keydown');
}, 700);
setInterval(() => {
  const locked = document.body.innerText.toUpperCase().includes('MOVEMENT LOCKED');
  if (!locked) { cur = ''; return; }
  if (!cur) { cur = names[ni % names.length]; idxc = 0; }
  if (idxc < cur.length) {
    const ch = cur[idxc++];
    const code = /[a-z]/i.test(ch) ? 'Key' + ch.toUpperCase() : /[0-9]/.test(ch) ? 'Digit' + ch : 'Minus';
    key(code, ch, 'keydown'); key(code, ch, 'keyup');
    if (idxc >= cur.length) ni++;
  }
}, 120);

if (q.get('god') === '1') setInterval(() => { const sim = (window as any).__moSim; if (sim && sim.status === 'flying') { sim.hull = 999; } }, 100);

(window as any).__audio = audioManager; (window as any).__store = useGameStore;

if (q.get('die') === '1') {
  let set = false;
  setInterval(() => {
    const sim = (window as any).__moSim; if (!sim) return;
    if (!set) { sim.hull = 2; set = true; }
    if (sim.status === 'flying' && sim.ship.invuln <= 0)
      sim.asteroids.push({ id: 9000 + Math.floor(Math.random() * 1e6), x: sim.ship.x, y: sim.ship.y, vx: 0, vy: 0, r: 0.06, rot: 0, spin: 0, shape: 0, grazed: false, hit: false });
  }, 100);
}
