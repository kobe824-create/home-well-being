const paths = {
  home: (
    <>
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
      <path d="M9 21v-8h6v8" />
    </>
  ),
  heart: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M16 3v4M8 3v4M3 11h18M8 15h2m4 0h2m-8 3h2" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M15 3a4 4 0 0 1 0 8" />
      <circle cx="9" cy="7" r="4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M8 7V3h8v4M3 12a22 22 0 0 0 18 0M12 11v4" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </>
  ),
  settings: (
    <>
      <path d="m9 3-1 3-3 1-2 3 2 2-1 4 3 2 3-1 2 3 3-1 1-3 3-1 1-4-3-2V6l-3-2-3 1Z" />
      <circle cx="11" cy="11" r="3" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="7" />
      <path d="m16 16 5 5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  shield: (
    <>
      <path d="m12 3 8 3v6c0 4-8 9-8 9s-8-5-8-9V6Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  map: (
    <>
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  chevrondown: <path d="m6 9 6 6 6-6" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 6 9 7 9-7" />
    </>
  ),
  phone: (
    <path d="m8 3 3 5-3 2a13 13 0 0 0 6 6l2-3 5 3v3a2 2 0 0 1-2 2C9 21 3 15 3 5a2 2 0 0 1 2-2Z" />
  ),
  download: (
    <>
      <path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5" />
    </>
  ),
  logout: (
    <>
      <path d="M9 4H4v16h5m0-8h12m-5-5 5 5-5 5" />
    </>
  ),
  document: (
    <>
      <path d="M14 2H5v20h14V7ZM14 2v6h5M8 12h8m-8 4h6" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18M7 16v-5m5 5V6m5 10v-7" />
    </>
  ),
  money: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M5 9h1m12 6h1" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 3C8 2 2 9 5 16s17 6 15-13ZM4 21 16 9" />
    </>
  ),
  star: (
    <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" />
  ),
  message: <path d="M21 11a9 9 0 0 1-9 9H3l2-5a9 9 0 1 1 16-4Z" />,
  alert: (
    <>
      <path d="m12 3 10 18H2ZM12 9v5m0 3v1" />
    </>
  ),
  edit: (
    <>
      <path d="m16 3 5 5L8 21H3v-5ZM13 6l5 5" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 8a8 8 0 1 0 0 8m0-13v6h-6" />
    </>
  ),
  baby: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 15s3 3 6 0M8 10h.01M16 10h.01M12 3c-3 1-2 5 0 4" />
    </>
  ),
  cooking: (
    <>
      <path d="M4 11h16l-2 10H6ZM8 3v4m4-4v4m4-4v4M2 11h20" />
    </>
  ),
  car: (
    <>
      <path d="m5 11 1.5-5h11L19 11M4 11h16l1.3 3.2a2 2 0 0 1-1.9 2.8H4.6a2 2 0 0 1-1.9-2.8ZM5 17v2m14-2v2" />
      <circle cx="7" cy="14" r=".7" />
      <circle cx="17" cy="14" r=".7" />
    </>
  ),
};
const aliases = {
  "map-pin": "map",
  location: "map",
  "arrow-right": "arrow",
  arrowright: "arrow",
  "chevron-right": "chevron",
  chevronright: "chevron",
  "chevron-down": "chevrondown",
  "log-out": "logout",
  "file-text": "document",
  filetext: "document",
  clipboard: "document",
  invoice: "document",
  receipt: "document",
  reports: "chart",
  dashboard: "home",
  x: "close",
  checkcircle: "check",
  "check-circle": "check",
  "credit-card": "money",
  wallet: "money",
  payments: "money",
  building: "home",
  households: "home",
  departments: "briefcase",
  inbox: "mail",
  "alert-circle": "alert",
  "alert-triangle": "alert",
  "refresh-cw": "refresh",
  "bar-chart": "chart",
  "bar-chart-3": "chart",
  "external-link": "arrow",
  utensils: "cooking",
  "user-round": "user",
};
export function Icon({ name = "heart", size = 20, ...props }) {
  const key = String(name).toLowerCase();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[aliases[key] || key] || paths.heart}
    </svg>
  );
}
export default Icon;
