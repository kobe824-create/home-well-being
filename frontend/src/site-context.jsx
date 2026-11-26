import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import defaults from "./site-defaults.json";
import copyMigrations from "./site-copy-migrations.json";
import { apiRequest } from "./api";

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
  const pageImages = {
    "howItWorks.image": "/images/how-it-works-flow.webp",
    "servicesPage.image": "/images/how-it-works-flow.webp",
    "about.image": "/images/about-family-meeting.webp",
    "booking.image": "/images/booking-plan.webp",
    "provider.image": "/images/provider-preparation.webp",
    "contact.image": "/images/contact-welcome.webp",
    "faq.image": "/images/faq-family.webp",
  };
  return pageImages[path] || null;
}
function altForSavedPath(path) {
  const service = path.match(/^services\.(\d+)\.(?:alt|cardAlt)$/);
  if (service) {
    const index = Number(service[1]);
    const detail = [
      "A Black home support worker speaking with an older woman in a modest Kigali home.",
      "A Black caregiver reading with a young child in a bright family home.",
      "A Black home cook preparing a meal with fresh ingredients in a Kigali kitchen.",
      "A Black cleaning professional carefully tidying a family living room.",
      "A Black home driver helping an older passenger into a car before a planned journey.",
      "A Black home security professional speaking with a homeowner at a gate.",
    ];
    if (path.endsWith(".cardAlt")) return index === 4
      ? "A Black home driver standing beside a family car in Kigali."
      : null;
    return detail[index] || null;
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
function mergeValue(base, saved, path = "") {
  if (saved === undefined || saved === null) return structuredClone(base);
  if (Array.isArray(base))
    if (!Array.isArray(saved)) return structuredClone(base);
    else if (path === "photography.items") {
      const currentPhotos = saved.filter(
        (item) => !retiredPhotoPaths.has(item?.image),
      );
      return Array.from(
        { length: Math.max(base.length, currentPhotos.length) },
        (_, index) =>
          mergeValue(
            base[index] ?? base[0],
            currentPhotos[index],
            `${path}.${index}`,
          ),
      );
    }
    else if (path === "howItWorks.steps")
      return Array.from(
        { length: Math.max(base.length, saved.length) },
        (_, index) =>
          mergeValue(
            base[index] ?? base[base.length - 1],
            saved[index],
            `${path}.${index}`,
          ),
      );
    else return structuredClone(saved);
  if (base && typeof base === "object")
    return Object.fromEntries(
      Object.entries(base).map(([key, value]) => [
        key,
        mergeValue(value, saved?.[key], path ? `${path}.${key}` : key),
      ]),
    );
  return typeof saved === typeof base ? saved : base;
}
function migratePublishedCopy(value, path = "") {
  if (Array.isArray(value))
    return value.map((item, index) =>
      migratePublishedCopy(item, `${path}.${index}`),
    );
  if (value && typeof value === "object")
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
  if (formerHomePhotos.has(value)) {
    const replacementAlt = altForSavedPath(path);
    if (replacementAlt) return replacementAlt;
  }
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
export function mergeSiteContent(base, saved) {
  if (!saved || typeof saved !== "object" || saved.version !== 2)
    return structuredClone(base);
  const result = mergeValue(base, saved);
  result.services = base.services.map((service, index) =>
    mergeValue(
      service,
      saved.services?.find((s) => s.id === service.id),
      `services.${index}`,
    ),
  );
  return migratePublishedCopy(result);
}
const SiteContentContext = createContext({
  content: defaults,
  refreshSiteContent: async () => {},
});
export function SiteContentProvider({ children }) {
  const [content, setContent] = useState(defaults);
  const [preview, setPreview] = useState(false);
  const refreshSiteContent = useCallback(async () => {
    const saved = await apiRequest("/site-content");
    let resolved = mergeSiteContent(defaults, saved);
    if (new URLSearchParams(location.search).get("preview") === "1") {
      try {
        const user = await apiRequest("/auth/session");
        if (user.role === "ADMIN") {
          const draft = JSON.parse(
            sessionStorage.getItem("wellness-site-draft") || "null",
          );
          if (draft?.version === 2) {
            resolved = mergeSiteContent(defaults, draft);
            setPreview(true);
          }
        }
      } catch {
        /* Unsaved drafts are visible only in an administrator session. */
      }
    }
    setContent(resolved);
    return resolved;
  }, []);
  useEffect(() => {
    let active = true;
    refreshSiteContent().catch(() => {});
    const update = () => active && refreshSiteContent().catch(() => {});
    window.addEventListener("wellness:content-published", update);
    return () => {
      active = false;
      window.removeEventListener("wellness:content-published", update);
    };
  }, [refreshSiteContent]);
  useEffect(() => {
    if (!content.business.favicon) return;
    let icon = document.querySelector('link[rel="icon"]');
    if (icon) icon.href = content.business.favicon;
  }, [content.business.favicon]);
  return (
    <SiteContentContext.Provider
      value={{ content, refreshSiteContent, preview }}
    >
      {children}
    </SiteContentContext.Provider>
  );
}
export const useSiteContent = () => useContext(SiteContentContext);
