import { useEffect, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { MathUtils, SRGBColorSpace, TextureLoader, type Texture } from 'three'
import { frames, sphereGrid, sphereTiles, type FrameKey, type SphereTile } from '../../data/photographyArchive'
import { CAMERA_FOV, START_YAW, tileCentre } from './archiveScene'
import { clampTo, useArchivePointer, type ArchiveField } from './useArchivePointer'
import PhotoCameraRig, { pitchLimit, radiansPerPixel } from './PhotoCameraRig'
import PhotoPlane from './PhotoPlane'

const { clamp, damp } = MathUtils
const uniqueKeys = [...new Set(sphereTiles.map((tile) => tile.key))]
const AUTO_TURN_SECONDS = 65
const AUTO_YAW_SPEED = (Math.PI * 2) / AUTO_TURN_SECONDS
const AUTO_RESUME_EASE = 2.4

type View = { yaw: number; pitch: number }

type SphereProps = {
  field: RefObject<ArchiveField>
  view: RefObject<View>
  caption: RefObject<HTMLParagraphElement | null>
  proxies: Map<string, HTMLElement>
  intensity: number
  onOpen: (id: string) => void
}

/** The texture each frame needs: the 720px file unless its widest tile would show it softer. */
function textureSource(key: FrameKey) {
  const frame = frames[key]
  const widest = Math.max(...sphereTiles.filter((tile) => tile.key === key).map((tile) => tile.at[1]))
  const pixels = ((widest * sphereGrid.cellDegrees) / CAMERA_FOV) * window.innerHeight * Math.min(window.devicePixelRatio || 1, 1.5)
  const thumbWidth = (720 * frame.width) / Math.max(frame.width, frame.height)
  return pixels > thumbWidth * 1.1 ? frame.src : frame.thumb
}

/**
 * Movement is layered so nothing fights: the camera rig owns the view (drag,
 * pointer, scroll); each plane owns only its depth, hover and entrance; this
 * loop only measures scroll speed.
 */
function PhotoSphere({ field, view, caption, proxies, intensity, onOpen }: SphereProps) {
  const gl = useThree((state) => state.gl)
  const textures = useRef(new Map<string, Texture>())
  const velocity = useRef(0)
  const lastY = useRef(Number.NaN)

  // One texture per photograph, shared by its copies around the sphere.
  useEffect(() => {
    const loaded = textures.current
    const loader = new TextureLoader()
    let cancelled = false
    for (const key of uniqueKeys) {
      loader.load(textureSource(key), (texture) => {
        if (cancelled) return texture.dispose()
        texture.colorSpace = SRGBColorSpace
        texture.anisotropy = gl.capabilities.getMaxAnisotropy()
        loaded.set(key, texture)
      })
    }
    return () => {
      cancelled = true
      loaded.forEach((texture) => texture.dispose())
      loaded.clear()
    }
  }, [gl])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1)
    const scrollY = window.scrollY
    if (Number.isNaN(lastY.current)) lastY.current = scrollY
    if (scrollY !== lastY.current) state.events.update?.()
    const speed = clamp((scrollY - lastY.current) / Math.max(dt, 1 / 240), -4000, 4000)
    lastY.current = scrollY
    velocity.current = damp(velocity.current, speed, 6, dt)
    const f = field.current
    caption.current?.classList.toggle('is-visible', f.hovered !== null && !f.opened)
  }, -1)

  return (
    <>
      <color attach="background" args={['#080808']} />
      <PerspectiveCamera makeDefault fov={CAMERA_FOV} position={[0, 0, 0]} near={0.1} far={40} />
      <PhotoCameraRig field={field} view={view} intensity={intensity} />
      {sphereTiles.map((tile) => (
        <PhotoPlane key={tile.id} tile={tile} textures={textures} field={field} velocity={velocity}
          caption={caption} proxy={proxies.get(tile.key) ?? null} onOpen={onOpen} />
      ))}
    </>
  )
}

/** The copy of a frame nearest the current view, and the yaw that faces it. */
function nearestCopy(key: FrameKey, yaw: number) {
  let best: { tile: SphereTile; yaw: number; latitude: number } | null = null
  for (const tile of sphereTiles) {
    if (tile.key !== key) continue
    const { longitude, latitude } = tileCentre(tile)
    const turns = Math.round((yaw + longitude) / (Math.PI * 2))
    const facing = -longitude + turns * Math.PI * 2
    if (!best || Math.abs(facing - yaw) < Math.abs(best.yaw - yaw)) best = { tile, yaw: facing, latitude }
  }
  return best
}

/**
 * WebGL hero: the photographs line the inside of a sphere around the viewer.
 * The page keeps an accessible list of the same photographs (`indexRef`) for
 * screen readers, keyboard focus and the viewer hand-off.
 */
export default function InteractivePhotoArchive({ mode, opened, onOpen, indexRef }: {
  mode: 'desktop' | 'tablet'
  opened: string | null
  onOpen: (id: string) => void
  indexRef: RefObject<HTMLElement | null>
}) {
  const layer = useRef<HTMLDivElement>(null)
  const caption = useRef<HTMLParagraphElement>(null)
  const view = useRef<View>({ yaw: START_YAW, pitch: 0 })
  const field = useArchivePointer(layer)
  const [proxies, setProxies] = useState(() => new Map<string, HTMLElement>())
  const [active, setActive] = useState(false)

  useEffect(() => {
    field.current.opened = opened
  }, [field, opened])

  // Turn through one full revolution every 65 seconds. Rotation is folded
  // into the existing endless horizontal drag offset, so pointer control,
  // keyboard focus and the camera's release inertia keep a single source of
  // truth. The browser pauses requestAnimationFrame in background tabs; the
  // delta cap prevents a jump when it resumes.
  useEffect(() => {
    const element = layer.current
    if (!active || !element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    let previous = performance.now()
    let speed = AUTO_YAW_SPEED
    const rotate = (now: number) => {
      const dt = Math.min(Math.max((now - previous) / 1000, 0), 0.1)
      previous = now
      const state = field.current

      if (state.drag.active) {
        speed = 0
      } else {
        speed = damp(speed, AUTO_YAW_SPEED, AUTO_RESUME_EASE, dt)
        const height = element.clientHeight
        if (height > 0) state.drag.x += (speed * dt) / radiansPerPixel(height)
      }

      frame = requestAnimationFrame(rotate)
    }

    frame = requestAnimationFrame(rotate)
    return () => cancelAnimationFrame(frame)
  }, [active, field])

  // Endless left/right; up/down only as far as the band of photographs allows.
  useEffect(() => {
    const element = layer.current
    if (!element) return
    const state = field.current
    const update = () => {
      const limit = pitchLimit() / radiansPerPixel(element.clientHeight)
      state.bounds = { minX: -Infinity, maxX: Infinity, minY: -limit, maxY: limit }
      state.drag.y = clampTo(state.drag.y, -limit, limit)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [field])

  // Keyboard: turn to the focused photograph and give it the hover focus.
  useEffect(() => {
    const index = indexRef.current
    const element = layer.current
    if (!index || !element) return
    setProxies(new Map(Array.from(index.querySelectorAll<HTMLElement>('[data-proxy]'), (proxy) => [proxy.dataset.proxy!, proxy])))
    const state = field.current
    const focus = (event: FocusEvent) => {
      const key = (event.target as HTMLElement).closest<HTMLElement>('[data-frame]')?.dataset.frame as FrameKey | undefined
      const copy = key && nearestCopy(key, view.current.yaw)
      if (!copy) return
      const perPixel = radiansPerPixel(element.clientHeight)
      state.drag.x = (copy.yaw - START_YAW) / perPixel
      state.drag.y = clampTo(copy.latitude / perPixel, state.bounds.minY, state.bounds.maxY)
      state.hovered = copy.tile.id
    }
    const blur = () => {
      state.hovered = null
    }
    index.addEventListener('focusin', focus)
    index.addEventListener('focusout', blur)
    return () => {
      index.removeEventListener('focusin', focus)
      index.removeEventListener('focusout', blur)
    }
  }, [indexRef, field])

  useEffect(() => {
    const element = layer.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { rootMargin: '120px 0px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={layer} className="bwp-gl" aria-hidden="true">
      <Canvas frameloop={active ? 'always' : 'never'} dpr={[1, 1.5]} flat
        gl={{ antialias: true, powerPreference: 'high-performance' }}>
        <PhotoSphere field={field} view={view} caption={caption} proxies={proxies}
          intensity={mode === 'desktop' ? 1 : 0.6} onOpen={onOpen} />
      </Canvas>
      <p ref={caption} className="bwp-gl-caption" />
    </div>
  )
}
