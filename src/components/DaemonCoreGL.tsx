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
 *  WebGL: il contorno vettoriale vero del logo, FERMO (niente rotazione),
 *  reso in due passaggi (aura + linea) per un neon liscio senza grana; uno
 *  SCIAME di particelle morbide a deriva casuale attorno alla sfera, con
 *  depth cue (davanti più luminose). Prospettiva: tilt 3D dal puntatore
 *  (CSS var --tiltX/--tiltY); click = giro 360° orizzontale (classe
 *  orb-spin) mentre si apre il menu.
 *
 *  Colori risolti a runtime dalle CSS var del tema (--ember; hot: amber in
 *  dark, navy in light). Il chiamante gestisce i fallback SVG. */

// ── taratura ─────────────────────────────────────────────────────────────
// stella "UHD": contorno densissimo reso in DUE passaggi (aura morbida sotto,
// linea semi-morbida sopra) — un neon liscio, niente grana né bordi duri
const CONTOUR_COUNT = 2600
const CONTOUR_SIZE = 0.5
const CONTOUR_SIZE_JITTER = 0.14
const CONTOUR_JITTER = 0.005
const CONTOUR_SHELLS = 5 // la stella è ESTRUSA: 5 gusci in z — ha spessore vero
const CONTOUR_DEPTH = 0.26
// la sfera è quasi a filo canvas (raggio scena ~1.65): la stella la riempie
const CONTOUR_SCALE = 1.08

// anelli HUD dentro la teca: compaiono in hover, testa di luce che spazzola
// [raggio, tilt X, verso sweep, count, size]
const HUD_RINGS: [number, number, number, number, number][] = [
  [1.28, 0.35, 1, 110, 0.55],
  [1.48, -0.22, -1, 130, 0.45],
]

// sciame: TANTE particelle piccole, gaussiane pure (nessun contorno)
const SWARM_COUNT = 520
const SWARM_SIZE = 0.7
const SWARM_SIZE_JITTER = 0.45
const SWARM_R_MIN = 1.26
const SWARM_R_SPREAD = 0.55

// campo puntatore (solo sciame: il vetro "protegge" la stella)
const POINTER_RADIUS = 0.55
const POINTER_PUSH = 0.1
const POINTER_SWIRL = 0.14

// prospettiva VERA: la scena 3D ruota verso il puntatore (parallasse reale,
// davanti si muove più di dietro); il guscio CSS tiene solo un micro-tilt
const SCENE_TILT_X = 0.24 // rad
const SCENE_TILT_Y = 0.3
const TILT_MAX_DEG = 4
// click: giro 360° in GL, easeOutQuint — parte deciso, atterra morbido
const SPIN_DURATION = 1.1

const CONTOUR_VERT = /* glsl */ `
  attribute float aSeed;
  attribute float aSize;
  uniform float uTime;
  uniform float uExcite;
  uniform float uBreathe;
  uniform float uDpr;
  uniform float uScale;
  varying float vGlow;
  void main() {
    float t = uTime;
    vec3 p = position;
    // niente rotazione: la stella sta ferma nella teca, vive di micro-tremolio
    float amp = 0.003 + aSeed * 0.006 + uExcite * 0.01;
    p.x += sin(t * (1.1 + aSeed * 1.8) + aSeed * 6.283) * amp;
    p.y += cos(t * (0.9 + aSeed * 1.5) + aSeed * 12.56) * amp;
    // hover: l'estrusione si APRE in profondità e la stella cresce appena —
    // un movimento solido, da motion graphic, non un effetto particellare
    p.z *= 1.0 + uExcite * 0.9;
    p.xy *= 1.0 + uExcite * 0.05;
    p *= uBreathe;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float shimmer = 0.92 + 0.08 * sin(t * (2.0 + aSeed * 3.0) + aSeed * 23.0);
    gl_PointSize = aSize * shimmer * (1.0 + uExcite * 0.25) * (uScale / -mv.z) * uDpr;
    vGlow = 0.72 + 0.28 * sin(t * (1.6 + aSeed * 2.8) + aSeed * 40.0);
    vGlow *= 1.0 + uExcite * 0.35;
  }
`

// sciame: deriva CASUALE (somma di seni, lava-lamp) attorno alla sfera,
// depth cue, campo puntatore — niente orbite regolari
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
    // punto casa su un guscio sferico attorno al vetro
    float r0 = ${SWARM_R_MIN} + fract(aSeed * 7.31) * ${SWARM_R_SPREAD};
    float th = fract(aSeed * 3.97) * 6.28318;
    float ph = (fract(aSeed * 9.13) - 0.5) * 2.4;
    vec3 p = vec3(cos(th) * cos(ph), sin(ph) * 0.9, sin(th) * cos(ph)) * r0;
    // deriva lenta e irregolare attorno alla casa
    float t1 = t * (0.16 + fract(aSeed * 5.5) * 0.22) * (1.0 + uExcite * 0.6);
    p.x += sin(t1 + aSeed * 40.0) * 0.16 + sin(t1 * 0.53 + aSeed * 11.0) * 0.09;
    p.y += cos(t1 * 0.81 + aSeed * 23.0) * 0.14 + sin(t1 * 0.37 + aSeed * 7.0) * 0.08;
    p.z += sin(t1 * 0.62 + aSeed * 17.0) * 0.2;

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

// anelli HUD: cerchi nitidi dentro la teca, visibili in hover — una testa di
// luce percorre l'anello con coda breve (sweep pulito, da interfaccia)
const RING_VERT = /* glsl */ `
  attribute float aSeed;
  attribute float aSize;
  uniform float uTime;
  uniform float uExcite;
  uniform float uDpr;
  uniform float uScale;
  uniform float uRadius;
  uniform float uDir;
  varying float vGlow;
  void main() {
    float t = uTime;
    float ang = aSeed * 6.28318 + t * uDir * 0.06;
    vec3 p = vec3(cos(ang) * uRadius, sin(ang) * uRadius * 0.985, 0.0);
    float head = fract(t * uDir * 0.22);
    float phase = (aSeed - head) * 6.28318;
    float flow = pow(0.5 + 0.5 * cos(phase), 10.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * (0.7 + flow * 1.1) * (uScale / -mv.z) * uDpr;
    // quasi invisibili a riposo: il motion appare con l'hover
    vGlow = (0.06 + uExcite) * (0.18 + flow * 1.3);
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
    // estrusione: gusci discreti in z — inclinando la scena si VEDE lo spessore
    const shell = i % CONTOUR_SHELLS
    out[i * 3 + 2] = (shell / (CONTOUR_SHELLS - 1) - 0.5) * CONTOUR_DEPTH + (Math.random() - 0.5) * 0.02
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
  size = 176,
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

      // stella dentro la teca — DUE passaggi sulle stesse posizioni:
      // 1) aura larga e morbidissima sotto, 2) linea semi-morbida sopra.
      // Il risultato è un neon continuo e liscio, senza grana né bordi.
      const starPos = contourPositions(CONTOUR_COUNT, CONTOUR_SCALE)
      const auraGeo = new BufferGeometry()
      auraGeo.setAttribute('position', new BufferAttribute(starPos, 3))
      seedAttributes(auraGeo, CONTOUR_COUNT, CONTOUR_SIZE * 2.6, CONTOUR_SIZE_JITTER)
      scene.add(
        new Points(
          auraGeo,
          makeMaterial(CONTOUR_VERT, { ...shared, uAlpha: { value: 0.16 + boost * 0.5 }, uSoft: { value: 1 } }, blend),
        ),
      )
      const starGeo = new BufferGeometry()
      starGeo.setAttribute('position', new BufferAttribute(starPos, 3))
      seedAttributes(starGeo, CONTOUR_COUNT, CONTOUR_SIZE, CONTOUR_SIZE_JITTER)
      scene.add(
        new Points(
          starGeo,
          makeMaterial(CONTOUR_VERT, { ...shared, uAlpha: { value: 0.92 + boost }, uSoft: { value: 0.45 } }, blend),
        ),
      )

      // anelli HUD dentro la teca (hover): nitidi, controrotanti
      for (const [radius, tiltX, dir, count, psize] of HUD_RINGS) {
        const geo = new BufferGeometry()
        geo.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
        const seeds = new Float32Array(count)
        const sizes = new Float32Array(count)
        for (let i = 0; i < count; i++) {
          seeds[i] = i / count
          sizes[i] = psize + Math.random() * 0.2
        }
        geo.setAttribute('aSeed', new BufferAttribute(seeds, 1))
        geo.setAttribute('aSize', new BufferAttribute(sizes, 1))
        const ring = new Points(
          geo,
          makeMaterial(
            RING_VERT,
            { ...shared, uAlpha: { value: 0.85 + boost }, uSoft: { value: 0.3 }, uRadius: { value: radius }, uDir: { value: dir } },
            blend,
          ),
        )
        ring.rotation.x = tiltX
        ring.frustumCulled = false
        scene.add(ring)
      }

      // sciame attorno alla sfera
      const swarmGeo = new BufferGeometry()
      swarmGeo.setAttribute('position', new BufferAttribute(new Float32Array(SWARM_COUNT * 3), 3))
      seedAttributes(swarmGeo, SWARM_COUNT, SWARM_SIZE, SWARM_SIZE_JITTER)
      const swarm = new Points(
        swarmGeo,
        makeMaterial(SWARM_VERT, { ...shared, uAlpha: { value: 0.7 + boost }, uSoft: { value: 1 } }, blend),
      )
      swarm.frustumCulled = false
      scene.add(swarm)

      // hover + puntatore: eccitazione, campo locale, PROSPETTIVA IN SCENA
      let exciteTarget = 0
      let pointerTarget = 0
      let rotTargetX = 0
      let rotTargetY = 0
      let spinStart = -1
      const vFov = (camera.fov * Math.PI) / 180
      const onEnter = () => {
        exciteTarget = 1
        pointerTarget = 1
      }
      const onLeave = () => {
        exciteTarget = 0
        pointerTarget = 0
      }
      // sul bottone: solo il campo particellare locale (coordinate scena)
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
      // mira a LUNGO raggio (finestra intera): la scena ruota verso il mouse
      // e il guscio tiene micro-tilt + contro-parallasse del riflesso.
      // Direzione = offset dal centro (satura a ~240px); intensità = falloff
      // smoothstep che parte pieno vicino e si spegne a ~70% del lato maggiore
      // della viewport — graduale, mai on/off. Il rientro morbido lo fanno
      // l'easing della scena nel tick e la transizione CSS del guscio.
      const applyAim = (dirX: number, dirY: number, fall: number) => {
        rotTargetY = dirX * SCENE_TILT_Y * fall
        rotTargetX = dirY * SCENE_TILT_X * fall
        orb.style.setProperty('--tiltX', `${(dirY * TILT_MAX_DEG * fall).toFixed(2)}deg`)
        orb.style.setProperty('--tiltY', `${(dirX * TILT_MAX_DEG * fall).toFixed(2)}deg`)
        orb.style.setProperty('--spX', `${(-dirX * 9 * fall).toFixed(1)}px`)
        orb.style.setProperty('--spY', `${(-dirY * 6 * fall).toFixed(1)}px`)
      }
      const onGlobalMove = (e: PointerEvent) => {
        const rect = renderer!.domElement.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) return
        const dx = e.clientX - (rect.left + rect.width / 2)
        const dy = e.clientY - (rect.top + rect.height / 2)
        const dist = Math.hypot(dx, dy)
        const R = Math.max(window.innerWidth, window.innerHeight) * 0.7
        const k = Math.min(1, Math.max(0, (dist - R * 0.18) / (R * 0.82)))
        const fall = 1 - k * k * (3 - 2 * k)
        applyAim(Math.max(-1, Math.min(1, dx / 240)), Math.max(-1, Math.min(1, dy / 240)), fall)
      }
      const onWindowOut = () => applyAim(0, 0, 0)
      // click: giro 360° calcolato IN SCENA (non un rotateY CSS del canvas
      // piatto): la stella estrusa si vede di taglio a metà giro — 3D vero
      const onClick = () => {
        spinStart = clock.getElapsedTime()
      }
      const hoverEl = host.closest('.ov-core') ?? host
      hoverEl.addEventListener('pointerenter', onEnter)
      hoverEl.addEventListener('pointerleave', onLeave)
      hoverEl.addEventListener('pointermove', onPointerMove as EventListener)
      hoverEl.addEventListener('click', onClick)
      window.addEventListener('pointermove', onGlobalMove as EventListener, { passive: true })
      document.documentElement.addEventListener('mouseleave', onWindowOut)
      cleanupFns.push(() => {
        hoverEl.removeEventListener('pointerenter', onEnter)
        hoverEl.removeEventListener('pointerleave', onLeave)
        hoverEl.removeEventListener('pointermove', onPointerMove as EventListener)
        hoverEl.removeEventListener('click', onClick)
        window.removeEventListener('pointermove', onGlobalMove as EventListener)
        document.documentElement.removeEventListener('mouseleave', onWindowOut)
      })

      const clock = new Clock()
      let rotX = 0
      let rotY = 0
      const tick = () => {
        raf = requestAnimationFrame(tick)
        if (!inViewRef.current || document.hidden) return
        const t = clock.getElapsedTime()
        shared.uTime.value = t
        shared.uExcite.value += (exciteTarget - (shared.uExcite.value as number)) * 0.14
        shared.uPointerStrength.value += (pointerTarget - (shared.uPointerStrength.value as number)) * 0.18
        shared.uBreathe.value = 1 + Math.sin((t * Math.PI * 2) / 7) * 0.018
        // prospettiva eased verso il puntatore + oscillazione minima a riposo
        rotX += (rotTargetX - rotX) * 0.07
        rotY += (rotTargetY - rotY) * 0.07
        let spinAngle = 0
        if (spinStart >= 0) {
          const p = Math.min(1, (t - spinStart) / SPIN_DURATION)
          spinAngle = (1 - Math.pow(1 - p, 5)) * Math.PI * 2 // easeOutQuint
          if (p >= 1) spinStart = -1
        }
        scene!.rotation.x = rotX + Math.sin(t * 0.23) * 0.015
        scene!.rotation.y = rotY + spinAngle + Math.sin(t * 0.17) * 0.02
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
