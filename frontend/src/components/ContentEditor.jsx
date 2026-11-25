import { useEffect, useState } from "react";
import { apiRequest } from "../api";
import { useSiteContent } from "../site-context";
import defaults from "../site-defaults.json";
import "./content-editor.css";

const draftKey = "wellness-site-draft";
const protectedKeys = new Set(["id", "slug", "icon", "version"]);
const labels = {
  business: "Business & contact",
  navigation: "Navigation",
  hero: "Home introduction",
  services: "Services",
  approach: "Our approach",
  welcomeSlides: "Welcome slides",
  home: "Home page",
  servicesPage: "Services introduction",
  howItWorks: "How it works",
  about: "About page",
  contact: "Contact page",
  booking: "Booking page",
  provider: "Join our team",
  policies: "Policies",
  labels: "Buttons & shared text",
  join: "Join our team",
  faq: "Questions & answers",
  faqs: "Questions & answers",
  footer: "Footer",
  privacy: "Privacy policy",
  terms: "Terms of service",
  pages: "Website pages",
  seo: "Search & sharing",
  image: "Photo",
  video: "Video",
  poster: "Video cover image",
  logo: "Logo image",
  favicon: "Browser icon",
  short: "Short description",
  videoPoster: "Video cover image",
  logoAlt: "Logo description",
  alt: "Image description",
  phoneDisplay: "Phone shown on the website",
  phone: "Phone for call links",
  whatsapp: "WhatsApp number",
  shortName: "Short business name",
  lede: "Introduction",
  eyebrow: "Small heading",
  href: "Link destination",
  cta: "Call to action",
  media: "Photos & videos",
  imageAlt: "Image description",
  videoAlt: "Video description",
};
const labelFor = (key) =>
  labels[key] ||
  key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
const clone = (value) => JSON.parse(JSON.stringify(value));
const emptyItem = (value) =>
  Array.isArray(value)
    ? []
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.entries(value).map(([key, item]) => [
            key,
            protectedKeys.has(key) ? item : emptyItem(item),
          ]),
        )
      : typeof value === "boolean"
        ? false
        : typeof value === "number"
          ? 0
          : "";

function mediaKind(key, path, value) {
  if (/^(video|videoUrl)$/i.test(key) || (key === "src" && /video/i.test(path)))
    return "video";
  if (
    /image$|imageUrl$|^(logo|favicon|poster|videoPoster|photo)$/i.test(key) ||
    (key === "src" && /image|photo|logo/i.test(path))
  )
    return "image";
  if (/\.(mp4)(?:\?|$)/i.test(value) && /url|source/i.test(key)) return "video";
  return null;
}

function MediaField({ label, kind, value, onChange, onUploadState }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  async function upload(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    const max = (kind === "video" ? 20 : 8) * 1024 * 1024;
    const allowed =
      kind === "video"
        ? ["video/mp4"]
        : ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type) || file.size > max) {
      setError(
        kind === "video"
          ? "Choose an MP4 video up to 20 MB."
          : "Choose a JPEG, PNG or WebP image up to 8 MB.",
      );
      input.value = "";
      return;
    }
    setUploading(true);
    onUploadState(true);
    setError("");
    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () =>
          reject(
            new Error("We could not read that file. Please choose it again."),
          );
        reader.readAsDataURL(file);
      });
      const media = await apiRequest("/admin/public-media", {
        method: "POST",
        body: JSON.stringify({ mimeType: file.type, data }),
        timeout: 90_000,
      });
      onChange(media.url);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
      onUploadState(false);
      input.value = "";
    }
  }
  return (
    <div className="cms-media-field">
      <span className="cms-field-label">{label}</span>
      {value && (
        <div className="cms-media-preview">
          {kind === "video" ? (
            <video src={value} controls preload="metadata" />
          ) : (
            <img src={value} alt={`${label} preview`} loading="lazy" />
          )}
        </div>
      )}
      <label
        className={`button button-outline cms-upload ${uploading ? "is-busy" : ""}`}
      >
        {uploading
          ? "Uploading…"
          : value
            ? `Replace ${kind === "video" ? "video" : "image"}`
            : `Upload ${kind === "video" ? "video" : "image"}`}
        <input
          type="file"
          accept={
            kind === "video" ? "video/mp4" : "image/jpeg,image/png,image/webp"
          }
          onChange={upload}
          disabled={uploading}
        />
      </label>
      <p className="cms-hint">
        {kind === "video"
          ? "MP4, up to 20 MB. Use the image description field for accessible context."
          : "JPEG, PNG or WebP, up to 8 MB. Describe the photo in its image description field."}
      </p>
      <label className="cms-field">
        <span>
          Or use an approved {kind === "video" ? "video" : "image"} address
        </span>
        <input
          value={value}
          maxLength={1200}
          onChange={(event) => onChange(event.target.value)}
          placeholder={
            kind === "video"
              ? "/videos/your-video.mp4"
              : "/images/your-image.jpg"
          }
        />
      </label>
      {error && (
        <p className="cms-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function ContentFields({
  value,
  template,
  onChange,
  onUploadState,
  path = "",
  depth = 0,
}) {
  if (Array.isArray(value)) {
    const sample = template?.[0] ?? value[0];
    const fixed =
      path === "services" ||
      value.some(
        (item) => item && typeof item === "object" && Object.hasOwn(item, "id"),
      );
    return (
      <div className="cms-list">
        {value.map((item, index) => (
          <div className="cms-list-item" key={index}>
            <div className="cms-item-heading">
              <h4>
                {typeof item === "object" && item
                  ? item.title ||
                    item.question ||
                    item.name ||
                    `Item ${index + 1}`
                  : `Item ${index + 1}`}
              </h4>
              {!fixed && (
                <button
                  type="button"
                  className="cms-remove"
                  onClick={() =>
                    onChange(value.filter((_, position) => position !== index))
                  }
                >
                  Remove<span className="sr-only"> item {index + 1}</span>
                </button>
              )}
            </div>
            <ContentFields
              value={item}
              template={template?.[index] ?? sample}
              onChange={(next) =>
                onChange(
                  value.map((previous, position) =>
                    position === index ? next : previous,
                  ),
                )
              }
              path={`${path}.${index}`}
              depth={depth + 1}
              onUploadState={onUploadState}
            />
          </div>
        ))}
        {!fixed && sample !== undefined && value.length < 30 && (
          <button
            className="button button-outline cms-add"
            type="button"
            onClick={() => onChange([...value, emptyItem(sample)])}
          >
            Add item
          </button>
        )}
        {!value.length && <p className="cms-hint">No items yet.</p>}
      </div>
    );
  }
  if (value && typeof value === "object")
    return (
      <div className={`cms-fields cms-depth-${Math.min(depth, 3)}`}>
        {Object.entries(value)
          .filter(([key]) => !protectedKeys.has(key))
          .map(([key, item]) => {
            const nextPath = path ? `${path}.${key}` : key;
            const nested =
              Array.isArray(item) || (item && typeof item === "object");
            const kind =
              typeof item === "string" ? mediaKind(key, path, item) : null;
            const update = (next) => onChange({ ...value, [key]: next });
            if (kind)
              return (
                <MediaField
                  key={key}
                  label={labelFor(key)}
                  kind={kind}
                  value={item}
                  onChange={update}
                  onUploadState={onUploadState}
                />
              );
            return nested ? (
              <section className="cms-group" key={key}>
                <h3>{labelFor(key)}</h3>
                <ContentFields
                  value={item}
                  template={template?.[key]}
                  onChange={update}
                  path={nextPath}
                  depth={depth + 1}
                  onUploadState={onUploadState}
                />
              </section>
            ) : (
              <ContentFields
                key={key}
                value={item}
                template={template?.[key]}
                onChange={update}
                path={nextPath}
                depth={depth + 1}
                onUploadState={onUploadState}
              />
            );
          })}
      </div>
    );
  const key = path.split(".").at(-1);
  const label = /^\d+$/.test(key) ? "Text" : labelFor(key);
  if (typeof value === "boolean")
    return (
      <label className="cms-check">
        <input
          type="checkbox"
          checked={value}
          onChange={(event) => onChange(event.target.checked)}
        />
        {label}
      </label>
    );
  if (typeof value === "number")
    return (
      <label className="cms-field">
        <span>{label}</span>
        <input
          type="number"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </label>
    );
  const long =
    String(value).length > 140 ||
    /body|description|answer|note|lede|paragraph|boundaries|prepare|statement|message|consent|disclaimer|intro|text/i.test(
      key,
    );
  return (
    <label className={`cms-field ${long ? "cms-field-wide" : ""}`}>
      <span>{label}</span>
      {long ? (
        <textarea
          value={value ?? ""}
          rows={4}
          maxLength={6000}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          value={value ?? ""}
          maxLength={1200}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

export default function ContentEditor() {
  const { refreshSiteContent } = useSiteContent();
  const [content, setContent] = useState(null);
  const [published, setPublished] = useState(null);
  const [uploadCount, setUploadCount] = useState(0);
  const [tab, setTab] = useState("business");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(0);
  const dirty =
    content &&
    published &&
    JSON.stringify(content) !== JSON.stringify(published);
  useEffect(() => {
    apiRequest("/site-content")
      .then((saved) => {
        setContent(clone(saved));
        setPublished(clone(saved));
        setTab(
          Object.hasOwn(saved, "business")
            ? "business"
            : Object.keys(saved).find((key) => !protectedKeys.has(key)),
        );
      })
      .catch((loadError) => setError(loadError.message));
    return () => {
      sessionStorage.removeItem(draftKey);
    };
  }, []);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function edit(next) {
    setContent(next);
    setMessage("");
  }
  function previewDraft() {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(content));
      setPreview((previous) => previous + 1);
      setError("");
    } catch {
      setError(
        "The draft preview could not be opened. Please allow browser session storage and try again.",
      );
    }
  }
  function revert() {
    setContent(clone(published));
    setPreview(0);
    setMessage("Unpublished changes discarded.");
    setError("");
    sessionStorage.removeItem(draftKey);
  }
  async function publish(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await apiRequest("/admin/site-content", {
        method: "PUT",
        body: JSON.stringify({ content }),
      });
      setContent(clone(result.content));
      setPublished(clone(result.content));
      sessionStorage.removeItem(draftKey);
      setPreview(0);
      await refreshSiteContent().catch(() => {});
      window.dispatchEvent(new Event("wellness:content-published"));
      setMessage(
        "Website published. Your words, contact details, photos and videos are now live.",
      );
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  }
  if (!content)
    return (
      <div className="content-editor cms-editor">
        <p role={error ? "alert" : "status"}>
          {error || "Loading website content…"}
        </p>
        {error && (
          <button
            className="button button-outline"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        )}
      </div>
    );
  const sections = Object.keys(content).filter(
    (key) => !protectedKeys.has(key),
  );
  return (
    <form className="content-editor cms-editor" onSubmit={publish}>
      <div className="editor-top">
        <div>
          <p className="eyebrow">Your public website</p>
          <h2>Make every page your own.</h2>
          <p>
            Edit your website’s text, contact details, photos and videos.
            Preview your draft before publishing.
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="button button-outline"
        >
          View live website
        </a>
      </div>
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice notice-success" role="status">
          {message}
        </p>
      )}
      <div className="cms-toolbar">
        <span className={`cms-draft-status ${dirty ? "has-changes" : ""}`}>
          {uploadCount
            ? "Uploading your media…"
            : dirty
              ? "You have unpublished changes"
              : "Your published content is up to date"}
        </span>
        <div>
          <button
            type="button"
            className="button button-outline"
            onClick={previewDraft}
            disabled={busy || uploadCount > 0}
          >
            Preview draft
          </button>
          <button
            type="button"
            className="button button-outline"
            onClick={revert}
            disabled={busy || uploadCount > 0 || !dirty}
          >
            Discard changes
          </button>
          <button
            className="button button-primary"
            disabled={busy || uploadCount > 0 || !dirty}
          >
            {busy ? "Publishing…" : "Publish website"}
          </button>
        </div>
      </div>
      <fieldset
        className="cms-editable-fields"
        disabled={busy || uploadCount > 0}
      >
        <div className="cms-workspace">
          <nav className="cms-tabs" aria-label="Website content sections">
            {sections.map((key) => (
              <button
                key={key}
                type="button"
                className={tab === key ? "is-active" : ""}
                aria-current={tab === key ? "page" : undefined}
                onClick={() => setTab(key)}
              >
                {labelFor(key)}
              </button>
            ))}
          </nav>
          <section className="editor-section cms-active-section">
            <h3>{labelFor(tab)}</h3>
            <ContentFields
              value={content[tab]}
              template={defaults[tab]}
              onChange={(next) => edit({ ...content, [tab]: next })}
              path={tab}
              onUploadState={(active) =>
                setUploadCount((count) =>
                  Math.max(0, count + (active ? 1 : -1)),
                )
              }
            />
          </section>
        </div>
      </fieldset>
      {preview > 0 && (
        <section className="cms-site-preview">
          <div>
            <h3>Draft preview</h3>
            <p>
              This preview shows your unpublished changes. Select “Preview
              draft” again after making edits.
            </p>
            <button
              type="button"
              className="button button-outline"
              onClick={() => setPreview(0)}
            >
              Close preview
            </button>
          </div>
          <iframe
            key={preview}
            src={`/?preview=1&draft=${preview}`}
            title="Unpublished website draft"
          />
        </section>
      )}
    </form>
  );
}
