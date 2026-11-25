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
  result.services = base.services.map((service) =>
    mergeValue(
      service,
      saved.services?.find((s) => s.id === service.id),
      `services.${service.id}`,
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
