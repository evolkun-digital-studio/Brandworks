import type { JSX } from 'react'
import type { CapabilityVisual as Kind } from '../../data/technology'

/**
 * One small line diagram per capability (480×400 viewBox): nodes, thin
 * lines and plain labels — boxes only where the shape is the picture (chart
 * bars, message bubbles, an interface). Lime only for the moving signals
 * and the one element that matters. Signals are CSS dash animations that run only while the visual
 * is the selected one (see .bwt-cap-visual.is-active in TechnologyPage.css).
 */

/** A path drawn as structure plus a lime signal travelling along it. */
function Flow({ d, delay = 0 }: { d: string; delay?: number }) {
  return (
    <>
      <path className="bwt-v-line" d={d} pathLength={1} />
      <path
        className="bwt-v-signal"
        d={d}
        pathLength={1}
        style={{ animationDelay: `${delay}s` }}
      />
    </>
  )
}

function Label({ x, y, children, anchor = 'middle' }: {
  x: number
  y: number
  children: string
  anchor?: 'start' | 'middle' | 'end'
}) {
  return (
    <text className="bwt-v-label" x={x} y={y} textAnchor={anchor}>
      {children}
    </text>
  )
}

function Agents() {
  const names = ['Intake', 'Research', 'Decide', 'Report', 'Schedule', 'Follow-up']
  return (
    <>
      <circle className="bwt-v-faint" cx={240} cy={200} r={168} />
      {names.map((name, i) => {
        const a = (i / names.length) * Math.PI * 2 - Math.PI / 2
        const x = 240 + Math.cos(a) * 132
        const y = 200 + Math.sin(a) * 132
        return (
          <g key={name}>
            <Flow d={`M240 200 L${x.toFixed(1)} ${y.toFixed(1)}`} delay={i * 0.35} />
            <circle className="bwt-v-node" cx={x} cy={y} r={7} />
            <Label x={x} y={y + (y > 200 ? 26 : -16)}>{name}</Label>
          </g>
        )
      })}
      <circle className="bwt-v-accent" cx={240} cy={200} r={24} />
      <circle className="bwt-v-dot" cx={240} cy={200} r={4} />
    </>
  )
}

function Sales() {
  const stages = ['New', 'Qualified', 'Contacted', 'Proposal', 'Won']
  const heights = [150, 112, 82, 56, 36]
  return (
    <>
      {stages.map((stage, i) => {
        const x = 60 + i * 90
        return (
          <g key={stage}>
            <rect
              className={i === stages.length - 1 ? 'bwt-v-accent' : 'bwt-v-block'}
              x={x - 26}
              y={250 - heights[i]}
              width={52}
              height={heights[i]}
            />
            <line className="bwt-v-faint" x1={x} y1={250} x2={x} y2={262} />
            <Label x={x} y={290}>{stage}</Label>
          </g>
        )
      })}
      <Flow d="M34 250 L446 250" />
      <Flow d="M34 250 L446 250" delay={1.6} />
    </>
  )
}

function Support() {
  const inbound = [110, 200, 290]
  const routes = [
    { y: 120, name: 'AI reply' },
    { y: 200, name: 'Specialist' },
    { y: 280, name: 'Knowledge' },
  ]
  return (
    <>
      {inbound.map((y, i) => (
        <g key={y}>
          <rect className="bwt-v-block" x={34} y={y - 22} width={112} height={44} rx={8} />
          <line className="bwt-v-text" x1={50} y1={y - 6} x2={120} y2={y - 6} />
          <line className="bwt-v-text" x1={50} y1={y + 7} x2={98} y2={y + 7} />
          <Flow d={`M146 ${y} C200 ${y} 200 200 226 200`} delay={i * 0.5} />
        </g>
      ))}
      <path className="bwt-v-accent" d="M240 182 L258 200 L240 218 L222 200 Z" />
      {routes.map((route, i) => (
        <g key={route.name}>
          <Flow d={`M258 200 C300 200 300 ${route.y} 340 ${route.y}`} delay={0.9 + i * 0.5} />
          <circle className="bwt-v-node" cx={348} cy={route.y} r={7} />
          <Label x={366} y={route.y + 4} anchor="start">{route.name}</Label>
        </g>
      ))}
    </>
  )
}

function Analytics() {
  const sources = ['CRM', 'Sales', 'Ops']
  const bars = [0.45, 0.62, 0.5, 0.78, 0.66, 0.92]
  return (
    <>
      {sources.map((name, i) => {
        const y = 120 + i * 80
        return (
          <g key={name}>
            <Flow d={`M114 ${y} C160 ${y} 160 200 204 200`} delay={i * 0.45} />
            <circle className="bwt-v-node" cx={114} cy={y} r={6} />
            <Label x={98} y={y + 4} anchor="end">{name}</Label>
          </g>
        )
      })}
      <Flow d="M256 200 L300 200" delay={1.3} />
      <circle className="bwt-v-accent" cx={230} cy={200} r={26} />
      <line className="bwt-v-faint" x1={300} y1={290} x2={450} y2={290} />
      {bars.map((value, i) => (
        <rect
          key={i}
          className={`bwt-v-bar${i === bars.length - 1 ? ' is-lime' : ''}`}
          x={308 + i * 24}
          y={290 - value * 170}
          width={12}
          height={value * 170}
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </>
  )
}

function Erp() {
  const departments = ['Sales', 'Ops', 'Inventory', 'Finance', 'Teams']
  return (
    <>
      {departments.map((name, i) => {
        const a = (i / departments.length) * Math.PI * 2 - Math.PI / 2
        const x = 240 + Math.cos(a) * 140
        const y = 200 + Math.sin(a) * 140
        return (
          <g key={name}>
            <Flow d={`M${x.toFixed(1)} ${y.toFixed(1)} L240 200`} delay={i * 0.4} />
            <circle className="bwt-v-node" cx={x} cy={y} r={6} />
            <Label
              x={240 + Math.cos(a) * 168}
              y={200 + Math.sin(a) * 168 + 4}
              anchor={Math.abs(Math.cos(a)) < 0.3 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end'}
            >
              {name}
            </Label>
          </g>
        )
      })}
      <circle className="bwt-v-accent" cx={240} cy={200} r={26} />
      <circle className="bwt-v-dot" cx={240} cy={200} r={4} />
    </>
  )
}

function Workflow() {
  return (
    <>
      <Flow d="M96 200 L218 200" />
      <Flow d="M262 200 L380 200" delay={0.7} />
      <Flow d="M240 222 C240 300 300 300 380 300" delay={1.1} />
      <circle className="bwt-v-node" cx={80} cy={200} r={16} />
      <Label x={80} y={244}>Trigger</Label>
      <path className="bwt-v-accent" d="M240 178 L262 200 L240 222 L218 200 Z" />
      <Label x={240} y={162}>Logic</Label>
      <circle className="bwt-v-node" cx={388} cy={200} r={8} />
      <Label x={406} y={204} anchor="start">Action</Label>
      <circle className="bwt-v-node" cx={388} cy={300} r={8} />
      <Label x={406} y={304} anchor="start">Notify</Label>
    </>
  )
}

function Integration() {
  const systems = ['CRM', 'ERP', 'Email', 'Helpdesk', 'Docs', 'Sheets']
  return (
    <>
      {systems.map((name, i) => {
        const y = 75 + i * 50
        return (
          <g key={name}>
            <Flow d={`M170 ${y} C280 ${y} 300 200 370 200`} delay={i * 0.3} />
            <circle className="bwt-v-node" cx={170} cy={y} r={6} />
            <Label x={152} y={y + 4} anchor="end">{name}</Label>
          </g>
        )
      })}
      <circle className="bwt-v-accent" cx={392} cy={200} r={22} />
      <circle className="bwt-v-dot" cx={392} cy={200} r={4} />
    </>
  )
}

function Tools() {
  const rows = [0, 1, 2, 3, 4]
  return (
    <>
      <rect className="bwt-v-block" x={50} y={70} width={380} height={260} />
      <line className="bwt-v-faint" x1={140} y1={70} x2={140} y2={330} />
      <line className="bwt-v-faint" x1={140} y1={110} x2={430} y2={110} />
      {[96, 126, 156, 186].map((y) => (
        <line key={y} className="bwt-v-text" x1={66} y1={y} x2={118} y2={y} />
      ))}
      {rows.map((row) => {
        const y = 140 + row * 36
        const active = row === 2
        return (
          <g key={row}>
            {active && <rect className="bwt-v-row" x={141} y={y - 14} width={288} height={30} />}
            {active && <rect className="bwt-v-dot" x={141} y={y - 14} width={2} height={30} />}
            <line className="bwt-v-text" x1={160} y1={y + 1} x2={250} y2={y + 1} />
            <line className="bwt-v-text" x1={280} y1={y + 1} x2={340} y2={y + 1} />
            {active && <Label x={410} y={y + 5} anchor="end">Approved</Label>}
          </g>
        )
      })}
    </>
  )
}

const VISUALS: Record<Kind, () => JSX.Element> = {
  agents: Agents,
  sales: Sales,
  support: Support,
  analytics: Analytics,
  erp: Erp,
  workflow: Workflow,
  integration: Integration,
  tools: Tools,
}

export default function CapabilityVisual({ kind }: { kind: Kind }) {
  const Visual = VISUALS[kind]
  return (
    <svg className="bwt-v" viewBox="0 0 480 400" aria-hidden="true" focusable="false">
      <Visual />
    </svg>
  )
}
