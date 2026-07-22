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
 *  garantita — e resa come sistema di particelle ember con blending additivo
 *  (glow volumetrico), anelli controrotanti e respiro a 6s come il logo.
 *  Hover = eccitazione (uExcite → 1). Il chiamante gestisce i fallback SVG
 *  (reduced-motion, WebGL assente); qui gestiamo solo l'errore di init. */

const STAR_COUNT = 2800
const RING_COUNT = 150

const VERT = /* glsl */ `
  attribute float aSeed;
  attribute float aSize;
  uniform float uTime;
  uniform float uExcite;
  uniform float uBreathe;
  uniform float uDpr;
  varying float vGlow;
  void main() {
    float t = uTime;
    // jitter per-particella attorno alla posizione-casa; ampiezza cresce con l'eccitazione
    float amp = 0.012 + uExcite * 0.045;
    float speed = 0.6 + aSeed * 1.6 + uExcite * 2.0;
    vec3 p = position;
    p.x += sin(t * speed + aSeed * 6.283) * amp;
    p.y += cos(t * (speed * 0.83) + aSeed * 12.566) * amp;
    p.z += sin(t * (speed * 0.5) + aSeed * 3.14) * amp * 2.0;
    // respiro globale (6s) come il glow del logo
    p *= uBreathe;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = aSize * (1.0 + uExcite * 0.9);
    gl_PointSize = size * (20.0 / -mv.z) * uDpr;
    vGlow = 0.55 + 0.45 * sin(t * (1.5 + aSeed * 2.0) + aSeed * 20.0);
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
    float falloff = smoothstep(0.5, 0.0, d);
    vec3 col = mix(uColor, uColorHot, uExcite * 0.7 + vGlow * 0.15);
    float alpha = falloff * falloff * (0.5 + 0.5 * vGlow) * uAlpha;
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
    // sub-pixel jitter per non vedere la griglia del campionamento
    out[i * 3] = ((x + Math.random() - N / 2) / (N / 2)) * S
    out[i * 3 + 1] = (-(y + Math.random() - N / 2) / (N / 2)) * S
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.16
  }
  return out
}

function ringPositions(count: number, radius: number): Float32Array {
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2
    out[i * 3] = Math.cos(a) * radius
    out[i * 3 + 1] = Math.sin(a) * radius
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.05
  }
  return out
}

function makePoints(positions: Float32Array, baseSize: number, sizeJitter: number, uniforms: Record<string, { value: unknown }>) {
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
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
        renderer.setSize(size, size)
        renderer.domElement.style.display = 'block'
        host.appendChild(renderer.domElement)

        scene = new Scene()
        const camera = new PerspectiveCamera(38, 1, 0.1, 10)
        camera.position.z = 3.4

        const shared = {
          uTime: { value: 0 },
          uExcite: { value: 0 },
          uBreathe: { value: 1 },
          uColor: { value: new Color('#E2382A') },
          uColorHot: { value: new Color('#ffb3a6') },
          uDpr: { value: renderer.getPixelRatio() },
        }
        const star = makePoints(starPos, 1.9, 1.5, { ...shared, uAlpha: { value: 0.6 } })
        scene.add(star)

        // anelli controrotanti: uniforms clonate ma uTime/uExcite condivisi via riferimento
        const ring1 = makePoints(ringPositions(RING_COUNT, 1.32), 1.5, 1.0, { ...shared, uBreathe: { value: 1 }, uAlpha: { value: 0.8 } })
        const ring2 = makePoints(ringPositions(Math.round(RING_COUNT * 0.7), 1.52), 1.2, 0.8, { ...shared, uBreathe: { value: 1 }, uAlpha: { value: 0.65 } })
        scene.add(ring1)
        scene.add(ring2)

        let exciteTarget = 0
        const onEnter = () => {
          exciteTarget = 1
        }
        const onLeave = () => {
          exciteTarget = 0
        }
        // l'hover arriva dal bottone contenitore (.ov-core)
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
          // easing dell'eccitazione
          shared.uExcite.value += (exciteTarget - shared.uExcite.value) * 0.06
          // respiro 6s
          shared.uBreathe.value = 1 + Math.sin((t * Math.PI * 2) / 6) * 0.03
          const ex = shared.uExcite.value
          ring1.rotation.z = t * (0.25 + ex * 0.9)
          ring2.rotation.z = -t * (0.16 + ex * 0.7)
          renderer!.render(scene!, camera)
        }
        tick()
      } catch {
        // WebGL rotto a runtime: il chiamante torna all'SVG
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
