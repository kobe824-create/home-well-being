import fs from "node:fs";
import { DomainError } from "./domain.js";

export const DEFAULT_SITE_CONTENT = JSON.parse(
  fs.readFileSync(new URL("./site-defaults.json", import.meta.url), "utf8"),
);
const copyMigrations = JSON.parse(
  fs.readFileSync(new URL("./site-copy-migrations.json", import.meta.url), "utf8"),
);
const retiredPhotoPaths = new Set([
  "/images/kigali-home-care.webp",
  "/images/home-driver.webp",
  "/images/rwanda-home.jpg",
]);
const formerHomePhotos = new Set([
  "/images/care-at-home.jpg",
  "/images/childcare.jpg",
  "/images/home-cooking.jpg",
  "/images/home-cleaning.jpg",
  "/images/community-care.jpg",
  "/images/home-security.jpg",
  ...retiredPhotoPaths,
]);
const serviceDetailImages = [
  "/images/service-elderly-detail.webp",
  "/images/service-childcare-detail.webp",
  "/images/service-cooking-detail.webp",
  "/images/service-cleaning-detail.webp",
  "/images/service-driving-detail.webp",
  "/images/service-security-detail.webp",
];
function imageForSavedPath(path, value) {
  if (!formerHomePhotos.has(value)) return null;
  const service = path.match(/^services\.(\d+)\.(?:image|videoPoster)$/);
  if (service) return serviceDetailImages[Number(service[1])] || null;
  return ({
    "howItWorks.image": "/images/how-it-works-flow.webp",
    "servicesPage.image": "/images/how-it-works-flow.webp",
    "about.image": "/images/about-family-meeting.webp",
    "booking.image": "/images/booking-plan.webp",
    "provider.image": "/images/provider-preparation.webp",
    "contact.image": "/images/contact-welcome.webp",
    "faq.image": "/images/faq-family.webp",
  })[path] || null;
}
function altForSavedPath(path) {
  const service = path.match(/^services\.(\d+)\.(?:alt|cardAlt)$/);
  const serviceAlts = [
    "A Black home support worker speaking with an older woman in a modest Kigali home.",
    "A Black caregiver reading with a young child in a bright family home.",
    "A Black home cook preparing a meal with fresh ingredients in a Kigali kitchen.",
    "A Black cleaning professional carefully tidying a family living room.",
    "A Black home driver helping an older passenger into a car before a planned journey.",
    "A Black home security professional speaking with a homeowner at a gate.",
  ];
  if (service) {
    const index = Number(service[1]);
    return path.endsWith(".cardAlt")
      ? index === 4
        ? "A Black home driver standing beside a family car in Kigali."
        : null
      : serviceAlts[index] || null;
  }
  return ({
    "howItWorks.imageAlt": "A family, service coordinator and employee reviewing the stages of a home visit together.",
    "servicesPage.imageAlt": "A family, service coordinator and employee reviewing the stages of a home visit together.",
    "about.imageAlt": "A service coordinator discussing home support with a family in Kigali.",
    "booking.imageAlt": "A family and home support professional reviewing a planned service.",
    "provider.imageAlt": "A home support employee preparing a visit checklist.",
    "contact.imageAlt": "A home support coordinator welcoming a family at their home.",
    "faq.imageAlt": "A family discussing practical home support with a care professional.",
  })[path] || null;
}
const immutable = new Set(["id", "slug", "icon", "version"]);
const clone = (value) => structuredClone(value);
const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const label = (path) =>
  path
    .replace(/\.(\d+)/g, (_, number) => ` item ${Number(number) + 1}`)
    .replaceAll(".", " → ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
function bad(path, message) {
  throw new DomainError(`${label(path)}: ${message}`, 400);
}
function mediaKind(path) {
  const key = path.split(".").at(-1);
  if (/^(video|videoUrl)$/i.test(key)) return "video";
  if (/image$|imageUrl$|^(logo|favicon|poster|videoPoster|photo)$/i.test(key))
    return "image";
  return null;
}
function safeMediaUrl(value, kind) {
  if (!value) return true;
  if (kind === "image" && value === "/favicon.svg") return true;
  const extension = kind === "video" ? "mp4" : "(?:jpe?g|png|webp|gif)";
  if (
    new RegExp(`^/(?:images|videos)/[A-Za-z0-9_/-]+\\.${extension}$`, "i").test(
      value,
    ) &&
    !value.includes("..")
  )
    return true;
  if (
    new RegExp(
      `^/api/public-media/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.${kind === "video" ? "mp4" : "(?:jpg|png|webp)"}$`,
    ).test(value)
  )
    return true;
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      !parsed.port &&
      (kind === "video"
        ? ["videos.pexels.com"]
        : ["images.pexels.com", "images.unsplash.com"]
      ).includes(parsed.hostname)
    );
  } catch {
    return false;
  }
}
function normalizeString(value, path) {
  if (typeof value !== "string") bad(path, "enter plain text.");
  if (
    value.length > 6000 ||
    /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  )
    bad(path, "use plain text, up to 6,000 characters, without HTML.");
  const clean = value.trim();
  const media = mediaKind(path);
  if (media && (clean.length > 1200 || !safeMediaUrl(clean, media)))
    bad(path, "upload a supported file or use an approved media address.");
  if (/\.(?:sourceUrl|licenseUrl)$/.test(path) && clean) {
    try {
      const parsed = new URL(clean);
      if (
        parsed.protocol !== "https:" ||
        parsed.username ||
        parsed.password ||
        parsed.port
      )
        bad(path, "use a secure HTTPS link.");
    } catch (error) {
      if (error instanceof DomainError) throw error;
      bad(path, "use a secure HTTPS link.");
    }
  }
  if (
    media === "image" &&
    !["business.logo", "business.favicon"].includes(path) &&
    !clean
  )
    bad(path, "choose an image.");
  if (path === "business.name" && !clean)
    bad(path, "enter your business name.");
  if (
    path === "business.email" &&
    clean &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)
  )
    bad(path, "enter a valid email address.");
  if (
    ["business.phone", "business.phoneDisplay", "business.whatsapp"].includes(
      path,
    ) &&
    clean &&
    !/^[+()\d\s-]{7,24}$/.test(clean)
  )
    bad(path, "enter a phone number with 7 to 24 characters.");
  return clean;
}
function normalizeNode(value, template, path, budget) {
  budget.count += 1;
  if (budget.count > 6000) bad(path, "this website content is too large.");
  if (typeof template === "string") return normalizeString(value, path);
  if (typeof template === "number" || typeof template === "boolean") {
    if (
      typeof value !== typeof template ||
      (typeof value === "number" && !Number.isFinite(value))
    )
      bad(path, "enter a valid value.");
    return path === "version" ? template : value;
  }
  if (Array.isArray(template)) {
    if (!Array.isArray(value) || value.length > 30)
      bad(path, "use a list of up to 30 items.");
    if (path === "services") {
      if (
        value.length !== template.length ||
        value.some(
          (item, index) =>
            item?.id !== template[index].id ||
            item?.slug !== template[index].slug,
        )
      )
        bad(path, "keep all configured service categories and their links.");
      return template.map((item, index) =>
        normalizeNode(value[index], item, `${path}.${index}`, budget),
      );
    }
    return value.map((item, index) =>
      normalizeNode(
        item,
        template[index] ?? template[0],
        `${path}.${index}`,
        budget,
      ),
    );
  }
  if (!isObject(value) || !isObject(template))
    bad(path, "check the fields in this section.");
  if (Object.keys(value).some((key) => !Object.hasOwn(template, key)))
    bad(path, "this section contains an unknown field.");
  return Object.fromEntries(
    Object.entries(template).map(([key, item]) => {
      if (!Object.hasOwn(value, key))
        bad(
          path ? `${path}.${key}` : key,
          "this field is missing. Reload the editor and try again.",
        );
      const nextPath = path ? `${path}.${key}` : key;
      if (immutable.has(key)) return [key, item];
      return [key, normalizeNode(value[key], item, nextPath, budget)];
    }),
  );
}
export function normalizeSiteContent(input) {
  if (!isObject(input) || Buffer.byteLength(JSON.stringify(input)) > 500 * 1024)
    bad("Website", "content must be smaller than 500 KB.");
  return normalizeNode(input, DEFAULT_SITE_CONTENT, "", { count: 0 });
}
function migrateLegacy(saved) {
  if (!isObject(saved) || saved.version === 2) return saved;
  const next = {};
  if (isObject(saved.hero)) {
    next.home = {};
    if (saved.hero.title !== "Good care.") next.home.title = saved.hero.title;
    if (saved.hero.emphasis !== "Closer to home.")
      next.home.emphasis = saved.hero.emphasis;
    if (
      saved.hero.lede !==
      "Thoughtful help for the people you love and the home you share. Find home assistance in Kigali, coordinated around your family."
    )
      next.home.intro = saved.hero.lede;
  }
  if (isObject(saved.approach)) {
    next.home ||= {};
    next.home.story = {};
    if (
      saved.approach.title !== "The little things." ||
      saved.approach.emphasis !== "Handled with care."
    )
      next.home.story.title = [saved.approach.title, saved.approach.emphasis]
        .filter(Boolean)
        .join("\n");
    if (
      saved.approach.body !==
      "Inviting someone into your home is personal. We take time to understand your routines, review the right support and agree every detail before a visit is confirmed."
    )
      next.home.story.body = saved.approach.body;
  }
  if (Array.isArray(saved.services))
    next.services = saved.services.map((item) => ({
      id: item.id === "home-services" ? "cooking" : item.id,
      title: item.title,
      short: item.kicker,
      description: item.text,
      image: /29372724|6916770|5691816|1556911220/.test(item.image || "")
        ? undefined
        : item.image,
      alt: item.alt,
    }));
  return next;
}
function mergeNode(template, value, path) {
  if (typeof template === "string") {
    try {
      return typeof value === "string"
        ? normalizeString(value, path)
        : template;
    } catch {
      return template;
    }
  }
  if (typeof template === "number" || typeof template === "boolean")
    return path === "version"
      ? template
      : typeof value === typeof template
        ? value
        : template;
  if (Array.isArray(template)) {
    if (!Array.isArray(value)) return clone(template);
    if (path === "services")
      return template.map((item, index) =>
        mergeNode(
          item,
          value.find((entry) => entry?.id === item.id),
          `${path}.${index}`,
        ),
      );
    if (value.length > 30) return clone(template);
    if (path === "photography.items") {
      const currentPhotos = value.filter(
        (item) => !retiredPhotoPaths.has(item?.image),
      );
      return Array.from(
        { length: Math.max(template.length, currentPhotos.length) },
        (_, index) =>
          mergeNode(
            template[index] ?? template[0],
            currentPhotos[index],
            `${path}.${index}`,
          ),
      );
    }
    if (path === "howItWorks.steps")
      return Array.from(
        { length: Math.max(template.length, value.length) },
        (_, index) =>
          mergeNode(
            template[index] ?? template[template.length - 1],
            value[index],
            `${path}.${index}`,
          ),
      );
    return value.map((item, index) =>
      mergeNode(template[index] ?? template[0], item, `${path}.${index}`),
    );
  }
  if (!isObject(template)) return clone(template);
  return Object.fromEntries(
    Object.entries(template).map(([key, item]) => [
      key,
      immutable.has(key)
        ? clone(item)
        : mergeNode(
            item,
            isObject(value) ? value[key] : undefined,
            path ? `${path}.${key}` : key,
          ),
    ]),
  );
}
export function mergeSiteContent(saved) {
  const content = mergeNode(DEFAULT_SITE_CONTENT, migrateLegacy(saved), "");
  function migratePublishedCopy(value, path = "") {
    if (Array.isArray(value))
      return value.map((item, index) =>
        migratePublishedCopy(item, `${path}.${index}`),
      );
    if (isObject(value))
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          migratePublishedCopy(item, path ? `${path}.${key}` : key),
        ]),
      );
    const migration = copyMigrations[path];
    if (typeof value === "string" && migration?.from === value)
      return migration.to;
    if (typeof value !== "string") return value;
    if (/^Illustrative scene of a home (?:care worker|driver)|^Illustrative Kigali home-care image|^An illustrative home-care moment/.test(value)) {
      const replacementAlt = altForSavedPath(path);
      if (replacementAlt) return replacementAlt;
    }
    const replacementImage = imageForSavedPath(path, value);
    if (replacementImage) return replacementImage;
    if (value === "/images/kigali-home-care.webp" || value === "/images/rwanda-home.jpg")
      return "/images/community-care.jpg";
    if (value === "/images/home-driver.webp")
      return path === "home.homeImage" ? "/images/care-at-home.jpg" : "/images/community-care.jpg";
    if (value.startsWith("Illustrative scene of a home care worker"))
      return "A Black family spending time together at home.";
    if (value.startsWith("Illustrative scene of a home driver"))
      return "An older Black man smiling at home.";
    if (value.startsWith("Illustrative Kigali home-care image created for this website"))
      return "";
    if (value.startsWith("An illustrative home-care moment"))
      return "The people and routines that make a home feel like yours.";
    return value;
  }
  return migratePublishedCopy(content);
}
let publishedContent = clone(DEFAULT_SITE_CONTENT);
let publicationRevision = 0;
export async function readSiteContent(db) {
  const revision = publicationRevision;
  const row = await db.websiteContent.findUnique({
    where: { key: "homepage" },
  });
  const content = mergeSiteContent(row?.content);
  if (revision === publicationRevision) publishedContent = content;
  return clone(content);
}
export function setPublishedContent(content) {
  publicationRevision += 1;
  publishedContent = clone(content);
}
export function publishedBusiness() {
  return clone(publishedContent.business);
}
