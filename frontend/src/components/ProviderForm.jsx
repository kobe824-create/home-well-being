import { useState } from "react";
import { apiRequest } from "../api";
import { useSiteContent } from "../site-context";
import { Field } from "./BookingForm";
import { Icon } from "./Icon";
export default function ProviderForm() {
  const { content } = useSiteContent();
  const serviceOptions = content.services.map(({ id, title }) => ({
    id,
    title,
  }));
  const copy = content.provider;
  const [state, setState] = useState({ busy: false, error: "", receipt: null });
  async function submit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = Object.fromEntries(form);
    body.references = [form.get("referenceOne"), form.get("referenceTwo")].join(
      "\n",
    );
    body.referenceConsent = form.has("referenceConsent");
    body.screeningConsent = form.has("screeningConsent");
    setState({ busy: true, error: "", receipt: null });
    try {
      const receipt = await apiRequest("/provider-applications", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setState({ busy: false, error: "", receipt });
    } catch (error) {
      setState({ busy: false, error: error.message, receipt: null });
    }
  }
  if (state.receipt)
    return (
      <div className="booking-success" role="status">
        <span className="success-symbol">
          <Icon name="check" size={30} />
        </span>
        <h2>{copy.successTitle}</h2>
        <p>{state.receipt.message}</p>
        <div className="reference-box">
          <small>Application reference</small>
          <strong>{state.receipt.reference}</strong>
        </div>
        <p>{copy.successText}</p>
        <a href="/" className="button button-primary">
          {copy.backButton}
        </a>
      </div>
    );
  return (
    <form className="application-form" onSubmit={submit}>
      <div className="form-section-heading">
        <span className="eyebrow">{copy.formEyebrow}</span>
        <h2>{copy.formTitle}</h2>
        <p>{copy.formIntro}</p>
      </div>
      {state.error && (
        <p className="notice notice-error" role="alert">
          {state.error}
        </p>
      )}
      <div className="form-grid">
        <Field label="Full name *">
          <input
            name="fullName"
            autoComplete="name"
            required
            minLength="2"
            maxLength="100"
          />
        </Field>
        <Field label="Phone number *">
          <input
            name="phone"
            type="tel"
            required
            minLength="7"
            maxLength="24"
            autoComplete="tel"
            placeholder="+250…"
          />
        </Field>
        <Field label="Email (optional)">
          <input
            name="email"
            type="email"
            maxLength="254"
            autoComplete="email"
          />
        </Field>
        <Field label="Area of residence *">
          <input
            name="neighborhood"
            required
            minLength="2"
            maxLength="100"
            placeholder="Neighbourhood, not your full address"
          />
        </Field>
        <Field label="Service category *">
          <select name="service" required>
            <option value="">Choose a category</option>
            {serviceOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Languages spoken *">
          <input
            name="languages"
            required
            minLength="2"
            maxLength="150"
            placeholder="e.g. Kinyarwanda, English"
          />
        </Field>
        <Field label="When are you available? *" wide>
          <input
            name="availability"
            required
            minLength="2"
            maxLength="250"
            placeholder="Days, hours and your preferred work arrangement"
          />
        </Field>
        <Field label="Relevant experience *" wide>
          <textarea
            name="experience"
            required
            minLength="10"
            maxLength="1000"
            rows="4"
            placeholder="Tell us about the work you have done and the skills you would bring."
          />
        </Field>
        <Field label="Training or qualifications (optional)" wide>
          <textarea
            name="training"
            maxLength="500"
            rows="2"
            placeholder="Qualification names only. Do not upload identity or certificate documents here."
          />
        </Field>
        <Field
          label="Reference 1 *"
          hint="Name, relationship and contact details. Obtain their permission first."
        >
          <textarea
            name="referenceOne"
            required
            minLength="10"
            maxLength="290"
            rows="3"
          />
        </Field>
        <Field
          label="Reference 2 *"
          hint="A second person who can speak about your work."
        >
          <textarea
            name="referenceTwo"
            required
            minLength="10"
            maxLength="290"
            rows="3"
          />
        </Field>
      </div>
      <label className="checkbox-label">
        <input type="checkbox" name="referenceConsent" required />
        My references agreed to be contacted about this application.
      </label>
      <label className="checkbox-label">
        <input type="checkbox" name="screeningConsent" required />
        <span>
          I agree to screening and to review the{" "}
          <a href="/policies/safeguarding" target="_blank" rel="noreferrer">
            safeguarding standards
          </a>{" "}
          and applicable provider terms before any assignment.
        </span>
      </label>
      <label className="honeypot" aria-hidden="true">
        Website
        <input name="website" tabIndex="-1" autoComplete="off" />
      </label>
      <button className="button button-primary" disabled={state.busy}>
        {state.busy ? copy.submittingLabel : copy.submitButton}
      </button>
      <p className="fine-print">
        Your information is available only to authorized staff reviewing your
        application.
      </p>
    </form>
  );
}
