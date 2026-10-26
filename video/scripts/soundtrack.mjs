#!/usr/bin/env node
/**
 * Original score and sound design for the demo video, synthesized in code.
 *
 *   npm run soundtrack      → public/tour/audio/soundtrack.m4a
 *
 * Every hit is placed from scripts/events.ts, which reads the same timeline,
 * tour script and physics simulation the picture is rendered from, so sound
 * and picture cannot drift. Deterministic: same input, same file.
 *
 * Music: D major, 102.4 BPM — three bars per feature chapter, so every chapter
 * cut lands on a bar line. Ambient intro → build under the page reveal → beat
 * drops on the first chapter → breakdown → final lift → logo hit and tail.
 */
import { build } from 'esbuild'
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(here, '../out')
const audioDir = path.join(here, '../../public/tour/audio')
mkdirSync(outDir, { recursive: true })
mkdirSync(audioDir, { recursive: true })

// ── Timeline ────────────────────────────────────────────────────────────────

await build({ entryPoints: [path.join(here, 'events.ts')], bundle: true, platform: 'node', format: 'esm', mainFields: ['module', 'main'], outfile: path.join(outDir, 'events.mjs'), logLevel: 'warning' })
const { soundEvents } = await import(pathToFileURL(path.join(outDir, 'events.mjs')).href + `?t=${Date.now()}`)
const { duration, drop, events } = soundEvents()

const SR = 48000
const N = Math.ceil(duration * SR)
const BPM = 102.4
const BEAT = 60 / BPM
const BAR = 4 * BEAT
const S16 = BEAT / 4
const barAt = b => drop + b * BAR
const outroHit = events.find(e => e.type === 'logoHit').t

// ── DSP primitives ──────────────────────────────────────────────────────────

function mulberry32(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(102_4)
const noise = () => rand() * 2 - 1

const mtof = m => 440 * 2 ** ((m - 69) / 12)

function polyBlep(t, dt) {
  if (t < dt) {
    t /= dt
    return t + t - t * t - 1
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt
    return t * t + t + t + 1
  }
  return 0
}

/** Zero-delay-feedback state-variable filter (Zavalishin TPT). */
class SVF {
  ic1 = 0
  ic2 = 0
  lp = 0
  bp = 0
  hp = 0
  run(x, cutoff, q = 0.707) {
    const g = Math.tan((Math.PI * Math.min(cutoff, SR * 0.45)) / SR)
    const k = 1 / q
    const a1 = 1 / (1 + g * (g + k))
    const a2 = g * a1
    const a3 = g * a2
    const v3 = x - this.ic2
    const v1 = a1 * this.ic1 + a2 * v3
    const v2 = this.ic2 + a2 * this.ic1 + a3 * v3
    this.ic1 = 2 * v1 - this.ic1
    this.ic2 = 2 * v2 - this.ic2
    this.lp = v2
    this.bp = v1
    this.hp = x - k * v1 - v2
    return v2
  }
}

const stereo = () => [new Float32Array(N), new Float32Array(N)]
const bus = {
  pump: stereo(), // pad, bass, arp — ducked by the kick
  music: stereo(), // bells, crashes, risers
  drums: stereo(),
  sfx: stereo(),
  verb: stereo(), // reverb send
  delay: stereo(), // ping-pong send
}

/** Constant-power pan, −1 … 1. */
const panGains = pan => [Math.cos(((pan + 1) * Math.PI) / 4), Math.sin(((pan + 1) * Math.PI) / 4)]

/**
 * Render a mono voice into a bus. `fn(i, t)` returns the sample for i-th
 * sample at t seconds since the voice started.
 */
function voice(target, start, length, fn, { gain = 1, pan = 0, verb = 0, delay = 0 } = {}) {
  const i0 = Math.round(start * SR)
  const n = Math.round(length * SR)
  const [gl, gr] = panGains(pan)
  const [L, R] = bus[target]
  const [VL, VR] = bus.verb
  const [DL, DR] = bus.delay
  for (let i = 0; i < n; i++) {
    const j = i0 + i
    if (j < 0) continue
    if (j >= N) break
    const s = fn(i, i / SR) * gain
    if (!Number.isFinite(s)) continue
    L[j] += s * gl
    R[j] += s * gr
    if (verb) {
      VL[j] += s * gl * verb
      VR[j] += s * gr * verb
    }
    if (delay) {
      DL[j] += s * gl * delay
      DR[j] += s * gr * delay
    }
  }
}

const adsr = (t, len, a, d, s, r) => {
  if (t < a) return t / a
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d)
  if (t < len) return s
  return Math.max(0, s * (1 - (t - len) / r))
}
const decay = (t, tau) => Math.exp(-t / tau)

// ── Instruments ─────────────────────────────────────────────────────────────

/** Warm supersaw pad: three detuned anti-aliased saws per note through a breathing low-pass. */
function pad(notes, start, length, { gain = 0.03, bright = 0.5, attack = 0.5, release = 1.4, target = 'pump' } = {}) {
  notes.forEach((m, n) => {
    ;[-0.11, 0, 0.12].forEach((det, v) => {
      const f = mtof(m + det)
      const dt = f / SR
      let phase = rand()
      const filter = new SVF()
      const lfo = 0.13 + 0.05 * v
      voice(
        target,
        start,
        length + release,
        (i, t) => {
          phase += dt
          if (phase >= 1) phase -= 1
          const saw = 2 * phase - 1 - polyBlep(phase, dt)
          const cutoff = 500 + bright * 2600 + 380 * Math.sin(2 * Math.PI * lfo * (start + t))
          return filter.run(saw, cutoff, 0.8) * adsr(t, length, attack, 0.3, 0.85, release)
        },
        { gain, pan: (v - 1) * 0.55 + (n % 2 ? 0.08 : -0.08), verb: 0.32 },
      )
    })
  })
}

/** Plucked synth: saw + square with a fast filter envelope. */
function pluck(m, start, { gain = 0.075, pan = 0, bright = 0.6, length = 0.42, verb = 0.22, delay = 0.2, target = 'pump' } = {}) {
  const f = mtof(m)
  const dt = f / SR
  let p1 = rand()
  let p2 = rand()
  const filter = new SVF()
  voice(
    target,
    start,
    length,
    (i, t) => {
      p1 += dt
      if (p1 >= 1) p1 -= 1
      p2 += dt * 1.003
      if (p2 >= 1) p2 -= 1
      const saw = 2 * p1 - 1 - polyBlep(p1, dt)
      let sq = p2 < 0.5 ? 1 : -1
      sq += polyBlep(p2, dt)
      sq -= polyBlep((p2 + 0.5) % 1, dt)
      const cutoff = 300 + (1200 + bright * 5200) * decay(t, 0.07)
      return filter.run(0.6 * saw + 0.4 * sq, cutoff, 1.1) * decay(t, 0.16) * Math.min(1, t / 0.002)
    },
    { gain, pan, verb, delay },
  )
}

/** Sub bass with a little filtered saw for definition on small speakers. */
function bass(m, start, length, gain = 0.2) {
  const f = mtof(m)
  const dt = f / SR
  let ph = 0
  let saw = rand()
  const filter = new SVF()
  voice(
    'pump',
    start,
    length + 0.06,
    (i, t) => {
      ph += dt
      saw += dt
      if (saw >= 1) saw -= 1
      // Less pure sub, more harmonics: the line still reads on laptop and phone speakers.
      const s = 0.72 * Math.sin(2 * Math.PI * ph) + 0.55 * filter.run(2 * saw - 1 - polyBlep(saw, dt), 560, 0.9)
      return Math.tanh(1.4 * s) * adsr(t, length, 0.004, 0.12, 0.75, 0.06)
    },
    { gain },
  )
}

const kicks = []
function kick(start, gain = 0.6) {
  kicks.push(start)
  let ph = 0
  const click = new SVF()
  voice(
    'drums',
    start,
    0.5,
    (i, t) => {
      const f = 52 + 92 * Math.exp(-t / 0.035)
      ph += f / SR
      const body = Math.sin(2 * Math.PI * ph) * decay(t, 0.21)
      const tick = t < 0.006 ? click.run(noise(), 3500, 0.7) * (1 - t / 0.006) * 0.6 : 0
      return Math.tanh(1.6 * body) + tick
    },
    { gain },
  )
}

function clap(start, gain = 0.16) {
  const filter = new SVF()
  voice(
    'drums',
    start,
    0.32,
    (i, t) => {
      const bursts = [0, 0.009, 0.018].reduce((sum, o) => sum + (t >= o ? decay(t - o, 0.007) : 0), 0) * 0.5
      filter.run(noise(), 1300, 1.3)
      return filter.bp * (bursts + decay(t, 0.11)) * 2.2
    },
    { gain, verb: 0.3 },
  )
}

function snare(start, gain = 0.12) {
  const filter = new SVF()
  let ph = 0
  voice(
    'drums',
    start,
    0.25,
    (i, t) => {
      ph += 185 / SR
      filter.run(noise(), 2400, 0.8)
      return (filter.bp * 1.8 + Math.sin(2 * Math.PI * ph) * 0.4) * decay(t, 0.07)
    },
    { gain, verb: 0.22 },
  )
}

function hat(start, { open = false, gain = 0.045, pan = 0.2 } = {}) {
  const filter = new SVF()
  voice('drums', start, open ? 0.45 : 0.08, (i, t) => {
    filter.run(noise(), 8200, 0.9)
    return filter.hp * decay(t, open ? 0.16 : 0.025)
  }, { gain, pan })
}

function shaker(start, gain = 0.02, pan = -0.3) {
  const filter = new SVF()
  voice('drums', start, 0.09, (i, t) => {
    filter.run(noise(), 6200, 1.2)
    return filter.bp * Math.min(1, t / 0.006) * decay(t, 0.03)
  }, { gain, pan })
}

function crash(start, gain = 0.1) {
  const filter = new SVF()
  voice('music', start, 2.6, (i, t) => {
    filter.run(noise(), 5200, 0.6)
    return filter.hp * decay(t, 0.75)
  }, { gain, verb: 0.25 })
}

/** FM bell — the melodic "glass" voice used for the motif and UI chimes. */
function bell(m, start, { gain = 0.07, length = 2.2, pan = 0, verb = 0.45, delay = 0.15, target = 'music', ratio = 3.5 } = {}) {
  const f = mtof(m)
  let pc = 0
  let pm = 0
  voice(
    target,
    start,
    length,
    (i, t) => {
      pc += f / SR
      pm += (f * ratio) / SR
      const index = 0.25 + 2.4 * decay(t, 0.22)
      return Math.sin(2 * Math.PI * pc + index * Math.sin(2 * Math.PI * pm)) * decay(t, length / 3.2) * Math.min(1, t / 0.003)
    },
    { gain, pan, verb, delay },
  )
}

function subBoom(start, { gain = 0.5, from = 62, to = 34, length = 1.8 } = {}) {
  let ph = 0
  voice('music', start, length, (i, t) => {
    ph += (to + (from - to) * Math.exp(-t / 0.25)) / SR
    return Math.tanh(1.3 * Math.sin(2 * Math.PI * ph)) * decay(t, length / 3.5)
  }, { gain })
}

/** Noise + saw riser ending exactly on `end`. */
function riser(start, end, gain = 0.1) {
  const len = end - start
  const filter = new SVF()
  let ph = 0
  voice('music', start, len, (i, t) => {
    const p = t / len
    filter.run(noise(), 350 + 7800 * p * p, 1.6)
    ph += (110 * 2 ** (p * 1.5)) / SR
    const tone = 2 * (ph % 1) - 1
    return (filter.bp * 1.6 + tone * 0.12 * p) * p * p
  }, { gain, verb: 0.35, pan: 0 })
}

/** Reversed cymbal swelling into `end`. */
function reverseCymbal(end, len = 1.6, gain = 0.14) {
  const filter = new SVF()
  const start = end - len
  voice('music', start, len, (i, t) => {
    filter.run(noise(), 4800, 0.7)
    return filter.hp * Math.exp(-(len - t) / 0.42)
  }, { gain, verb: 0.2 })
}

// ── Sound design (one function per kind of on-screen action) ────────────────

/** Air whoosh: band-passed noise sweeping across the stereo field. */
function whoosh(start, len, { gain = 0.11, up = true, low = 280, high = 3600, q = 1.4, panFrom = -0.6, panTo = 0.6, verb = 0.2 } = {}) {
  const filter = new SVF()
  const i0 = Math.round(start * SR)
  const n = Math.round(len * SR)
  const [L, R] = bus.sfx
  const [VL, VR] = bus.verb
  for (let i = 0; i < n; i++) {
    const j = i0 + i
    if (j < 0 || j >= N) continue
    const p = i / n
    const sweep = up ? p : 1 - p
    filter.run(noise(), low * (high / low) ** sweep, q)
    const env = Math.sin(Math.PI * p) ** 1.6
    const s = filter.bp * env * gain
    const [gl, gr] = panGains(panFrom + (panTo - panFrom) * p)
    L[j] += s * gl
    R[j] += s * gr
    VL[j] += s * gl * verb
    VR[j] += s * gr * verb
  }
}

/** Crisp UI click: transient + short tone + soft body. */
function click(start, gain = 0.26) {
  const filter = new SVF()
  let ph = 0
  let pl = 0
  voice('sfx', start, 0.09, (i, t) => {
    ph += 1900 / SR
    pl += 210 / SR
    const transient = t < 0.004 ? filter.run(noise(), 5000, 0.8) * (1 - t / 0.004) : 0
    return transient * 0.9 + Math.sin(2 * Math.PI * ph) * decay(t, 0.008) * 0.5 + Math.sin(2 * Math.PI * pl) * decay(t, 0.02) * 0.6
  }, { gain, verb: 0.08 })
}

const PENTA = [0, 2, 4, 7, 9] // D major pentatonic degrees
const pentaNote = (base, step) => base + PENTA[((step % 5) + 5) % 5] + 12 * Math.floor(step / 5)

/** Spotlight "bloop": a pitched sine that blips upward, in key. */
function pop(start, step = 0, gain = 0.1) {
  const f0 = mtof(pentaNote(74, step))
  let ph = 0
  voice('sfx', start, 0.22, (i, t) => {
    ph += (f0 * (0.82 + 0.18 * Math.min(1, t / 0.03))) / SR
    return Math.sin(2 * Math.PI * ph) * Math.min(1, t / 0.002) * decay(t, 0.06)
  }, { gain, verb: 0.22, pan: 0.15 })
}

/** Soft woody tick for list items and labels. */
function tick(start, step = 0, gain = 0.045) {
  const f = mtof(pentaNote(86, step))
  let ph = 0
  voice('sfx', start, 0.06, (i, t) => {
    ph += f / SR
    return Math.sin(2 * Math.PI * ph) * decay(t, 0.012)
  }, { gain, pan: -0.15 + 0.1 * (step % 4), verb: 0.15 })
}

/** Marimba-like tone for each physics landing. */
function tock(start, strength, index) {
  const m = pentaNote(62, (index * 3) % 8)
  const f = mtof(m)
  let a = 0
  let b = 0
  voice('sfx', start, 0.9, (i, t) => {
    a += f / SR
    b += (f * 4) / SR
    return (Math.sin(2 * Math.PI * a) * decay(t, 0.28) + 0.35 * Math.sin(2 * Math.PI * b) * decay(t, 0.05)) * Math.min(1, t / 0.0015)
  }, { gain: 0.018 + 0.04 * strength, pan: ((index % 5) - 2) * 0.22, verb: 0.35 })
}

/** Camera move: a gentle air swoosh with a faint tonal glide. */
function zoom(start, len, inward) {
  whoosh(start, len * 0.95, { gain: 0.14, up: inward, low: 500, high: 4200, q: 0.9, panFrom: inward ? -0.25 : 0.25, panTo: inward ? 0.25 : -0.25, verb: 0.25 })
  let ph = 0
  voice('sfx', start, len, (i, t) => {
    const p = t / len
    ph += (inward ? 520 + 260 * p : 780 - 260 * p) / SR
    return Math.sin(2 * Math.PI * ph) * Math.sin(Math.PI * p) ** 2
  }, { gain: 0.028, verb: 0.3 })
}

function shimmer(start, gain = 0.05) {
  ;[86, 90, 93, 98, 102].forEach((m, i) => bell(m, start + i * 0.035, { gain, length: 2.6, pan: (i - 2) * 0.3, verb: 0.65, target: 'sfx' }))
}

// ── Score ───────────────────────────────────────────────────────────────────

const CHORDS = {
  D: { pad: [50, 57, 64, 66], bass: 38, arp: [62, 66, 69, 74, 76, 69] },
  A: { pad: [49, 57, 61, 64], bass: 33, arp: [61, 64, 69, 73, 76, 69] },
  Bm: { pad: [47, 54, 62, 66], bass: 35, arp: [59, 62, 66, 71, 74, 66] },
  G: { pad: [47, 55, 62, 67], bass: 31, arp: [59, 62, 67, 71, 74, 67] },
  Asus: { pad: [50, 57, 62, 64], bass: 33, arp: [62, 64, 69, 74, 76, 69] },
}
const LOOP = ['D', 'A', 'Bm', 'G']
const ARP_PATTERN = [0, 2, 1, 3, 2, 4, 3, 1, 0, 2, 1, 3, 5, 4, 3, 2]
// Four-bar bell motif: [bar, 16th, midi, length in 16ths]
const MOTIF = [
  [0, 0, 78, 3], [0, 4, 81, 2], [0, 6, 83, 4], [0, 12, 81, 4],
  [1, 0, 76, 4], [1, 6, 73, 2], [1, 8, 76, 6],
  [2, 0, 78, 3], [2, 4, 74, 2], [2, 6, 71, 4], [2, 12, 74, 4],
  [3, 0, 74, 4], [3, 6, 71, 2], [3, 8, 67, 4], [3, 12, 69, 4],
]

const lastGrooveBar = Math.floor((outroHit - drop) / BAR) // bars after this one are the outro

function barChord(b) {
  if (b >= 30) return ['G', 'A', 'Bm'][Math.min(b - 30, 2)]
  return LOOP[((b % 4) + 4) % 4]
}

function playBar(b, { kickOn = true, bassOn = true, clapOn = false, hats = true, shakerOn = false, bright = 0.5, arpOn = true, arpBright = 0.6, motif = false, motifUp = 0 }) {
  const t = barAt(b)
  const name = barChord(b)
  const chord = CHORDS[name]
  const end = Math.min(t + BAR, outroHit - 0.05)
  if (end <= t) return
  pad(chord.pad, t, end - t, { gain: 0.026, bright, attack: 0.08, release: 0.9 })
  for (let s = 0; s < 16; s++) {
    const st = t + s * S16
    if (st >= outroHit - 0.12) break
    if (arpOn) pluck(chord.arp[ARP_PATTERN[s] % chord.arp.length], st, { gain: s % 4 === 0 ? 0.07 : 0.055, pan: s % 2 ? 0.35 : -0.35, bright: arpBright })
    if (bassOn && s % 2 === 0) bass(chord.bass + (s === 14 ? 12 : 0), st, S16 * 1.7, s % 4 === 0 ? 0.2 : 0.15)
    if (kickOn && s % 4 === 0) kick(st)
    if (clapOn && (s === 4 || s === 12)) clap(st)
    if (hats && s % 4 === 2) hat(st, { gain: 0.056 })
    if (hats && s === 14 && b % 2 === 1) hat(st, { open: true, gain: 0.05, pan: -0.25 })
    if (shakerOn) shaker(st, s % 2 ? 0.02 : 0.03)
  }
  if (motif) {
    for (const [mb, s16, m, len] of MOTIF) {
      if (mb !== ((b % 4) + 4) % 4) continue
      const st = t + s16 * S16
      if (st < outroHit - 0.2) bell(m + motifUp, st, { gain: motifUp ? 0.07 : 0.09, length: Math.max(0.9, len * S16 * 2.4), pan: 0.2 })
    }
  }
}

// Intro — ambient bed under the physics.
pad(CHORDS.D.pad.map(m => m + 12), 0.0, barAt(-3) - 0.2, { gain: 0.022, bright: 0.25, attack: 2.4, release: 2.4, target: 'music' })
pad([38, 45], 0.0, barAt(-3), { gain: 0.018, bright: 0.1, attack: 3, release: 2, target: 'music' })

// Build — under the page reveal, filter opening into the drop.
;[-3, -2, -1].forEach((b, k) => {
  const name = ['Bm', 'G', 'Asus'][k]
  const chord = CHORDS[name]
  const t = barAt(b)
  pad(chord.pad, t, BAR, { gain: 0.022, bright: 0.25 + k * 0.18, attack: k === 0 ? 0.9 : 0.1, release: 0.6, target: 'music' })
  for (let s = 0; s < 16; s++) {
    const st = t + s * S16
    if (st < events.find(e => e.type === 'transition').t) continue // arp starts with the reveal
    pluck(chord.arp[ARP_PATTERN[s] % chord.arp.length], st, { gain: 0.035 + 0.02 * k, pan: s % 2 ? 0.35 : -0.35, bright: 0.15 + 0.25 * k, target: 'music' })
    if (k === 2 && s % 2 === 0) hat(st, { gain: 0.015 + 0.002 * s })
  }
  if (k >= 1) bass(chord.bass, t, BAR * 0.95, 0.1)
})
// Snare roll through the last bar, accelerating, then riser + reverse cymbal into the drop.
for (let s = 0; s < 16; s++) snare(barAt(-1) + s * S16, 0.025 + 0.006 * s)
for (let s = 0; s < 8; s++) snare(barAt(-1) + 3 * BEAT + s * (S16 / 2), 0.05 + 0.008 * s)
riser(barAt(-2), drop, 0.11)
reverseCymbal(drop, 1.8)

// Groove — the chapters.
for (let b = 0; b <= lastGrooveBar; b++) {
  if (b < 8) playBar(b, { bright: 0.45, arpBright: 0.55 })
  else if (b < 16) playBar(b, { clapOn: true, shakerOn: true, bright: 0.55, arpBright: 0.65, motif: true })
  else if (b < 18) playBar(b, { kickOn: false, bassOn: false, hats: false, bright: 0.7, arpBright: 0.3, motif: true })
  else if (b < 20) playBar(b, { kickOn: true, clapOn: b === 19, hats: true, bright: 0.6, arpBright: 0.45 + (b - 18) * 0.2 })
  else playBar(b, { clapOn: true, shakerOn: true, bright: 0.68, arpBright: 0.75, motif: b < 30, motifUp: 12 })
}
crash(drop, 0.11)
crash(barAt(8), 0.07)
riser(barAt(18), barAt(20), 0.09)
reverseCymbal(barAt(20), 1.6, 0.12)
for (let s = 0; s < 16; s++) snare(barAt(19) + s * S16, 0.02 + 0.005 * s)
crash(barAt(20), 0.11)
crash(barAt(30), 0.09)
// Lift into the logo.
riser(outroHit - 2.6, outroHit, 0.12)
reverseCymbal(outroHit, 1.9, 0.15)

// Outro — the final hit and a long, warm tail.
const tail = duration - outroHit
pad(CHORDS.D.pad, outroHit, tail - 1.6, { gain: 0.032, bright: 0.55, attack: 0.01, release: 1.6, target: 'music' })
pad(CHORDS.D.pad.map(m => m + 12), outroHit, tail - 1.6, { gain: 0.016, bright: 0.7, attack: 0.01, release: 1.6, target: 'music' })
bass(38, outroHit, 2.4, 0.22)
kick(outroHit, 0.7)
subBoom(outroHit, { gain: 0.45 })
crash(outroHit, 0.13)
;[74, 78, 81, 86].forEach((m, i) => bell(m, outroHit + i * 0.06, { gain: 0.06, length: 4.5, pan: (i - 1.5) * 0.35, verb: 0.6 }))

// ── Sound effects from the picture ──────────────────────────────────────────

const counts = {}
for (const e of events) {
  counts[e.type] = (counts[e.type] || 0) + 1
  switch (e.type) {
    case 'titleHit':
      subBoom(e.t, { gain: 0.34, from: 70, to: 40, length: 1.6 })
      whoosh(e.t - 0.35, 0.5, { gain: 0.07, low: 400, high: 6000 })
      shimmer(e.t + 0.02, 0.035)
      break
    case 'land':
      tock(e.t, e.strength ?? 0.5, e.index ?? 0)
      break
    case 'assemble':
      whoosh(e.t - 0.1, e.duration ?? 1.4, { gain: 0.09, low: 250, high: 5200, panFrom: -0.8, panTo: 0.8 })
      break
    case 'settle':
      bell(pentaNote(62, e.index ?? 0), e.t, { gain: 0.012, length: 0.9, pan: ((e.index ?? 0) % 5 - 2) * 0.25, verb: 0.35, target: 'sfx' })
      break
    case 'pop':
      pop(e.t, (e.index ?? 0) * 2, 0.16 * (e.strength ?? 1))
      break
    case 'tick':
      tick(e.t, e.index ?? 0, 0.2 * (e.strength ?? 1))
      break
    case 'transition':
      // Lead slightly into the cut so the whoosh peaks on it.
      whoosh(e.t - 0.32, 0.62, { gain: 0.16 * (e.strength ?? 0.7) + 0.05, low: 260, high: 4800 })
      break
    case 'swish':
      whoosh(e.t, 0.28, { gain: 0.1, low: 1500, high: 7000, panFrom: 0.2, panTo: 0.7, verb: 0.1 })
      break
    case 'zoomIn':
      zoom(e.t, e.duration ?? 1.1, true)
      break
    case 'zoomOut':
      zoom(e.t, e.duration ?? 1.1, false)
      break
    case 'click':
      click(e.t)
      break
    case 'rise':
      whoosh(e.t, e.duration ?? 1.2, { gain: 0.12, low: 300, high: 3000, panFrom: -0.4, panTo: 0.2 })
      break
    case 'chip':
      pluck(pentaNote(69, (e.index ?? 0) % 11), e.t, { gain: 0.065, bright: 0.8, pan: ((e.index ?? 0) % 6 - 2.5) * 0.18, verb: 0.3, delay: 0.1, target: 'sfx' })
      break
    case 'logoHit':
      break // scored above with the final chord
    case 'shimmer':
      shimmer(e.t, 0.065)
      break
    case 'chime':
      bell(81, e.t, { gain: 0.11, length: 2.2, pan: -0.15, target: 'sfx' })
      bell(86, e.t + 0.14, { gain: 0.11, length: 2.6, pan: 0.15, target: 'sfx' })
      break
  }
}

// ── Effects and mix ─────────────────────────────────────────────────────────

/** Bus levels into the master. */
const STEMS = { pump: 1.0, music: 1.1, drums: 0.52, sfx: 1.0 }

/** Sidechain: duck the pump bus after every kick for the breathing groove. */
{
  const gainCurve = new Float32Array(N).fill(1)
  for (const k of kicks) {
    const i0 = Math.round(k * SR)
    const n = Math.round(0.42 * SR)
    for (let i = 0; i < n && i0 + i < N; i++) {
      const g = 1 - 0.55 * Math.exp(-i / SR / 0.11) * Math.min(1, i / (0.004 * SR))
      if (i0 + i >= 0) gainCurve[i0 + i] = Math.min(gainCurve[i0 + i], g)
    }
  }
  for (const ch of bus.pump) for (let i = 0; i < N; i++) ch[i] *= gainCurve[i]
}

/** Freeverb (Jezar), tuned for 48 kHz, with 18 ms pre-delay. */
function freeverb([inL, inR], { room = 0.84, damp = 0.32, spread = 25 } = {}) {
  const scale = SR / 44100
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map(n => Math.round(n * scale))
  const allpasses = [556, 441, 341, 225].map(n => Math.round(n * scale))
  const pre = Math.round(0.018 * SR)
  const make = offset => ({
    combs: combs.map(n => ({ buf: new Float32Array(n + offset), i: 0, store: 0 })),
    alls: allpasses.map(n => ({ buf: new Float32Array(n + offset), i: 0 })),
  })
  const chans = [make(0), make(Math.round(spread * scale))]
  const out = stereo()
  const feedback = room * 0.28 + 0.7
  ;[inL, inR].forEach((input, c) => {
    const { combs: cs, alls } = chans[c]
    const o = out[c]
    for (let j = 0; j < N; j++) {
      const x = (j >= pre ? input[j - pre] : 0) * 0.015
      let acc = 0
      for (const cb of cs) {
        const y = cb.buf[cb.i]
        cb.store = y * (1 - damp) + cb.store * damp
        cb.buf[cb.i] = x + cb.store * feedback
        if (++cb.i >= cb.buf.length) cb.i = 0
        acc += y
      }
      for (const ap of alls) {
        const b = ap.buf[ap.i]
        ap.buf[ap.i] = acc + b * 0.5
        acc = b - acc
        if (++ap.i >= ap.buf.length) ap.i = 0
      }
      o[j] = acc
    }
  })
  return out
}

/** Ping-pong dotted-eighth delay (wet only) with a darkening feedback path. */
function pingPong([inL, inR], { time = 0.75 * BEAT, feedback = 0.36 } = {}) {
  const d = Math.round(time * SR)
  const out = stereo()
  const lineL = new Float32Array(N)
  const lineR = new Float32Array(N)
  const lpL = new SVF()
  const lpR = new SVF()
  for (let j = 0; j < N; j++) {
    const dl = j >= d ? lineL[j - d] : 0
    const dr = j >= d ? lineR[j - d] : 0
    // Mono input enters the left line; each repeat crosses to the other side.
    lineL[j] = (inL[j] + inR[j]) * 0.5 + lpR.run(dr, 3800) * feedback
    lineR[j] = lpL.run(dl, 3800) * feedback
    out[0][j] = dl
    out[1][j] = dr
  }
  return out
}

const verb = freeverb(bus.verb)
const delay = pingPong(bus.delay)

const master = stereo()
const stems = STEMS
for (const [name, g] of Object.entries(stems)) for (let c = 0; c < 2; c++) for (let j = 0; j < N; j++) master[c][j] += bus[name][c][j] * g
for (let c = 0; c < 2; c++)
  for (let j = 0; j < N; j++) master[c][j] += verb[c][j] * 0.85 + delay[c][j] * 0.5

/** Master: high-pass, tone shelves, glue compression, soft clip, fades. */
{
  const hpL = new SVF()
  const hpR = new SVF()
  const shelf = [0, 1].map(() => ({ low: new SVF(), high: new SVF() }))
  const lowGain = 10 ** (-3.5 / 20) - 1 // −3.5 dB below ~60 Hz
  const highGain = 10 ** (2.5 / 20) - 1 // +2.5 dB above ~9 kHz
  let env = 0
  const attack = Math.exp(-1 / (0.012 * SR))
  const release = Math.exp(-1 / (0.22 * SR))
  const threshold = 0.25
  const ratio = 2.4
  const fadeIn = Math.round(0.08 * SR)
  const fadeOut = Math.round(1.8 * SR)
  for (let j = 0; j < N; j++) {
    hpL.run(master[0][j], 28, 0.7)
    hpR.run(master[1][j], 28, 0.7)
    let l = hpL.hp
    let r = hpR.hp
    shelf[0].low.run(l, 60, 0.7)
    shelf[0].high.run(l, 9000, 0.7)
    shelf[1].low.run(r, 60, 0.7)
    shelf[1].high.run(r, 9000, 0.7)
    l += shelf[0].low.lp * lowGain + shelf[0].high.hp * highGain
    r += shelf[1].low.lp * lowGain + shelf[1].high.hp * highGain
    const level = Math.max(Math.abs(l), Math.abs(r))
    env = level > env ? attack * env + (1 - attack) * level : release * env + (1 - release) * level
    const gain = env > threshold ? (threshold + (env - threshold) / ratio) / env : 1
    l = Math.tanh(l * gain * 1.15) / 1.15
    r = Math.tanh(r * gain * 1.15) / 1.15
    const fade = Math.min(1, j / fadeIn, (N - j) / fadeOut)
    master[0][j] = l * fade
    master[1][j] = r * fade
  }
}

// Diagnostics: section balance and how far each kind of effect stands out of the music.
if (process.env.SOUNDTRACK_DEBUG) {
  const rms = (name, t0, t1) => {
    let sum = 0
    let n = 0
    for (const ch of bus[name]) for (let j = Math.round(t0 * SR); j < Math.min(N, Math.round(t1 * SR)); j++) (sum += ch[j] * ch[j]), n++
    return 10 * Math.log10(sum / n + 1e-12) + 20 * Math.log10(STEMS[name] ?? 1)
  }
  const sections = { intro: [0, 7.5], build: [7.5, drop], groove: [drop, barAt(16)], breakdown: [barAt(16), barAt(18)], finale: [barAt(20), outroHit], tail: [outroHit, duration] }
  for (const [name, [t0, t1]] of Object.entries(sections))
    console.log(`${name.padEnd(10)} drums ${rms('drums', t0, t1).toFixed(1)}  pump ${rms('pump', t0, t1).toFixed(1)}  music ${rms('music', t0, t1).toFixed(1)}`)
  const peak = (name, t0, t1) => {
    let p = 0
    for (const ch of bus[name]) for (let j = Math.max(0, Math.round(t0 * SR)); j < Math.min(N, Math.round(t1 * SR)); j++) p = Math.max(p, Math.abs(ch[j]))
    return 20 * Math.log10(p + 1e-9)
  }
  const bed = (t0, t1) => 10 * Math.log10(['drums', 'pump', 'music'].reduce((sum, n) => sum + 10 ** (rms(n, t0, t1) / 10), 0))
  const byType = {}
  const windowOf = e => (e.type === 'transition' ? [e.t - 0.35, e.t + 0.3] : [e.t, e.t + Math.max(0.12, e.duration ?? 0)])
  for (const e of events) {
    const [a, b] = windowOf(e)
    ;(byType[e.type] ??= []).push(peak('sfx', a, b) - bed(e.t - 0.4, e.t + 0.4))
  }
  for (const [type, list] of Object.entries(byType)) {
    list.sort((x, y) => x - y)
    console.log(`sfx ${type.padEnd(10)} peak over bed: median ${list[list.length >> 1].toFixed(1)} dB`)
  }
}

// Peak-normalize to −1 dBFS before mastering loudness.
let peak = 0
for (const ch of master) for (const s of ch) peak = Math.max(peak, Math.abs(s))
const norm = 0.89 / peak
const stats = Object.fromEntries(
  Object.entries(stems).map(([name]) => {
    let sum = 0
    for (const ch of bus[name]) for (const s of ch) sum += s * s
    return [name, (10 * Math.log10(sum / (2 * N) + 1e-12)).toFixed(1) + ' dB rms']
  }),
)

// ── Write and master ────────────────────────────────────────────────────────

function wav(file, [L, R], gain) {
  const data = Buffer.alloc(N * 2 * 4)
  for (let j = 0; j < N; j++) {
    data.writeFloatLE(L[j] * gain, j * 8)
    data.writeFloatLE(R[j] * gain, j * 8 + 4)
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(3, 20) // IEEE float
  header.writeUInt16LE(2, 22)
  header.writeUInt32LE(SR, 24)
  header.writeUInt32LE(SR * 8, 28)
  header.writeUInt16LE(8, 32)
  header.writeUInt16LE(32, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  writeFileSync(file, Buffer.concat([header, data]))
}

const mixFile = path.join(outDir, 'soundtrack-mix.wav')
wav(mixFile, master, norm)

// Two-pass EBU R128 loudness normalisation to −16 LUFS / −1.5 dBTP, then AAC.
const ffmpeg = args => {
  const run = spawnSync('npx', ['remotion', 'ffmpeg', '-hide_banner', '-nostats', ...args], { cwd: path.join(here, '..'), encoding: 'utf8' })
  if (run.status !== 0) throw new Error(run.stderr)
  return run.stderr // ffmpeg reports on stderr
}
const report = ffmpeg(['-i', mixFile, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'])
const json = report.match(/\{[^{}]*"target_offset"[^{}]*\}/)
const m = json ? JSON.parse(json[0]) : null
const loudnorm = m
  ? `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`
  : 'loudnorm=I=-16:TP=-1.5:LRA=11'
const outFile = path.join(audioDir, 'soundtrack.m4a')
ffmpeg(['-y', '-i', mixFile, '-af', `${loudnorm},aresample=48000`, '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', '-f', 'mp4', outFile])

console.log(`events placed: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}`)
console.log(`stems: ${Object.entries(stats).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
console.log(`peak before normalise ${(20 * Math.log10(peak)).toFixed(1)} dBFS · input loudness ${m ? m.input_i + ' LUFS' : 'n/a'}`)
console.log(`wrote ${path.relative(path.join(here, '../..'), outFile)} (${duration.toFixed(2)} s)`)
