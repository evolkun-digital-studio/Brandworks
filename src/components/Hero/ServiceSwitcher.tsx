import type { HeroServiceId } from '../../data/heroServices'
import { heroServices, HERO_SERVICE_ORDER } from '../../data/heroServices'

/**
 * The capsules drive the hero visual in place — they are toggle buttons,
 * not links. Pointing at or focusing one warms its media so the switch
 * lands on an image that's already loaded.
 */
function ServiceSwitcher({
  activeId,
  onSelect,
  onIntent,
}: {
  activeId: HeroServiceId
  onSelect: (id: HeroServiceId) => void
  onIntent: (id: HeroServiceId) => void
}) {
  return (
    <div role="group" aria-label="Preview our work by service" className="hero-switcher">
      {HERO_SERVICE_ORDER.map((id) => {
        const active = id === activeId
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(id)}
            onPointerEnter={() => onIntent(id)}
            onFocus={() => onIntent(id)}
            className={`hero-capsule ${active ? 'is-active' : ''}`}
          >
            {heroServices[id].label}
          </button>
        )
      })}
    </div>
  )
}

export default ServiceSwitcher
