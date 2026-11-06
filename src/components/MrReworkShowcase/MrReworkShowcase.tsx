import { useState, type RefObject } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './MrReworkShowcase.css'

type Props = {
  scrollRoot: RefObject<HTMLDivElement | null>
}

const asset = (name: string) => `/images/mr-rework/${name}`
const heroImages = ['hero-20.webp', 'hero-21.webp', 'hero-22.webp', 'hero-23.webp', 'hero-24.webp', 'hero-25.webp'].map(asset)
const categoryImages = ['category-01.jpg', 'category-02.jpg', 'category-03.jpg', 'category-accessories.webp'].map(asset)
const bestSellingImages = ['best-selling-01.webp', 'best-selling-02.webp', 'best-selling-03.webp', 'best-selling-04.webp'].map(asset)
const trendingImages = ['trending-01.webp', 'trending-02.webp', 'trending-03.webp', 'trending-04.webp'].map(asset)
const lookImages = ['look-01.jpg', 'look-02.jpg', 'look-03.jpg', 'look-04.jpg', 'look-05.jpg'].map(asset)

const screens = [
  { label: 'Home', kind: 'hero' },
  { label: 'Shop by category', kind: 'categories' },
  { label: 'Best selling', kind: 'best' },
  { label: 'Trending', kind: 'trending' },
  { label: 'Looks', kind: 'look' },
] as const

function ImageFrame({ src, alt, className = '', contain = false }: { src: string; alt: string; className?: string; contain?: boolean }) {
  return (
    <div className={`mrw-image ${className}`}>
      <img src={src} alt={alt} loading="lazy" decoding="async" className={contain ? 'mrw-image__contain' : undefined} />
    </div>
  )
}

function MrReworkWebsiteScreen({ kind }: { kind: typeof screens[number]['kind'] }) {
  return (
    <div className="mrw-site-screen">
      <header className="mrw-site-screen__nav">
        <span className="mrw-site-screen__menu">Menu</span>
        <img src={asset('logo-wordmark.png')} alt="Mr.Rework" className="mrw-site-screen__logo" />
        <span className="mrw-site-screen__actions">Search&nbsp;&nbsp; Bag</span>
      </header>
      {kind === 'hero' && (
        <div className="mrw-site-screen__hero">
          {heroImages.slice(0, 5).map((src, index) => <img key={src} src={src} alt="" className={`mrw-site-screen__hero-image mrw-site-screen__hero-image--${index + 1}`} />)}
          <div className="mrw-site-screen__hero-copy"><strong>Mr.Rework</strong><span>Reclaimed vintage, rebuilt with intent</span></div>
        </div>
      )}
      {kind === 'categories' && <WebsiteRail title="Shop by Category" images={categoryImages} labels={['Women’s', 'Men’s', 'Unisex', 'Accessories']} />}
      {kind === 'best' && <WebsiteRail title="Best Selling" images={bestSellingImages} labels={['Patchwork', 'Workwear', 'Reworked', 'Limited']} />}
      {kind === 'trending' && <WebsiteRail title="Trending" images={trendingImages} labels={['Totes', 'Denim', 'Vintage', 'New in']} />}
      {kind === 'look' && <WebsiteRail title="Looks" images={lookImages} labels={['Look 01', 'Look 02', 'Look 03', 'Look 04', 'Look 05']} tall />}
    </div>
  )
}

function WebsiteRail({ title, images, labels, tall = false }: { title: string; images: string[]; labels: string[]; tall?: boolean }) {
  return (
    <section className="mrw-site-screen__rail">
      <div className="mrw-site-screen__rail-heading"><h4>{title}</h4><span>View all →</span></div>
      <div className={`mrw-site-screen__rail-grid ${tall ? 'is-tall' : ''}`}>
        {images.map((src, index) => <figure key={src}><img src={src} alt="" /><figcaption>{labels[index]}</figcaption></figure>)}
      </div>
    </section>
  )
}

function ScrubbedWebsite() {
  const [screenIndex, setScreenIndex] = useState(0)
  const progress = (screenIndex + 1) / screens.length
  const screen = screens[screenIndex]
  const goToScreen = (index: number) => {
    setScreenIndex(Math.max(0, Math.min(screens.length - 1, index)))
  }

  return (
    <section className="mrw-scrub" aria-labelledby="mrw-scrub-title">
      <div className="mrw-scrub__sticky">
        <div className="mrw-scrub__header">
          <div>
            {/* <p className="mrw-kicker">Interactive website experience</p> */}
            <h3 id="mrw-scrub-title">Explore the store</h3>
          </div>
          <div className="mrw-progress" aria-hidden="true">
            <span style={{ transform: `scaleX(${Math.max(0.04, progress)})` }} />
          </div>
          <p className="mrw-scrub__counter">{String(screenIndex + 1).padStart(2, '0')} / {String(screens.length).padStart(2, '0')}</p>
        </div>

        <div className="mrw-browser-stage">
          <button type="button" className="mrw-browser-nav mrw-browser-nav--prev" aria-label="Previous store section" disabled={screenIndex === 0} onClick={() => goToScreen(screenIndex - 1)}>
            <ChevronLeft aria-hidden="true" strokeWidth={1.8} />
          </button>
          <div className="mrw-browser">
            <div className="mrw-browser__bar" aria-hidden="true">
              <span /><span /><span />
              <span className="mrw-browser__address">mrrework.com / {screen.label.toLowerCase().replaceAll(' ', '-')}</span>
            </div>
            <div className="mrw-browser__screen">
              {screens.map((item, index) => <div key={item.kind} className={`mrw-browser__image ${index === screenIndex ? 'is-active' : ''}`}><MrReworkWebsiteScreen kind={item.kind} /></div>)}
            </div>
          </div>
          <button type="button" className="mrw-browser-nav mrw-browser-nav--next" aria-label="Next store section" disabled={screenIndex === screens.length - 1} onClick={() => goToScreen(screenIndex + 1)}>
            <ChevronRight aria-hidden="true" strokeWidth={1.8} />
          </button>
        </div>

        <div className="mrw-scrub__label">
          {/* <span>{screen.label}</span> */}
        </div>
      </div>
    </section>
  )
}

export default function MrReworkShowcase(_props: Props) {
  return (
    <article className="mrw-showcase">
      <header className="mrw-intro">
        <div className="mrw-intro__copy">
          {/* <p className="mrw-kicker">02 / Fashion e-commerce</p> */}
          <h2>Mr.Rework</h2>
          <p className="mrw-intro__lede">An online fashion experience built around individual style, curated collections, and effortless product discovery.</p>
          <dl className="mrw-meta">
            <div><dt>Services</dt><dd>Website design &amp; development</dd></div>
            <div><dt>Website</dt><dd><a href="https://www.mrrework.com/" target="_blank" rel="noreferrer">mrrework.com ↗</a></dd></div>
          </dl>
        </div>
        <ImageFrame src={heroImages[0]} alt="Mr.Rework fashion storefront homepage" className="mrw-intro__image" />
      </header>

      <ScrubbedWebsite />

      <section className="mrw-editorial" aria-labelledby="mrw-editorial-title">
        <div className="mrw-section-heading">
          <h3 id="mrw-editorial-title" className="project-detail__tagline">A wardrobe with a point of view.</h3>
        </div>
        <div className="mrw-editorial__grid project-detail__grid">
          <ImageFrame src={lookImages[0]} alt="Mr.Rework editorial collection" />
          <ImageFrame src={bestSellingImages[1]} alt="Mr.Rework reworked clothing product" contain />
          <ImageFrame src={trendingImages[0]} alt="Mr.Rework trending accessories" contain />
        </div>
      </section>

      <section className="mrw-shopping" aria-labelledby="mrw-shopping-title">
        <div className="mrw-section-heading">
          {/* <p className="mrw-kicker">Shopping experience</p> */}
          <h3 id="mrw-shopping-title" className="project-detail__tagline">Made to browse, filter, and find.</h3>
        </div>
        <div className="mrw-shopping__grid">
          <ImageFrame src={categoryImages[3]} alt="Mr.Rework accessories category" contain />
          <ImageFrame src={bestSellingImages[0]} alt="Mr.Rework best selling product" contain />
        </div>
      </section>

      <section className="mrw-final" aria-labelledby="mrw-final-title">
        <div className="mrw-final__caption">
          <div>
            <h3 id="mrw-final-title" className="project-detail__tagline">A digital home for one-of-a-kind style.</h3>
          </div>
          {/* <a href="https://www.mrrework.com/" target="_blank" rel="noreferrer" className="mrw-cta">Explore Mr.Rework <span>↗</span></a> */}
        </div>
        <div className="mrw-final__looks">
          {lookImages.map((src, index) => <ImageFrame key={src} src={src} alt={`Mr.Rework look ${index + 1}`} />)}
        </div>
      </section>
    </article>
  )
}
