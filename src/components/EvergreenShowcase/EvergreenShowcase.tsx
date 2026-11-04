import { useState, type RefObject } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "./EvergreenShowcase.css";

type Props = {
  scrollRoot: RefObject<HTMLDivElement | null>;
};

const asset = (name: string) => `/images/evergreen/${name}`;
const heroImage = asset("hero-poster.jpg");
const logo = asset("logo.png");

const screens = [
  { label: "Home", kind: "hero" },
  { label: "About Evergreen", kind: "about" },
  { label: "What we recycle", kind: "recycle" },
  { label: "Materials & capacity", kind: "materials" },
  { label: "How a pickup works", kind: "process" },
  { label: "Certifications & industries", kind: "certifications" },
  { label: "Sustainability", kind: "sustainability" },
] as const;

type ScreenKind = (typeof screens)[number]["kind"];

function SiteHeader() {
  return (
    <header className="evg-site-screen__nav">
      <img
        src={logo}
        alt="Ever Green E-Waste Recycling Management"
        className="evg-site-screen__logo"
      />
      <nav aria-label="Evergreen website navigation">
        <span>About</span>
        <span>Services</span>
        <span>Our process</span>
        <span>Documents</span>
      </nav>
      <span className="evg-site-screen__contact">Contact</span>
    </header>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="evg-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function EvergreenWebsiteScreen({ kind }: { kind: ScreenKind }) {
  return (
    <div className={`evg-site-screen evg-site-screen--${kind}`}>
      <SiteHeader />

      {kind === "hero" && (
        <section className="evg-hero">
          <img src={heroImage} alt="Evergreen recycling facility" />
          <div className="evg-hero__overlay" />
          <div className="evg-hero__copy">
            <p>Ever Green E-Waste Recycling Management</p>
            <h4>Authorised e-waste, battery and plastic recycling</h4>
            <span>PAN India pickup. Recycled at our plant in Sitapur, UP.</span>
          </div>
        </section>
      )}

      {kind === "about" && (
        <section className="evg-about">
          <div className="evg-site-heading">
            <span>About Evergreen</span>
            <h4>Recycling in Sitapur since 2020</h4>
          </div>
          <div className="evg-about__grid">
            <img
              src={asset("about.jpg")}
              alt="Evergreen recycling operations"
            />
            <div>
              <p>
                Ever Green E-Waste Recycling Management is an authorised
                recycler of e-waste, batteries and plastics, operating from
                Sitapur, Uttar Pradesh.
              </p>
              <p>
                We help organisations across India manage retired assets through
                documented, environmentally responsible recycling.
              </p>
              <div className="evg-stats evg-stats--three">
                <Stat value="2020" label="Operating since" />
                <Stat value="14,400 MT" label="E-waste capacity" />
                <Stat value="Pan India" label="Pickup network" />
              </div>
            </div>
          </div>
        </section>
      )}

      {kind === "recycle" && (
        <section className="evg-recycle">
          <div className="evg-site-heading">
            <span>What we recycle</span>
            <h4>Six specialist recovery routes.</h4>
          </div>
          <div className="evg-service-grid">
            {[
              ["e-waste.jpg", "E-waste recycling"],
              ["battery.jpg", "Battery recycling"],
              ["plastic.jpg", "Plastic recycling"],
              ["metal.jpg", "Metal recovery"],
              ["capacity.jpg", "Industrial scrap"],
              ["process-data.webp", "Secure disposal"],
            ].map(([image, title]) => (
              <figure key={title}>
                <img src={asset(image)} alt="" />
                <figcaption>{title}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {kind === "materials" && (
        <section className="evg-materials">
          <div className="evg-site-heading">
            <span>Materials we recover</span>
            <h4>Valuable fractions, routed back into use.</h4>
          </div>
          <div className="evg-materials__grid">
            {[
              [
                "copper.webp",
                "Copper",
                "From cables, motors and circuit boards",
              ],
              ["aluminium.webp", "Aluminium", "From casings, frames and cans"],
              ["plastic-flakes.webp", "Plastics", "PET, HDPE, PP and ABS"],
              [
                "battery-cells.jpg",
                "Battery materials",
                "From lead-acid and lithium-ion batteries",
              ],
            ].map(([image, title, description]) => (
              <figure key={title}>
                <img src={asset(image)} alt="" />
                <figcaption>
                  <strong>{title}</strong>
                  <span>{description}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="evg-capacity">
            <span>Annual processing capacity</span>
            <div>
              <Stat value="14,400 MT" label="E-waste" />
              <Stat value="10,800 MT" label="Batteries" />
              <Stat value="9,000 MT" label="Plastics" />
            </div>
          </div>
        </section>
      )}

      {kind === "process" && (
        <section className="evg-process">
          <div className="evg-site-heading">
            <span>How a pickup works</span>
            <h4>Six documented stages from inspection to closure.</h4>
          </div>
          <div className="evg-process__feature">
            <img
              src={asset("process-inspection.webp")}
              alt="Inspection and asset verification"
            />
            <div>
              <strong>01</strong>
              <h4>Inspection and asset verification</h4>
              <p>
                Every pickup begins with a documented view of the assets,
                condition and route ahead.
              </p>
            </div>
          </div>
          <div className="evg-process__steps">
            {[
              "Reverse logistics",
              "Data destruction and degaussing",
              "Reconditioning and refurbishment",
              "Recycling and material recovery",
              "Certificate and closure report",
            ].map((step, index) => (
              <div key={step}>
                <span>{String(index + 2).padStart(2, "0")}</span>
                <strong>{step}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      {kind === "certifications" && (
        <section className="evg-certifications">
          <div className="evg-site-heading">
            <span>Registrations and authorisations</span>
            <h4>Compliance that can be documented.</h4>
          </div>
          <div className="evg-certifications__grid">
            <img
              src={asset("certifications.jpg")}
              alt="Evergreen certification documents"
            />
            <div className="evg-cert-list">
              <div>
                <strong>GST registration</strong>
                <span>GSTIN 09BQEPA3569F3ZV</span>
              </div>
              <div>
                <strong>E-waste CTE, CTO and EPR</strong>
                <span>UPPCB authorisations</span>
              </div>
              <div>
                <strong>Battery CTE, CTO and EPR</strong>
                <span>UPPCB authorisations</span>
              </div>
            </div>
          </div>
          <div className="evg-industries">
            <span>Industries we serve</span>
            <div>
              {[
                ["industry-it.jpg", "IT companies"],
                ["industry-manufacturing.jpg", "Manufacturing plants"],
                ["industry-hospital.jpg", "Hospitals"],
                ["industry-construction.jpg", "Construction"],
              ].map(([image, title]) => (
                <figure key={title}>
                  <img src={asset(image)} alt="" />
                  <figcaption>{title}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {kind === "sustainability" && (
        <section className="evg-sustainability">
          <img
            src={asset("sustainability.jpg")}
            alt="Sorted recycled plastic flakes"
          />
          <div className="evg-sustainability__copy">
            <span>Our sustainability commitment</span>
            <h4>Every kilogram stays in the loop.</h4>
            <p>
              Responsible material recovery that keeps toxic material out of
              India's soil and water.
            </p>
          </div>
          <div className="evg-sustainability__stats">
            <Stat value="75%" label="Carbon footprint reduction" />
            <Stat value="92%" label="Material recovery rate" />
            <Stat value="98%" label="Zero landfill achievement" />
            <Stat value="60%" label="Clean energy usage" />
          </div>
          <footer>
            Ever Green E-Waste Recycling Management · Sitapur, Uttar Pradesh ·
            +91 94150 46061
          </footer>
        </section>
      )}
    </div>
  );
}

export default function EvergreenShowcase(_props: Props) {
  const [screenIndex, setScreenIndex] = useState(0);
  const progress = (screenIndex + 1) / screens.length;
  const screen = screens[screenIndex];

  const goToScreen = (index: number) => {
    setScreenIndex(Math.max(0, Math.min(screens.length - 1, index)));
  };

  return (
    <article className="evg-showcase">
      <header className="evg-intro">
        <div className="evg-intro__copy">
          <h2>Evergreen</h2>
          <p>Recycling &amp; Environmental Compliance</p>
          <span>
            An industrial digital experience for Evergreen, showcasing
            responsible material recovery and compliance-driven services.
          </span>
        </div>
        <img
          src={heroImage}
          alt="Evergreen industrial recycling facility"
          className="evg-intro__image"
        />
      </header>

      <section className="evg-scrub" aria-labelledby="evg-scrub-title">
        <div className="evg-scrub__sticky">
          {/* <div className="evg-scrub__header"><div><p>Evergreen website</p><h3 id="evg-scrub-title">Explore the operation</h3></div><div className="evg-progress" aria-hidden="true"><span style={{ transform: `scaleX(${Math.max(0.04, progress)})` }} /></div><p className="evg-counter">{String(screenIndex + 1).padStart(2, '0')} / {String(screens.length).padStart(2, '0')}</p></div> */}
          <div className="evg-browser-stage">
            <button
              type="button"
              className="evg-browser-nav"
              aria-label="Previous Evergreen website section"
              disabled={screenIndex === 0}
              onClick={() => goToScreen(screenIndex - 1)}
            >
              <ChevronLeft aria-hidden="true" strokeWidth={1.8} />
            </button>
            <div className="evg-browser">
              <div className="evg-browser__bar">
                <span />
                <span />
                <span />
                <span className="evg-browser__address">
                  evergreenrecycler.in /{" "}
                  {screen.label
                    .toLowerCase()
                    .replaceAll(" ", "-")
                    .replaceAll("&", "and")}
                </span>
              </div>
              <div className="evg-browser__screen">
                {screens.map((item, index) => (
                  <div
                    key={item.kind}
                    className={`evg-browser__image ${index === screenIndex ? "is-active" : ""}`}
                  >
                    <EvergreenWebsiteScreen kind={item.kind} />
                  </div>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="evg-browser-nav"
              aria-label="Next Evergreen website section"
              disabled={screenIndex === screens.length - 1}
              onClick={() => goToScreen(screenIndex + 1)}
            >
              <ChevronRight aria-hidden="true" strokeWidth={1.8} />
            </button>
          </div>
          <div className="evg-scrub__label">
            {/* <span>{screen.label}</span> */}
            {/* <span>Scroll to explore</span> */}
          </div>
        </div>
      </section>
    </article>
  );
}
