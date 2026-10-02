import { MathUtils, PlaneGeometry, Vector3 } from 'three'
import { sphereGrid, type SphereTile } from '../../data/photographyArchive'

const { degToRad } = MathUtils

export const RADIUS = 10
/** Vertical field of view, degrees. Wide, so the sphere's curve shows toward the edges. */
export const CAMERA_FOV = 70
const CELL = degToRad(sphereGrid.cellDegrees)
/** About 5px of dark between frames at a 900px tall viewport. */
const GAP = degToRad(0.38)

/** Half the photo band's height; the camera may tilt only inside it. */
export const BAND = (sphereGrid.rows / 2) * CELL
/** Camera yaw (rotation.y) that faces the middle of the first sector. */
export const START_YAW = -(sphereGrid.sectorColumns / 2) * CELL

export type TileShape = {
  geometry: PlaneGeometry
  /** Unit vector from the sphere's centre to the tile's centre. */
  direction: Vector3
  /** Width / height of the tile as seen from the centre. */
  aspect: number
}

/** Tile centre in radians: longitude grows to the right, latitude upward. */
export function tileCentre({ at: [column, colSpan, row, rowSpan] }: SphereTile) {
  return {
    longitude: (column - 1 + colSpan / 2) * CELL,
    latitude: (sphereGrid.rows / 2 - (row - 1 + rowSpan / 2)) * CELL,
  }
}

/**
 * A tile as a true latitude/longitude patch on the sphere, built on the CPU
 * so pointer raycasts hit the curved surface. Depth only changes the radius:
 * every tile keeps the same angular size, so the grid gaps stay even at rest.
 */
export function tileShape(tile: SphereTile): TileShape {
  const { at: [, colSpan, , rowSpan], z } = tile
  const { longitude, latitude } = tileCentre(tile)
  const radius = RADIUS - z * 0.6
  const width = colSpan * CELL - GAP
  const height = rowSpan * CELL - GAP
  const geometry = new PlaneGeometry(1, 1, Math.max(4, colSpan * 2), Math.max(4, rowSpan * 2))
  const position = geometry.attributes.position
  const point = new Vector3()
  for (let index = 0; index < position.count; index++) {
    const lon = longitude + position.getX(index) * width
    const lat = latitude + position.getY(index) * height
    point.set(Math.sin(lon) * Math.cos(lat), Math.sin(lat), -Math.cos(lon) * Math.cos(lat)).multiplyScalar(radius)
    position.setXYZ(index, point.x, point.y, point.z)
  }
  geometry.computeBoundingSphere()
  const direction = new Vector3(Math.sin(longitude) * Math.cos(latitude), Math.sin(latitude), -Math.cos(longitude) * Math.cos(latitude))
  return { geometry, direction, aspect: (width * Math.cos(latitude)) / height }
}
