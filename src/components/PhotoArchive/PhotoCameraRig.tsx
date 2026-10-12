import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'
import { BAND, CAMERA_FOV, START_YAW } from './archiveScene'
import type { ArchiveField } from './useArchivePointer'

const { clamp, damp, degToRad } = MathUtils

/** Gentle near the centre, growing toward the viewport edges. */
const amplify = (value: number) => value * (0.55 + 0.45 * value * value)

/** Radians of view per CSS px of drag, so the sphere tracks the cursor. */
export const radiansPerPixel = (height: number) => degToRad(CAMERA_FOV) / height
/** How far the view may tilt before the band's top or bottom edge shows. */
export const pitchLimit = () => Math.max(0, BAND - degToRad(CAMERA_FOV / 2) - degToRad(2))

/**
 * The camera sits at the sphere's centre. Drag turns it (endlessly left and
 * right, inside the band up and down); the pointer turns it a little more
 * toward the edges and nudges it off-centre, which is what separates near
 * and far frames. Everything eases, so the view keeps drifting briefly after
 * the hand stops.
 */
export default function PhotoCameraRig({ field, view, intensity }: {
  field: RefObject<ArchiveField>
  view: RefObject<{ yaw: number; pitch: number }>
  intensity: number
}) {
  useFrame(({ camera, size }, delta) => {
    const dt = Math.min(delta, 0.1)
    const f = field.current
    const v = view.current
    f.smooth.x = damp(f.smooth.x, amplify(f.pointer.x) * intensity, 3, dt)
    f.smooth.y = damp(f.smooth.y, amplify(f.pointer.y) * intensity, 3, dt)

    const perPixel = radiansPerPixel(size.height)
    const leaving = clamp(window.scrollY / size.height, 0, 1)
    const limit = pitchLimit()
    const yaw = START_YAW + f.drag.x * perPixel - f.smooth.x * degToRad(7)
    const pitch = clamp(f.drag.y * perPixel + f.smooth.y * degToRad(4) - leaving * degToRad(4), -limit, limit)
    const ease = f.drag.active ? 10 : 2.6
    v.yaw = damp(v.yaw, yaw, ease, dt)
    v.pitch = damp(v.pitch, pitch, ease, dt)

    camera.rotation.set(v.pitch, v.yaw, 0, 'YXZ')
    camera.position.set(0, 0, 0)
    camera.translateX(f.smooth.x * 0.35)
    camera.translateY(f.smooth.y * 0.22)
  })
  return null
}
