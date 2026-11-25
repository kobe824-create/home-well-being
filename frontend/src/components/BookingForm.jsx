import { useEffect, useState } from "react";
import { apiRequest } from "../api";
import { useSiteContent } from "../site-context";
import { Icon } from "./Icon";
export function Field({ label, hint, children, wide = false }) {
  return (
    <label className={`field ${wide ? "field-wide" : ""}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export default function BookingForm({ selectedService = "", user = null }) {
  const { content } = useSiteContent();
  const services = content.services;
  const serviceOptions = services.map(({ id, title }) => ({ id, title }));
  const copy = content.booking;
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({
    service: selectedService,
    fullName: user?.fullName || "",
    phone: user?.phone || "",
    email: user?.email || "",
    preferredContact: "phone",
    neighborhood: "",
    date: "",
    time: "09:00",
    duration: "2",
    recurring: false,
    recurringWeeks: "4",
    notes: "",
    ageRange: "",
    people: "2",
    contactConsent: false,
    guardianAuthorization: false,
    website: "",
  });
  const [state, setState] = useState({ busy: false, error: "", receipt: null });
  useEffect(() => {
    if (selectedService) setValues((v) => ({ ...v, service: selectedService }));
  }, [selectedService]);
  const set = (key) => (e) =>
    setValues((v) => ({
      ...v,
      [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kigali",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  async function submit(e) {
    e.preventDefault();
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    setState({ busy: true, error: "", receipt: null });
    try {
      const receipt = await apiRequest("/requests", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          duration: Number(values.duration),
          recurringWeeks: Number(values.recurringWeeks),
          details: {
            notes: values.notes,
            ...(values.service === "childcare"
              ? {
                  ageRange: values.ageRange,
                  guardianAuthorization: values.guardianAuthorization,
                }
              : {}),
            ...(values.service === "cooking"
              ? { people: Number(values.people) }
              : {}),
            ...(values.service === "elderly"
              ? { supportTypes: ["Agreed daily activities"] }
              : {}),
          },
        }),
      });
      setState({ busy: false, error: "", receipt });
    } catch (error) {
      setState({ busy: false, error: error.message, receipt: null });
    }
  }
  if (state.receipt)
    return (
      <section className="booking-success" role="status">
        <span className="success-symbol">
          <Icon name="check" size={30} />
        </span>
        <p className="eyebrow">A good place to start</p>
        <h2>
          We’ve received
          <br />
          your request.
        </h2>
        <p>{state.receipt.message}</p>
        <div className="reference-box">
          <small>Your request reference</small>
          <strong>{state.receipt.reference}</strong>
        </div>
        <p className="fine-print">
          This is a request, not a confirmed booking. Our team will contact you
          to discuss the details.
        </p>
        <a className="button button-primary" href="/account">
          Go to your account
        </a>
        <button
          className="text-button"
          onClick={() => {
            setState({ busy: false, error: "", receipt: null });
            setStep(0);
          }}
        >
          Make another request
        </button>
      </section>
    );
  return (
    <form className="booking-form" onSubmit={submit}>
      <div className="form-steps" aria-label="Booking progress">
        {["Your service", "The details", "Let’s connect"].map((label, i) => (
          <div
            className={step === i ? "is-current" : step > i ? "is-done" : ""}
            key={label}
          >
            <span>{step > i ? <Icon name="check" size={14} /> : i + 1}</span>
            <small>{label}</small>
          </div>
        ))}
      </div>
      {state.error && (
        <p className="notice notice-error" role="alert">
          {state.error}
        </p>
      )}
      {step === 0 && (
        <>
          <p className="eyebrow">Step 1 of 3</p>
          <h2>{copy.formTitle}</h2>
          <p>{copy.formIntro}</p>
          <div className="service-choices">
            {serviceOptions.map((s) => (
              <label
                className={`service-choice ${values.service === s.id ? "selected" : ""}`}
                key={s.id}
              >
                <input
                  type="radio"
                  name="service"
                  value={s.id}
                  checked={values.service === s.id}
                  onChange={set("service")}
                  required
                />
                <span className="choice-icon">
                  <Icon
                    name={services.find((x) => x.id === s.id)?.icon || "home"}
                    size={24}
                  />
                </span>
                <strong>{s.title}</strong>
                <span className="radio-mark" />
              </label>
            ))}
          </div>
          {values.service === "security" && (
            <p className="fine-print">
              Security services require specific operating and licensing
              arrangements. An enquiry does not mean the service is currently
              available.
            </p>
          )}
        </>
      )}
      {step === 1 && (
        <>
          <p className="eyebrow">Step 2 of 3</p>
          <h2>Around your routine.</h2>
          <p>Tell us your preferred time. We’ll check availability with you.</p>
          <div className="form-grid">
            <Field
              label="Kigali neighbourhood *"
              hint="Just the area for now. Keep your full address private."
            >
              <input
                required
                minLength={2}
                maxLength={100}
                value={values.neighborhood}
                onChange={set("neighborhood")}
                placeholder="e.g. Kacyiru"
                autoComplete="address-level3"
              />
            </Field>
            <Field label="Preferred date *">
              <input
                type="date"
                min={today}
                required
                value={values.date}
                onChange={set("date")}
              />
            </Field>
            <Field label="Start time *">
              <input
                type="time"
                required
                value={values.time}
                onChange={set("time")}
              />
            </Field>
            <Field label="Duration *">
              <select value={values.duration} onChange={set("duration")}>
                {[2, 3, 4, 6, 8].map((n) => (
                  <option key={n} value={n}>
                    {n} hours
                  </option>
                ))}
              </select>
            </Field>
            {values.service === "childcare" && (
              <Field label="Child’s age range *">
                <select
                  required
                  value={values.ageRange}
                  onChange={set("ageRange")}
                >
                  <option value="">Select an age range</option>
                  {["Under 2", "2–5", "6–12", "13–17"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
            )}
            {values.service === "cooking" && (
              <Field label="How many people? *">
                <input
                  type="number"
                  min="1"
                  max="12"
                  required
                  value={values.people}
                  onChange={set("people")}
                />
              </Field>
            )}
            <Field
              label="Anything we should discuss?"
              hint="A short outline only. No medical records, ID numbers or payment details."
              wide
            >
              <textarea
                maxLength={600}
                rows={3}
                value={values.notes}
                onChange={set("notes")}
                placeholder={
                  values.service === "cooking"
                    ? "Meal preferences, ingredient arrangements or dietary needs to discuss privately…"
                    : "The kind of support, accessibility preferences or routines you’d like to discuss…"
                }
              />
            </Field>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={values.recurring}
              onChange={set("recurring")}
            />
            I’d like help at the same time each week
          </label>
          {values.recurring && (
            <Field label="Weeks to request">
              <select
                value={values.recurringWeeks}
                onChange={set("recurringWeeks")}
              >
                {[2, 4, 8, 12].map((n) => (
                  <option key={n} value={n}>
                    {n} weekly visits
                  </option>
                ))}
              </select>
            </Field>
          )}
          {values.service === "childcare" && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={values.guardianAuthorization}
                onChange={set("guardianAuthorization")}
                required
              />
              I am the parent or authorized guardian. I agree to confirm care
              instructions and authorized handover contacts privately before
              childcare is arranged.
            </label>
          )}
        </>
      )}
      {step === 2 && (
        <>
          <p className="eyebrow">Step 3 of 3</p>
          <h2>Let’s talk it through.</h2>
          <p>Our team will use these details to follow up on your request.</p>
          <div className="form-grid">
            <Field label="Full name *">
              <input
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
                value={values.fullName}
                onChange={set("fullName")}
              />
            </Field>
            <Field label="Phone number *">
              <input
                autoComplete="tel"
                type="tel"
                required
                minLength={7}
                maxLength={24}
                value={values.phone}
                onChange={set("phone")}
                placeholder="+250…"
              />
            </Field>
            <Field
              label={`Email ${values.preferredContact === "email" ? "*" : "(optional)"}`}
            >
              <input
                autoComplete="email"
                type="email"
                required={values.preferredContact === "email"}
                maxLength={254}
                value={values.email}
                onChange={set("email")}
              />
            </Field>
            <Field label="Preferred contact method">
              <select
                value={values.preferredContact}
                onChange={set("preferredContact")}
              >
                <option value="phone">Phone call</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
            </Field>
          </div>
          <div className="booking-review">
            <span>
              {serviceOptions.find((x) => x.id === values.service)?.title}
            </span>
            <strong>
              {values.date} · {values.time} · {values.duration} hours
            </strong>
            <small>
              {values.neighborhood}
              {values.recurring ? " · Weekly request" : ""}
            </small>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              required
              checked={values.contactConsent}
              onChange={set("contactConsent")}
            />
            <span>
              I agree to be contacted about this request and have read the{" "}
              <a href="/policies/privacy" target="_blank" rel="noreferrer">
                privacy notice
              </a>
              .
            </span>
          </label>
          <label className="honeypot" aria-hidden="true">
            Website
            <input
              name="website"
              tabIndex="-1"
              autoComplete="off"
              value={values.website}
              onChange={set("website")}
            />
          </label>
        </>
      )}
      <div className="form-actions">
        {step > 0 && (
          <button
            type="button"
            className="button button-light"
            disabled={state.busy}
            onClick={() => setStep(step - 1)}
          >
            Back
          </button>
        )}
        <button
          type="submit"
          className="button button-primary"
          disabled={state.busy}
        >
          {state.busy
            ? "Sending your request…"
            : step < 2
              ? "Continue"
              : "Send my request"}
        </button>
      </div>
      <p className="form-bottom-note">
        <Icon name="shield" size={15} />
        Your request is reviewed by a real person. No payment required here.
      </p>
    </form>
  );
}
