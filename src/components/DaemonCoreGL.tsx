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
import starLogo from '../assets/star-logo.png'
import starLogoLight from '../assets/daemon-star-blue.png'
import { useInView } from '../lib/useInView'

/** Core DÆMON — redesign v2 (three.js, chunk lazy solo per l'Overview).
 *
 *  Architettura:
 *  - NUCLEO: la stella a 8 punte campionata dall'alpha del logo PNG vero
 *    (identità garantita), polvere fine a nucleo duro, micro-orbita per
 *    particella — il logo non ruota, respira.
 *  - 3 ORBITE ELLITTICHE con flusso di energia: particelle ferme sull'orbita,
 *    una "testa" luminosa la percorre con coda che sfuma (dash-flow).
 *    Inclinazioni, velocità e direzioni diverse: sistema 3D stratificato.
 *  - CAMPO PUNTATORE LOCALE: le particelle entro ~0.5 unità dal cursore
 *    ricevono swirl + spinta + luce con falloff morbido — reagisce solo la
 *    zona toccata, il resto resta calmo.
 *  - IMPULSO RADIALE: a riposo ogni ~6s un fronte d'onda espande dal centro
 *    illuminando le particelle al passaggio; in hover più frequente.
 *  - HOVER = ignizione: orbite accelerate, nucleo che stringe e vira al
 *    caldo, nebulosa espansa.
 *
 *  Tema chiaro: secondo logo (stella/cometa blu), palette blu, blending
 *  normale — l'additive schiarisce soltanto e su fondo chiaro sparirebbe.
 *  Il chiamante gestisce i fallback SVG; qui solo l'errore di init. */

// ── taratura ─────────────────────────────────────────────────────────────
const STAR_COUNT = 7000
const NEBULA_COUNT = 320
const STAR_Z_SPREAD = 0.42

const STAR_SIZE = 0.62
const STAR_SIZE_JITTER = 0.34
const NEBULA_SIZE = 0.5
const NEBULA_SIZE_JITTER = 0.4

// orbite: [semiasse x, semiasse y, tilt X, tilt Y, velocità (segno=verso), teste, count, size]
// sprite grandi e MORBIDI (uSoft): un nastro di luce, non una collana di pixel
const ORBITS: [number, number, number, number, number, number, number, number][] = [
  [1.3, 1.18, 0.5, 0.0, 0.9, 1, 240, 2.0],
  [1.52, 1.36, -0.42, 0.25, -0.6, 2, 200, 1.7],
  [1.42, 1.05, 0.15, -0.55, 0.45, 1, 160, 1.85],
]

// campo puntatore
const POINTER_RADIUS = 0.5
const POINTER_PUSH = 0.1
const POINTER_SWIRL = 0.16

// impulso radiale
const PULSE_PERIOD_REST = 4.2
const PULSE_PERIOD_HOVER = 2.4

const DARK_COLOR = '#E2382A'
const DARK_HOT = '#FF7A3D'
const LIGHT_COLOR = '#3159A8'
const LIGHT_HOT = '#17275C'

// nucleo + nebulosa: micro-orbita, campo puntatore, impulso
const DUST_VERT = /* glsl */ `
  attribute float aSeed;
  attribute float aSize;
  uniform float uTime;
  uniform float uExcite;
  uniform float uBreathe;
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
    // micro-orbita per particella: il logo non ruota, vive — ampia e sempre
    // attiva, il sistema si muove anche senza mouse
    float ang = t * (0.4 + aSeed * 0.9) + aSeed * 6.283;
    float amp = 0.02 + aSeed * 0.03 + uExcite * 0.028;
    p.x += cos(ang) * amp;
    p.y += sin(ang * 1.31 + aSeed * 3.0) * amp;
    p.z += sin(t * 0.55 + aSeed * 9.0) * amp * 1.8;
    // hover: ignizione — il nucleo stringe appena
    p *= uBreathe * (1.0 - uExcite * 0.05);

    // campo puntatore LOCALE: swirl + spinta con falloff morbido
    vec2 d = p.xy - uPointer;
    float dist = length(d);
    float fall = smoothstep(${POINTER_RADIUS}, 0.0, dist) * uPointerStrength;
    if (fall > 0.0) {
      vec2 dir = dist > 0.0001 ? d / dist : vec2(1.0, 0.0);
      vec2 tang = vec2(-dir.y, dir.x);
      p.xy += dir * fall * ${POINTER_PUSH} + tang * fall * ${POINTER_SWIRL};
    }

    // fronte d'onda radiale: gaussiana centrata sul raggio dell'impulso
    float rr = length(p.xy);
    float wave = exp(-pow((rr - uPulse) * 9.0, 2.0)) * uPulseGain;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float shimmer = 0.88 + 0.12 * sin(t * (2.6 + aSeed * 4.5) + aSeed * 23.0);
    float size = aSize * shimmer * (1.0 + uExcite * 0.3 + fall * 0.8 + wave * 0.5);
    gl_PointSize = size * (uScale / -mv.z) * uDpr;
    // twinkle di base; puntatore e impulso spingono oltre 1 (il frag vira al caldo)
    vGlow = 0.45 + 0.55 * sin(t * (2.4 + aSeed * 4.0) + aSeed * 40.0);
    vGlow = min(1.6, vGlow + fall * 1.2 + wave * 1.1);
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
    p.xy += vec2(sin(aSeed * 47.0), cos(aSeed * 31.0)) * 0.018;
    p.z += sin(t * 0.7 + aSeed * 12.0) * 0.05;

    // flusso di energia: teste luminose che percorrono l'orbita, coda che sfuma
    float head = fract(t * uSpeed * (0.08 + uExcite * 0.07));
    float phase = (aSeed - head) * 6.28318 * uHeads;
    float flow = pow(0.5 + 0.5 * cos(phase), 6.0);

    // il fronte d'onda tocca anche le orbite (raggio medio dell'ellisse)
    float rr = length(p.xy);
    float wave = exp(-pow((rr - uPulse) * 9.0, 2.0)) * uPulseGain * 0.6;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = aSize * (0.75 + flow * 0.9) * (1.0 + uExcite * 0.3);
    gl_PointSize = size * (uScale / -mv.z) * uDpr;
    vGlow = 0.16 + flow * 1.15 + wave;
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
    // uSoft 0 = nucleo duro (polvere nitida della stella); 1 = falloff largo
    // e gaussiano (nastro di luce delle orbite, niente scalini a pixel)
    float core = smoothstep(mix(0.3, 0.46, uSoft), mix(0.16, 0.04, uSoft), d);
    float halo = smoothstep(0.5, 0.26, d) * mix(0.08, 0.22, uSoft);
    // il caldo entra con l'hover E dove vGlow supera 1 (puntatore/impulso/testa orbita)
    float hot = clamp(uExcite * 0.35 + max(vGlow - 1.0, 0.0) * 0.7, 0.0, 1.0);
    vec3 col = mix(uColor, uColorHot, hot);
    float alpha = (core + halo) * clamp(vGlow, 0.0, 1.25) * uAlpha * (1.0 + uExcite * 0.3);
    gl_FragColor = vec4(col * alpha, alpha);
  }
`

/** Campiona l'alpha del logo: torna posizioni [-s,s] dove il PNG è pieno.
 *  Rejection sampling uniforme-per-area con smorzamento dell'hub centrale
 *  (dove le 8 punte convergono: senza taper brucia in additive) e vignetta
 *  tonda che azzera i residui verso gli angoli del campione quadrato. */
async function sampleLogo(count: number, src: string): Promise<Float32Array> {
  const img = new Image()
  img.src = src
  await img.decode()
  const N = 192
  const cv = document.createElement('canvas')
  cv.width = N
  cv.height = N
  const ctx = cv.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, N, N)
  const data = ctx.getImageData(0, 0, N, N).data
  const R = N / 2
  const S = 1.05
  const out = new Float32Array(count * 3)
  let i = 0
  let guard = 0
  const maxGuard = count * 400
  while (i < count && guard < maxGuard) {
    guard++
    const x = Math.random() * N
    const y = Math.random() * N
    const xi = Math.min(N - 1, x | 0)
    const yi = Math.min(N - 1, y | 0)
    const a = data[(yi * N + xi) * 4 + 3] / 255
    if (a < 0.04) continue
    const dx = xi - R
    const dy = yi - R
    const rr = Math.sqrt(dx * dx + dy * dy) / R
    const vign = rr < 0.78 ? 1 : Math.max(0, 1 - (rr - 0.78) / 0.2)
    const hubTaper = rr < 0.16 ? 0.1 + 0.9 * (rr / 0.16) : 1
    if (vign <= 0 || Math.random() > a * vign * hubTaper) continue
    out[i * 3] = ((x - R) / R) * S
    out[i * 3 + 1] = (-(y - R) / R) * S
    out[i * 3 + 2] = (Math.random() - 0.5) * STAR_Z_SPREAD
    i++
  }
  return out
}

/** Nube di profondità: densa verso il centro, z ampio — una parte passa
 *  DAVANTI al nucleo, la sagoma si intravede dentro una nebulosa viva. */
function nebulaPositions(count: number): Float32Array {
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const rr = Math.pow(Math.random(), 0.6) * 1.35
    const a = Math.random() * Math.PI * 2
    out[i * 3] = Math.cos(a) * rr
    out[i * 3 + 1] = Math.sin(a) * rr
    out[i * 3 + 2] = (Math.random() - 0.5) * 1.5
  }
  return out
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
    // per le orbite i seed sono la posizione sull'ellisse: distribuzione uniforme
    seeds[i] = evenSeeds ? i / n : Math.random()
    sizes[i] = baseSize + Math.random() * jitter
  }
  geo.setAttribute('aSeed', new BufferAttribute(seeds, 1))
  geo.setAttribute('aSize', new BufferAttribute(sizes, 1))
}

export default function DaemonCoreGL({
  size = 168,
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

    const blend: BlendMode = theme === 'light' ? 'normal' : 'additive'
    const baseColor = theme === 'light' ? LIGHT_COLOR : DARK_COLOR
    const hotColor = theme === 'light' ? LIGHT_HOT : DARK_HOT
    const logoSrc = theme === 'light' ? starLogoLight : starLogo

    void (async () => {
      try {
        const starPos = await sampleLogo(STAR_COUNT, logoSrc)
        if (disposed) return

        renderer = new WebGLRenderer({
          alpha: true,
          antialias: false,
          premultipliedAlpha: false, // altrimenti il canvas compone sulla pagina con un alone rettangolare
          powerPreference: 'low-power',
        })
        renderer.setClearColor(0x000000, 0)
        // supersampling: sempre ≥2x anche su schermi dpr 1 — un solo canvas
        // piccolo, il costo è nulla e sparisce l'effetto "a pixel"
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
          uColor: { value: new Color(baseColor) },
          uColorHot: { value: new Color(hotColor) },
          uDpr: { value: renderer.getPixelRatio() },
          uScale: { value: size * 0.1 },
          uPointer: { value: new Vector2(99, 99) },
          uPointerStrength: { value: 0 },
          uPulse: { value: 0 },
          uPulseGain: { value: 0 },
        }
        const boost = theme === 'light' ? 0.1 : 0

        // nucleo — NON sempre in highlight: a riposo convive col sistema,
        // si accende con impulso/puntatore/hover (uExcite alza l'alpha nel frag)
        const starGeo = new BufferGeometry()
        starGeo.setAttribute('position', new BufferAttribute(starPos, 3))
        seedAttributes(starGeo, STAR_COUNT, STAR_SIZE, STAR_SIZE_JITTER)
        scene.add(
          new Points(starGeo, makeMaterial(DUST_VERT, { ...shared, uAlpha: { value: 0.6 + boost }, uSoft: { value: 0 } }, blend)),
        )

        // nebulosa di profondità
        const nebGeo = new BufferGeometry()
        nebGeo.setAttribute('position', new BufferAttribute(nebulaPositions(NEBULA_COUNT), 3))
        seedAttributes(nebGeo, NEBULA_COUNT, NEBULA_SIZE, NEBULA_SIZE_JITTER)
        const nebula = new Points(
          nebGeo,
          makeMaterial(DUST_VERT, { ...shared, uAlpha: { value: theme === 'light' ? 0.5 : 0.4 }, uSoft: { value: 0.7 } }, blend),
        )
        scene.add(nebula)

        // 3 orbite ellittiche con flusso
        for (const [rx, ry, tiltX, tiltY, speed, heads, count, psize] of ORBITS) {
          const geo = new BufferGeometry()
          geo.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
          seedAttributes(geo, count, psize, 0.5, true)
          const pts = new Points(
            geo,
            makeMaterial(
              ORBIT_VERT,
              {
                ...shared,
                uAlpha: { value: 0.55 + boost },
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
        const tick = () => {
          raf = requestAnimationFrame(tick)
          if (!inViewRef.current || document.hidden) return
          const t = clock.getElapsedTime()
          shared.uTime.value = t
          shared.uExcite.value += (exciteTarget - shared.uExcite.value) * 0.14
          shared.uPointerStrength.value += (pointerTarget - (shared.uPointerStrength.value as number)) * 0.18
          const ex = shared.uExcite.value as number
          shared.uBreathe.value = 1 + Math.sin((t * Math.PI * 2) / 7) * 0.025
          // impulso radiale: fronte 0→1.9, gain che sfuma mentre espande
          const period = PULSE_PERIOD_REST + (PULSE_PERIOD_HOVER - PULSE_PERIOD_REST) * ex
          const pt = (t % period) / period
          shared.uPulse.value = pt * 1.9
          shared.uPulseGain.value = (1 - pt) * (0.6 + ex * 0.4)
          // il sistema intero ondeggia piano (parallasse 3D percepibile anche da fermi)
          scene!.rotation.z = Math.sin(t * 0.12) * 0.07
          scene!.rotation.x = Math.sin(t * 0.09) * 0.05
          nebula.rotation.z = t * 0.055
          renderer!.render(scene!, camera)
        }
        tick()
      } catch {
        if (!disposed) onFallback()
      }
    })()

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
