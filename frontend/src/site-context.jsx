import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import defaults from "./site-defaults.json";
import { apiRequest } from "./api";

function mergeValue(base, saved) {
  if (saved === undefined || saved === null) return structuredClone(base);
  if (Array.isArray(base))
    return Array.isArray(saved)
      ? structuredClone(saved)
      : structuredClone(base);
  if (base && typeof base === "object")
    return Object.fromEntries(
      Object.entries(base).map(([key, value]) => [
        key,
        mergeValue(value, saved?.[key]),
      ]),
    );
  return typeof saved === typeof base ? saved : base;
}
export function mergeSiteContent(base, saved) {
  if (!saved || typeof saved !== "object" || saved.version !== 2)
    return structuredClone(base);
  const result = mergeValue(base, saved);
  result.services = base.services.map((service) =>
    mergeValue(
      service,
      saved.services?.find((s) => s.id === service.id),
    ),
  );
  return result;
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
