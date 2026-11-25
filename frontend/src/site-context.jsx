import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import defaults from "./site-defaults.json";
import { apiRequest } from "./api";

const legacyHomeImage = "/images/rwanda-home.jpg";
const replacementHomeCredit = defaults.photography.items.find(
  (item) => item.image === "/images/kigali-home-care.webp",
);
function mergeValue(base, saved, path = "") {
  if (saved === undefined || saved === null) return structuredClone(base);
  if (Array.isArray(base))
    if (!Array.isArray(saved)) return structuredClone(base);
    else if (path === "photography.items")
      return Array.from(
        { length: Math.max(base.length, saved.length) },
        (_, index) =>
          mergeValue(
            base[index] ?? base[0],
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
function migrateLegacyHomeImages(value, path = "") {
  if (Array.isArray(value))
    return value.map((item, index) =>
      path === "photography.items" &&
      item?.image === legacyHomeImage &&
      replacementHomeCredit
        ? structuredClone(replacementHomeCredit)
        : migrateLegacyHomeImages(item, `${path}.${index}`),
    );
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        migrateLegacyHomeImages(item, path ? `${path}.${key}` : key),
      ]),
    );
  if (value === legacyHomeImage) return "/images/kigali-home-care.webp";
  if (
    value ===
    "Homes with stone walls and corrugated roofs in Kora village, Nyabihu, Rwanda, with children and sheep beside the road."
  )
    return "Illustrative scene of a home care worker greeting an older woman outside a modest Kigali home. The people and property are not real Wellness customers.";
  if (value === "A view of homes in Nyabihu, Rwanda.")
    return "An illustrative home-care moment in a modest Kigali setting.";
  if (typeof value === "string" && value.includes("Noemi Ciucci / Wikimedia"))
    return "Illustrative Kigali home-care image created for this website; it does not depict a real property or identified person.";
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
  return migrateLegacyHomeImages(result);
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
