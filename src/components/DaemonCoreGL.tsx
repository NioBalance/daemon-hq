import { useEffect, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Clock,
  Color,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from 'three'
import starLogo from '../assets/star-logo.png'
import { useInView } from '../lib/useInView'

/** Core DÆMON a particelle (three.js, chunk lazy solo per l'Overview):
 *  la stella a 8 punte è campionata dall'alpha del logo PNG vero — identità
 *  garantita. Punti a nucleo duro (non alone), twinkle continuo, anelli
 *  inclinati controrotanti, comete con scia su orbite 3D, profondità in z.
 *  Hover = eccitazione netta (uExcite → 1: tutto più grande, luminoso e
 *  veloce). Il chiamante gestisce i fallback SVG; qui solo l'errore di init. */

// ── taratura ("più vivo, più nitido, più Jarvis") ─────────────────────────
const STAR_COUNT = 5200
const RING1_COUNT = 220
const RING2_COUNT = 150
const COMET_COUNT = 14 // comete che si staccano e rientrano
const COMET_TRAIL = 6 // sprite di scia per cometa
const STAR_Z_SPREAD = 0.5 // profondità della stella

const VERT = /* glsl */ `
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
    // drift per-particella attorno alla casa; con l'eccitazione si agita
    float amp = 0.016 + uExcite * 0.05;
    float speed = 0.7 + aSeed * 2.0 + uExcite * 2.6;
    vec3 p = position;
    p.x += sin(t * speed + aSeed * 6.283) * amp;
    p.y += cos(t * (speed * 0.83) + aSeed * 12.566) * amp;
    p.z += sin(t * (speed * 0.5) + aSeed * 3.14) * amp * 2.2;
    p *= uBreathe;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = aSize * (1.0 + uExcite * 0.7);
    gl_PointSize = size * (uScale / -mv.z) * uDpr;
    // scintillio veloce e marcato
    vGlow = 0.35 + 0.65 * sin(t * (2.5 + aSeed * 4.0) + aSeed * 40.0);
  }
`

// comete: orbita parametrica inclinata; la scia sono sprite in ritardo di fase
const COMET_VERT = /* glsl */ `
  attribute float aSeed;
  attribute float aLag;
  uniform float uTime;
  uniform float uExcite;
  uniform float uDpr;
  uniform float uScale;
  varying float vGlow;
  void main() {
    float speed = 0.35 + aSeed * 0.55 + uExcite * 1.1;
    float ang = uTime * speed + aSeed * 40.0 - aLag * 0.1;
    float rad = 1.1 + aSeed * 0.55 + 0.08 * sin(uTime * 0.7 + aSeed * 10.0);
    vec3 p = vec3(cos(ang) * rad, sin(ang) * rad, 0.0);
    float incl = (aSeed - 0.5) * 1.5;
    p = vec3(p.x, p.y * cos(incl), p.y * sin(incl));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = (2.3 - aLag * 0.3) * (1.0 + uExcite * 0.8);
    gl_PointSize = size * (uScale / -mv.z) * uDpr;
    vGlow = 1.0 - aLag * 0.16;
  }
`

const FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uColorHot;
  uniform float uExcite;
  uniform float uAlpha;
  varying float vGlow;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    // nucleo DURO + piccolo alone: punto nitido, non bagliore
    float core = smoothstep(0.34, 0.18, d);
    float halo = smoothstep(0.5, 0.2, d) * 0.28;
    vec3 col = mix(uColor, uColorHot, uExcite * 0.45 + vGlow * 0.2);
    float alpha = (core * 0.95 + halo) * (0.4 + 0.6 * vGlow) * uAlpha * (1.0 + uExcite * 0.35);
    gl_FragColor = vec4(col * alpha, alpha);
  }
`

/** Campiona l'alpha del logo: torna posizioni [-s,s] dove il PNG è pieno. */
async function sampleLogo(count: number): Promise<Float32Array> {
  const img = new Image()
  img.src = starLogo
  await img.decode()
  const N = 160
  const cv = document.createElement('canvas')
  cv.width = N
  cv.height = N
  const ctx = cv.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, N, N)
  const data = ctx.getImageData(0, 0, N, N).data
  const solid: [number, number][] = []
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      if (data[(y * N + x) * 4 + 3] > 120) solid.push([x, y])
    }
  const out = new Float32Array(count * 3)
  const S = 1.05
  for (let i = 0; i < count; i++) {
    const [x, y] = solid[Math.floor(Math.random() * solid.length)]
    out[i * 3] = ((x + Math.random() - N / 2) / (N / 2)) * S
    out[i * 3 + 1] = (-(y + Math.random() - N / 2) / (N / 2)) * S
    // profondità: più livelli di distanza
    out[i * 3 + 2] = (Math.random() - 0.5) * STAR_Z_SPREAD
  }
  return out
}

function ringPositions(count: number, radius: number): Float32Array {
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.05
    const r = radius + (Math.random() - 0.5) * 0.06
    out[i * 3] = Math.cos(a) * r
    out[i * 3 + 1] = Math.sin(a) * r
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.08
  }
  return out
}

type Uniforms = Record<string, { value: unknown }>

function makePoints(positions: Float32Array, baseSize: number, sizeJitter: number, uniforms: Uniforms) {
  const n = positions.length / 3
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(positions, 3))
  const seeds = new Float32Array(n)
  const sizes = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    seeds[i] = Math.random()
    sizes[i] = baseSize + Math.random() * sizeJitter
  }
  geo.setAttribute('aSeed', new BufferAttribute(seeds, 1))
  geo.setAttribute('aSize', new BufferAttribute(sizes, 1))
  const mat = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  return new Points(geo, mat)
}

/** Comete con scia: posizioni calcolate interamente nel vertex shader. */
function makeComets(uniforms: Uniforms) {
  const n = COMET_COUNT * COMET_TRAIL
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3))
  const seeds = new Float32Array(n)
  const lags = new Float32Array(n)
  for (let c = 0; c < COMET_COUNT; c++) {
    const seed = Math.random()
    for (let k = 0; k < COMET_TRAIL; k++) {
      seeds[c * COMET_TRAIL + k] = seed
      lags[c * COMET_TRAIL + k] = k
    }
  }
  geo.setAttribute('aSeed', new BufferAttribute(seeds, 1))
  geo.setAttribute('aLag', new BufferAttribute(lags, 1))
  // il frustum culling userebbe la bounding sphere delle posizioni (tutte a 0):
  // le comete orbitano larghe, mai cullate
  const points = new Points(
    geo,
    new ShaderMaterial({
      vertexShader: COMET_VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  )
  points.frustumCulled = false
  return points
}

export default function DaemonCoreGL({ size = 168, onFallback }: { size?: number; onFallback: () => void }) {
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

    void (async () => {
      try {
        const starPos = await sampleLogo(STAR_COUNT)
        if (disposed) return

        renderer = new WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' })
        renderer.setClearColor(0x000000, 0) // niente box scuro: canvas trasparente
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
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
          uColor: { value: new Color('#E2382A') },
          uColorHot: { value: new Color('#ffc2b3') },
          uDpr: { value: renderer.getPixelRatio() },
          uScale: { value: size * 0.10 }, // px proporzionali al canvas (tarato a 168)
        }
        const star = makePoints(starPos, 1.2, 1.0, { ...shared, uAlpha: { value: 0.85 } })
        scene.add(star)

        // anelli inclinati (profondità) e controrotanti
        const ring1 = makePoints(ringPositions(RING1_COUNT, 1.32), 1.4, 0.9, {
          ...shared,
          uBreathe: { value: 1 },
          uAlpha: { value: 0.9 },
        })
        const ring2 = makePoints(ringPositions(RING2_COUNT, 1.58), 1.1, 0.8, {
          ...shared,
          uBreathe: { value: 1 },
          uAlpha: { value: 0.7 },
        })
        ring1.rotation.x = 0.42
        ring2.rotation.x = -0.55
        scene.add(ring1)
        scene.add(ring2)

        // comete con scia su orbite 3D
        scene.add(makeComets({ ...shared, uAlpha: { value: 0.9 } }))

        let exciteTarget = 0
        const onEnter = () => {
          exciteTarget = 1
        }
        const onLeave = () => {
          exciteTarget = 0
        }
        const hoverEl = host.closest('.ov-core') ?? host
        hoverEl.addEventListener('pointerenter', onEnter)
        hoverEl.addEventListener('pointerleave', onLeave)
        cleanupFns.push(() => {
          hoverEl.removeEventListener('pointerenter', onEnter)
          hoverEl.removeEventListener('pointerleave', onLeave)
        })

        const clock = new Clock()
        const tick = () => {
          raf = requestAnimationFrame(tick)
          if (!inViewRef.current || document.hidden) return
          const t = clock.getElapsedTime()
          shared.uTime.value = t
          // hover netto: easing rapido + micro-zoom del sistema
          shared.uExcite.value += (exciteTarget - shared.uExcite.value) * 0.14
          const ex = shared.uExcite.value
          shared.uBreathe.value = (1 + Math.sin((t * Math.PI * 2) / 6) * 0.03) * (1 + ex * 0.06)
          // rotazione anelli ben visibile, accelera con l'eccitazione
          ring1.rotation.z = t * (0.5 + ex * 1.4)
          ring2.rotation.z = -t * (0.34 + ex * 1.1)
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
  }, [size, onFallback])

  return (
    <span className="core-wrap core-gl" style={{ width: size, height: size }} aria-hidden ref={viewRef}>
      <span className="core-glow" />
      <span ref={hostRef} className="core-gl-host" />
    </span>
  )
}
