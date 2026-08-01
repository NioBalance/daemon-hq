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

/** Core DÆMON — "bolla" bottone 3D in teca di vetro.
 *
 *  La sfera di vetro è CSS (gradienti radiali per gloss e tinta, rim light,
 *  ombre interne, riflesso speculare, ombra ellittica a terra): sta SOPRA il
 *  canvas ma solo nel cerchio della sfera, così la stella si legge "dentro
 *  la teca" mentre lo sciame di particelle orbita fuori, libero.
 *
 *  WebGL: il contorno vettoriale vero del logo (wireframe fine, rotazione
 *  lenta in shader) + uno SCIAME di ~260 particelle su orbite 3D pseudo-
 *  casuali attorno alla sfera, con depth cue (davanti più luminose).
 *  Prospettiva: il tilt 3D segue il puntatore (CSS var --tiltX/--tiltY sul
 *  guscio, perspective sul bottone) — premium, sobrio, reversibile.
 *
 *  Colori risolti a runtime dalle CSS var del tema (--ember; hot: amber in
 *  dark, navy in light). Il chiamante gestisce i fallback SVG. */

// ── taratura ─────────────────────────────────────────────────────────────
const CONTOUR_COUNT = 1100
const CONTOUR_SIZE = 0.58
const CONTOUR_SIZE_JITTER = 0.2
const CONTOUR_JITTER = 0.007
const CONTOUR_Z = 0.07
const CONTOUR_SCALE = 0.68 // la stella sta DENTRO la sfera (72% del canvas)

const SWARM_COUNT = 260
const SWARM_SIZE = 0.85
const SWARM_SIZE_JITTER = 0.5
const SWARM_R_MIN = 1.22 // appena fuori dal vetro
const SWARM_R_SPREAD = 0.5

// campo puntatore (solo sciame: il vetro "protegge" la stella)
const POINTER_RADIUS = 0.55
const POINTER_PUSH = 0.1
const POINTER_SWIRL = 0.14

// tilt prospettico
const TILT_MAX_DEG = 8

const CONTOUR_VERT = /* glsl */ `
  attribute float aSeed;
  attribute float aSize;
  uniform float uTime;
  uniform float uExcite;
  uniform float uBreathe;
  uniform float uSpin;
  uniform float uDpr;
  uniform float uScale;
  varying float vGlow;
  void main() {
    float t = uTime;
    vec3 p = position;
    float ca = cos(uSpin);
    float sa = sin(uSpin);
    p.xy = mat2(ca, -sa, sa, ca) * p.xy;
    // tremolio olografico minimo: dentro la teca l'aria è ferma
    float amp = 0.004 + aSeed * 0.007 + uExcite * 0.012;
    p.x += sin(t * (1.1 + aSeed * 1.8) + aSeed * 6.283) * amp;
    p.y += cos(t * (0.9 + aSeed * 1.5) + aSeed * 12.56) * amp;
    p *= uBreathe;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float shimmer = 0.9 + 0.1 * sin(t * (2.0 + aSeed * 3.0) + aSeed * 23.0);
    gl_PointSize = aSize * shimmer * (1.0 + uExcite * 0.25) * (uScale / -mv.z) * uDpr;
    vGlow = 0.55 + 0.45 * sin(t * (1.6 + aSeed * 2.8) + aSeed * 40.0);
    vGlow *= 1.0 + uExcite * 0.35;
  }
`

// sciame: orbite 3D pseudo-casuali dal seed, depth cue, campo puntatore
const SWARM_VERT = /* glsl */ `
  attribute float aSeed;
  attribute float aSize;
  uniform float uTime;
  uniform float uExcite;
  uniform float uDpr;
  uniform float uScale;
  uniform vec2 uPointer;
  uniform float uPointerStrength;
  varying float vGlow;
  void main() {
    float t = uTime;
    float r = ${SWARM_R_MIN} + fract(aSeed * 7.31) * ${SWARM_R_SPREAD};
    float incl = (fract(aSeed * 13.7) - 0.5) * 2.6;
    float dir = fract(aSeed * 2.1) > 0.5 ? 1.0 : -1.0;
    float speed = (0.1 + fract(aSeed * 3.3) * 0.22) * dir;
    float ang = aSeed * 6.28318 + t * speed * (1.0 + uExcite * 0.9);
    vec3 p = vec3(cos(ang) * r, sin(ang) * r * 0.92, 0.0);
    // inclina l'orbita fuori dal piano: nuvola 3D, non anello
    float ci = cos(incl);
    float si = sin(incl);
    p = vec3(p.x, p.y * ci - p.z * si, p.y * si + p.z * ci);
    p.z += sin(t * 0.5 + aSeed * 9.0) * 0.07;

    // campo puntatore locale: lo sciame reagisce vicino al cursore
    vec2 d = p.xy - uPointer;
    float dist = length(d);
    float fall = smoothstep(${POINTER_RADIUS}, 0.0, dist) * uPointerStrength;
    if (fall > 0.0) {
      vec2 dirv = dist > 0.0001 ? d / dist : vec2(1.0, 0.0);
      vec2 tang = vec2(-dirv.y, dirv.x);
      p.xy += dirv * fall * ${POINTER_PUSH} + tang * fall * ${POINTER_SWIRL};
    }

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    // depth cue: davanti (z>0) più grandi e luminose, dietro velate
    float front = smoothstep(-1.2, 1.2, p.z);
    float tw = 0.5 + 0.5 * sin(t * (1.4 + aSeed * 3.0) + aSeed * 40.0);
    gl_PointSize = aSize * (0.55 + front * 0.7) * (1.0 + uExcite * 0.3 + fall * 0.8) * (uScale / -mv.z) * uDpr;
    vGlow = (0.18 + tw * 0.5) * (0.35 + front * 0.9);
    vGlow = min(1.5, vGlow + fall * 1.1);
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
    float core = smoothstep(mix(0.3, 0.46, uSoft), mix(0.16, 0.05, uSoft), d);
    float halo = smoothstep(0.5, 0.26, d) * mix(0.07, 0.18, uSoft);
    float hot = clamp(uExcite * 0.4 + max(vGlow - 1.0, 0.0) * 0.7, 0.0, 1.0);
    vec3 col = mix(uColor, uColorHot, hot);
    float alpha = (core + halo) * clamp(vGlow, 0.0, 1.2) * uAlpha;
    gl_FragColor = vec4(col * alpha, alpha);
  }
`

/** Ricampiona il contorno del logo per lunghezza d'arco (densità uniforme). */
function contourPositions(count: number, scale: number): Float32Array {
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
    out[i * 3] = ((x - 50) / 50) * scale + (Math.random() - 0.5) * CONTOUR_JITTER
    out[i * 3 + 1] = (-(y - 50) / 50) * scale + (Math.random() - 0.5) * CONTOUR_JITTER
    out[i * 3 + 2] = (Math.random() - 0.5) * CONTOUR_Z
  }
  return out
}

/** Colore di una CSS var del tema, risolto dal browser (segue dark/light). */
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

function seedAttributes(geo: BufferGeometry, n: number, baseSize: number, jitter: number) {
  const seeds = new Float32Array(n)
  const sizes = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    seeds[i] = Math.random()
    sizes[i] = baseSize + Math.random() * jitter
  }
  geo.setAttribute('aSeed', new BufferAttribute(seeds, 1))
  geo.setAttribute('aSize', new BufferAttribute(sizes, 1))
}

export default function DaemonCoreGL({
  size = 128,
  theme = 'dark',
  onFallback,
}: {
  size?: number
  theme?: 'dark' | 'light'
  onFallback: () => void
}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const { ref: viewRef, inView } = useInView<HTMLSpanElement>()
  const inViewRef = useRef(inView)
  useEffect(() => {
    inViewRef.current = inView
  }, [inView])

  useEffect(() => {
    const host = hostRef.current
    const orb = viewRef.current
    if (!host || !orb) return
    let disposed = false
    let raf = 0
    let renderer: WebGLRenderer | null = null
    let scene: Scene | null = null
    const cleanupFns: (() => void)[] = []

    const blend: BlendMode = theme === 'light' ? 'normal' : 'additive'

    try {
      renderer = new WebGLRenderer({
        alpha: true,
        antialias: false,
        premultipliedAlpha: false,
        powerPreference: 'low-power',
      })
      renderer.setClearColor(0x000000, 0)
      renderer.setPixelRatio(Math.min(2.5, Math.max(2, window.devicePixelRatio || 1)))
      renderer.setSize(size, size)
      renderer.domElement.style.display = 'block'
      renderer.domElement.style.background = 'transparent'
      host.appendChild(renderer.domElement)

      scene = new Scene()
      const camera = new PerspectiveCamera(38, 1, 0.1, 10)
      camera.position.z = 5.2

      const shared = {
        uTime: { value: 0 },
        uExcite: { value: 0 },
        uBreathe: { value: 1 },
        uSpin: { value: 0 },
        uColor: { value: cssColor('--ember', theme === 'light' ? '#3159A8' : '#E2382A') },
        uColorHot: {
          value: theme === 'light' ? cssColor('--ember-dim', '#17275C') : cssColor('--amber', '#E0A03C'),
        },
        uDpr: { value: renderer.getPixelRatio() },
        uScale: { value: size * 0.1 },
        uPointer: { value: new Vector2(99, 99) },
        uPointerStrength: { value: 0 },
      }
      const boost = theme === 'light' ? 0.15 : 0

      // stella dentro la teca
      const starGeo = new BufferGeometry()
      starGeo.setAttribute('position', new BufferAttribute(contourPositions(CONTOUR_COUNT, CONTOUR_SCALE), 3))
      seedAttributes(starGeo, CONTOUR_COUNT, CONTOUR_SIZE, CONTOUR_SIZE_JITTER)
      scene.add(
        new Points(
          starGeo,
          makeMaterial(CONTOUR_VERT, { ...shared, uAlpha: { value: 0.78 + boost }, uSoft: { value: 0 } }, blend),
        ),
      )

      // sciame attorno alla sfera
      const swarmGeo = new BufferGeometry()
      swarmGeo.setAttribute('position', new BufferAttribute(new Float32Array(SWARM_COUNT * 3), 3))
      seedAttributes(swarmGeo, SWARM_COUNT, SWARM_SIZE, SWARM_SIZE_JITTER)
      const swarm = new Points(
        swarmGeo,
        makeMaterial(SWARM_VERT, { ...shared, uAlpha: { value: 0.55 + boost }, uSoft: { value: 1 } }, blend),
      )
      swarm.frustumCulled = false
      scene.add(swarm)

      // hover + puntatore: eccitazione, campo locale, tilt prospettico
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
        orb.style.setProperty('--tiltX', '0deg')
        orb.style.setProperty('--tiltY', '0deg')
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
        // la teca si inclina verso il cursore: prospettiva vera, non decorazione
        orb.style.setProperty('--tiltX', `${(-ny * TILT_MAX_DEG).toFixed(2)}deg`)
        orb.style.setProperty('--tiltY', `${(nx * TILT_MAX_DEG).toFixed(2)}deg`)
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
        shared.uBreathe.value = 1 + Math.sin((t * Math.PI * 2) / 7) * 0.018
        spin += dt * (0.05 + ex * 0.15)
        shared.uSpin.value = spin
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
  }, [size, theme, onFallback, viewRef])

  return (
    <span className="core-wrap core-orb" style={{ width: size, height: size }} aria-hidden ref={viewRef}>
      <span className="core-orb-shadow" />
      <span ref={hostRef} className="core-gl-host" />
      <span className="core-orb-sphere" />
      <span className="core-orb-spec" />
    </span>
  )
}
