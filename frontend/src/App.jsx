import { useEffect, useMemo, useState } from 'react';

const API = import.meta.env.VITE_API_URL || '/api';
const services = [
  {
    id: 'elderly', number: '01', title: 'Elderly home assistance', kicker: 'A familiar face, a gentler day.',
    text: 'Companionship, meal assistance and help with agreed everyday activities, shaped around the person and their routine.',
    detail: 'Companionship and everyday support, planned around familiar routines.',
    image: 'https://images.pexels.com/photos/29372724/pexels-photo-29372724.jpeg?auto=compress&cs=tinysrgb&w=1400',
    alt: 'A caregiver offering calm support to an older woman at home.', tone: 'clay', symbol: '↗',
  },
  {
    id: 'childcare', number: '02', title: 'Babysitting & childcare', kicker: 'Care that respects your family’s rhythm.',
    text: 'A little breathing room for parents, with the details and handover agreed together before a visit is confirmed.',
    detail: 'Play, supervision and handover details agreed with a parent or guardian.',
    image: 'https://images.pexels.com/photos/5691816/pexels-photo-5691816.jpeg?auto=compress&cs=tinysrgb&w=1400',
    alt: 'An adult playing with children in a bright home.', tone: 'butter', symbol: '↗',
  },
  {
    id: 'home-services', number: '03', title: 'Home services', kicker: 'A hand with the heart of a home.',
    text: 'Practical help for everyday living, coordinated around your home and schedule.',
    detail: 'Home cooking · Cleaning · Home security check',
    image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1400&q=85',
    alt: 'A home cook preparing food in a bright kitchen.', tone: 'leaf', symbol: '↗',
  },
];
const defaultWebsiteContent = {
  hero: {
    title: 'More ease in the place you call', emphasis: 'home.',
    lede: 'Find thoughtful help with care, family routines and the work of keeping a home running. Tell us what you need; our Kigali team will follow up and talk through the details.',
  },
  services,
  approach: {
    title: 'Good support starts with', emphasis: 'trust.',
    body: 'We coordinate home assistance with care and clear communication. Every request is considered on its own; we do not promise a match before the service details and provider suitability have been reviewed.',
  },
  welcomeSlides: [
    { image: '/images/green-brush.webp', eyebrow: 'A little more ease', title: 'A steadier day starts at home.', note: 'Thoughtful help, agreed together.' },
    { image: services[0].image, eyebrow: 'People first', title: 'Care shaped around familiar routines.', note: 'A real conversation before each visit.' },
    { image: services[2].image, eyebrow: 'Home, in good hands', title: 'Small tasks can make a lighter day.', note: 'Cooking, cleaning and practical support.' },
  ],
};
const serviceOptions = [
  { id: 'elderly', title: 'Elderly home assistance' },
  { id: 'childcare', title: 'Babysitting & childcare' },
  { id: 'cooking', title: 'Home cooking' },
  { id: 'cleaning', title: 'Home cleaning' },
  { id: 'security', title: 'Home security check' },
];

const bookingStatuses = [
  'New request', 'Under review', 'Awaiting customer confirmation', 'Confirmed',
  'Provider assigned', 'In progress', 'Completed', 'Declined', 'Cancelled', 'Rescheduled', 'No-show', 'Complaint open',
];
const applicationStatuses = ['Application received', 'Under review', 'More information required', 'Approved', 'Not approved'];

async function apiRequest(path, options = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers };
  if (options.method && options.method !== 'GET') headers['X-WHC-Request'] = 'wellness-web';
  const response = await fetch(`${API}${path}`, { credentials: 'same-origin', ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Something went wrong. Please try again.');
  return payload;
}

function downloadCsv(filename, rows) {
  const quote = (value) => {
    let cell = String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
    if (/^[=+\-@]/.test(cell)) cell = `'${cell}`;
    return `"${cell.replaceAll('"', '""')}"`;
  };
  const csv = rows.map((row) => row.map(quote).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Logo() {
  return <a className="brand" href="/#top" aria-label="Wellness Home Care home">
    <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 42 42"><path d="M21 4.5c3.1 5.2 3.1 8.4 0 11.3-3.1-2.9-3.1-6.1 0-11.3Zm16.5 16.5c-5.2 3.1-8.4 3.1-11.3 0 2.9-3.1 6.1-3.1 11.3 0ZM21 37.5c-3.1-5.2-3.1-8.4 0-11.3 3.1 2.9 3.1 6.1 0 11.3ZM4.5 21c5.2-3.1 8.4-3.1 11.3 0-2.9 3.1-6.1 3.1-11.3 0Z" fill="currentColor"/><circle cx="21" cy="21" r="3.4" fill="currentColor"/></svg></span>
    <span className="brand-name">wellness <i>home care</i></span>
  </a>;
}

function HomeIllustration() {
  return <svg className="home-illustration" viewBox="0 0 620 500" role="img" aria-labelledby="scene-title scene-desc">
    <title id="scene-title">A quiet afternoon at home</title>
    <desc id="scene-desc">A hand-drawn scene of two people sharing a cup of tea in a sunny room.</desc>
    <rect x="12" y="12" width="596" height="476" rx="2" fill="#e8bb8a" />
    <path d="M12 337h596v151H12z" fill="#e1a77c" />
    <path d="M67 53h166v174H67z" fill="#f5edda" />
    <path d="M81 68h138v144H81z" fill="#9dae8a" />
    <path d="M150 68v144M81 140h138" stroke="#f5edda" strokeWidth="8" />
    <circle cx="185" cy="104" r="19" fill="#edc969" />
    <path d="M82 212c13-30 23-39 39-42 13 13 23 26 30 42" fill="#647c5d" />
    <path d="M89 211c6-19 13-25 22-28m12 28c5-14 12-22 22-29" stroke="#f5edda" strokeWidth="3" fill="none" />
    <path d="M457 81h97v189h-97z" fill="#f2e7d2" />
    <path d="M473 98h65v151h-65z" fill="#c7d0ac" />
    <path d="M487 249c2-37 8-53 20-70m8 71c1-24 8-41 17-56" stroke="#607958" strokeWidth="5" fill="none" strokeLinecap="round" />
    <path d="M496 196c-13-1-20-10-21-20 14 0 22 6 24 16m12-20c0-13 7-20 17-23 1 13-3 21-13 26" fill="#607958" />
    <path d="M482 251h46l-7 20h-32z" fill="#d77958" />
    <path d="M147 287c0-43 20-66 50-66s51 23 51 66v68H147z" fill="#547456" />
    <circle cx="198" cy="193" r="31" fill="#a65f42" />
    <path d="M170 192c2-21 15-35 31-35 20 0 30 14 30 32-14-5-24-13-29-25-5 12-17 22-32 28Z" fill="#34483d" />
    <path d="M171 296c-19 9-28 22-32 42m88-42c18 9 26 22 30 42" stroke="#a65f42" strokeWidth="14" fill="none" strokeLinecap="round" />
    <path d="M138 328c-10 17-14 34-12 48" stroke="#4d5949" strokeWidth="15" fill="none" strokeLinecap="round" />
    <path d="M256 329c9 15 13 30 12 45" stroke="#4d5949" strokeWidth="15" fill="none" strokeLinecap="round" />
    <path d="M154 354h-32v14h40m89-14h30v14h-39" fill="#52604d" />
    <path d="M315 193c0-48 19-73 51-73 33 0 53 25 53 73v162H315z" fill="#f2e7d2" />
    <circle cx="367" cy="99" r="31" fill="#88533a" />
    <path d="M337 96c2-20 13-34 31-34 16 0 27 12 30 31-17-3-29-10-37-22-5 12-13 20-24 25Z" fill="#35473d" />
    <path d="M333 189h71l-16 95h-38z" fill="#da7856" />
    <path d="M339 188c-18 6-31 19-38 39l-26 28" stroke="#88533a" strokeWidth="14" fill="none" strokeLinecap="round" />
    <path d="M393 188c11 14 17 29 20 47l-43 5" stroke="#88533a" strokeWidth="14" fill="none" strokeLinecap="round" />
    <path d="M301 253c16 0 26-4 39-12" stroke="#88533a" strokeWidth="11" fill="none" strokeLinecap="round" />
    <path d="M270 273h154v20H270z" fill="#6a4d3c" />
    <path d="M287 293v94m122-94v94" stroke="#6a4d3c" strokeWidth="10" />
    <path d="M276 269h29v-22c0-7-5-12-12-12h-5c-7 0-12 5-12 12z" fill="#f0d074" />
    <path d="M305 253c9 0 13 5 13 11s-4 11-13 11" fill="none" stroke="#f0d074" strokeWidth="5" />
    <path d="M45 421h528" stroke="#9b6650" strokeWidth="2" />
    <path d="M44 40h46M44 40v46M576 460h-46m46 0v-46" stroke="#fff7e7" strokeWidth="2" opacity=".85" />
    <text x="42" y="462" className="illustration-label">HOME, AT EASE · KIGALI</text>
  </svg>;
}

function SectionLabel({ number, children, light = false }) {
  return <p className={`section-label${light ? ' section-label-light' : ''}`}><span>{number}</span><span className="section-label-rule" />{children}</p>;
}

function TextField({ label, hint, children }) {
  return <label className="field"><span className="field-label">{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);
  return <header className="site-header">
    <div className="header-inner">
      <Logo />
      <button className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="main-nav" onClick={() => setMenuOpen((value) => !value)}>
        <span>{menuOpen ? 'Close' : 'Menu'}</span><span className="menu-plus" aria-hidden="true">{menuOpen ? '−' : '+'}</span>
      </button>
      <nav id="main-nav" className={`main-nav${menuOpen ? ' nav-open' : ''}`}>
        <a href="#services" onClick={close}>Services</a>
        <a href="#how-it-works" onClick={close}>How it works</a>
        <a href="#about" onClick={close}>Our approach</a>
        <a href="#provider" onClick={close}>Become a provider</a>
        <a href="/account" onClick={close}>Client account</a>
        <a href="/staff" onClick={close}>Team sign in</a>
        <a className="nav-cta" href="#request" onClick={close}>Request a service <span aria-hidden="true">↗</span></a>
      </nav>
    </div>
  </header>;
}

function PublicSite() {
  const [selectedService, setSelectedService] = useState('');
  const [siteContent, setSiteContent] = useState(defaultWebsiteContent);
  const visibleServices = siteContent.services?.length === 3
    ? services.map((base, index) => ({ ...base, ...siteContent.services[index] }))
    : services;
  useEffect(() => { apiRequest('/site-content').then(setSiteContent).catch(() => {}); }, []);
  useEffect(() => {
    const targets = document.querySelectorAll('#main > section, #main .reveal, .service-card, .steps-list li, .media-note');
    targets.forEach((target) => target.classList.add('reveal'));
    if (!('IntersectionObserver' in window)) {
      targets.forEach((target) => target.classList.add('is-visible'));
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);
  const chooseService = (id) => {
    setSelectedService(id === 'home-services' ? '' : id);
    document.getElementById('request')?.scrollIntoView({ behavior: 'smooth' });
  };
  return <>
    <a href="#main" className="skip-link">Skip to content</a>
    <SiteHeader />
    <main id="main">
      <section className="hero page-wrap" id="top">
        <div className="hero-copy">
          <SectionLabel number="01">HOME HELP, MADE HUMAN · KIGALI</SectionLabel>
          <h1>{siteContent.hero.title} <em>{siteContent.hero.emphasis}</em></h1>
          <p className="hero-lede">{siteContent.hero.lede}</p>
          <div className="hero-actions">
            <a className="button button-ink" href="#services">Explore services <span aria-hidden="true">↗</span></a>
            <a className="text-link" href="#request">Request a call back <span aria-hidden="true">↓</span></a>
          </div>
          <div className="hero-note"><span className="note-flower" aria-hidden="true">✳</span><span>Real people. Clear follow-up.<br /><strong>Every visit agreed before it’s confirmed.</strong></span></div>
        </div>
          <div className="hero-art-wrap hero-photo-stage" aria-label="Everyday home support">
          <img className="hero-photo-main" src="https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1600&q=85" alt="A home cook preparing a meal in a bright kitchen." fetchPriority="high" />
          <figure className="hero-photo-inset"><img src="https://images.pexels.com/photos/5691816/pexels-photo-5691816.jpeg?auto=compress&cs=tinysrgb&w=900" alt="An adult joining children in play at home." /><figcaption>Good days start at home.</figcaption></figure>
          <figure className="hero-photo-float">
            <img src="https://images.pexels.com/videos/6195184/pexels-photo-6195184.jpeg?auto=compress&dpr=1&h=750&w=1260" alt="A home-care provider vacuuming a living room." loading="lazy" />
            <figcaption><span>HOME CLEANING</span><strong>A little help, right at home</strong></figcaption>
          </figure>
          <div className="hero-photo-caption"><span>Support for the things that matter at home.</span><span>01 / 03</span></div>
        </div>
      </section>

      <div className="ticker" aria-label="Service principles"><div className="ticker-track"><span>Made around your routine</span><b>✳</b><span>Clear before we confirm</span><b>✳</b><span>Close to home in Kigali</span><b>✳</b><span>Made around your routine</span><b>✳</b><span>Clear before we confirm</span><b>✳</b></div></div>

      <section className="services-section section-pad" id="services">
        <div className="page-wrap">
          <div className="section-heading services-heading">
            <div><SectionLabel number="02">WHAT WOULD MAKE TODAY EASIER?</SectionLabel><h2>Care that fits<br /><em>real life.</em></h2></div>
            <p>Start with what you need. We’ll listen, clarify the details and follow up with what we can arrange.</p>
          </div>
          <div className="service-grid">
            {visibleServices.map((service, index) => <article className={`service-card service-${service.tone} reveal reveal-delay-${index + 1}`} key={service.id}>
              <div className="service-image-wrap"><img src={service.image} alt={service.alt} loading="lazy" /><span className="service-image-index">0{index + 1} / 03</span></div>
              <div className="service-card-copy"><div className="card-topline"><span>{service.kicker}</span><span className="service-symbol" aria-hidden="true">{service.symbol}</span></div>
              <h3>{service.title}</h3><p className="service-description">{service.text}</p>
              {service.id === 'home-services' ? <div className="home-service-options" aria-label="Home service choices">{serviceOptions.filter((option) => ['cooking', 'cleaning', 'security'].includes(option.id)).map((option) => <button type="button" key={option.id} onClick={() => chooseService(option.id)}>{option.title}<span aria-hidden="true">↗</span></button>)}</div> : <><p className="service-boundary">{service.detail}</p><button className="card-link" type="button" onClick={() => chooseService(service.id)}>Ask about this service <span aria-hidden="true">↗</span></button></>}
              </div>
            </article>)}
          </div>
          <p className="service-footnote"><span>✳</span> We confirm scope, provider, price and any extra costs with you before a booking is confirmed.</p>
        </div>
      </section>

      <section className="media-section section-pad" aria-labelledby="home-work-title">
        <div className="page-wrap media-layout">
          <div className="media-intro reveal"><SectionLabel number="03" light>SMALL MOMENTS, REAL HOMES</SectionLabel><h2 id="home-work-title">A glimpse of<br />home, in motion.</h2><p>Cooking and cleaning are part of the everyday support we can discuss. Tell us what would help and we’ll confirm the scope together.</p><a className="light-link" href="#request">Talk to our team <span aria-hidden="true">↗</span></a></div>
          <div className="media-reel">
            <figure className="media-card media-card-wide reveal reveal-delay-1"><video controls preload="none" poster="https://images.pexels.com/videos/7351818/pexels-photo-7351818.jpeg?auto=compress&dpr=1&h=750&w=1260" aria-label="A home cook preparing food in a kitchen"><source src="https://videos.pexels.com/video-files/7351818/7351818-hd_1920_1080_24fps.mp4" type="video/mp4" />Your browser does not support embedded video.</video><figcaption><span>01 — HOME COOKING</span><a href="https://www.pexels.com/video/woman-preparing-food-in-the-kitchen-7351818/" target="_blank" rel="noreferrer">Video by Vivaan Rupani / Pexels</a></figcaption></figure>
            <figure className="media-card media-card-tall reveal reveal-delay-2"><video controls preload="none" poster="https://images.pexels.com/videos/6195184/pexels-photo-6195184.jpeg?auto=compress&dpr=1&h=750&w=1260" aria-label="A person vacuuming a living room"><source src="https://videos.pexels.com/video-files/6195184/6195184-uhd_2160_3840_25fps.mp4" type="video/mp4" />Your browser does not support embedded video.</video><figcaption><span>02 — HOME CLEANING</span><a href="https://www.pexels.com/video/woman-wearing-earphones-vacuuming-the-floor-at-the-living-room-6195184/" target="_blank" rel="noreferrer">Video by Tima Miroshnichenko / Pexels</a></figcaption></figure>
            <div className="media-note reveal reveal-delay-3"><span aria-hidden="true">✳</span><p>For a security check, our team will first clarify the exact task and what’s appropriate for the home.</p></div>
          </div>
        </div>
      </section>

      <section className="how-section section-pad" id="how-it-works">
        <div className="page-wrap how-layout">
          <div className="how-intro"><SectionLabel number="04">A HUMAN-SIZED PROCESS</SectionLabel><h2>From a first note<br />to <em>feeling supported.</em></h2><p>Good care takes a little conversation. Here’s how we make sure the details are clear first.</p><a className="text-link" href="#request">Start a request <span aria-hidden="true">↗</span></a></div>
          <ol className="steps-list">
            <li className="reveal reveal-delay-1"><span className="step-no">01</span><div><h3>Tell us what would help</h3><p>Choose a service, area and preferred time. Share only the details needed for us to follow up.</p></div><span className="step-mark" aria-hidden="true">↘</span></li>
            <li className="reveal reveal-delay-2"><span className="step-no">02</span><div><h3>We review it together</h3><p>Our team checks the request and discusses suitability, availability and any questions with you.</p></div><span className="step-mark" aria-hidden="true">↘</span></li>
            <li className="reveal reveal-delay-3"><span className="step-no">03</span><div><h3>Agree the details</h3><p>We talk through the provider, scope, price, payment method and cancellation terms.</p></div><span className="step-mark" aria-hidden="true">↘</span></li>
            <li className="reveal reveal-delay-4"><span className="step-no">04</span><div><h3>Then we confirm</h3><p>Only after you agree do we confirm the visit. Afterwards, we welcome your feedback.</p></div><span className="step-mark step-finish" aria-hidden="true">✳</span></li>
          </ol>
        </div>
      </section>

      <section className="approach-section section-pad" id="about">
        <div className="page-wrap approach-layout">
          <figure className="approach-photo-card reveal">
            <img src="https://images.pexels.com/photos/29372724/pexels-photo-29372724.jpeg?auto=compress&cs=tinysrgb&w=900" alt="A caregiver offering calm support to an older woman at home." loading="lazy" />
            <figcaption><span>ELDERLY HOME ASSISTANCE</span><strong>People first, in every little detail.</strong></figcaption>
          </figure>
          <div className="approach-copy reveal"><SectionLabel number="05" light>OUR APPROACH</SectionLabel><h2>{siteContent.approach.title}<br /><em>{siteContent.approach.emphasis}</em></h2><p>{siteContent.approach.body}</p>
            <div className="approach-points"><div><span>01</span><p><strong>Clear expectations.</strong> We explain what a service includes and where its boundaries are.</p></div><div><span>02</span><p><strong>Thoughtful matching.</strong> We review availability and the checks relevant to each service category.</p></div><div><span>03</span><p><strong>A real person to reach.</strong> Questions, changes and concerns are handled by the operations team.</p></div></div>
            <p className="approach-note">Our launch screening standards and operating policies are being finalized. Providers are not presented as approved until the required review for their service is complete.</p>
          </div>
          <div className="approach-side-note"><span className="side-line" />A good visit<br />is built on<br /><em>the small things.</em></div>
        </div>
      </section>

      <section className="request-section section-pad" id="request">
        <div className="page-wrap request-layout">
          <div className="request-intro"><SectionLabel number="06">LET’S START WITH A CONVERSATION</SectionLabel><h2>What kind of help would make <em>today lighter?</em></h2><p>Tell us the basics below. We’ll contact you to talk through scope and availability. Submitting this form does not confirm a booking.</p>
            <div className="request-callout"><span className="callout-icon" aria-hidden="true">↗</span><div><strong>Only the essentials for now.</strong><p>Please don’t include a full address, medical records, ID numbers or payment-card details in this form.</p></div></div>
            <p className="request-smallprint">Prices are agreed after we understand the request. We don’t collect payment online.</p>
          </div>
          <BookingForm selectedService={selectedService} />
        </div>
      </section>

      <section className="provider-section section-pad" id="provider">
        <div className="page-wrap provider-layout">
          <div className="provider-copy"><SectionLabel number="07" light>JOIN THE PROVIDER NETWORK</SectionLabel><h2>Good care is<br />a skill worth<br /><em>sharing.</em></h2><p>We’re building a dependable network of home-care providers in Kigali. Tell us about your experience and the work you’d like to do.</p><div className="provider-guidelines"><span>✳</span><p>Applications are reviewed by our team. Applying does not make someone eligible for assignments; screening and category requirements must be met first.</p></div><p className="provider-privacy">We don’t ask for identity-document uploads here. If needed, the team will provide a secure way to share documents later.</p></div>
          <ProviderForm />
        </div>
      </section>

      <section className="faq-section section-pad" id="faq">
        <div className="page-wrap faq-layout"><div><SectionLabel number="08">A FEW THINGS PEOPLE ASK</SectionLabel><h2>Before you<br /><em>get in touch.</em></h2><p>Still wondering something? Send us a request and we’ll talk it through.</p></div>
          <div className="faq-list">
            <details><summary>Is my request a confirmed booking?<span aria-hidden="true">+</span></summary><p>No. We review every request, check suitability and availability, and contact you to agree the scope, provider, price and terms. A booking is confirmed only after that conversation.</p></details>
            <details><summary>How much does a service cost?<span aria-hidden="true">+</span></summary><p>We provide a quote once we understand what is needed. We’ll explain whether transport, supplies, ingredients or other costs apply before you agree to book.</p></details>
            <details><summary>Do you provide medical or emergency care?<span aria-hidden="true">+</span></summary><p>No. Elderly home assistance is non-medical. It is not nursing, diagnosis, medication administration or an emergency response. For urgent medical help, contact the appropriate emergency service.</p></details>
            <details><summary>How are providers reviewed?<span aria-hidden="true">+</span></summary><p>Requirements depend on the service. Our team reviews experience, references and relevant suitability checks before approval. Final screening and safeguarding procedures are being prepared for launch.</p></details>
            <details><summary>Can I share special care or dietary details here?<span aria-hidden="true">+</span></summary><p>Please share only a short, non-sensitive outline. We’ll follow up through a more appropriate private conversation if additional details are needed. Don’t put medical records or detailed health information in this form.</p></details>
            <details><summary>What areas do you serve?<span aria-hidden="true">+</span></summary><p>We are starting in Kigali. Our team will confirm whether your neighbourhood is within the service area before discussing a booking.</p></details>
          </div>
        </div>
      </section>

      <section className="policies-section section-pad" id="policies">
        <div className="page-wrap policies-inner"><div><SectionLabel number="09">SAFETY, PRIVACY & POLICIES</SectionLabel><h2>Careful by<br /><em>design.</em></h2></div><div className="policy-columns">
          <article><h3>Privacy, in plain language</h3><p>We use request and application details to review, coordinate and follow up on the service you asked about. Access is limited to the operations team. We don’t sell personal information. Contact details for data requests will be published here before launch.</p></article>
          <article><h3>Clear service boundaries</h3><p>Scope, price, payment approach and cancellation terms are discussed before a booking is confirmed. There is no online checkout or instant availability in this pilot.</p></article>
          <article><h3>Safeguarding comes first</h3><p>Provider standards, incident escalation and service agreements are being finalized. Service categories will be offered only when the related checks, insurance position and operating procedures are ready.</p></article>
          <p className="policy-draft">These are draft policy summaries for the development phase. The business owner must confirm the policies, contact details and local requirements before accepting bookings.</p>
        </div></div>
      </section>
    </main>
    <footer className="site-footer"><div className="page-wrap footer-main"><div><Logo /><p>Thoughtful help for everyday life at home.</p><span className="footer-city">KIGALI, RWANDA&nbsp; · &nbsp;SERVICE DETAILS CONFIRMED TOGETHER</span></div><div className="footer-nav"><div><strong>Explore</strong><a href="#services">Services</a><a href="#how-it-works">How it works</a><a href="#provider">Become a provider</a></div><div><strong>Information</strong><a href="#policies">Privacy & policies</a><a href="#faq">FAQs</a><a href="/staff">Team sign in</a></div><div><strong>Start here</strong><a href="#request">Request a service ↗</a><a href="/account">Client account ↗</a><span>Contact channels will be<br />confirmed before public launch.</span></div></div></div><div className="page-wrap footer-bottom"><span>© {new Date().getFullYear()} Wellness Home Care & Assistance</span><span>Business name is provisional · Developed for the Kigali pilot</span></div><div className="page-wrap media-credits">Images: Jsme MILA and Alex Green via Pexels; Jason Briscoe and Vitaly Gariev via Unsplash. Video: Vivaan Rupani and Tima Miroshnichenko via Pexels.</div></footer>
  </>;
}

function BookingForm({ selectedService }) {
  const [state, setState] = useState({ sending: false, error: '', receipt: null });
  const [service, setService] = useState(selectedService || '');
  const [contactChoice, setContactChoice] = useState('phone');
  useEffect(() => setService(selectedService || ''), [selectedService]);
  const minimumDate = useMemo(() => {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kigali', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const date = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
    return `${date.year}-${date.month}-${date.day}`;
  }, []);
  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setState({ sending: true, error: '', receipt: null });
    const form = new FormData(formElement);
    const supportTypes = form.getAll('supportTypes');
    const body = {
      fullName: form.get('fullName'), phone: form.get('phone'), email: form.get('email'),
      preferredContact: form.get('preferredContact'), service, neighborhood: form.get('neighborhood'),
      date: form.get('date'), time: form.get('time'), duration: Number(form.get('duration')),
      recurring: form.get('recurring') === 'on', contactConsent: form.get('contactConsent') === 'on',
      details: service === 'elderly' ? { supportTypes, notes: form.get('notes') } :
        service === 'childcare' ? { ageRange: form.get('ageRange'), notes: form.get('notes') } :
          { people: Number(form.get('people')), notes: form.get('notes') },
      website: form.get('website'),
    };
    try {
      const receipt = await apiRequest('/requests', { method: 'POST', body: JSON.stringify(body) });
      formElement.reset();
      setService('');
      setContactChoice('phone');
      setState({ sending: false, error: '', receipt });
    } catch (error) { setState({ sending: false, error: error.message, receipt: null }); }
  }
  if (state.receipt) return <div className="form-panel form-receipt" aria-live="polite"><span className="receipt-spark" aria-hidden="true">✳</span><SectionLabel number="THANK YOU">REQUEST RECEIVED</SectionLabel><h3>We’ll take it<br /><em>from here.</em></h3><p>{state.receipt.message}</p><p className="receipt-reference">Your reference <strong>{state.receipt.reference}</strong></p><p className="receipt-note">A member of the team will contact you to discuss the details. This is not yet a confirmed booking.</p><button type="button" className="text-link" onClick={() => setState({ sending: false, error: '', receipt: null })}>Send another request ↗</button></div>;
  return <form className="form-panel" onSubmit={submit}>
    <div className="form-heading"><span>BOOKING ENQUIRY</span><span>01 — 06</span></div>
    <p className="form-lead">A few details to help us start a useful conversation.</p>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    <div className="form-grid">
      <TextField label="Your name *"><input name="fullName" autoComplete="name" required minLength="2" maxLength="100" /></TextField>
      <TextField label="Phone number *" hint="Include your country code if you can."><input name="phone" type="tel" autoComplete="tel" required minLength="7" maxLength="24" /></TextField>
      <TextField label="Email, if you prefer" hint="Required only if you choose email as your contact method."><input name="email" type="email" autoComplete="email" maxLength="254" required={contactChoice === 'email'} /></TextField>
      <TextField label="How should we reach you? *"><select name="preferredContact" value={contactChoice} onChange={(event) => setContactChoice(event.target.value)} required><option value="phone">Phone call</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select></TextField>
      <TextField label="Service you’re looking for *"><select value={service} onChange={(event) => setService(event.target.value)} required><option value="">Choose a service</option>{serviceOptions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></TextField>
      <TextField label="Kigali neighbourhood *" hint="No full street address yet."><input name="neighborhood" required maxLength="100" placeholder="e.g. Kacyiru" /></TextField>
      <TextField label="Preferred date *"><input type="date" name="date" min={minimumDate} required /></TextField>
      <TextField label="Start time *"><input type="time" name="time" required /></TextField>
      <TextField label="Expected duration *"><select name="duration" defaultValue="2"><option value="2">About 2 hours</option><option value="3">About 3 hours</option><option value="4">About 4 hours</option><option value="6">About 6 hours</option><option value="8">About 8 hours</option></select></TextField>
      <label className="check-field recurring-field"><input type="checkbox" name="recurring" /><span>We may be interested in a recurring visit</span></label>
    </div>
    {service === 'elderly' && <fieldset className="service-fields"><legend>What kind of support would help?</legend><div className="check-grid">{['Companionship', 'Meal assistance', 'Agreed daily activities', 'Accompaniment'].map((item) => <label className="check-field" key={item}><input name="supportTypes" value={item} type="checkbox" /><span>{item}</span></label>)}</div></fieldset>}
    {service === 'childcare' && <div className="form-grid service-fields"><TextField label="Child’s age range *" hint="No name or other identifying details needed."><select name="ageRange" required defaultValue=""><option value="" disabled>Choose an age range</option><option>Under 2</option><option>2–5</option><option>6–12</option><option>13–17</option></select></TextField><p className="field-note">Parent or guardian authorization and handover contacts are agreed privately before a visit.</p></div>}
    {service === 'cooking' && <div className="form-grid service-fields"><TextField label="How many people? *"><select name="people" defaultValue="" required><option value="" disabled>Choose a number</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1}>{index + 1}</option>)}</select></TextField><p className="field-note">We’ll discuss dietary requirements privately. Please don’t enter allergy or health information here.</p></div>}
    {service && <TextField label={service === 'elderly' ? 'A short note about the support' : service === 'childcare' ? 'A short note about the visit' : service === 'cooking' ? 'Anything about the meal plan?' : service === 'cleaning' ? 'What would you like cleaned?' : 'What would you like checked?'} hint={service === 'security' ? 'This is a basic home check request, not emergency or security response.' : 'Please keep it brief and don’t include medical, identity or financial details.'}><textarea name="notes" rows="3" maxLength="600" placeholder="Only what’s useful for our first conversation…" /></TextField>}
    <div className="honeypot" aria-hidden="true"><label>Leave this field empty<input name="website" tabIndex="-1" autoComplete="off" /></label></div>
    <label className="check-field consent-field"><input name="contactConsent" type="checkbox" required /><span>I agree to be contacted about this request and have read the <a href="#policies">privacy information</a>. *</span></label>
    <button className="button button-ink form-submit" type="submit" disabled={state.sending}>{state.sending ? 'Sending your request…' : 'Send request'}<span aria-hidden="true">↗</span></button>
    <p className="form-legal">Required fields are marked *. This enquiry is not a confirmed booking and does not ask for payment.</p>
  </form>;
}

function ProviderForm() {
  const [state, setState] = useState({ sending: false, error: '', receipt: null });
  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setState({ sending: true, error: '', receipt: null });
    const form = new FormData(formElement);
    const body = Object.fromEntries(['fullName', 'phone', 'email', 'neighborhood', 'service', 'experience', 'languages', 'availability', 'training', 'references'].map((name) => [name, form.get(name)]));
    body.referenceConsent = form.get('referenceConsent') === 'on';
    body.screeningConsent = form.get('screeningConsent') === 'on';
    body.website = form.get('website');
    try {
      const receipt = await apiRequest('/provider-applications', { method: 'POST', body: JSON.stringify(body) });
      formElement.reset();
      setState({ sending: false, error: '', receipt });
    } catch (error) { setState({ sending: false, error: error.message, receipt: null }); }
  }
  if (state.receipt) return <div className="provider-form-panel provider-receipt" aria-live="polite"><SectionLabel number="THANK YOU" light>APPLICATION RECEIVED</SectionLabel><h3>We appreciate<br /><em>your interest.</em></h3><p>{state.receipt.message}</p><p className="receipt-reference">Reference <strong>{state.receipt.reference}</strong></p><p>We’ll contact you if we need more information. Applying does not make you eligible for assignments.</p><button type="button" className="light-link" onClick={() => setState({ sending: false, error: '', receipt: null })}>Submit another application ↗</button></div>;
  return <form className="provider-form-panel" onSubmit={submit}>
    <div className="form-heading provider-form-heading"><span>PROVIDER APPLICATION</span><span>02 — 06</span></div>
    <p className="form-lead">A few things we need to understand what you bring.</p>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    <div className="form-grid">
      <TextField label="Full name *"><input name="fullName" autoComplete="name" required minLength="2" maxLength="100" /></TextField>
      <TextField label="Phone number *"><input name="phone" type="tel" autoComplete="tel" required minLength="7" maxLength="24" /></TextField>
      <TextField label="Email, if available"><input name="email" type="email" autoComplete="email" maxLength="254" /></TextField>
      <TextField label="General area of residence *"><input name="neighborhood" required maxLength="100" placeholder="Kigali neighbourhood" /></TextField>
      <TextField label="Service category *"><select name="service" defaultValue="" required><option value="" disabled>Select a category</option>{serviceOptions.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}</select></TextField>
      <TextField label="Languages spoken *"><input name="languages" required maxLength="150" placeholder="e.g. Kinyarwanda, English" /></TextField>
      <TextField label="Availability *"><input name="availability" required maxLength="250" placeholder="Days and times that usually work" /></TextField>
      <TextField label="Training or certificates" hint="Only add what is relevant to this service."><input name="training" maxLength="500" /></TextField>
    </div>
    <TextField label="Relevant experience *" hint="Keep it general. Please don’t include client names or private details."><textarea name="experience" rows="3" required minLength="10" maxLength="1000" /></TextField>
    <TextField label="Two references *" hint="Include names and a way to contact them. Please confirm you have their permission first."><textarea name="references" rows="3" required minLength="10" maxLength="600" /></TextField>
    <div className="honeypot" aria-hidden="true"><label>Leave this field empty<input name="website" tabIndex="-1" autoComplete="off" /></label></div>
    <label className="check-field provider-check"><input name="referenceConsent" type="checkbox" required /><span>I have permission to share these references’ contact details. *</span></label>
    <label className="check-field provider-check"><input name="screeningConsent" type="checkbox" required /><span>I understand the screening, safeguarding rules and provider terms for this category will be shared before any approval. *</span></label>
    <button className="button button-paper form-submit" type="submit" disabled={state.sending}>{state.sending ? 'Sending application…' : 'Send application'}<span aria-hidden="true">↗</span></button>
    <p className="form-legal">We do not request ID uploads here. Your application is only reviewed; it does not create an assignment.</p>
  </form>;
}

function AdminWelcomeCarousel({ slides = defaultWebsiteContent.welcomeSlides }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = slides[index % slides.length] || defaultWebsiteContent.welcomeSlides[0];
  useEffect(() => {
    if (paused || slides.length < 2) return undefined;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);
  return <section className="welcome-carousel" aria-label="Welcome message" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
    <img key={current.image} className="welcome-carousel-image" src={current.image} alt="" />
    <div className="welcome-carousel-shade" />
    <div className="welcome-carousel-content"><span>{current.eyebrow}</span><h2>{current.title}</h2><p>{current.note}</p></div>
    <div className="welcome-carousel-controls" aria-label="Choose welcome image">{slides.map((slide, slideIndex) => <button key={`${slide.image}-${slideIndex}`} type="button" className={index === slideIndex ? 'active' : ''} aria-label={`Show image ${slideIndex + 1}`} aria-pressed={index === slideIndex} onClick={() => setIndex(slideIndex)} />)}</div>
  </section>;
}

function HomepageEditor({ value = defaultWebsiteContent, onChange, onSave, saving }) {
  const content = value || defaultWebsiteContent;
  const setSection = (section, key, nextValue) => onChange((current) => ({ ...current, [section]: { ...current[section], [key]: nextValue } }));
  const setService = (index, key, nextValue) => onChange((current) => ({ ...current, services: current.services.map((service, itemIndex) => itemIndex === index ? { ...service, [key]: nextValue } : service) }));
  const setSlide = (index, key, nextValue) => onChange((current) => ({ ...current, welcomeSlides: current.welcomeSlides.map((slide, itemIndex) => itemIndex === index ? { ...slide, [key]: nextValue } : slide) }));
  return <form className="homepage-editor" onSubmit={onSave}>
    <div className="editor-heading"><div><span className="form-overline">PUBLIC WEBSITE</span><h2>Homepage content</h2><p>Changes publish to the public site as soon as you save. Use image URLs from Pexels or Unsplash, or a file under <code>/images/</code>.</p></div><button className="button button-ink" type="submit" disabled={saving}>{saving ? 'Publishing…' : 'Publish changes'}<span aria-hidden="true">↗</span></button></div>
    <section className="editor-section"><div className="editor-section-heading"><span>01</span><div><h3>First impression</h3><p>The main headline and introduction visitors see first.</p></div></div><div className="editor-fields editor-fields-two">
      <TextField label="Headline"><input value={content.hero.title} maxLength="100" onChange={(event) => setSection('hero', 'title', event.target.value)} required /></TextField>
      <TextField label="Highlighted word"><input value={content.hero.emphasis} maxLength="40" onChange={(event) => setSection('hero', 'emphasis', event.target.value)} required /></TextField>
      <TextField label="Introduction"><textarea value={content.hero.lede} maxLength="420" rows="3" onChange={(event) => setSection('hero', 'lede', event.target.value)} required /></TextField>
    </div></section>
    <section className="editor-section"><div className="editor-section-heading"><span>02</span><div><h3>Services</h3><p>Three service cards shown on the homepage.</p></div></div><div className="editor-service-grid">{content.services.map((service, index) => <article className="editor-service" key={service.id}><img src={service.image} alt="" /><span className="form-overline">SERVICE 0{index + 1}</span><TextField label="Service name"><input value={service.title} maxLength="80" onChange={(event) => setService(index, 'title', event.target.value)} required /></TextField><TextField label="Short heading"><input value={service.kicker} maxLength="100" onChange={(event) => setService(index, 'kicker', event.target.value)} required /></TextField><TextField label="Description"><textarea value={service.text} maxLength="400" rows="3" onChange={(event) => setService(index, 'text', event.target.value)} required /></TextField><TextField label="Image URL"><input value={service.image} onChange={(event) => setService(index, 'image', event.target.value)} required /></TextField><TextField label="Image description"><input value={service.alt} maxLength="180" onChange={(event) => setService(index, 'alt', event.target.value)} required /></TextField></article>)}</div></section>
    <section className="editor-section"><div className="editor-section-heading"><span>03</span><div><h3>Our approach</h3><p>The values statement below the service reel.</p></div></div><div className="editor-fields editor-fields-two"><TextField label="Heading"><input value={content.approach.title} maxLength="100" onChange={(event) => setSection('approach', 'title', event.target.value)} required /></TextField><TextField label="Highlighted word"><input value={content.approach.emphasis} maxLength="40" onChange={(event) => setSection('approach', 'emphasis', event.target.value)} required /></TextField><TextField label="Introduction"><textarea value={content.approach.body} maxLength="600" rows="4" onChange={(event) => setSection('approach', 'body', event.target.value)} required /></TextField></div></section>
    <section className="editor-section"><div className="editor-section-heading"><span>04</span><div><h3>Welcome images</h3><p>The dashboard card changes image and message every few seconds.</p></div></div><div className="editor-slide-grid">{content.welcomeSlides.map((slide, index) => <article className="editor-slide" key={`${index}-${slide.image}`}><div className="editor-slide-preview" style={{ backgroundImage: `linear-gradient(180deg, transparent, rgba(12, 37, 28, .68)), url("${slide.image}")` }}><span>IMAGE 0{index + 1}</span></div><TextField label="Image URL"><input value={slide.image} onChange={(event) => setSlide(index, 'image', event.target.value)} required /></TextField><TextField label="Small heading"><input value={slide.eyebrow} maxLength="50" onChange={(event) => setSlide(index, 'eyebrow', event.target.value)} required /></TextField><TextField label="Main message"><input value={slide.title} maxLength="120" onChange={(event) => setSlide(index, 'title', event.target.value)} required /></TextField><TextField label="Supporting line"><input value={slide.note} maxLength="140" onChange={(event) => setSlide(index, 'note', event.target.value)} required /></TextField></article>)}</div></section>
    <div className="editor-footer"><span>Text and image addresses are checked before publishing.</span><button className="button button-ink" type="submit" disabled={saving}>{saving ? 'Publishing…' : 'Publish homepage'}<span aria-hidden="true">↗</span></button></div>
  </form>;
}

function ProviderWorkspace({ user, onLogout }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  async function loadAssignments() { setAssignments(await apiRequest('/provider/assignments')); }
  useEffect(() => { loadAssignments().catch((loadError) => setError(loadError.message)).finally(() => setLoading(false)); }, []);
  async function respond(event, assignment, response) {
    event?.preventDefault(); const form = event?.currentTarget ? new FormData(event.currentTarget) : null;
    setBusyId(assignment.id); setNotice(''); setError('');
    try {
      await apiRequest(`/provider/assignments/${assignment.id}/response`, { method: 'PATCH', body: JSON.stringify({ response, note: form?.get('note') || '' }) });
      await loadAssignments(); setNotice(response === 'Accepted' ? 'Visit accepted. The team can see your response.' : 'Visit declined. The operations team has been notified.');
    } catch (responseError) { setError(responseError.message); }
    setBusyId('');
  }
  return <main className="provider-shell"><header className="provider-topbar"><Logo /><div><span className="online-dot" />{user.fullName}<button className="text-link" type="button" onClick={onLogout}>Sign out ↗</button></div></header><section className="provider-dashboard"><div className="provider-heading"><SectionLabel number="PROVIDER SPACE">YOUR SCHEDULE</SectionLabel><h1>Welcome, <em>{user.fullName.split(' ')[0]}.</em></h1><p>Review the visits assigned to you and let the team know whether you can take each one.</p></div>{notice && <p className="admin-notice" role="status">{notice}</p>}{error && <p className="form-error" role="alert">{error}</p>}{loading ? <p className="admin-loading">Loading your schedule…</p> : assignments.length === 0 ? <div className="admin-empty provider-empty"><span>✳</span><h2>No visits assigned yet.</h2><p>When the operations team assigns you a visit, it will appear here with the service details.</p></div> : <div className="provider-assignment-list">{assignments.map((assignment) => <article className="provider-assignment" key={assignment.id}><header><span className="record-ref">{assignment.reference}</span><span className={`status-mark ${assignment.response.toLowerCase()}`}>{assignment.response === 'Pending' ? 'Awaiting your response' : assignment.response}</span></header><div className="provider-assignment-body"><div><span className="form-overline">{serviceOptions.find((service) => service.id === assignment.service)?.title || assignment.service}</span><h2>{new Date(`${assignment.requested_date_text}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</h2><p>{String(assignment.start_time).slice(0, 5)} · {assignment.duration_hours} hours · {assignment.neighborhood}</p><p className="provider-client-contact">Customer: {assignment.full_name} · {assignment.phone}{assignment.email ? ` · ${assignment.email}` : ''}</p>{assignment.service_details?.notes && <p className="provider-visit-note">Visit details: {assignment.service_details.notes}</p>}</div><span className="provider-calendar-mark">{new Date(`${assignment.requested_date_text}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span></div>{assignment.response === 'Pending' ? <div className="provider-assignment-actions"><button className="button button-ink" type="button" disabled={busyId === assignment.id} onClick={() => respond(null, assignment, 'Accepted')}>{busyId === assignment.id ? 'Saving…' : 'Accept visit ↗'}</button><details><summary>Decline and explain</summary><form onSubmit={(event) => respond(event, assignment, 'Declined')}><TextField label="Reason for the team"><textarea name="note" rows="3" minLength="10" maxLength="500" required placeholder="Share a brief reason so the team can arrange another provider." /></TextField><button className="button button-outline" type="submit" disabled={busyId === assignment.id}>{busyId === assignment.id ? 'Sending…' : 'Send decline'}</button></form></details></div> : <p className="provider-response-note">The operations team will contact you if any visit details change.</p>}</article>)}</div>}<p className="account-footnote">Only visits assigned to your approved provider profile appear here. For urgent changes, contact the operations team using your agreed channel.</p></section><footer className="admin-footer"><span>Wellness Home Care · Provider workspace</span><a href="/">Public website ↗</a></footer></main>;
}

function StaffPanel() {
  const [auth, setAuth] = useState({ checking: true, user: null, error: '' });
  const [data, setData] = useState({ overview: null, requests: [], applications: [], employees: [], siteContent: defaultWebsiteContent, audit: [], feedback: [], leaveRequests: [] });
  const [siteDraft, setSiteDraft] = useState(defaultWebsiteContent);
  const [tab, setTab] = useState('requests');
  const [busyId, setBusyId] = useState('');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [loginSending, setLoginSending] = useState(false);
  const [contentSaving, setContentSaving] = useState(false);

  async function loadData(role = auth.user?.role) {
    const [overview, requests, applications] = await Promise.all([
      apiRequest('/admin/overview'), apiRequest('/admin/requests'), apiRequest('/admin/applications'),
    ]);
    const [employees, siteContent, audit, feedback, leaveRequests] = await Promise.all([
      role === 'ADMIN' ? apiRequest('/admin/employees') : Promise.resolve([]),
      role === 'ADMIN' ? apiRequest('/site-content') : Promise.resolve(defaultWebsiteContent),
      role === 'ADMIN' ? apiRequest('/admin/audit') : Promise.resolve([]),
      role === 'ADMIN' ? apiRequest('/admin/feedback') : Promise.resolve([]),
      apiRequest('/employee/leave-requests'),
    ]);
    setData({ overview, requests, applications, employees, siteContent, audit, feedback, leaveRequests });
    if (role === 'ADMIN') setSiteDraft(siteContent);
  }

  useEffect(() => {
    let active = true;
    apiRequest('/auth/session').then(async (user) => {
      if (!active) return;
      setAuth({ checking: false, user, error: '' });
      if (!['CLIENT', 'PROVIDER'].includes(user.role)) {
        try { await loadData(user.role); } catch (error) { if (active) setAuth({ checking: false, user: null, error: error.message }); }
      }
    }).catch(() => { if (active) setAuth({ checking: false, user: null, error: '' }); });
    return () => { active = false; };
  }, []);

  async function login(event) {
    event.preventDefault(); setLoginSending(true); setAuth((current) => ({ ...current, error: '' }));
    const form = new FormData(event.currentTarget);
    try {
      const user = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
      setAuth({ checking: false, user, error: '' });
      if (!['CLIENT', 'PROVIDER'].includes(user.role)) await loadData(user.role);
    } catch (error) { setAuth({ checking: false, user: null, error: error.message }); }
    setLoginSending(false);
  }

  async function logout() {
    try { await apiRequest('/auth/logout', { method: 'POST', body: '{}' }); } finally {
      setAuth({ checking: false, user: null, error: 'You have signed out.' });
      setData({ overview: null, requests: [], applications: [], employees: [], siteContent: defaultWebsiteContent, audit: [], feedback: [], leaveRequests: [] });
      setSiteDraft(defaultWebsiteContent);
    }
  }

  async function updateStatus(kind, item, status) {
    setBusyId(item.id); setNotice('');
    try {
      const endpoint = kind === 'request' ? `/admin/requests/${item.id}/status` : `/admin/applications/${item.id}/status`;
      await apiRequest(endpoint, { method: 'PATCH', body: JSON.stringify({ status }) });
      await loadData(); setNotice(`${kind === 'request' ? 'Request' : 'Application'} status updated.`);
    } catch (error) { setNotice(error.message); }
    setBusyId('');
  }

  async function updateAssignment(item, providerId) {
    setBusyId(item.id); setNotice('');
    try {
      await apiRequest(`/admin/requests/${item.id}/assignment`, { method: 'PATCH', body: JSON.stringify({ providerId: providerId || null }) });
      await loadData(); setNotice(providerId ? 'Approved provider assigned and logged.' : 'Provider unassigned.');
    } catch (error) { setNotice(error.message); }
    setBusyId('');
  }

  async function savePayment(event, item) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusyId(item.id); setNotice('');
    try {
      await apiRequest(`/admin/requests/${item.id}/payment`, { method: 'PATCH', body: JSON.stringify({
        quotedAmount: form.get('quotedAmount'), paymentMethod: form.get('paymentMethod'),
        clientPaymentStatus: form.get('clientPaymentStatus'), providerPaymentStatus: form.get('providerPaymentStatus'),
        transactionReference: form.get('transactionReference'),
      }) });
      await loadData(); setNotice(`Payment record saved for ${item.reference}.`);
    } catch (error) { setNotice(error.message); }
    setBusyId('');
  }

  async function createEmployee(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusyId('employee-create'); setNotice('');
    try {
      await apiRequest('/admin/employees', { method: 'POST', body: JSON.stringify({ fullName: values.get('fullName'), email: values.get('email'), password: values.get('password') }) });
      form.reset(); await loadData(); setNotice('Employee account created. Share its sign-in details with the employee securely.');
    } catch (error) { setNotice(error.message); }
    setBusyId('');
  }

  async function createProviderAccount(event, application) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    setBusyId(application.id); setNotice('');
    try {
      await apiRequest(`/admin/applications/${application.id}/account`, { method: 'POST', body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
      await loadData(); setNotice('Provider access created. Share the sign-in details privately.');
    } catch (error) { setNotice(error.message); }
    setBusyId('');
  }

  async function toggleEmployee(employee) {
    setBusyId(employee.id); setNotice('');
    try {
      await apiRequest(`/admin/employees/${employee.id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: !employee.isActive }) });
      await loadData(); setNotice(`${employee.fullName}’s account ${employee.isActive ? 'deactivated' : 'reactivated'}.`);
    } catch (error) { setNotice(error.message); }
    setBusyId('');
  }

  async function saveHomepage(event) {
    event.preventDefault(); setContentSaving(true); setNotice('');
    try {
      const saved = await apiRequest('/admin/site-content', { method: 'PUT', body: JSON.stringify({ content: siteDraft }) });
      setSiteDraft(saved.content); setData((current) => ({ ...current, siteContent: saved.content }));
      setNotice('Homepage changes are live.');
    } catch (error) { setNotice(error.message); }
    setContentSaving(false);
  }

  async function updateEmployeeAssignment(item, employeeId) {
    setBusyId(item.id); setNotice('');
    try {
      await apiRequest(`/admin/requests/${item.id}/employee-assignment`, { method: 'PATCH', body: JSON.stringify({ employeeId: employeeId || null }) });
      await loadData(); setNotice(employeeId ? 'Team member assigned to this visit.' : 'Team assignment removed.');
    } catch (error) { setNotice(error.message); }
    setBusyId('');
  }

  async function recordAttendance(item, action) {
    setBusyId(item.id); setNotice('');
    if (!navigator.geolocation) { setNotice('This browser cannot share a location for attendance.'); setBusyId(''); return; }
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        await apiRequest(`/employee/assignments/${item.id}/attendance/${action}`, { method: 'POST', body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }) });
        await loadData(); setNotice(action === 'check-in' ? 'Arrival recorded for this visit.' : 'Departure recorded and the visit marked complete.');
      } catch (error) { setNotice(error.message); }
      setBusyId('');
    }, (error) => {
      setNotice(error.code === error.PERMISSION_DENIED ? 'Allow location access to record attendance.' : 'Could not read your location. Please try again.');
      setBusyId('');
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  }

  async function respondToEmployeeAssignment(event, item, response) {
    event?.preventDefault(); const form = event?.currentTarget ? new FormData(event.currentTarget) : null;
    setBusyId(item.id); setNotice('');
    try {
      await apiRequest(`/employee/assignments/${item.id}/response`, { method: 'PATCH', body: JSON.stringify({ response, note: form?.get('note') || '' }) });
      await loadData(); setNotice(response === 'Accepted' ? 'Visit accepted. You can record attendance when you arrive.' : 'Visit declined. The operations team has been notified.');
    } catch (error) { setNotice(error.message); }
    setBusyId('');
  }

  async function submitServiceReport(event, item) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    setBusyId(item.id); setNotice('');
    try {
      await apiRequest(`/employee/assignments/${item.id}/reports`, { method: 'POST', body: JSON.stringify({ kind: form.get('kind'), message: form.get('message') }) });
      await loadData(); setNotice('Your report has been sent to the operations team.');
    } catch (error) { setNotice(error.message); }
    setBusyId('');
  }

  async function updateFeedbackStatus(item, status) {
    setBusyId(item.id); setNotice('');
    try {
      await apiRequest(`/admin/feedback/${item.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await loadData(); setNotice('Customer message updated.');
    } catch (error) { setNotice(error.message); }
    setBusyId('');
  }

  async function submitLeaveRequest(event) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    setBusyId('leave-create'); setNotice('');
    try {
      await apiRequest('/employee/leave-requests', { method: 'POST', body: JSON.stringify({ startDate: form.get('startDate'), endDate: form.get('endDate'), reason: form.get('reason') }) });
      formElement.reset(); await loadData(); setNotice('Your time-off request has been sent for review.');
    } catch (error) { setNotice(error.message); }
    setBusyId('');
  }

  async function reviewLeaveRequest(item, status) {
    setBusyId(item.id); setNotice('');
    try {
      await apiRequest(`/admin/leave-requests/${item.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await loadData(); setNotice(`Time-off request ${status.toLowerCase()}.`);
    } catch (error) { setNotice(error.message); }
    setBusyId('');
  }

  function exportCurrentRecords() {
    if (tab === 'requests') {
      downloadCsv('wellness-service-requests.csv', [
        ['Reference', 'Customer', 'Email', 'Phone', 'Service', 'Area', 'Date', 'Start time', 'Duration hours', 'Status', 'Approved provider', 'Assigned team member', 'Quoted RWF', 'Payment status'],
        ...visibleItems.map((item) => [item.reference, item.full_name, item.email, item.phone, item.service, item.neighborhood, item.requested_date_text, item.start_time, item.duration_hours, item.status, item.provider_name, item.employee_name, item.quoted_amount_rwf, item.client_payment_status]),
      ]);
    } else {
      downloadCsv('wellness-provider-applications.csv', [
        ['Reference', 'Applicant', 'Email', 'Phone', 'Service', 'Area', 'Languages', 'Availability', 'Status', 'Received'],
        ...visibleItems.map((item) => [item.reference, item.full_name, item.email, item.phone, item.service, item.neighborhood, item.languages, item.availability, item.status, item.created_at]),
      ]);
    }
  }

  const user = auth.user;
  const isAdmin = user?.role === 'ADMIN';
  const currentItems = tab === 'applications' ? data.applications : data.requests;
  const visibleItems = currentItems.filter((item) => `${item.reference} ${item.full_name} ${item.phone} ${item.service} ${item.neighborhood}`.toLowerCase().includes(search.trim().toLowerCase()));
  if (auth.checking) return <main className="admin-shell"><p className="admin-loading">Opening your team space…</p></main>;
  if (!user) return <main className="admin-shell"><header className="admin-header"><Logo /><a className="text-link" href="/">Return to the website ↗</a></header><div className="admin-login-wrap"><div className="admin-login-note"><SectionLabel number="PRIVATE AREA">TEAM ACCESS</SectionLabel><h1>Work that<br /><em>helps home.</em></h1><p>Team members and approved providers use this space to coordinate visits. Your account role controls which tools are available.</p><div className="admin-safe-note"><span>✳</span>For authorized staff only. Keep account details private.</div></div><form className="admin-login" onSubmit={login}><span className="form-overline">WELLNESS HOME CARE</span><h2>Team sign in</h2><p>Use the account created for you by the administrator.</p>{auth.error && <p className="form-error" role="alert">{auth.error}</p>}<TextField label="Work email"><input name="email" type="email" autoComplete="username" required /></TextField><TextField label="Password"><input name="password" type="password" autoComplete="current-password" required /></TextField><button className="button button-ink form-submit" type="submit" disabled={loginSending}>{loginSending ? 'Checking…' : 'Open your workspace'}<span aria-hidden="true">↗</span></button><a className="text-link admin-return" href="/account">Client account sign in ↗</a><a className="text-link admin-return" href="/">Back to Wellness Home Care</a></form></div></main>;
  if (user.role === 'CLIENT') return <main className="admin-shell"><header className="admin-header"><Logo /><button className="text-link" type="button" onClick={logout}>Sign out ↗</button></header><section className="role-redirect"><SectionLabel number="CLIENT ACCOUNT">WRONG DOOR? EASY FIX.</SectionLabel><h1>Your sign-in is<br /><em>a client account.</em></h1><p>Open your service requests and account details in the client dashboard.</p><a className="button button-ink" href="/account">Go to client dashboard <span>↗</span></a></section></main>;
  if (user.role === 'PROVIDER') return <ProviderWorkspace user={user} onLogout={logout} />;

  const totalRequests = data.overview?.requestStatuses.reduce((sum, item) => sum + item.count, 0) || 0;
  const totalApplications = data.overview?.applicationStatuses.reduce((sum, item) => sum + item.count, 0) || 0;
  return <main className="admin-shell admin-layout">
    <aside className="admin-sidebar"><div className="admin-sidebar-brand"><Logo /><span className="admin-workspace-label">OPERATIONS</span></div><nav className="admin-side-nav" aria-label="Dashboard sections"><span className="admin-nav-caption">WORKSPACE</span>
      <button className={tab === 'requests' ? 'active' : ''} type="button" onClick={() => setTab('requests')}><span className="admin-nav-icon">▤</span>{isAdmin ? 'Service requests' : 'My assignments'}<small>{data.requests.filter((item) => item.status === 'New request').length}</small></button>
      <button className={tab === 'leave' ? 'active' : ''} type="button" onClick={() => setTab('leave')}><span className="admin-nav-icon">◷</span>{isAdmin ? 'Time off' : 'My time off'}<small>{data.leaveRequests.filter((item) => item.status === 'Pending').length}</small></button>
      {isAdmin && <><button className={tab === 'applications' ? 'active' : ''} type="button" onClick={() => setTab('applications')}><span className="admin-nav-icon">✳</span>Provider applications<small>{data.applications.filter((item) => item.status === 'Application received').length}</small></button><button className={tab === 'employees' ? 'active' : ''} type="button" onClick={() => setTab('employees')}><span className="admin-nav-icon">♧</span>Team accounts<small>{data.employees.length}</small></button><button className={tab === 'feedback' ? 'active' : ''} type="button" onClick={() => setTab('feedback')}><span className="admin-nav-icon">♡</span>Client feedback<small>{data.feedback.filter((item) => item.status !== 'Resolved').length}</small></button><span className="admin-nav-caption admin-nav-spaced">MANAGE SITE</span><button className={tab === 'content' ? 'active' : ''} type="button" onClick={() => setTab('content')}><span className="admin-nav-icon">◇</span>Homepage editor</button><button className={tab === 'audit' ? 'active' : ''} type="button" onClick={() => setTab('audit')}><span className="admin-nav-icon">↻</span>Activity log</button></>}
    </nav><div className="admin-sidebar-bottom"><a href="/" className="admin-sidebar-link"><span>↗</span>View public website</a><button type="button" onClick={logout}><span>⇥</span>Sign out</button><div className="admin-sidebar-profile"><span className="admin-avatar">{user.fullName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><div><strong>{user.fullName}</strong><small>{isAdmin ? 'Administrator' : 'Team member'}</small></div></div></div></aside>
    <div className="admin-app-body"><header className="admin-topbar"><div className="admin-topbar-brand"><Logo /><span>·</span><strong>{isAdmin ? 'Admin space' : 'Team space'}</strong></div><div className="admin-topbar-actions"><span className="admin-topbar-date">Kigali · {new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())}</span><button className="admin-refresh-button" type="button" aria-label="Refresh dashboard" onClick={() => loadData().then(() => setNotice('Dashboard refreshed.')).catch((error) => setNotice(error.message))}>↻</button><span className="admin-topbar-user"><span className="online-dot" />{user.fullName}</span></div></header>
    <div className="admin-content-layout"><div className="admin-main"><div className="admin-title-row"><div><SectionLabel number={isAdmin ? 'ADMIN SPACE' : 'TEAM SPACE'}>KIGALI · OPERATIONS</SectionLabel><h1>{tab === 'requests' ? (isAdmin ? 'Service requests' : 'My assignments') : tab === 'applications' ? 'Provider applications' : tab === 'employees' ? 'Your team' : tab === 'content' ? 'Website content' : tab === 'feedback' ? 'Client feedback' : tab === 'leave' ? (isAdmin ? 'Time-off requests' : 'My time off') : 'Recent activity'}</h1><p className="admin-page-subtitle">{tab === 'requests' ? (isAdmin ? 'Review new requests and keep every visit moving.' : 'The visits assigned to you, with attendance and service notes.') : tab === 'applications' ? 'Review new provider enquiries and screening details.' : tab === 'employees' ? 'Manage access for the people who keep visits running.' : tab === 'content' ? 'Keep the public homepage current and welcoming.' : tab === 'feedback' ? 'Listen to what customers share after sending a request.' : tab === 'leave' ? (isAdmin ? 'Review employee availability and time-off requests.' : 'Ask for time away and follow the review status.') : 'A traceable record of changes made by the team.'}</p></div><button className="button button-outline admin-refresh-label" type="button" onClick={() => loadData().then(() => setNotice('Dashboard refreshed.')).catch((error) => setNotice(error.message))}>Refresh data <span>↻</span></button></div>
      <div className="admin-metrics"><article><span>NEW REQUESTS</span><strong>{data.requests.filter((item) => item.status === 'New request').length}</strong><small>Awaiting first review</small></article><article><span>REQUESTS THIS WEEK</span><strong>{data.overview?.requestsThisWeek || 0}</strong><small>{totalRequests} all-time requests</small></article><article><span>APPLICATIONS</span><strong>{data.applications.filter((item) => item.status === 'Application received').length}</strong><small>{totalApplications} all-time applications</small></article><article><span>OPEN COMPLAINTS</span><strong>{data.requests.filter((item) => item.status === 'Complaint open').length}</strong><small>Requests marked for follow-up</small></article></div>
      <div className="admin-workspace">{['requests', 'applications'].includes(tab) && <div className="admin-toolbar"><div className="admin-tools"><label className="admin-search"><span className="visually-hidden">Search team records</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone or reference" /></label>{isAdmin && <button className="admin-export-button" type="button" onClick={exportCurrentRecords}>Export CSV <span>↓</span></button>}<p className="admin-refresh-note">Latest first · up to 250 records</p></div></div>}
        {notice && <p className="admin-notice" role="status">{notice}</p>}
        {tab === 'employees' && isAdmin ? <div className="employee-management"><form className="employee-create" onSubmit={createEmployee}><div><span className="form-overline">ADD A TEAM MEMBER</span><h2>Create an employee account</h2><p>Employees see visits assigned to them. Account access and finance remain with the administrator.</p></div><TextField label="Full name"><input name="fullName" autoComplete="name" required minLength="2" maxLength="120" /></TextField><TextField label="Work email"><input name="email" type="email" autoComplete="email" required /></TextField><TextField label="Temporary password" hint="At least 12 characters. Share it privately."><input name="password" type="password" minLength="12" maxLength="128" required /></TextField><button className="button button-ink" type="submit" disabled={busyId === 'employee-create'}>{busyId === 'employee-create' ? 'Creating…' : 'Create account'}<span>↗</span></button></form><div className="employee-list"><h3>Employee accounts</h3>{data.employees.length === 0 ? <p>No employee accounts yet.</p> : data.employees.map((employee) => <article key={employee.id}><div><strong>{employee.fullName}</strong><span>{employee.email}</span></div><span className={`employee-state ${employee.isActive ? 'is-active' : ''}`}>{employee.isActive ? 'Active' : 'Paused'}</span><button className="text-link" type="button" disabled={busyId === employee.id} onClick={() => toggleEmployee(employee)}>{employee.isActive ? 'Deactivate' : 'Reactivate'}</button></article>)}</div></div> : tab === 'content' && isAdmin ? <HomepageEditor value={siteDraft} onChange={setSiteDraft} onSave={saveHomepage} saving={contentSaving} /> : tab === 'audit' && isAdmin ? <div className="audit-list">{data.audit.length === 0 ? <div className="admin-empty"><span>✳</span><h2>No activity yet.</h2><p>Changes made by administrators will be recorded here.</p></div> : data.audit.map((item) => <article key={item.id}><span className="audit-dot" /><div><strong>{item.action.replaceAll('_', ' ')}</strong><p>{item.entity_type.replaceAll('_', ' ')} · {item.actor}</p></div><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</time></article>)}</div> : tab === 'feedback' && isAdmin ? <div className="feedback-list">{data.feedback.length === 0 ? <div className="admin-empty"><span>♡</span><h2>No customer messages yet.</h2><p>Feedback and complaints will be collected here after a customer submits one.</p></div> : data.feedback.map((item) => <article key={item.id} className="feedback-card"><div className="feedback-card-head"><div><span className="record-ref">{item.reference}</span><span className={`status-mark ${item.status.toLowerCase().replaceAll(' ', '-')}`}>{item.status}</span></div><time>{new Date(item.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}</time></div><div className="feedback-card-meta"><strong>{item.client_name}</strong><span>{item.kind === 'complaint' ? 'Complaint' : `Feedback${item.rating ? ` · ${'★'.repeat(item.rating)}` : ''}`} · {serviceOptions.find((service) => service.id === item.service)?.title || item.service}</span></div><p>{item.message}</p><label className="feedback-status-control">FOLLOW-UP STATUS<select value={item.status} disabled={busyId === item.id} onChange={(event) => updateFeedbackStatus(item, event.target.value)}>{['Received', 'Under review', 'Resolved'].map((status) => <option key={status}>{status}</option>)}</select></label></article>)}</div> : tab === 'leave' ? <div className="leave-workspace">{!isAdmin && <form className="leave-create" onSubmit={submitLeaveRequest}><span className="form-overline">PLAN AHEAD</span><h2>Request time off</h2><div className="leave-date-fields"><TextField label="First day"><input type="date" name="startDate" required /></TextField><TextField label="Last day"><input type="date" name="endDate" required /></TextField></div><TextField label="Reason"><textarea name="reason" rows="3" minLength="10" maxLength="1000" placeholder="Share the information your manager needs." required /></TextField><button className="button button-ink" type="submit" disabled={busyId === 'leave-create'}>{busyId === 'leave-create' ? 'Sending…' : 'Send for review'}<span>↗</span></button></form>}<div className="leave-list">{data.leaveRequests.length === 0 ? <div className="admin-empty"><span>◷</span><h2>No time-off requests yet.</h2><p>{isAdmin ? 'Employee requests will appear here for review.' : 'Requests you send will show their status here.'}</p></div> : data.leaveRequests.map((item) => <article key={item.id}><div><span className={`status-mark ${item.status.toLowerCase()}`}>{item.status}</span><h3>{isAdmin ? item.employee_name : 'Time-off request'}</h3><p>{new Date(`${item.start_date}T12:00:00`).toLocaleDateString('en-GB', { dateStyle: 'medium' })} – {new Date(`${item.end_date}T12:00:00`).toLocaleDateString('en-GB', { dateStyle: 'medium' })}</p><small>{item.reason}</small>{item.reviewer_note && <small>Manager note: {item.reviewer_note}</small>}</div>{isAdmin && item.status === 'Pending' && <div className="leave-actions"><button type="button" disabled={busyId === item.id} onClick={() => reviewLeaveRequest(item, 'Approved')}>Approve</button><button type="button" disabled={busyId === item.id} onClick={() => reviewLeaveRequest(item, 'Declined')}>Decline</button></div>}</article>)}</div></div> : visibleItems.length === 0 ? <div className="admin-empty"><span aria-hidden="true">✳</span><h2>{currentItems.length ? 'No matching records.' : 'Nothing in the queue yet.'}</h2><p>{currentItems.length ? 'Try another name, phone number or reference.' : `New ${tab === 'requests' ? 'service requests' : 'provider applications'} will appear here after someone submits a form.`}</p></div> : <div className="record-list">{visibleItems.map((item) => {
          const approvedProviders = data.applications.filter((provider) => provider.status === 'Approved' && provider.account_active && provider.service === item.service);
          const currentProviderMissing = item.assigned_provider_id && !approvedProviders.some((provider) => provider.id === item.assigned_provider_id);
          const attendance = item.attendance?.[0];
          const statusChoices = isAdmin ? (tab === 'requests' ? bookingStatuses : applicationStatuses) : ['In progress', 'Completed', 'No-show', 'Complaint open'];
          return <article className="record" key={item.id}>
          <div className="record-header"><div><span className="record-ref">{item.reference}</span><span className={`status-mark ${item.status.toLowerCase().replaceAll(' ', '-')}`}>{item.status}</span></div><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</time></div>
          <div className="record-body"><div><h2>{item.full_name}</h2><p className="record-subtitle">{serviceOptions.find((service) => service.id === item.service)?.title || item.service} <span>·</span> {item.neighborhood}</p><p className="record-contact">{item.phone}{item.email ? ` · ${item.email}` : ''}{item.preferred_contact ? ` · prefers ${item.preferred_contact}` : ''}</p>{item.provider_name && <p className="assigned-provider">Provider: {item.provider_name} <span>· {item.provider_reference}</span> · {item.provider_response === 'Accepted' ? 'accepted' : item.provider_response === 'Pending' ? 'awaiting response' : ''}</p>}{item.provider_response === 'Declined' && <p className="provider-decline-note">Provider declined: {item.provider_decline_note || 'No reason provided.'}</p>}{item.employee_name && <p className="assigned-provider">Team member: {item.employee_name} <span>· {item.employee_response === 'Accepted' ? 'accepted' : item.employee_response === 'Pending' ? 'awaiting response' : ''}</span></p>}{item.employee_response === 'Declined' && <p className="provider-decline-note">Employee declined: {item.employee_decline_note || 'No reason provided.'}</p>}</div>
            {tab === 'requests' ? <div className="record-detail"><span>Preferred visit</span><strong>{new Date(`${item.requested_date_text}T12:00:00`).toLocaleDateString('en-GB', { dateStyle: 'medium' })} · {String(item.start_time).slice(0, 5)}</strong><small>{item.duration_hours} hours{item.recurring ? ' · recurring interest' : ''}</small>{item.service_details?.notes && <p>“{item.service_details.notes}”</p>}{item.service_details?.supportTypes?.length > 0 && <small>Support: {item.service_details.supportTypes.join(', ')}</small>}{item.service_details?.ageRange && <small>Age range: {item.service_details.ageRange}</small>}{item.service_details?.people && <small>Meal for {item.service_details.people}</small>}</div> : <div className="record-detail"><span>Provider information</span><strong>{item.languages}</strong><small>Available: {item.availability}</small><p>{item.experience}</p>{item.training && <small>Training: {item.training}</small>}<details className="references-detail"><summary>Reference details (restricted)</summary><p>{item.references_text}</p></details></div>}</div>
          <div className="record-actions"><span className="record-action-label">{tab === 'requests' ? 'BOOKING STATUS' : 'APPLICATION STATUS'}</span><select aria-label={`Update status for ${item.reference}`} value={item.status} disabled={busyId === item.id || (!isAdmin && item.employee_response !== 'Accepted')} onChange={(event) => updateStatus(tab === 'requests' ? 'request' : 'application', item, event.target.value)}>{!statusChoices.includes(item.status) && <option value={item.status}>{item.status}</option>}{statusChoices.filter((status) => status !== item.status).map((status) => <option key={status} disabled={isAdmin && tab === 'requests' && ((status === 'Provider assigned' && !item.assigned_provider_id) || (['In progress', 'Completed'].includes(status) && !item.assigned_provider_id && !item.assigned_employee_id))}>{status}</option>)}</select>{tab === 'requests' && isAdmin && <><span className="record-action-label">APPROVED PROVIDER</span><select aria-label={`Assign provider for ${item.reference}`} value={item.assigned_provider_id || ''} disabled={busyId === item.id || Boolean(item.assigned_employee_id && !item.assigned_provider_id) || (!approvedProviders.length && !currentProviderMissing) || !['Confirmed', 'Rescheduled', 'Provider assigned'].includes(item.status)} onChange={(event) => updateAssignment(item, event.target.value)}><option value="">{item.assigned_provider_id ? 'Unassign provider' : 'Choose approved provider'}</option>{currentProviderMissing && <option value={item.assigned_provider_id}>Current: {item.provider_name}</option>}{approvedProviders.map((provider) => <option key={provider.id} value={provider.id}>{provider.full_name} · {provider.reference}</option>)}</select><span className="record-action-label">TEAM ASSIGNMENT</span><select aria-label={`Assign team member for ${item.reference}`} value={item.assigned_employee_id || ''} disabled={busyId === item.id || Boolean(item.assigned_provider_id && !item.assigned_employee_id) || !['Confirmed', 'Rescheduled', 'Provider assigned'].includes(item.status)} onChange={(event) => updateEmployeeAssignment(item, event.target.value)}><option value="">{item.assigned_employee_id ? 'Unassign team member' : 'Choose team member'}</option>{data.employees.filter((employee) => employee.isActive).map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}</select></>}{tab === 'requests' && !isAdmin && item.employee_response === 'Pending' && <div className="employee-assignment-prompt"><div><strong>This visit needs your response.</strong><span>Accept it to see attendance and visit-report actions.</span></div><div className="employee-assignment-buttons"><button className="button button-ink" type="button" disabled={busyId === item.id} onClick={() => respondToEmployeeAssignment(null, item, 'Accepted')}>{busyId === item.id ? 'Saving…' : 'Accept visit ↗'}</button><details><summary>Decline</summary><form onSubmit={(event) => respondToEmployeeAssignment(event, item, 'Declined')}><TextField label="Reason for declining"><textarea name="note" rows="2" minLength="10" maxLength="500" required placeholder="Let the team know why you cannot take this visit." /></TextField><button className="button button-outline" type="submit" disabled={busyId === item.id}>{busyId === item.id ? 'Sending…' : 'Send decline'}</button></form></details></div></div>}{tab === 'requests' && !isAdmin && item.employee_response === 'Accepted' && <div className="employee-attendance"><span className="record-action-label">VISIT ATTENDANCE</span>{!attendance ? <button type="button" className="button button-outline" disabled={busyId === item.id} onClick={() => recordAttendance(item, 'check-in')}>{busyId === item.id ? 'Recording…' : 'Record arrival ↗'}</button> : attendance.check_out_at ? <p>Visit complete · {new Date(attendance.check_out_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p> : <><p>Arrived {new Date(attendance.check_in_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p><button type="button" className="button button-outline" disabled={busyId === item.id} onClick={() => recordAttendance(item, 'check-out')}>{busyId === item.id ? 'Recording…' : 'Record departure ↗'}</button></>}</div>}<span className="record-action-note">Changes are recorded in the operations log.</span></div>
          {tab === 'requests' && isAdmin && attendance && <div className="attendance-admin-summary"><span className="record-action-label">GPS ATTENDANCE · {attendance.employee_name || 'TEAM MEMBER'}</span><p>Arrival {new Date(attendance.check_in_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} · approx. {attendance.check_in_location}</p>{attendance.check_out_at && <p>Departure {new Date(attendance.check_out_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} · approx. {attendance.check_out_location}</p>}</div>}
          {tab === 'applications' && isAdmin && item.status === 'Approved' && item.has_account && <p className="provider-account-active">Provider portal {item.account_active ? 'active' : 'paused'} · {item.account_email}</p>}
          {tab === 'applications' && isAdmin && item.status === 'Approved' && !item.has_account && <details className="provider-account-create"><summary>Create provider sign-in</summary><form onSubmit={(event) => createProviderAccount(event, item)}><TextField label="Provider login email"><input name="email" type="email" defaultValue={item.email || ''} autoComplete="email" required /></TextField><TextField label="Initial password" hint="At least 12 characters. Share it privately; it will not be shown again."><input name="password" type="password" minLength="12" maxLength="128" required /></TextField><button className="button button-ink" type="submit" disabled={busyId === item.id}>{busyId === item.id ? 'Creating…' : 'Create provider access'}<span>↗</span></button></form></details>}
          {tab === 'requests' && isAdmin && item.reports?.length > 0 && <div className="staff-report-feed"><span className="record-action-label">RECENT TEAM NOTES</span>{item.reports.map((report) => <p key={report.id}><strong>{report.kind.replaceAll('-', ' ')}</strong> · {report.message}<small>{report.employee_name} · {new Date(report.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}</small></p>)}</div>}
          {tab === 'requests' && !isAdmin && item.employee_response === 'Accepted' && <><p className="attendance-privacy-note">Location is requested only when you record arrival or departure for this visit.</p><details className="record-report"><summary>Send a visit note or report</summary><form onSubmit={(event) => submitServiceReport(event, item)}><label>Type<select name="kind"><option value="service-note">Visit note</option><option value="supplies">Supplies needed</option><option value="incident">Incident</option></select></label><label>Details<textarea name="message" rows="3" minLength="10" maxLength="2000" required placeholder="Share the details the operations team should know." /></label><button className="button button-outline" type="submit" disabled={busyId === item.id}>{busyId === item.id ? 'Sending…' : 'Send to operations'}</button></form></details></>}
          {tab === 'requests' && isAdmin && <details className="record-payment"><summary>Price & payment record <span>{item.quoted_amount_rwf ? `RWF ${Number(item.quoted_amount_rwf).toLocaleString('en-US')}` : 'Not recorded'} · {item.client_payment_status}</span></summary><form className="payment-form" onSubmit={(event) => savePayment(event, item)}><label>Customer quote (RWF)<input type="number" name="quotedAmount" min="0" max="999999999.99" step="0.01" defaultValue={item.quoted_amount_rwf ?? ''} /></label><label>Payment method<select name="paymentMethod" defaultValue={item.payment_method || 'Not decided'}>{['Not decided', 'Cash', 'Bank transfer', 'Mobile money', 'Other'].map((method) => <option key={method}>{method}</option>)}</select></label><label>Customer payment<select name="clientPaymentStatus" defaultValue={item.client_payment_status || 'Not discussed'}>{['Not discussed', 'Quoted', 'Part-paid', 'Paid', 'Overdue', 'Refunded'].map((status) => <option key={status}>{status}</option>)}</select></label><label>Provider payment<select name="providerPaymentStatus" defaultValue={item.provider_payment_status || 'Not recorded'}>{['Not recorded', 'Pending', 'Paid'].map((status) => <option key={status}>{status}</option>)}</select></label><label className="transaction-field">Transaction reference<input name="transactionReference" maxLength="120" defaultValue={item.transaction_reference || ''} /></label><button className="button button-outline" type="submit" disabled={busyId === item.id}>{busyId === item.id ? 'Saving…' : 'Save payment record'}</button></form></details>}
        </article>})}</div>}
      </div><p className="admin-disclaimer"><strong>A request is not a booking.</strong> Confirm scope, provider, price, payment method and cancellation terms with the customer before confirming.</p>
    </div><aside className="admin-right-rail"><AdminWelcomeCarousel slides={data.siteContent?.welcomeSlides || defaultWebsiteContent.welcomeSlides} /><section className="rail-focus"><span className="form-overline">TODAY’S FOCUS</span><h2>{data.requests.filter((item) => item.status === 'New request').length ? 'A few requests need a first look.' : 'The queue is up to date.'}</h2><p>{isAdmin ? 'Keep the customer in the loop before confirming a visit.' : 'Open an assigned visit to record arrival, departure or a service note.'}</p><button type="button" onClick={() => setTab('requests')}>Open service queue <span>↗</span></button></section><div className="rail-support-note"><span className="note-flower">✳</span><p>Good support is built on clear details and a thoughtful handover.</p></div></aside></div><footer className="admin-footer"><span>Wellness Home Care · Team dashboard</span><a href="/">Public website ↗</a></footer></div></main>;
}

function ClientPortal() {
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);

  async function loadRequests() { setRequests(await apiRequest('/client/requests')); }
  async function sendFeedback(event, request) {
    event.preventDefault(); const formElement = event.currentTarget; const values = new FormData(formElement);
    setSending(true); setError(''); setNotice('');
    try {
      const kind = values.get('kind');
      await apiRequest(`/client/requests/${request.id}/feedback`, { method: 'POST', body: JSON.stringify({ kind, rating: kind === 'feedback' ? values.get('rating') : null, message: values.get('message') }) });
      formElement.reset(); await loadRequests(); setNotice('Thank you. Your message has been sent to the team.');
    } catch (submitError) { setError(submitError.message); }
    setSending(false);
  }
  useEffect(() => {
    let active = true;
    apiRequest('/auth/session').then(async (account) => {
      if (!active) return;
      setUser(account);
      if (account.role === 'CLIENT') {
        try { const rows = await apiRequest('/client/requests'); if (active) setRequests(rows); }
        catch (loadError) { if (active) setError(loadError.message); }
      }
    }).catch(() => {}).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);

  async function submit(event) {
    event.preventDefault(); setSending(true); setError(''); setNotice('');
    const values = new FormData(event.currentTarget);
    const body = { email: values.get('email'), password: values.get('password') };
    if (mode === 'register') { body.fullName = values.get('fullName'); body.phone = values.get('phone'); }
    try {
      const account = await apiRequest(`/auth/${mode === 'register' ? 'register' : 'login'}`, { method: 'POST', body: JSON.stringify(body) });
      setUser(account);
      if (account.role === 'CLIENT') await loadRequests();
      else setNotice('This is a team account. Use the team dashboard to continue.');
    } catch (submitError) { setError(submitError.message); }
    setSending(false);
  }

  async function logout() {
    await apiRequest('/auth/logout', { method: 'POST', body: '{}' }).catch(() => {});
    setUser(null); setRequests([]); setNotice('You have signed out.');
  }

  if (checking) return <main className="account-shell"><p className="admin-loading">Opening your account…</p></main>;
  return <main className="account-shell"><header className="admin-header"><Logo /><div className="admin-account">{user && <span>Signed in as {user.fullName}</span>}<a className="text-link" href="/">Back to the website ↗</a></div></header>
    {!user ? <div className="account-grid"><section className="account-intro"><SectionLabel number="YOUR HOME, YOUR ACCOUNT">CLIENT SPACE</SectionLabel><h1>Everything about your request,<br /><em>in one place.</em></h1><p>Sign in to see updates to your requests, ask a question, or share feedback after a visit. Your account does not confirm a booking automatically.</p><div className="account-promise"><span>✳</span><p>Only requests linked to your account appear here. We’ll still call or message to agree the final details.</p></div><a className="light-link" href="/">Explore home services ↗</a></section><form className="admin-login account-form" onSubmit={submit}><span className="form-overline">CLIENT ACCOUNT</span><h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2><p>{mode === 'login' ? 'See updates to the requests you have sent.' : 'Use a password with at least 12 characters.'}</p>{error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}{mode === 'register' && <><TextField label="Full name"><input name="fullName" autoComplete="name" required minLength="2" maxLength="120" /></TextField><TextField label="Phone number"><input name="phone" type="tel" autoComplete="tel" required minLength="7" maxLength="24" /></TextField></>}<TextField label="Email"><input name="email" type="email" autoComplete="email" required /></TextField><TextField label="Password"><input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'register' ? 12 : undefined} /></TextField><button className="button button-ink form-submit" type="submit" disabled={sending}>{sending ? 'Please wait…' : mode === 'login' ? 'Open my account' : 'Create client account'}<span>↗</span></button><button className="account-switch" type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'New here? Create a client account' : 'Already registered? Sign in'}</button><a className="account-team-link" href="/staff">Are you part of the team? Sign in here ↗</a></form></div> : user.role !== 'CLIENT' ? <section className="role-redirect"><SectionLabel number="TEAM ACCOUNT">WELCOME BACK</SectionLabel><h1>This sign-in belongs<br /><em>to the team.</em></h1><p>Continue to the staff dashboard to access your team tools.</p>{notice && <p className="admin-notice" role="status">{notice}</p>}<a className="button button-ink" href="/staff">Go to team dashboard <span>↗</span></a><button className="text-link account-signout" type="button" onClick={logout}>Sign out ↗</button></section> : <section className="client-dashboard"><div className="account-dashboard-head"><div><SectionLabel number="CLIENT ACCOUNT">YOUR REQUESTS</SectionLabel><h1>Hello, <em>{user.fullName.split(' ')[0]}.</em></h1><p>Here are the requests linked to your account.</p></div><button className="text-link" type="button" onClick={logout}>Sign out ↗</button></div><div className="client-dashboard-actions"><p>Need help with something at home?</p><a className="button button-ink" href="/#request">Start a service request <span>↗</span></a></div>{error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}{requests.length === 0 ? <div className="admin-empty client-empty"><span>✳</span><h2>No requests yet.</h2><p>Requests you send while signed in will show here with their reference and current status.</p><a className="text-link" href="/#services">Browse services ↗</a></div> : <div className="client-request-list">{requests.map((request) => <article className="client-request" key={request.id}><div className="client-request-main"><span className="record-ref">{request.reference}</span><span className={`status-mark ${request.status.toLowerCase().replaceAll(' ', '-')}`}>{request.status}</span><h2>{serviceOptions.find((service) => service.id === request.service)?.title || request.service}</h2><p>{request.neighborhood} · {new Date(`${request.requested_date_text}T12:00:00`).toLocaleDateString('en-GB', { dateStyle: 'medium' })} at {String(request.start_time).slice(0, 5)}</p><small>Submitted {new Date(request.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}</small>{request.feedback?.map((item) => <p className="client-feedback-status" key={item.id}>{item.kind === 'complaint' ? 'Concern' : 'Feedback'} received · {item.status}</p>)}<details className="client-feedback"><summary>Share feedback or raise a concern</summary><form onSubmit={(event) => sendFeedback(event, request)}><label>Message type<select name="kind"><option value="feedback">Feedback</option><option value="complaint">Concern or complaint</option></select></label><label>Rating<select name="rating" defaultValue="5"><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Fine</option><option value="2">2 — Not good</option><option value="1">1 — Poor</option></select></label><label>Your message<textarea name="message" rows="3" minLength="10" maxLength="2000" required placeholder="Tell us what went well or what needs attention." /></label><button className="button button-outline" type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send privately'}</button></form></details></div><span className="client-request-arrow" aria-hidden="true">↗</span></article>)}</div>}<p className="account-footnote">A request is not a confirmed booking. Our team will contact you to agree service details.</p></section>}
    <footer className="admin-footer"><span>Wellness Home Care · Client account</span><a href="/">Public website ↗</a></footer></main>;
}

export default function App() {
  const path = window.location.pathname;
  if (path.startsWith('/admin') || path.startsWith('/staff')) return <StaffPanel />;
  if (path.startsWith('/account')) return <ClientPortal />;
  return <PublicSite />;
}
