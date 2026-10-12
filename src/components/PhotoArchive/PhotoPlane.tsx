import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Color, MathUtils, ShaderMaterial, Vector2, Vector3, type Mesh, type Texture } from 'three'
import { frames, type SphereTile } from '../../data/photographyArchive'
import { RADIUS, tileShape } from './archiveScene'
import { CLICK_TOLERANCE, type ArchiveField } from './useArchivePointer'

const { damp } = MathUtils
const point = new Vector3()
const rightAxis = new Vector3()
const upAxis = new Vector3()

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

// object-fit: cover with a focal point, plus a 1.5% zoom, lift and contrast on hover.
const fragmentShader = /* glsl */ `
uniform sampler2D uMap;
uniform vec2 uScale;
uniform vec2 uFocus;
uniform float uHover;
uniform float uFade;
uniform vec3 uBg;
varying vec2 vUv;
void main() {
  vec2 uv = vUv * uScale + (1.0 - uScale) * uFocus;
  vec2 centre = 0.5 * uScale + (1.0 - uScale) * uFocus;
  uv = centre + (uv - centre) / (1.0 + 0.015 * uHover);
  vec3 color = texture2D(uMap, uv).rgb * mix(0.86, 1.08, uHover);
  color = max((color - 0.18) * (1.0 + 0.06 * uHover) + 0.18, 0.0);
  gl_FragColor = vec4(mix(uBg, color, uFade), 1.0);
  #include <colorspace_fragment>
}`

function parseFocus(focus = '50% 50%') {
  const [x, y] = focus.split(' ').map((part) => parseFloat(part) / 100)
  return new Vector2(x, 1 - y)
}

type Props = {
  tile: SphereTile
  textures: RefObject<Map<string, Texture>>
  field: RefObject<ArchiveField>
  /** Smoothed scroll speed, px/s. */
  velocity: RefObject<number>
  caption: RefObject<HTMLElement | null>
  /** Viewer hand-off: the open and close animations start and end on this box. */
  proxy: HTMLElement | null
  onOpen: (id: string) => void
}

export default function PhotoPlane({ tile, textures, field, velocity, caption, proxy, onOpen }: Props) {
  const mesh = useRef<Mesh>(null)
  const motion = useRef({ hover: 0, dim: 1, reveal: 0, entered: false })
  const shape = useMemo(() => tileShape(tile), [tile])
  // Corners and edge midpoints, for the frame's box on screen.
  const outline = useMemo(() => {
    const position = shape.geometry.attributes.position
    const { widthSegments: columns, heightSegments: rows } = shape.geometry.parameters
    const at = (column: number, row: number) => new Vector3().fromBufferAttribute(position, row * (columns + 1) + column)
    const midColumn = Math.round(columns / 2)
    const midRow = Math.round(rows / 2)
    return [at(0, rows), at(columns, rows), at(columns, 0), at(0, 0), at(midColumn, 0), at(midColumn, rows), at(0, midRow), at(columns, midRow)]
  }, [shape])

  const material = useMemo(() => new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uMap: { value: null as Texture | null },
      uScale: { value: new Vector2(1, 1) },
      uFocus: { value: parseFocus(frames[tile.key].focus) },
      uHover: { value: 0 },
      uFade: { value: 0 },
      uBg: { value: new Color('#080808') },
    },
  }), [tile.key])

  useEffect(() => () => {
    shape.geometry.dispose()
    material.dispose()
  }, [shape, material])

  useFrame(({ camera, size }, delta) => {
    const plane = mesh.current
    if (!plane) return
    const dt = Math.min(delta, 0.1)
    const f = field.current
    const m = motion.current
    const texture = textures.current.get(tile.key)
    const hovered = f.hovered === tile.id && !f.opened

    // Fade in once any part of the frame is near the screen.
    if (texture && !m.entered) {
      m.entered = outline.some((sample) => {
        point.copy(sample).project(camera)
        return point.z < 1 && Math.abs(point.x) < 1.1 && Math.abs(point.y) < 1.1
      })
    }
    // While its photo is open in the viewer the frame steps out, so the image
    // reads as lifted from the sphere; the rest of the archive dims.
    const dim = f.opened === tile.key ? 0 : f.opened || (f.hovered && !hovered) ? 0.65 : 1
    m.hover = damp(m.hover, hovered ? 1 : 0, 7, dt)
    m.dim = damp(m.dim, dim, 9, dt)
    m.reveal = damp(m.reveal, m.entered ? 1 : 0, 3.6, dt)

    // Toward the viewer on hover (3.5% larger), apart in depth on fast scrolls,
    // and nudged with the pointer: front frames slide further than back ones.
    const forward = RADIUS * 0.035 * m.hover + velocity.current * tile.z * 0.00012 - (1 - m.reveal) * 0.25
    rightAxis.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(f.smooth.x * tile.z * 0.12)
    upAxis.setFromMatrixColumn(camera.matrixWorld, 1).multiplyScalar(f.smooth.y * tile.z * 0.12)
    plane.position.copy(shape.direction).multiplyScalar(-forward).add(rightAxis).add(upAxis)

    const uniforms = material.uniforms
    uniforms.uMap.value = texture ?? null
    if (texture) {
      const image = texture.image as { width: number; height: number }
      const imageAspect = image.width / image.height
      uniforms.uScale.value.set(Math.min(1, shape.aspect / imageAspect), Math.min(1, imageAspect / shape.aspect))
    }
    uniforms.uHover.value = m.hover
    uniforms.uFade.value = m.reveal * m.dim

    if (!hovered) return
    const box = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
    for (const sample of outline) {
      plane.localToWorld(point.copy(sample)).project(camera)
      const x = ((point.x + 1) / 2) * size.width
      const y = ((1 - point.y) / 2) * size.height
      box.left = Math.min(box.left, x)
      box.right = Math.max(box.right, x)
      box.top = Math.min(box.top, y)
      box.bottom = Math.max(box.bottom, y)
    }
    if (caption.current) caption.current.style.transform = `translate3d(${box.left + 10}px, ${box.bottom - 24}px, 0)`
    if (proxy) {
      Object.assign(proxy.style, {
        left: `${box.left}px`, top: `${box.top}px`, width: `${box.right - box.left}px`, height: `${box.bottom - box.top}px`,
      })
    }
  })

  const enter = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    field.current.hovered = tile.id
    if (caption.current) caption.current.textContent = frames[tile.key].label
  }
  const leave = () => {
    if (field.current.hovered === tile.id) field.current.hovered = null
  }
  const click = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (field.current.drag.moved < CLICK_TOLERANCE) onOpen(tile.id)
  }

  return <mesh ref={mesh} geometry={shape.geometry} material={material} dispose={null}
    onPointerOver={enter} onPointerOut={leave} onClick={click} />
}
