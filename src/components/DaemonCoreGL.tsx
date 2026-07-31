import { useEffect, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Clock,
  Color,
  NormalBlending,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from 'three'
import { DAEMON_LOGO_POINTS } from './daemonLogoGeometry'
import { useInView } from '../lib/useInView'

/** Core DÆMON — "ologramma Jarvis" (three.js, chunk lazy solo per l'Overview).
 *
 *  Il logo è un WIREFRAME di particelle: il contorno vettoriale vero della
 *  stella a 8 punte (daemonLogoGeometry, niente PNG a runtime) ricampionato
 *  per lunghezza d'arco — densità uniforme lungo il perimetro, jitter minimo,
 *  brillanza variabile per particella. Attorno, 2 orbite ellittiche inclinate
 *  di particelle morbide con flusso di energia. Il contorno ruota lento (in
 *  shader, così il campo puntatore resta in coordinate mondo).
 *
 *  Interazione: campo puntatore LOCALE (swirl+luce solo vicino al cursore),
 *  impulso radiale periodico, hover = ignizione sobria.
 *
 *  Colori: risolti a runtime dalle CSS var del tema (--ember / --amber,
 *  gradiente incandescenza §2.4) — rende su void scuro e parchment chiaro.
 *  Il chiamante gestisce i fallback SVG; qui solo l'errore di init. */

// ── taratura ─────────────────────────────────────────────────────────────
const CONTOUR_COUNT = 1500
const CONTOUR_SIZE = 1.0
const CONTOUR_SIZE_JITTER = 0.4
const CONTOUR_JITTER = 0.016 // spessore del tratto: quasi niente, è un filo
const CONTOUR_Z = 0.1

// orbite: [semiasse x, semiasse y, tilt X, tilt Y, velocità (segno=verso), teste, count, size]
const ORBITS: [number, number, number, number, number, number, number, number][] = [
  [1.28, 1.12, 0.5, 0.08, 0.55, 1, 190, 1.8],
  [1.5, 1.3, -0.42, 0.28, -0.4, 2, 160, 1.55],
]

// campo puntatore
const POINTER_RADIUS = 0.5
const POINTER_PUSH = 0.08
const POINTER_SWIRL = 0.13

// impulso radiale
const PULSE_PERIOD_REST = 4.2
const PULSE_PERIOD_HOVER = 2.4

// contorno: micro-tremolio olografico, rotazione lenta, campo puntatore, impulso
const CONTOUR_VERT = /* glsl */ `
  attribute float aSeed;
  attribute float aSize;
  uniform float uTime;
  uniform float uExcite;
  uniform float uBreathe;
  uniform float uSpin;
  uniform float uDpr;
  uniform float uScale;
  uniform vec2 uPointer;
  uniform float uPointerStrength;
  uniform float uPulse;
  uniform float uPulseGain;
  varying float vGlow;
  void main() {
    float t = uTime;
    vec3 p = position;
    // rotazione lenta del wireframe (in shader: il puntatore resta in mondo)
    float ca = cos(uSpin);
    float sa = sin(uSpin);
    p.xy = mat2(ca, -sa, sa, ca) * p.xy;
    // tremolio olografico minimo: il contorno resta leggibile
    float amp = 0.006 + aSeed * 0.01 + uExcite * 0.02;
    p.x += sin(t * (1.2 + aSeed * 2.0) + aSeed * 6.283) * amp;
    p.y += cos(t * (1.0 + aSeed * 1.7) + aSeed * 12.56) * amp;
    p *= uBreathe;

    // campo puntatore LOCALE: swirl + spinta con falloff morbido
    vec2 d = p.xy - uPointer;
    float dist = length(d);
    float fall = smoothstep(${POINTER_RADIUS}, 0.0, dist) * uPointerStrength;
    if (fall > 0.0) {
      vec2 dir = dist > 0.0001 ? d / dist : vec2(1.0, 0.0);
      vec2 tang = vec2(-dir.y, dir.x);
      p.xy += dir * fall * ${POINTER_PUSH} + tang * fall * ${POINTER_SWIRL};
    }

    // fronte d'onda radiale
    float rr = length(p.xy);
    float wave = exp(-pow((rr - uPulse) * 9.0, 2.0)) * uPulseGain;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float shimmer = 0.9 + 0.1 * sin(t * (2.2 + aSeed * 3.5) + aSeed * 23.0);
    float size = aSize * shimmer * (1.0 + uExcite * 0.25 + fall * 0.7 + wave * 0.5);
    gl_PointSize = size * (uScale / -mv.z) * uDpr;
    // brillanza variabile lungo il filo; puntatore e impulso spingono oltre 1
    vGlow = 0.5 + 0.5 * sin(t * (1.8 + aSeed * 3.2) + aSeed * 40.0);
    vGlow = min(1.6, vGlow + fall * 1.2 + wave * 1.0);
  }
`

// orbite: posizione parametrica sull'ellisse, luminosità dal flusso (testa+coda)
const ORBIT_VERT = /* glsl */ `
  attribute float aSeed;
  attribute float aSize;
  uniform float uTime;
  uniform float uExcite;
  uniform float uDpr;
  uniform float uScale;
  uniform vec2 uRadii;
  uniform float uSpeed;
  uniform float uHeads;
  uniform float uPulse;
  uniform float uPulseGain;
  varying float vGlow;
  void main() {
    float t = uTime;
    float ang = aSeed * 6.28318;
    vec3 p = vec3(cos(ang) * uRadii.x, sin(ang) * uRadii.y, 0.0);
    // grana: l'orbita non è un filo perfetto, e ondeggia anche da ferma
    p.xy += vec2(sin(aSeed * 47.0), cos(aSeed * 31.0)) * 0.016;
    p.z += sin(t * 0.6 + aSeed * 12.0) * 0.04;

    // flusso di energia: teste luminose che percorrono l'orbita, coda che sfuma
    float head = fract(t * uSpeed * (0.07 + uExcite * 0.06));
    float phase = (aSeed - head) * 6.28318 * uHeads;
    float flow = pow(0.5 + 0.5 * cos(phase), 6.0);

    float rr = length(p.xy);
    float wave = exp(-pow((rr - uPulse) * 9.0, 2.0)) * uPulseGain * 0.6;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = aSize * (0.7 + flow * 0.9) * (1.0 + uExcite * 0.25);
    gl_PointSize = size * (uScale / -mv.z) * uDpr;
    vGlow = 0.14 + flow * 1.1 + wave;
  }
`

const FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uColorHot;
  uniform float uExcite;
  uniform float uAlpha;
  uniform float uSoft;
  varying float vGlow;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    // uSoft 0 = nucleo duro (filo del wireframe); 1 = falloff gaussiano largo
    float core = smoothstep(mix(0.3, 0.46, uSoft), mix(0.16, 0.04, uSoft), d);
    float halo = smoothstep(0.5, 0.26, d) * mix(0.07, 0.2, uSoft);
    // il caldo (amber, gradiente incandescenza) entra con hover/puntatore/impulso
    float hot = clamp(uExcite * 0.35 + max(vGlow - 1.0, 0.0) * 0.7, 0.0, 1.0);
    vec3 col = mix(uColor, uColorHot, hot);
    float alpha = (core + halo) * clamp(vGlow, 0.0, 1.25) * uAlpha * (1.0 + uExcite * 0.3);
    gl_FragColor = vec4(col * alpha, alpha);
  }
`

/** Ricampiona il contorno del logo per lunghezza d'arco: densità uniforme
 *  lungo il perimetro, indipendente da come sono distribuiti i 139 vertici. */
function contourPositions(count: number): Float32Array {
  const pts = DAEMON_LOGO_POINTS
  const n = pts.length
  const segLen: number[] = []
  let total = 0
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % n]
    const len = Math.hypot(x2 - x1, y2 - y1)
    segLen.push(len)
    total += len
  }
  const S = 1.05
  const out = new Float32Array(count * 3)
  let seg = 0
  let acc = 0
  for (let i = 0; i < count; i++) {
    const target = (i / count) * total
    while (seg < n - 1 && acc + segLen[seg] < target) {
      acc += segLen[seg]
      seg++
    }
    const frac = segLen[seg] > 0 ? (target - acc) / segLen[seg] : 0
    const [x1, y1] = pts[seg]
    const [x2, y2] = pts[(seg + 1) % n]
    const x = x1 + (x2 - x1) * frac
    const y = y1 + (y2 - y1) * frac
    out[i * 3] = ((x - 50) / 50) * S + (Math.random() - 0.5) * CONTOUR_JITTER
    out[i * 3 + 1] = (-(y - 50) / 50) * S + (Math.random() - 0.5) * CONTOUR_JITTER
    out[i * 3 + 2] = (Math.random() - 0.5) * CONTOUR_Z
  }
  return out
}

/** Colore di una CSS var del tema, risolto dal browser (segue dark/parchment). */
function cssColor(varName: string, fallback: string): Color {
  try {
    const probe = document.createElement('span')
    probe.style.color = `var(${varName})`
    probe.style.display = 'none'
    document.body.appendChild(probe)
    const resolved = getComputedStyle(probe).color
    probe.remove()
    return new Color(resolved || fallback)
  } catch {
    return new Color(fallback)
  }
}

type Uniforms = Record<string, { value: unknown }>
type BlendMode = 'additive' | 'normal'

function makeMaterial(vert: string, uniforms: Uniforms, blend: BlendMode) {
  return new ShaderMaterial({
    vertexShader: vert,
    fragmentShader: FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: blend === 'additive' ? AdditiveBlending : NormalBlending,
    premultipliedAlpha: blend === 'normal',
  })
}

function seedAttributes(geo: BufferGeometry, n: number, baseSize: number, jitter: number, evenSeeds = false) {
  const seeds = new Float32Array(n)
  const sizes = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    seeds[i] = evenSeeds ? i / n : Math.random()
    sizes[i] = baseSize + Math.random() * jitter
  }
  geo.setAttribute('aSeed', new BufferAttribute(seeds, 1))
  geo.setAttribute('aSize', new BufferAttribute(sizes, 1))
}

export default function DaemonCoreGL({
  size = 140,
  theme = 'dark',
  onFallback,
}: {
  size?: number
  theme?: 'dark' | 'light'
  onFallback: () => void
}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const { ref: viewRef, inView } = useInView<HTMLDivElement>()
  const inViewRef = useRef(inView)
  useEffect(() => {
    inViewRef.current = inView
  }, [inView])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let raf = 0
    let renderer: WebGLRenderer | null = null
    let scene: Scene | null = null
    const cleanupFns: (() => void)[] = []

    // su parchment l'additive schiarisce e sparisce: blending normale
    const blend: BlendMode = theme === 'light' ? 'normal' : 'additive'

    try {
      renderer = new WebGLRenderer({
        alpha: true,
        antialias: false,
        premultipliedAlpha: false, // altrimenti il canvas compone sulla pagina con un alone rettangolare
        powerPreference: 'low-power',
      })
      renderer.setClearColor(0x000000, 0)
      // supersampling: sempre ≥2x anche su schermi dpr 1 — niente scalini
      renderer.setPixelRatio(Math.min(2.5, Math.max(2, window.devicePixelRatio || 1)))
      renderer.setSize(size, size)
      renderer.domElement.style.display = 'block'
      renderer.domElement.style.background = 'transparent'
      host.appendChild(renderer.domElement)

      scene = new Scene()
      const camera = new PerspectiveCamera(38, 1, 0.1, 10)
      camera.position.z = 5.2

      // uniform condivise: gli oggetti {value} sono GLI STESSI in ogni
      // material — un solo aggiornamento nel tick li muove tutti
      const shared = {
        uTime: { value: 0 },
        uExcite: { value: 0 },
        uBreathe: { value: 1 },
        uSpin: { value: 0 },
        uColor: { value: cssColor('--ember', '#E2382A') },
        uColorHot: { value: cssColor('--amber', '#E0A03C') },
        uDpr: { value: renderer.getPixelRatio() },
        uScale: { value: size * 0.1 },
        uPointer: { value: new Vector2(99, 99) },
        uPointerStrength: { value: 0 },
        uPulse: { value: 0 },
        uPulseGain: { value: 0 },
      }
      const boost = theme === 'light' ? 0.15 : 0

      // wireframe del logo: contorno vero, ricampionato per arco
      const starGeo = new BufferGeometry()
      starGeo.setAttribute('position', new BufferAttribute(contourPositions(CONTOUR_COUNT), 3))
      seedAttributes(starGeo, CONTOUR_COUNT, CONTOUR_SIZE, CONTOUR_SIZE_JITTER)
      scene.add(
        new Points(
          starGeo,
          makeMaterial(CONTOUR_VERT, { ...shared, uAlpha: { value: 0.8 + boost }, uSoft: { value: 0 } }, blend),
        ),
      )

      // 2 orbite ellittiche inclinate, controrotanti, con flusso
      for (const [rx, ry, tiltX, tiltY, speed, heads, count, psize] of ORBITS) {
        const geo = new BufferGeometry()
        geo.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
        seedAttributes(geo, count, psize, 0.6, true)
        const pts = new Points(
          geo,
          makeMaterial(
            ORBIT_VERT,
            {
              ...shared,
              uAlpha: { value: 0.5 + boost },
              uSoft: { value: 1 },
              uRadii: { value: new Vector2(rx, ry) },
              uSpeed: { value: speed },
              uHeads: { value: heads },
            },
            blend,
          ),
        )
        pts.rotation.x = tiltX
        pts.rotation.y = tiltY
        // posizioni calcolate nel vertex shader: bounding sphere non valida
        pts.frustumCulled = false
        scene.add(pts)
      }

      // hover + campo puntatore (coordinate scena sul piano z=0)
      let exciteTarget = 0
      let pointerTarget = 0
      const vFov = (camera.fov * Math.PI) / 180
      const onEnter = () => {
        exciteTarget = 1
        pointerTarget = 1
      }
      const onLeave = () => {
        exciteTarget = 0
        pointerTarget = 0
      }
      const onPointerMove = (e: PointerEvent) => {
        const rect = renderer!.domElement.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) return
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
        const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
        const halfH = Math.tan(vFov / 2) * camera.position.z
        const halfW = halfH * camera.aspect
        ;(shared.uPointer.value as Vector2).set(nx * halfW, ny * halfH)
        pointerTarget = 1
      }
      const hoverEl = host.closest('.ov-core') ?? host
      hoverEl.addEventListener('pointerenter', onEnter)
      hoverEl.addEventListener('pointerleave', onLeave)
      hoverEl.addEventListener('pointermove', onPointerMove as EventListener)
      cleanupFns.push(() => {
        hoverEl.removeEventListener('pointerenter', onEnter)
        hoverEl.removeEventListener('pointerleave', onLeave)
        hoverEl.removeEventListener('pointermove', onPointerMove as EventListener)
      })

      const clock = new Clock()
      let prevT = 0
      let spin = 0
      const tick = () => {
        raf = requestAnimationFrame(tick)
        if (!inViewRef.current || document.hidden) return
        const t = clock.getElapsedTime()
        const dt = Math.min(0.1, t - prevT)
        prevT = t
        shared.uTime.value = t
        shared.uExcite.value += (exciteTarget - (shared.uExcite.value as number)) * 0.14
        shared.uPointerStrength.value += (pointerTarget - (shared.uPointerStrength.value as number)) * 0.18
        const ex = shared.uExcite.value as number
        shared.uBreathe.value = 1 + Math.sin((t * Math.PI * 2) / 7) * 0.02
        // rotazione lenta del wireframe, appena più corrente in hover
        spin += dt * (0.06 + ex * 0.18)
        shared.uSpin.value = spin
        // impulso radiale: fronte 0→1.8, gain che sfuma mentre espande
        const period = PULSE_PERIOD_REST + (PULSE_PERIOD_HOVER - PULSE_PERIOD_REST) * ex
        const pt = (t % period) / period
        shared.uPulse.value = pt * 1.8
        shared.uPulseGain.value = (1 - pt) * (0.5 + ex * 0.4)
        // ondeggio lento dell'intero sistema: profondità percepibile da fermi
        scene!.rotation.z = Math.sin(t * 0.11) * 0.05
        scene!.rotation.x = Math.sin(t * 0.08) * 0.04
        renderer!.render(scene!, camera)
      }
      tick()
    } catch {
      if (!disposed) onFallback()
    }

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      cleanupFns.forEach((fn) => fn())
      if (scene) {
        scene.traverse((obj) => {
          if (obj instanceof Points) {
            obj.geometry.dispose()
            ;(obj.material as ShaderMaterial).dispose()
          }
        })
      }
      if (renderer) {
        renderer.dispose()
        renderer.domElement.remove()
      }
    }
  }, [size, theme, onFallback])

  return (
    <span className="core-wrap core-gl" style={{ width: size, height: size }} aria-hidden ref={viewRef}>
      <span className="core-glow" />
      <span ref={hostRef} className="core-gl-host" />
    </span>
  )
}
