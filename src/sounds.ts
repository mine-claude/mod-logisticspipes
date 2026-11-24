// @ts-check

/**
 * Registers all synthesized sounds for the Logistics Pipes mod.
 * @param {import('../../packages/cli/types/mineclaude-mod.d.ts').ModContext} ctx
 */
export function registerSounds(ctx) {
  // Sound when an item routes through the pipe network (mechanical whoosh/pulse)
  ctx.sounds.synth('pipe_route', {
    layers: [
      { kind: 'tone', freq: 440, end: 880, dur: 0.12, type: 'sine', gain: 0.08 },
      { kind: 'noise', freq: 1200, q: 2, dur: 0.08, gain: 0.04 },
    ],
  });

  // Sound when an item is inserted into destination chest
  ctx.sounds.synth('pipe_insert', {
    layers: [
      { kind: 'tone', freq: 520, end: 650, dur: 0.1, type: 'triangle', gain: 0.1 },
      { kind: 'tone', freq: 780, end: 1040, dur: 0.08, type: 'sine', gain: 0.07 },
    ],
  });

  // Sound when an item is extracted from a provider chest
  ctx.sounds.synth('pipe_extract', {
    layers: [
      { kind: 'tone', freq: 650, end: 480, dur: 0.1, type: 'triangle', gain: 0.09 },
      { kind: 'noise', freq: 1600, q: 4, dur: 0.05, gain: 0.05 },
    ],
  });

  // Sound when configuring a pipe with a wrench / pipe controller
  ctx.sounds.synth('wrench', {
    layers: [
      { kind: 'tone', freq: 880, end: 1200, dur: 0.06, type: 'square', gain: 0.06 },
      { kind: 'tone', freq: 1320, end: 1760, dur: 0.08, type: 'sine', gain: 0.08 },
    ],
  });

  // Soldering sound for chip fabrication
  ctx.sounds.synth('solder', {
    layers: [
      { kind: 'noise', freq: 3500, q: 8, dur: 0.18, gain: 0.1 },
      { kind: 'tone', freq: 220, end: 180, dur: 0.2, type: 'sawtooth', gain: 0.05 },
    ],
  });

  // Sound for request acknowledgment
  ctx.sounds.synth('request_ping', {
    layers: [
      { kind: 'tone', freq: 587.33, end: 880, dur: 0.15, type: 'sine', gain: 0.1 },
      { kind: 'tone', freq: 880, end: 1174.66, dur: 0.2, type: 'sine', gain: 0.12 },
    ],
  });
}
