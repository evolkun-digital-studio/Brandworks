import type MatterNamespace from 'matter-js'

/** Everything worth tweaking in the footer lives here. */
export const CONFIG = {
  links: [
    { label: 'Home', href: '/' },
    { label: 'Work', href: '#work' },
    { label: 'Services', href: '#services' },
    { label: 'About', href: '/about' },
    { label: 'Insights', href: '/blog' },
  ],
  socials: [
    { label: 'Instagram', href: '#' },
    { label: 'LinkedIn', href: '#' },
    { label: 'X', href: '#' },
  ],
  colors: {
    greys: ['#C9CCD6', '#A8ACB8'],
    black: '#111111',
    accents: ['#FF2D55', '#7B2CFF', '#1E3BFF', '#CEFD10', '#22E06B'],
    // Share of each group; accents take the remainder.
    greyShare: 0.45,
    blackShare: 0.3,
  },
  shapes: {
    desktop: { min: 250, max: 350, perPixelWidth: 0.24 },
    tablet: 150,
    mobile: 80,
    // Sized so the pile stays clear of the footer links above it.
    minSize: 20,
    maxSize: 50,
    maxPileShare: 0.5,
    // Stage area one shape takes up once settled, at a scale of 1.
    pileAreaPerShape: 1100,
  },
  physics: {
    gravityY: 1,
    restitution: [0.3, 0.5],
    friction: 0.1,
    frictionAir: 0.01,
    spawnMs: 1200,
    maxSpeed: 28,
  },
  pointer: {
    radius: 80,
    basePush: 0.9,
    speedPush: 0.18,
    burstRadius: 140,
    burstSpeed: 14,
    blobLerp: 0.14,
  },
}

const SHAPE_KINDS = ['circle', 'ring', 'pentagon', 'square', 'triangle', 'bowtie', 'plus', 'pill'] as const
type ShapeKind = (typeof SHAPE_KINDS)[number]

const STEP_MS = 1000 / 60
const WALL = 400

const random = (min: number, max: number) => min + Math.random() * (max - min)
const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)]

function pickColor() {
  const { greys, black, accents, greyShare, blackShare } = CONFIG.colors
  const roll = Math.random()
  if (roll < greyShare) return pick(greys)
  if (roll < greyShare + blackShare) return black
  return pick(accents)
}

function shapeCount(width: number) {
  const { desktop, tablet, mobile } = CONFIG.shapes
  if (width < 768) return mobile
  if (width < 1024) return tablet
  return Math.round(Math.min(desktop.max, Math.max(desktop.min, width * desktop.perPixelWidth)))
}

function tracePolygon(ctx: CanvasRenderingContext2D, sides: number, radius: number) {
  // Same vertex placement as Matter's Bodies.polygon, so drawing matches the collider.
  const theta = (Math.PI * 2) / sides
  ctx.beginPath()
  for (let i = 0; i < sides; i += 1) {
    const angle = theta / 2 + i * theta
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
  }
  ctx.closePath()
}

function traceShape(ctx: CanvasRenderingContext2D, kind: ShapeKind, size: number) {
  const half = size / 2
  switch (kind) {
    case 'circle':
      ctx.beginPath()
      ctx.arc(0, 0, half, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'ring':
      ctx.lineWidth = size * 0.26
      ctx.beginPath()
      ctx.arc(0, 0, half - ctx.lineWidth / 2, 0, Math.PI * 2)
      ctx.stroke()
      break
    case 'pentagon':
      tracePolygon(ctx, 5, half)
      ctx.fill()
      break
    case 'triangle':
      tracePolygon(ctx, 3, half)
      ctx.fill()
      break
    case 'square':
      ctx.fillRect(-half * 0.85, -half * 0.85, size * 0.85, size * 0.85)
      break
    case 'bowtie':
      ctx.beginPath()
      ctx.moveTo(-half, -half * 0.8)
      ctx.lineTo(half, -half * 0.8)
      ctx.lineTo(-half, half * 0.8)
      ctx.lineTo(half, half * 0.8)
      ctx.closePath()
      ctx.fill()
      break
    case 'plus': {
      const arm = size * 0.3
      ctx.fillRect(-half, -arm / 2, size, arm)
      ctx.fillRect(-arm / 2, -half, arm, size)
      break
    }
    case 'pill':
      ctx.beginPath()
      ctx.roundRect(-size * 0.65, -size * 0.25, size * 1.3, size * 0.5, size * 0.25)
      ctx.fill()
      break
  }
}

function createBody(Matter: typeof MatterNamespace, kind: ShapeKind, size: number, x: number, y: number) {
  const { Bodies } = Matter
  const { friction, frictionAir, restitution } = CONFIG.physics
  const options = {
    friction,
    frictionAir,
    restitution: random(restitution[0], restitution[1]),
    angle: random(0, Math.PI * 2),
  }
  switch (kind) {
    case 'circle':
    case 'ring':
      return Bodies.circle(x, y, size / 2, options)
    case 'pentagon':
      return Bodies.polygon(x, y, 5, size / 2, options)
    case 'triangle':
      return Bodies.polygon(x, y, 3, size / 2, options)
    case 'square':
      return Bodies.rectangle(x, y, size * 0.85, size * 0.85, options)
    case 'bowtie':
      return Bodies.rectangle(x, y, size, size * 0.8, options)
    case 'plus':
      return Bodies.polygon(x, y, 8, size / 2, options)
    case 'pill':
      return Bodies.rectangle(x, y, size * 1.3, size * 0.5, { ...options, chamfer: { radius: size * 0.22 } })
  }
}

/**
 * Runs the shape pile on the canvas. Matter.js is only fetched once the stage
 * is near the viewport, and the loop only runs while the stage is on screen.
 * Returns a cleanup function.
 */
export function createFooterPhysics(stage: HTMLElement, canvas: HTMLCanvasElement, blob: HTMLElement, reducedMotion: boolean) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => undefined

  let destroyed = false
  let teardownScene: (() => void) | null = null

  const start = async () => {
    const { default: Matter } = await import('matter-js')
    if (destroyed) return

    const { Bodies, Body, Composite, Engine, Sleeping } = Matter
    const engine = Engine.create({ enableSleeping: true })
    engine.gravity.y = CONFIG.physics.gravityY

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const sprites = new Map<string, HTMLCanvasElement>()
    const shapes: Array<{ body: MatterNamespace.Body; sprite: HTMLCanvasElement; extent: number }> = []

    let width = 0
    let height = 0
    let walls: MatterNamespace.Body[] = []

    const spriteFor = (kind: ShapeKind, color: string, size: number) => {
      const key = `${kind}|${color}|${size}`
      const cached = sprites.get(key)
      if (cached) return cached

      const sprite = document.createElement('canvas')
      sprite.width = sprite.height = Math.ceil(size * 1.5 * dpr)
      const sctx = sprite.getContext('2d')!
      sctx.scale(dpr, dpr)
      sctx.translate(size * 0.75, size * 0.75)
      sctx.fillStyle = sctx.strokeStyle = color
      traceShape(sctx, kind, size)

      // Very slight flat shading, only over what was just drawn.
      const shade = sctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2)
      shade.addColorStop(0, 'rgba(255, 255, 255, 0.14)')
      shade.addColorStop(1, 'rgba(0, 0, 0, 0.07)')
      sctx.globalCompositeOperation = 'source-atop'
      sctx.fillStyle = shade
      sctx.fillRect(-size, -size, size * 2, size * 2)

      sprites.set(key, sprite)
      return sprite
    }

    const addShape = (x: number, y: number, scale: number) => {
      const { minSize, maxSize } = CONFIG.shapes
      // Sizes are bucketed so shapes can share sprites.
      const size = Math.round((random(minSize, maxSize) * scale) / 4) * 4
      const kind = pick(SHAPE_KINDS)
      const body = createBody(Matter, kind, size, x, y)
      Composite.add(engine.world, body)
      shapes.push({ body, sprite: spriteFor(kind, pickColor(), size), extent: size * 1.5 })
    }

    const setBounds = () => {
      const rect = stage.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)

      Composite.remove(engine.world, walls)
      const wall = { isStatic: true, friction: CONFIG.physics.friction }
      walls = [
        Bodies.rectangle(-WALL / 2, height / 2, WALL, height * 3, wall),
        Bodies.rectangle(width + WALL / 2, height / 2, WALL, height * 3, wall),
        Bodies.rectangle(width / 2, height + WALL / 2, width + WALL * 2, WALL, wall),
        // Soft ceiling: absorbs a flung shape rather than bouncing it back.
        Bodies.rectangle(width / 2, -WALL / 2, width + WALL * 2, WALL, { ...wall, restitution: 0 }),
      ]
      Composite.add(engine.world, walls)
    }

    const keepInside = () => {
      for (const { body } of shapes) {
        const { x, y } = body.position
        if (x >= 0 && x <= width && y >= 0 && y <= height) continue
        Sleeping.set(body, false)
        Body.setPosition(body, {
          x: Math.min(width - 10, Math.max(10, x)),
          y: Math.min(height - 10, Math.max(10, y)),
        })
        Body.setVelocity(body, { x: 0, y: 0 })
      }
    }

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const { body, sprite, extent } of shapes) {
        const cos = Math.cos(body.angle) * dpr
        const sin = Math.sin(body.angle) * dpr
        ctx.setTransform(cos, sin, -sin, cos, body.position.x * dpr, body.position.y * dpr)
        ctx.drawImage(sprite, -extent / 2, -extent / 2, extent, extent)
      }
    }

    setBounds()
    const scale = Math.max(1, width / 1440)
    // Short stages get fewer shapes, so the pile stays below the link row.
    const { maxPileShare, pileAreaPerShape } = CONFIG.shapes
    const total = Math.min(shapeCount(width), Math.floor((maxPileShare * height * width) / (pileAreaPerShape * scale * scale)))

    if (reducedMotion) {
      // Static pile: stack the shapes on a grid, settle them off screen, draw once.
      const settle = (steps: number) => {
        for (let i = 0; i < steps; i += 1) Engine.update(engine, STEP_MS)
        keepInside()
        draw()
      }
      const cell = CONFIG.shapes.maxSize * scale * 1.1
      const columns = Math.max(1, Math.floor(width / cell))
      for (let i = 0; i < total; i += 1) {
        const x = (i % columns + 0.5) * (width / columns)
        const y = height - (Math.floor(i / columns) + 0.5) * cell
        addShape(x, Math.max(cell, y), scale)
      }
      settle(150)

      const resize = new ResizeObserver(() => {
        setBounds()
        keepInside()
        for (const { body } of shapes) Sleeping.set(body, false)
        settle(60)
      })
      resize.observe(stage)
      teardownScene = () => {
        resize.disconnect()
        Engine.clear(engine)
      }
      return
    }

    let frame = 0
    let running = false
    let onScreen = false
    let spawned = 0
    let spawnStart = 0
    let last = 0
    let accumulator = 0

    // Cursor state, in stage coordinates. null while the pointer is away.
    let pointer: { x: number; y: number } | null = null
    let previous: { x: number; y: number } | null = null
    const blobPos = { x: 0, y: 0 }
    let blobPlaced = false

    const applyPointer = () => {
      if (!pointer) {
        previous = null
        return
      }
      const { radius, basePush, speedPush } = CONFIG.pointer
      const dx = previous ? pointer.x - previous.x : 0
      const dy = previous ? pointer.y - previous.y : 0
      const speed = Math.hypot(dx, dy)
      previous = pointer

      for (const { body } of shapes) {
        const offsetX = body.position.x - pointer.x
        const offsetY = body.position.y - pointer.y
        const distance = Math.hypot(offsetX, offsetY) || 1
        if (distance > radius) continue

        const falloff = 1 - distance / radius
        const push = (basePush + speed * speedPush) * falloff
        const limit = CONFIG.physics.maxSpeed
        Sleeping.set(body, false)
        Body.setVelocity(body, {
          x: Math.max(-limit, Math.min(limit, body.velocity.x + (offsetX / distance) * push + dx * speedPush * falloff)),
          y: Math.max(-limit, Math.min(limit, body.velocity.y + (offsetY / distance) * push + dy * speedPush * falloff)),
        })
      }
    }

    const spawnDue = (now: number) => {
      if (spawned >= total) return
      if (!spawnStart) spawnStart = now
      const due = Math.min(total, Math.ceil(((now - spawnStart) / CONFIG.physics.spawnMs) * total))
      for (; spawned < due; spawned += 1) {
        addShape(random(30, Math.max(31, width - 30)), random(10, 50), scale)
      }
    }

    const moveBlob = () => {
      if (!pointer) return
      if (!blobPlaced) {
        blobPos.x = pointer.x
        blobPos.y = pointer.y
        blobPlaced = true
      }
      blobPos.x += (pointer.x - blobPos.x) * CONFIG.pointer.blobLerp
      blobPos.y += (pointer.y - blobPos.y) * CONFIG.pointer.blobLerp
      blob.style.transform = `translate3d(${blobPos.x}px, ${blobPos.y}px, 0) translate(-50%, -50%)`
    }

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      accumulator += Math.min(now - last, 50)
      last = now
      spawnDue(now)

      // Fixed steps keep the physics the same speed on 60Hz and 120Hz screens.
      let steps = 0
      while (accumulator >= STEP_MS && steps < 2) {
        applyPointer()
        Engine.update(engine, STEP_MS)
        accumulator -= STEP_MS
        steps += 1
      }
      if (steps === 2) accumulator = 0

      keepInside()
      moveBlob()
      draw()
    }

    const syncRunning = () => {
      const shouldRun = onScreen && !document.hidden
      if (shouldRun === running) return
      running = shouldRun
      if (running) {
        last = performance.now()
        frame = requestAnimationFrame(tick)
      } else {
        cancelAnimationFrame(frame)
      }
    }

    const toStage = (clientX: number, clientY: number) => {
      const rect = stage.getBoundingClientRect()
      return { x: clientX - rect.left, y: clientY - rect.top }
    }

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      pointer = toStage(event.clientX, event.clientY)
      blob.classList.add('is-active')
    }
    const onPointerLeave = () => {
      pointer = null
      blobPlaced = false
      blob.classList.remove('is-active')
    }
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (touch) pointer = toStage(touch.clientX, touch.clientY)
    }
    const onTouchEnd = () => {
      pointer = null
    }
    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (!touch) return
      const point = toStage(touch.clientX, touch.clientY)
      const { burstRadius, burstSpeed } = CONFIG.pointer
      for (const { body } of shapes) {
        const offsetX = body.position.x - point.x
        const offsetY = body.position.y - point.y
        const distance = Math.hypot(offsetX, offsetY) || 1
        if (distance > burstRadius) continue
        const force = burstSpeed * (1 - distance / burstRadius)
        Sleeping.set(body, false)
        Body.setVelocity(body, {
          x: body.velocity.x + (offsetX / distance) * force,
          y: body.velocity.y + (offsetY / distance) * force,
        })
      }
    }

    // Listeners stay passive so touch scrolling through the footer still works.
    stage.addEventListener('pointermove', onPointerMove)
    stage.addEventListener('pointerleave', onPointerLeave)
    stage.addEventListener('touchstart', onTouchStart, { passive: true })
    stage.addEventListener('touchmove', onTouchMove, { passive: true })
    stage.addEventListener('touchend', onTouchEnd)
    stage.addEventListener('touchcancel', onTouchEnd)
    document.addEventListener('visibilitychange', syncRunning)

    const visible = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      syncRunning()
    }, { threshold: 0.15 })
    visible.observe(stage)

    const resize = new ResizeObserver(() => {
      setBounds()
      keepInside()
      for (const { body } of shapes) Sleeping.set(body, false)
      draw()
    })
    resize.observe(stage)

    teardownScene = () => {
      cancelAnimationFrame(frame)
      visible.disconnect()
      resize.disconnect()
      stage.removeEventListener('pointermove', onPointerMove)
      stage.removeEventListener('pointerleave', onPointerLeave)
      stage.removeEventListener('touchstart', onTouchStart)
      stage.removeEventListener('touchmove', onTouchMove)
      stage.removeEventListener('touchend', onTouchEnd)
      stage.removeEventListener('touchcancel', onTouchEnd)
      document.removeEventListener('visibilitychange', syncRunning)
      Engine.clear(engine)
    }
  }

  const nearby = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return
    nearby.disconnect()
    void start()
  }, { rootMargin: '800px 0px' })
  nearby.observe(stage)

  return () => {
    destroyed = true
    nearby.disconnect()
    teardownScene?.()
  }
}
