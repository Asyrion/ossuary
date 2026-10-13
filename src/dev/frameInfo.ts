/* The dev menu's frame readout (#fpsInfo), fed each drawn frame through the door. */
import { DEV } from '../state';
import { DEV_STR } from './strings';
import { renderer } from '../render/renderer';
import { onDevFrame } from '../devDoor';
import { $ } from '../util';

/** The dev menu's frame readout (DEV.fps): the frame rate, as the median of the last half second's frames, and what
    the last frame drew. Written only when it changes. */
const frameEl = $('fpsInfo'),
  frameTimes: number[] = [],
  FRAME_WINDOW_MS = 500,
  STALL_MS = 1000;
let frameSpan = 0,
  frameText = '';
onDevFrame((ms) => {
  if (frameEl.hidden === DEV.fps) frameEl.hidden = !DEV.fps;
  if (!DEV.fps || !(ms > 0) || ms > STALL_MS) return;
  frameTimes.push(ms);
  if ((frameSpan += ms) < FRAME_WINDOW_MS) return;
  const median = frameTimes.sort((a, b) => a - b)[frameTimes.length >> 1];
  frameTimes.length = 0;
  frameSpan = 0;
  const text = DEV_STR.frameInfo(Math.round(1000 / median), renderer.info.render.calls, renderer.info.render.triangles);
  if (text !== frameText) frameEl.textContent = frameText = text;
});
