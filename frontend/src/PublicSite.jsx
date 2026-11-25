import { useEffect, useState } from "react";
import { apiRequest } from "./api";
import { useSiteContent } from "./site-context";
import BookingForm, { Field } from "./components/BookingForm";
import ProviderForm from "./components/ProviderForm";
import { Icon } from "./components/Icon";
import "./public-v2.css";

const Lines = ({ text }) =>
  String(text || "")
    .split("\n")
    .map((line, i) => (
      <span className="copy-line" key={i}>
        {line}
      </span>
    ));
export function Logo({ light = false }) {
  const {
    content: { business: b },
  } = useSiteContent();
  return (
    <a
      className={`brand ${light ? "brand-light" : ""}`}
      href="/"
      aria-label={`${b.name} home`}
    >
      {b.logo ? (
        <img className="brand-upload" src={b.logo} alt={b.logoAlt || b.name} />
      ) : (
        <span className="brand-mark">
          <svg viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <path
              d="M18 28C10 24 5 19 7 13c2-5 8-5 11 0 3-5 9-5 11 0 2 6-3 11-11 15Z"
              stroke="currentColor"
              strokeWidth="2.2"
            />
            <path
              d="M18 25V13m0 9-5-5m5 2 5-5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </span>
      )}
      <span className="brand-type">
        {b.shortName}
        <span>{b.tagline}</span>
      </span>
    </a>
  );
}
function Header({ user }) {
  const {
    content: { business: b, navigation: n },
  } = useSiteContent();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="v2-announcement">
        <div className="container">
          <span>
            {n.announcement}
            {n.location ? ` · ${n.location}` : ""}
          </span>
          <a href={`tel:${b.phone}`}>{b.phoneDisplay}</a>
        </div>
      </div>
      <header className="v2-header">
        <div className="container">
          <Logo />
          <button
            className="v2-menu"
            aria-expanded={open}
            aria-controls="public-navigation"
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={() => setOpen(!open)}
          >
            <Icon name={open ? "close" : "menu"} size={26} />
          </button>
          <nav
            id="public-navigation"
            className={open ? "open" : ""}
            aria-label="Main navigation"
          >
            {[
              ["/services", n.services],
              ["/how-it-works", n.howItWorks],
              ["/about", n.about],
              ["/become-provider", n.join],
              ["/contact", n.contact],
            ].map(([url, label]) => (
              <a
                href={url}
                key={url}
                aria-current={
                  location.pathname.startsWith(url) ? "page" : undefined
                }
              >
                {label}
              </a>
            ))}
            <a className="v2-signin" href="/account">
              {user ? n.workspace : n.signIn}
            </a>
            <a className="button button-primary" href="/book">
              {n.book}
            </a>
          </nav>
        </div>
      </header>
    </>
  );
}
function Footer() {
  const { content: c } = useSiteContent(),
    b = c.business,
    f = c.footer;
  return (
    <footer className="v2-footer">
      <div className="container v2-footer-main">
        <div className="v2-footer-intro">
          <Logo light />
          <h2>{f.tagline}</h2>
          <p>{f.description}</p>
          <small>{f.location}</small>
        </div>
        <div>
          <h3>{f.servicesHeading}</h3>
          {c.services.map((s) => (
            <a key={s.id} href={`/services/${s.slug}`}>
              {s.title}
            </a>
          ))}
        </div>
        <div>
          <h3>{f.companyHeading}</h3>
          <a href="/about">{c.navigation.about}</a>
          <a href="/how-it-works">{c.navigation.howItWorks}</a>
          <a href="/become-provider">{c.navigation.join}</a>
          <a href="/faq">{c.labels.allQuestions}</a>
          <a href="/account">{f.familyAccount}</a>
          <a href="/staff">{f.teamSignIn}</a>
        </div>
        <div className="v2-footer-contact">
          <h3>{f.helpHeading}</h3>
          {b.phone && <a href={`tel:${b.phone}`}>{b.phoneDisplay}</a>}
          {b.email && <a href={`mailto:${b.email}`}>{b.email}</a>}
          {b.address && <p>{b.address}</p>}
          <WhatsAppLink business={b} className="v2-whatsapp-link">
            Chat on WhatsApp
          </WhatsAppLink>
        </div>
      </div>
      <div className="container v2-footer-bottom">
        <span>
          © {new Date().getFullYear()} {f.copyright || b.name}
        </span>
        <div>
          {Object.keys(c.policies).map((k) => (
            <a key={k} href={`/policies/${k}`}>
              {c.labels[k] || c.policies[k].label}
            </a>
          ))}
          <a href="/photo-credits">Photo credits</a>
        </div>
      </div>
    </footer>
  );
}
function whatsappHref(business) {
  const digits = String(business.whatsapp || business.phone || "").replace(
    /\D/g,
    "",
  );
  const phone = digits.startsWith("0") ? `250${digits.slice(1)}` : digits;
  if (!phone) return "";
  const message = encodeURIComponent(
    "Hello, I would like to learn more about your home care and assistance services.",
  );
  return `https://wa.me/${phone}?text=${message}`;
}
function WhatsAppLink({ business, className = "", children }) {
  const href = whatsappHref(business);
  if (!href) return null;
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open a WhatsApp chat with ${business.name}`}
    >
      {children || "Chat on WhatsApp"}
      <Icon name="message" size={18} />
    </a>
  );
}
function Media({
  image,
  alt,
  video,
  videoPoster,
  videoTitle,
  className = "",
  eager = false,
  autoplay = false,
}) {
  const [canAutoplay, setCanAutoplay] = useState(false);
  useEffect(() => {
    if (!autoplay || !video) return undefined;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = navigator.connection;
    const update = () =>
      setCanAutoplay(
        !motion.matches &&
          !connection?.saveData &&
          !["slow-2g", "2g"].includes(connection?.effectiveType),
      );
    update();
    motion.addEventListener?.("change", update);
    connection?.addEventListener?.("change", update);
    return () => {
      motion.removeEventListener?.("change", update);
      connection?.removeEventListener?.("change", update);
    };
  }, [autoplay, video]);
  if (video && autoplay) {
    if (!canAutoplay)
      return (
        <img
          className={className}
          src={image}
          alt={alt || ""}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
        />
      );
    return (
      <video
        className={className}
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        poster={videoPoster || image}
        aria-hidden="true"
        key={video}
      >
        <source src={video} type="video/mp4" />
      </video>
    );
  }
  return video ? (
    <video
      className={className}
      controls
      playsInline
      preload="none"
      poster={videoPoster || image}
      aria-label={videoTitle || alt}
      key={video}
    >
      <source src={video} type="video/mp4" />
      Your browser does not support this video.
    </video>
  ) : (
    <img
      className={className}
      src={image}
      alt={alt || ""}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
function PageIntro({ data }) {
  return (
    <div className="container v2-page-intro">
      <p className="v2-kicker">{data.eyebrow}</p>
      <h1>
        <Lines text={data.title} />
      </h1>
      <p>{data.intro}</p>
    </div>
  );
}
function CareCta() {
  const {
    content: { cta: c, business: b },
  } = useSiteContent();
  return (
    <section className="v2-cta">
      <div className="container">
        <div>
          <p className="v2-kicker">{c.eyebrow}</p>
          <h2>
            <Lines text={c.title} />
          </h2>
        </div>
        <div>
          <p>{c.text}</p>
          <div className="v2-actions">
            <a className="button button-white" href="/book">
              {c.button}
            </a>
            <a className="v2-text-light" href={`tel:${b.phone}`}>
              {c.secondary} · {b.phoneDisplay}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
function ServiceCatalog({ compact = false }) {
  const { content: c } = useSiteContent();
  return (
    <div className={`v2-service-catalog ${compact ? "compact" : ""}`}>
      {c.services.map((s) => (
        <article key={s.id}>
          <a className="v2-service-picture" href={`/services/${s.slug}`}>
            <img src={s.image} alt={s.alt} loading="lazy" decoding="async" />
          </a>
          <div>
            <p className="v2-kicker">{s.short}</p>
            <h3>
              <a href={`/services/${s.slug}`}>{s.title}</a>
            </h3>
            <p>{s.description}</p>
            <ul className="v2-service-preview">
              {s.includes.slice(0, 3).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            <a className="v2-text-link" href={`/services/${s.slug}`}>
              {c.labels.exploreService}
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}
function Process() {
  const {
    content: { howItWorks: p },
  } = useSiteContent();
  return (
    <div className="v2-process">
      {p.steps.map((s, i) => (
        <article key={i}>
          <span className="v2-process-line" aria-hidden="true" />
          <h3>{s.title}</h3>
          <p>{s.text}</p>
        </article>
      ))}
    </div>
  );
}
function FaqList({ limit }) {
  const { content: c } = useSiteContent();
  return (
    <div className="v2-faq-list">
      {c.faq.items.slice(0, limit).map((item, i) => (
        <details key={i}>
          <summary>
            {item.question}
            <span aria-hidden="true">+</span>
          </summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
function Home() {
  const { content: c } = useSiteContent(),
    h = c.home,
    b = c.business;
  return (
    <>
      <section className="v2-hero">
        <div className="container v2-hero-layout">
          <div className="v2-hero-copy">
            <p className="v2-kicker">{h.eyebrow}</p>
            <h1>
              {h.title}
              <em>{h.emphasis}</em>
            </h1>
            <p>{h.intro}</p>
            <div className="v2-actions">
              <a className="button button-primary" href="/book">
                {h.primaryAction}
              </a>
              <a className="v2-text-link" href={`tel:${b.phone}`}>
                {h.secondaryAction} · {b.phoneDisplay}
              </a>
            </div>
          </div>
          <div className="v2-hero-photos">
            <figure className="v2-family-photo">
              <Media
                image={h.image}
                alt={h.imageAlt}
                video={h.video}
                videoPoster={h.videoPoster}
                videoTitle={h.videoTitle}
                autoplay
                eager
              />
              <figcaption>{h.imageCaption}</figcaption>
            </figure>
            <figure className="v2-home-photo">
              <img src={h.homeImage} alt={h.homeImageAlt} decoding="async" />
              <figcaption>
                <strong>{h.homeImageCaption}</strong>
              </figcaption>
            </figure>
          </div>
        </div>
        <div className="container v2-service-strip">
          {c.services.map((s) => (
            <a key={s.id} href={`/services/${s.slug}`}>
              <Icon name={s.icon} size={22} />
              {s.title}
            </a>
          ))}
        </div>
      </section>
      <section className="container v2-section">
        <div className="v2-section-head">
          <div>
            <p className="v2-kicker">{h.servicesEyebrow}</p>
            <h2>
              <Lines text={h.servicesTitle} />
            </h2>
          </div>
          <p>{h.servicesIntro}</p>
        </div>
        <ServiceCatalog />
      </section>
      <section className="v2-story-section">
        <div className="container v2-story-layout">
          <figure>
            <Media
              image={h.story.image}
              alt={h.story.imageAlt}
              video={h.story.video}
              videoPoster={h.story.videoPoster}
              videoTitle={h.story.videoTitle}
            />
            <figcaption>{h.story.caption}</figcaption>
          </figure>
          <div>
            <p className="v2-kicker">{h.story.eyebrow}</p>
            <h2>
              <Lines text={h.story.title} />
            </h2>
            <p>{h.story.body}</p>
            <a className="v2-text-link" href="/about">
              {c.labels.aboutUs}
            </a>
          </div>
        </div>
      </section>
      <section className="container v2-section">
        <div className="v2-section-head">
          <h2>
            <Lines text={h.valuesTitle} />
          </h2>
          <p>{c.howItWorks.intro}</p>
        </div>
        <div className="v2-values">
          {h.values.map((item, i) => (
            <article key={i}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
        <div className="v2-life-gallery">
          <h2>{h.galleryTitle}</h2>
          <div>
            {h.gallery.map((item, i) => (
              <figure key={i}>
                <img src={item.image} alt={item.alt} loading="lazy" />
                <figcaption>{item.caption}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
      <section className="v2-join-section container">
        <img src={h.joinImage} alt={h.joinImageAlt} loading="lazy" />
        <div>
          <p className="v2-kicker">{c.navigation.join}</p>
          <h2>
            <Lines text={h.joinTitle} />
          </h2>
          <p>{h.joinText}</p>
          <a className="button button-primary" href="/become-provider">
            {h.joinButton}
          </a>
        </div>
      </section>
      <section className="container v2-section v2-faq-layout">
        <div>
          <p className="v2-kicker">{c.faq.eyebrow}</p>
          <h2>{c.faq.title}</h2>
          <p>{c.faq.intro}</p>
          <a className="v2-text-link" href="/faq">
            {c.labels.allQuestions}
          </a>
        </div>
        <FaqList limit={4} />
      </section>
      <CareCta />
    </>
  );
}
function ServiceDetail({ service: s }) {
  const { content: c } = useSiteContent();
  return (
    <>
      <div className="container v2-breadcrumb">
        <a href="/services">{c.labels.allServices}</a>
        <span>/</span>
        <span>{s.title}</span>
      </div>
      <section className="container v2-detail-hero">
        <div>
          <p className="v2-kicker">{s.short}</p>
          <h1>{s.title}</h1>
          <p>{s.description}</p>
          <a className="button button-primary" href={`/book?service=${s.id}`}>
            {c.labels.requestService}
          </a>
          <small>{c.labels.requestNotice}</small>
        </div>
        <Media
          image={s.image}
          alt={s.alt}
          video={s.video}
          videoPoster={s.videoPoster}
          videoTitle={s.videoTitle}
          eager
        />
      </section>
      <section className="container v2-detail-content">
        <div>
          <h2>{c.labels.serviceIncludes}</h2>
          <ul>
            {s.includes.map((x, i) => (
              <li key={i}>
                <Icon name="check" size={20} />
                {x}
              </li>
            ))}
          </ul>
          <h2>{c.labels.servicePrepare}</h2>
          <p>{s.prepare}</p>
        </div>
        <aside>
          <Icon name={s.icon} size={32} />
          <h3>{c.labels.serviceBoundaries}</h3>
          <p>{s.boundaries}</p>
          <a href="/contact" className="v2-text-link">
            {c.navigation.contact}
          </a>
        </aside>
      </section>
      <CareCta />
    </>
  );
}
function Contact() {
  const { content: c } = useSiteContent(),
    b = c.business,
    d = c.contact;
  const [state, setState] = useState({ busy: false, error: "", done: false }),
    labels = d.formLabels;
  async function submit(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setState({ busy: true, error: "", done: false });
    try {
      await apiRequest("/contact", {
        method: "POST",
        body: JSON.stringify({ ...f, consent: f.consent === "on" }),
      });
      setState({ busy: false, error: "", done: true });
    } catch (error) {
      setState({ busy: false, error: error.message, done: false });
    }
  }
  return (
    <>
      <PageIntro data={d} />
      <section className="container v2-contact-layout">
        <aside>
          <h2>{d.contactTitle}</h2>
          <p>{d.phoneLabel}</p>
          <a className="v2-contact-phone" href={`tel:${b.phone}`}>
            {b.phoneDisplay}
          </a>
          <p>{d.emailLabel}</p>
          <a href={`mailto:${b.email}`}>{b.email}</a>
          <div className="v2-contact-meta">
            <p>{d.areaLabel}</p>
            <strong>{b.serviceAreas}</strong>
            {b.address && <span>{b.address}</span>}
            {b.hours && (
              <>
                <p>{d.hoursLabel}</p>
                <strong>{b.hours}</strong>
              </>
            )}
          </div>
          <WhatsAppLink business={b} className="v2-whatsapp-link">
            Message Mary on WhatsApp
          </WhatsAppLink>
          <figure>
            <img src={d.image} alt={d.imageAlt} loading="lazy" />
          </figure>
          <small>{d.emergencyNote}</small>
        </aside>
        {state.done ? (
          <div className="booking-success" role="status">
            <Icon name="check" size={40} />
            <h2>{d.successTitle}</h2>
            <p>{d.successText}</p>
            <a className="button button-primary" href="/">
              {c.labels.backHome}
            </a>
          </div>
        ) : (
          <form className="contact-form" onSubmit={submit}>
            <h2>{d.formTitle}</h2>
            {state.error && (
              <p className="notice notice-error" role="alert">
                {state.error}
              </p>
            )}
            <div className="form-grid">
              <Field label={labels.name}>
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength="2"
                  maxLength="100"
                />
              </Field>
              <Field label={labels.email}>
                <input
                  name="email"
                  autoComplete="email"
                  type="email"
                  required
                  maxLength="254"
                />
              </Field>
              <Field label={labels.phone}>
                <input
                  name="phone"
                  autoComplete="tel"
                  type="tel"
                  maxLength="24"
                />
              </Field>
              <Field label={labels.subject}>
                <select name="subject" required>
                  {labels.subjects.map((subject) => (
                    <option key={subject}>{subject}</option>
                  ))}
                </select>
              </Field>
              <Field label={labels.message} hint={labels.messageHint} wide>
                <textarea
                  name="message"
                  required
                  minLength="10"
                  maxLength="2000"
                  rows="6"
                />
              </Field>
            </div>
            <label className="checkbox-label">
              <input name="consent" type="checkbox" required />
              <span>
                {labels.consent.split(labels.privacyLink)[0]}
                <a href="/policies/privacy">{labels.privacyLink}</a>
                {labels.consent.split(labels.privacyLink)[1]}
              </span>
            </label>
            <label className="honeypot" aria-hidden="true">
              Website
              <input name="website" tabIndex="-1" autoComplete="off" />
            </label>
            <button className="button button-primary" disabled={state.busy}>
              {state.busy ? labels.sendingLabel : d.sendButton}
            </button>
          </form>
        )}
      </section>
    </>
  );
}
function Policy({ kind }) {
  const { content: c } = useSiteContent(),
    p = c.policies[kind] || c.policies.privacy;
  return (
    <>
      <PageIntro data={{ eyebrow: p.label, ...p }} />
      <section className="container v2-policy-layout">
        <nav aria-label="Policies">
          {Object.entries(c.policies).map(([key, item]) => (
            <a
              key={key}
              href={`/policies/${key}`}
              aria-current={key === kind ? "page" : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <article>
          <p className="v2-policy-status">{p.status}</p>
          {p.sections.map((s, i) => (
            <section key={i}>
              <h2>{s.title}</h2>
              <p>{s.body}</p>
            </section>
          ))}
          <a className="v2-text-link" href="/contact">
            {c.navigation.contact}
          </a>
        </article>
      </section>
    </>
  );
}
function Credits() {
  const { content: c } = useSiteContent();
  return (
    <>
      <PageIntro
        data={{
          eyebrow: "Photography",
          title:
            c.photography?.title || "The people and places in our photographs.",
          intro: c.photography?.note || c.labels.galleryCaption,
        }}
      />
      <section className="container v2-credits">
        {(c.photography?.items || []).map((p, i) => (
          <article key={i}>
            <img src={p.image} alt={p.alt || p.title} loading="lazy" />
            <div>
              <h2>{p.title}</h2>
              <p>
                {p.author}
                {p.location ? ` · ${p.location}` : ""}
              </p>
              <p>
                {p.sourceUrl && (
                  <a href={p.sourceUrl} target="_blank" rel="noreferrer">
                    {p.mediaType === "video" ? "Original video" : "Original photograph"}
                  </a>
                )}
                {p.sourceUrl && p.license && " · "}
                {p.licenseUrl ? (
                  <a href={p.licenseUrl} target="_blank" rel="noreferrer">
                    {p.license}
                  </a>
                ) : (
                  p.license
                )}
              </p>
              <small>
                {p.note ||
                  "Displayed in compressed web size; some layouts crop the image."}
              </small>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
export default function PublicSite({ user }) {
  const { content: c, preview } = useSiteContent();
  const path = location.pathname.replace(/\/$/, "") || "/";
  const detail = c.services.find((s) => path === `/services/${s.slug}`);
  const seoKey = {
    "/": "home",
    "/services": "services",
    "/how-it-works": "howItWorks",
    "/about": "about",
    "/book": "booking",
    "/become-provider": "provider",
    "/contact": "contact",
    "/faq": "faq",
  }[path];
  useEffect(() => {
    const seo = c.seo?.[seoKey];
    const brand = c.business.shortName
      ? c.business.shortName.charAt(0).toLocaleUpperCase() +
        c.business.shortName.slice(1)
      : c.business.name;
    document.title = `${detail?.title || seo?.title || c.business.name} | ${brand}`;
    let desc = document.querySelector('meta[name="description"]');
    if (desc)
      desc.content = detail?.description || seo?.description || c.home.intro;
  }, [path, c, detail, seoKey]);
  let page;
  if (path === "/") page = <Home />;
  else if (detail) page = <ServiceDetail service={detail} />;
  else if (path === "/services")
    page = (
      <>
        <PageIntro data={c.servicesPage} />
        <section className="container v2-services-guide">
          <div className="v2-services-guide-copy">
            <p className="v2-kicker">{c.servicesPage.guideTitle}</p>
            <p>{c.servicesPage.guideText}</p>
            <a className="v2-text-link" href="/book">
              {c.labels.requestService}
            </a>
          </div>
          <div className="v2-services-guide-points">
            {c.servicesPage.guidePoints.map((point, index) => (
              <article key={index}>
                <span aria-hidden="true">0{index + 1}</span>
                <div>
                  <h2>{point.title}</h2>
                  <p>{point.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="container v2-section v2-services-catalog">
          <div className="v2-section-head">
            <div>
              <p className="v2-kicker">{c.servicesPage.catalogEyebrow}</p>
              <h2>{c.servicesPage.catalogTitle}</h2>
            </div>
            <p>{c.servicesPage.catalogIntro}</p>
          </div>
          <ServiceCatalog />
        </section>
        <section className="v2-service-planning">
          <div className="container">
            <div className="v2-service-planning-head">
              <div>
                <p className="v2-kicker">{c.servicesPage.scopeTitle}</p>
                <h2>{c.servicesPage.planningTitle}</h2>
              </div>
              <p>{c.servicesPage.planningIntro}</p>
            </div>
            <div className="v2-service-planning-steps">
              {c.servicesPage.planningSteps.map((step, index) => (
                <article key={index}>
                  <span>0{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
            <p className="v2-scope-note">{c.servicesPage.scopeText}</p>
          </div>
        </section>
        <CareCta />
      </>
    );
  else if (path === "/about")
    page = (
      <>
        <PageIntro data={c.about} />
        <section className="container v2-about-layout">
          <img src={c.about.image} alt={c.about.imageAlt} />
          <article>
            {c.about.sections.map((s, i) => (
              <section key={i}>
                <h2>{s.title}</h2>
                <p>{s.body}</p>
              </section>
            ))}
            <section className="v2-about-commitments">
              <h2>{c.about.commitmentsTitle}</h2>
              <div>
                {c.about.commitments.map((item, i) => (
                  <article key={i}>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </article>
                ))}
              </div>
            </section>
            <a className="button button-primary" href="/contact">
              {c.about.contactButton}
            </a>
          </article>
        </section>
        <CareCta />
      </>
    );
  else if (path === "/how-it-works")
    page = (
      <>
        <PageIntro data={c.howItWorks} />
        <section className="container v2-section v2-process-page">
          <img src={c.howItWorks.image} alt={c.howItWorks.imageAlt} />
          <Process />
        </section>
        <section className="container v2-account-banner">
          <div>
            <h2>{c.howItWorks.accountTitle}</h2>
            <p>{c.howItWorks.accountText}</p>
          </div>
          <a className="button button-primary" href="/account?create=1">
            {c.howItWorks.accountButton}
          </a>
        </section>
        <CareCta />
      </>
    );
  else if (path === "/book")
    page = (
      <>
        <PageIntro data={c.booking} />
        <section className="container v2-request-layout">
          <aside>
            <h2>
              <Lines text={c.booking.asideTitle} />
            </h2>
            <p>{c.booking.asideText}</p>
            <h3 className="v2-checklist-title">{c.booking.preparationTitle}</h3>
            <ul>
              {c.booking.preparationPoints.map((x, i) => (
                <li key={i}>
                  <Icon name="check" size={18} />
                  {x}
                </li>
              ))}
            </ul>
            <div className="v2-booking-assurances">
              {c.booking.assurances.map((x, i) => (
                <p key={i}>
                  <span>0{i + 1}</span>
                  {x}
                </p>
              ))}
            </div>
            <a className="v2-text-link" href="/contact">
              {c.booking.questionLink}
            </a>
          </aside>
          <BookingForm
            selectedService={
              new URLSearchParams(location.search).get("service") || ""
            }
            user={user}
          />
        </section>
      </>
    );
  else if (path === "/become-provider")
    page = (
      <>
        <PageIntro data={c.provider} />
        <section className="container v2-request-layout">
          <aside>
            <img src={c.provider.image} alt={c.provider.imageAlt} />
            <h2>
              <Lines text={c.provider.sidebarTitle} />
            </h2>
            <p>{c.provider.sidebarText}</p>
            <ul>
              {c.provider.steps.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
            <small>{c.provider.privacyNote}</small>
          </aside>
          <ProviderForm />
        </section>
      </>
    );
  else if (path === "/contact") page = <Contact />;
  else if (path === "/faq")
    page = (
      <>
        <PageIntro data={c.faq} />
        <section className="container v2-section v2-faq-page">
          <img src={c.faq.image} alt={c.faq.imageAlt} />
          <FaqList />
        </section>
        <CareCta />
      </>
    );
  else if (path.startsWith("/policies/"))
    page = <Policy kind={path.split("/")[2]} />;
  else if (path === "/photo-credits") page = <Credits />;
  else
    page = (
      <section className="container v2-page-intro">
        <h1>This page is not here.</h1>
        <a href="/">{c.labels.backHome}</a>
      </section>
    );
  return (
    <div className="public-v2">
      {preview && (
        <div className="v2-preview-banner" role="status">
          Draft preview · Changes are not published
        </div>
      )}
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header user={user} />
      <main id="main">{page}</main>
      <Footer />
    </div>
  );
}
