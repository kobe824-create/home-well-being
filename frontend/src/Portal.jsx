import { useEffect, useRef, useState } from "react";
import { apiRequest, downloadCsv, acquireLocation } from "./api.js";
import { Logo } from "./PublicSite.jsx";
import "./portal.css";

const SERVICES = {
  elderly: "Elderly home assistance",
  childcare: "Babysitting & childcare",
  cooking: "Home cooking",
  cleaning: "Home cleaning",
  driving: "Home drivers",
  security: "Home security check",
};
const STATUSES = [
  "New request",
  "Under review",
  "Awaiting customer confirmation",
  "Confirmed",
  "Provider assigned",
  "In progress",
  "Completed",
  "Declined",
  "Cancelled",
  "Rescheduled",
  "No-show",
  "Complaint open",
  "Delayed",
  "Unable to Complete",
];
const CLOSED = ["Completed", "Declined", "Cancelled"];
const initialData = {
  requests: [],
  applications: [],
  employees: [],
  households: [],
  departments: [],
  notifications: [],
  invoices: [],
  payroll: [],
  expenses: [],
  feedback: [],
  leaveRequests: [],
  documents: [],
  serviceChanges: [],
  summary: {},
  settings: {},
};
const money = (n) =>
  `RWF ${Number(n || 0).toLocaleString("en-RW", { maximumFractionDigits: 0 })}`;
const person = (p) => p?.fullName || p?.full_name || p?.name || "—";
const dateText = (value, long = false) =>
  value
    ? new Date(
        String(value).length === 10 ? `${value}T12:00:00` : value,
      ).toLocaleDateString(
        "en-GB",
        long
          ? { weekday: "short", day: "numeric", month: "long" }
          : { day: "numeric", month: "short", year: "numeric" },
      )
    : "To be agreed";
const timeText = (value) =>
  String(value || "").includes("T")
    ? new Date(value).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : String(value || "").slice(0, 5);
const requestDate = (r) =>
  r.requested_date_text ||
  String(r.requestedDate || r.requested_date || "").slice(0, 10);
const initials = (name) =>
  String(name || "W H")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
const dayToday = () => new Date().toLocaleDateString("en-CA");
const val = (f, key) => String(f.get(key) || "").trim();
const secret = (f, key) => String(f.get(key) || "");
function I({ name, size = 20 }) {
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 11h18M8 15h2m4 0h2m-8 3h2" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 12h8m-8 4h6" />
      </>
    ),
    home: (
      <>
        <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5" />
      </>
    ),
    layers: (
      <>
        <path d="m12 3 10 5-10 5L2 8zM2 12l10 5 10-5M2 16l10 5 10-5" />
      </>
    ),
    wallet: (
      <>
        <rect x="3" y="5" width="18" height="15" rx="2" />
        <path d="M17 11h4v5h-4a2.5 2.5 0 0 1 0-5M3 7V5a2 2 0 0 1 2-2h13" />
      </>
    ),
    chart: (
      <>
        <path d="M4 3v18h18M9 16v-5m5 5V6m5 10v-8" />
      </>
    ),
    chat: (
      <>
        <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6A8.4 8.4 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8z" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </>
    ),
    settings: (
      <>
        <path d="m10 3-1 3-3 1-3-1-1 4 3 2v3l-2 2 3 3 3-1 3 1 2 2 4-2-1-3 1-3 3-1-1-4-3-1-2-3z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    logout: (
      <>
        <path d="M9 21H4V3h5m6 5 4 4-4 4m-7-4h12" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0 1 13-3l2 2M4 17l2 2a8 8 0 0 0 13-3" />
      </>
    ),
  };
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
    >
      {paths[name] || paths.file}
    </svg>
  );
}
function Badge({ children }) {
  const t = String(children || "Pending");
  return (
    <span
      className={`pc-badge ${["Completed", "Paid", "Approved", "Accepted", "Active", "Resolved", "Confirmed", "Cleared", "Verified", "Configured"].includes(t) ? "positive" : ["Cancelled", "Declined", "Rejected", "Not approved", "Overdue", "Inactive"].includes(t) ? "negative" : ["In progress", "Provider assigned"].includes(t) ? "blue" : ""}`}
    >
      {t}
    </span>
  );
}
function Button({
  children,
  secondary,
  danger,
  small,
  className = "",
  ...props
}) {
  return (
    <button
      type="button"
      className={`pc-btn ${secondary ? "secondary" : ""} ${danger ? "danger" : ""} ${small ? "small" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
function Field({ label, children, hint, wide }) {
  return (
    <label className={`pc-field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Empty({
  title = "Nothing here just yet",
  children,
  icon = "file",
  action,
}) {
  return (
    <div className="pc-empty">
      <span className="pc-empty-icon">
        <I name={icon} size={26} />
      </span>
      <h3>{title}</h3>
      <p>{children || "Records will appear here when there is an update."}</p>
      {action}
    </div>
  );
}
function Panel({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`pc-panel ${className}`}>
      <div className="pc-panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function DataTable({ columns, rows, empty, onRow }) {
  return rows.length ? (
    <div className="pc-table-scroll">
      <table className="pc-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.id || i}
              className={onRow ? "clickable" : ""}
              tabIndex={onRow ? 0 : undefined}
              onClick={onRow ? () => onRow(r) : undefined}
              onKeyDown={
                onRow
                  ? (event) => {
                      if (
                        event.target === event.currentTarget &&
                        ["Enter", " "].includes(event.key)
                      ) {
                        event.preventDefault();
                        onRow(r);
                      }
                    }
                  : undefined
              }
            >
              {columns.map((c) => (
                <td key={c.key}>{c.render ? c.render(r) : r[c.key] || "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty title={empty || "No records to show"} />
  );
}
function useDialogFocus(active, elementRef, onClose) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!active) return undefined;
    const previous = document.activeElement;
    const frame = requestAnimationFrame(() => elementRef.current?.focus());
    const keydown = (event) => {
      const element = elementRef.current;
      if (
        !element ||
        Array.from(document.querySelectorAll("[data-pc-dialog]")).at(-1) !==
          element
      )
        return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current?.();
      }
      if (event.key !== "Tab") return;
      const fields = [
        ...element.querySelectorAll(
          'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
        ),
      ].filter((n) => n.offsetParent !== null);
      if (!fields.length) {
        event.preventDefault();
        element.focus();
        return;
      }
      const first = fields[0],
        last = fields.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === element)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === element)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", keydown);
      if (previous?.isConnected) previous.focus();
    };
  }, [active, elementRef]);
}
function Modal({ title, subtitle, children, onClose, wide }) {
  const dialogRef = useRef(null);
  useDialogFocus(true, dialogRef, onClose);
  return (
    <div
      className="pc-modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        ref={dialogRef}
        data-pc-dialog
        tabIndex={-1}
        className={`pc-modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="pc-modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="pc-icon-btn"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <I name="close" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function Submit({ busy, children = "Save changes" }) {
  return (
    <div className="pc-form-footer">
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : children}
        <I name="arrow" size={17} />
      </Button>
    </div>
  );
}

export default function Portal({
  user,
  onLogout,
  onUserChange,
  contentEditor,
}) {
  const admin = user.role === "ADMIN";
  const operations = user.role === "OPERATIONS";
  const manager = admin || operations;
  const client = user.role === "CLIENT";
  const worker = ["EMPLOYEE", "PROVIDER"].includes(user.role);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState(
    user.mustChangePassword ? "settings" : "overview",
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(null);
  const [mobile, setMobile] = useState(false);
  const [date, setDate] = useState("");
  const [documentFile, setDocumentFile] = useState(null);
  const [reportSummary, setReportSummary] = useState(null);
  const [reportRange, setReportRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [reportBusy, setReportBusy] = useState(false);
  const reportData = reportSummary || data.summary;
  const drawerRef = useRef(null);
  useDialogFocus(Boolean(selectedId), drawerRef, () => setSelectedId(null));
  useEffect(() => {
    if (!modal && !selectedId) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [Boolean(modal || selectedId)]);
  async function load() {
    const next = await apiRequest("/workspace");
    setData({ ...initialData, ...next });
  }
  useEffect(() => {
    let active = true;
    apiRequest("/workspace")
      .then((next) => {
        if (active) setData({ ...initialData, ...next });
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);
  async function action(
    key,
    path,
    method = "POST",
    body = {},
    success = "Changes saved.",
    close = false,
  ) {
    setBusy(key);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest(path, {
        method,
        body: JSON.stringify(body),
      });
      await load();
      setNotice(success);
      if (close) setModal(null);
      return result;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setBusy("");
    }
  }
  const run = (...args) => action(...args).catch(() => {});
  const navigate = (next) => {
    setSection(next);
    setSearch("");
    setFilter("All");
    setMobile(false);
  };
  const reqs = data.requests || [];
  const selected = reqs.find((r) => r.id === selectedId);
  const pending = reqs.filter((r) => r.status === "New request");
  const visible = reqs.filter(
    (r) =>
      (filter === "All" || r.status === filter) &&
      `${r.reference} ${person(r)} ${r.service} ${r.neighborhood} ${r.employee_name || ""} ${r.provider_name || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const upcoming = [...reqs]
    .filter(
      (r) =>
        [
          "Confirmed",
          "Rescheduled",
          "Provider assigned",
          "In progress",
          "Delayed",
        ].includes(r.status) && requestDate(r) >= dayToday(),
    )
    .sort((a, b) =>
      `${requestDate(a)}${a.start_time || a.startTime}`.localeCompare(
        `${requestDate(b)}${b.start_time || b.startTime}`,
      ),
    );
  const completed = reqs.filter((r) => r.status === "Completed");
  const invoices = (data.invoices || []).map((i) => ({
    ...i,
    request: reqs.find((r) => r.id === i.requestId),
  }));
  const outstanding = invoices.reduce(
    (n, x) =>
      n +
      Math.max(
        0,
        Number(x.totalRwf || x.total_rwf || 0) -
          Number(x.netPaidRwf ?? x.paidAmountRwf ?? x.paidRwf ?? 0),
      ),
    0,
  );
  const unread = data.notifications.filter((n) => !n.readAt && !n.read);
  const today = dayToday();
  const firstName = person(user).split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const todayVisits = [...reqs]
    .filter((r) => requestDate(r) === today &&
      ["Confirmed", "Rescheduled", "Provider assigned", "In progress", "Delayed", "Completed"].includes(r.status))
    .sort((a, b) => String(a.start_time || a.startTime || "").localeCompare(String(b.start_time || b.startTime || "")));
  const waitingAssignments = reqs.filter((r) =>
    !CLOSED.includes(r.status) &&
    (user.role === "PROVIDER" ? r.provider_response : r.employee_response) === "Pending");
  const priorityOrder = ["Complaint open", "Unable to Complete", "Delayed", "New request", "Awaiting customer confirmation", "Under review"];
  const priorityRequests = [...reqs]
    .filter((r) => manager
      ? ["Complaint open", "Unable to Complete", "Delayed", "New request", "Under review"].includes(r.status)
      : client
        ? ["Awaiting customer confirmation", "Complaint open", "Delayed", "Unable to Complete"].includes(r.status)
        : waitingAssignments.some((assignment) => assignment.id === r.id) || ["Delayed", "Unable to Complete"].includes(r.status))
    .sort((a, b) => {
      const first = priorityOrder.indexOf(a.status);
      const second = priorityOrder.indexOf(b.status);
      return (first === -1 ? priorityOrder.length : first) - (second === -1 ? priorityOrder.length : second);
    });
  const openToday = () => {
    navigate("schedule");
    setDate(today);
  };
  const dailyTasks = [
    manager
      ? {
          title: "Give new requests a first look",
          detail: pending.length ? "Review the care needed and agree the next step." : "You’re up to date with new care requests.",
          value: pending.length,
          icon: "file",
          onClick: () => { navigate("requests"); setFilter("New request"); },
        }
      : client
        ? {
            title: "See your upcoming care",
            detail: upcoming.length ? "Check visit times, arrangements and who is coming." : "Your confirmed care arrangements will appear here.",
            value: upcoming.length,
            icon: "calendar",
            onClick: () => { navigate("schedule"); setDate(""); },
          }
        : {
            title: "Respond to your assignments",
            detail: waitingAssignments.length ? "Open each visit to accept or decline the assignment." : "You’re up to date with your assignment responses.",
            value: waitingAssignments.length,
            icon: "file",
            onClick: () => waitingAssignments[0] ? setSelectedId(waitingAssignments[0].id) : navigate("requests"),
          },
    client
      ? {
          title: "Keep an eye on your invoices",
          detail: outstanding > 0 ? "Your current balance across issued invoices." : "There’s no outstanding balance on your invoices.",
          value: money(outstanding),
          icon: "wallet",
          onClick: () => navigate("invoices"),
        }
      : {
          title: "Get ready for today’s visits",
          detail: todayVisits.length ? "Check the times, households and visit details." : "There are no confirmed visits on today’s schedule.",
          value: todayVisits.length,
          icon: "calendar",
          onClick: openToday,
        },
    {
      title: "Catch up with your updates",
      detail: unread.length ? "New messages and changes are waiting in your inbox." : "You’ve read all your latest notifications.",
      value: unread.length,
      icon: "bell",
      onClick: () => navigate("inbox"),
    },
  ];
  const nav = [
    ["overview", "grid", "Overview"],
    [
      "requests",
      "file",
      manager ? "Service requests" : client ? "My services" : "My assignments",
    ],
    ["schedule", "calendar", "Schedule"],
    ...(manager ? [["attendance", "pin", "Attendance"]] : []),
    ...(!worker ? [["households", "home", "Households"]] : []),
    ...(admin ? [["clients", "home", "Clients & families"]] : []),
    ...(manager ? [["team", "users", "People & screening"]] : []),
    ...(admin ? [["departments", "layers", "Departments"]] : []),
    ...(admin || client ? [["invoices", "wallet", "Invoices & payments"]] : []),
    ...(admin || worker
      ? [["earnings", "chart", admin ? "Payroll & expenses" : "My earnings"]]
      : []),
    [
      "feedback",
      "chat",
      client || manager ? "Feedback & concerns" : "Visit reports",
    ],
    ["changes", "clock", worker ? "Time off" : "Changes & time off"],
    ...(!operations ? [["documents", "file", "Documents"]] : []),
    ...(admin ? [["reports", "chart", "Reports"]] : []),
    ["inbox", "bell", "Inbox"],
    ...(admin && contentEditor
      ? [["website", "layers", "Website content"]]
      : []),
    ["settings", "settings", "My account"],
  ];
  const currentTitle = nav.find((n) => n[0] === section)?.[2] || "Overview";
  const requestColumns = [
    {
      key: "reference",
      title: "Service / reference",
      render: (r) => (
        <>
          <strong>{SERVICES[r.service] || r.service}</strong>
          <small>{r.reference}</small>
        </>
      ),
    },
    {
      key: "customer",
      title: client ? "Household" : "Customer",
      render: (r) => (
        <>
          <span>{person(r)}</span>
          <small>{r.neighborhood}</small>
        </>
      ),
    },
    {
      key: "date",
      title: "Date & time",
      render: (r) => (
        <>
          <span>{dateText(requestDate(r))}</span>
          <small>
            {timeText(r.start_time || r.startTime)} ·{" "}
            {r.duration_hours || r.durationHours} hours
          </small>
        </>
      ),
    },
    {
      key: "worker",
      title: "Assigned to",
      render: (r) =>
        r.employee_name ||
        r.provider_name || (
          <span className="pc-muted">Awaiting assignment</span>
        ),
    },
    {
      key: "status",
      title: "Status",
      render: (r) => <Badge>{r.status}</Badge>,
    },
    {
      key: "open",
      title: "",
      render: (r) => (
        <button
          className="pc-icon-btn"
          aria-label={`Open ${r.reference}`}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedId(r.id);
          }}
        >
          <I name="arrow" size={18} />
        </button>
      ),
    },
  ];
  async function attendance(r, stage) {
    setBusy(`attendance-${r.id}`);
    setError("");
    setNotice("Getting a fresh location. Stay still for a moment.");
    try {
      const location = await acquireLocation();
      await apiRequest(`/employee/assignments/${r.id}/attendance/${stage}`, {
        method: "POST",
        body: JSON.stringify(location),
      });
      await load();
      setNotice(
        stage === "check-in"
          ? "Arrival recorded. Have a good visit."
          : "Departure recorded. Your visit is complete.",
      );
    } catch (e) {
      setError(e.message);
      setNotice("");
    } finally {
      setBusy("");
    }
  }
  const formAction = (event, fn) => {
    event.preventDefault();
    fn(new FormData(event.currentTarget));
  };
  async function uploadDocument(f) {
    if (!documentFile) {
      setError("Choose a document to upload.");
      return;
    }
    setBusy("upload");
    setError("");
    try {
      if (documentFile.size > 5 * 1024 * 1024)
        throw new Error("Choose a document smaller than 5 MB.");
      const contentBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(documentFile);
      });
      await action(
        "upload",
        "/documents",
        "POST",
        {
          name: documentFile.name,
          mimeType: documentFile.type || "application/octet-stream",
          contentBase64,
          category: val(f, "category"),
          ownerUserId: val(f, "ownerUserId") || undefined,
          householdId: val(f, "householdId") || undefined,
        },
        "Document uploaded for review.",
        true,
      );
      setDocumentFile(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }
  async function checkout(invoice) {
    setBusy(invoice.id);
    setError("");
    try {
      const result = await apiRequest(`/invoices/${invoice.id}/checkout`, {
        method: "POST",
        body: "{}",
      });
      if (!result.url)
        throw new Error(
          "The payment provider did not return a checkout link. Contact the operations team.",
        );
      const url = new URL(result.url);
      if (url.protocol !== "https:")
        throw new Error("The payment link could not be verified.");
      window.location.assign(url.href);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }
  function exportRows() {
    downloadCsv("wellness-service-requests.csv", [
      [
        "Reference",
        "Customer",
        "Service",
        "Area",
        "Date",
        "Time",
        "Hours",
        "Status",
        "Assigned employee",
        "Assigned provider",
        "Quote RWF",
      ],
      ...visible.map((r) => [
        r.reference,
        person(r),
        SERVICES[r.service],
        r.neighborhood,
        requestDate(r),
        timeText(r.start_time || r.startTime),
        r.duration_hours || r.durationHours,
        r.status,
        r.employee_name,
        r.provider_name,
        r.quoted_amount_rwf || r.quotedAmountRwf,
      ]),
    ]);
  }
  return (
    <div className="whc-portal">
      <aside className={`pc-sidebar ${mobile ? "open" : ""}`}>
        <div className="pc-sidebar-head">
          <div className="pc-brand">
            <Logo light />
            <button
              className="pc-icon-btn pc-sidebar-close"
              aria-label="Close navigation"
              onClick={() => setMobile(false)}
            >
              <I name="close" size={19} />
            </button>
          </div>
          <div className="pc-workspace-switch">
            <span className="pc-workspace-icon">
              <I name="home" size={19} />
            </span>
            <span>
              {manager
                ? "Operations workspace"
                : client
                  ? "Your home care"
                  : "Team workspace"}
              <small>{user.role.toLowerCase()} account</small>
            </span>
          </div>
        </div>
        <nav aria-label="Workspace navigation">
          {nav
            .filter((n) => !user.mustChangePassword || n[0] === "settings")
            .map(([key, icon, label], index) => (
              <div key={key}>
                {index === 0 && <span className="pc-nav-label">WORKSPACE</span>}
                {key === "feedback" && (
                  <span className="pc-nav-label pc-nav-label-gap">
                    COMMUNICATION
                  </span>
                )}
                <button
                  className={section === key ? "active" : ""}
                  aria-current={section === key ? "page" : undefined}
                  onClick={() => navigate(key)}
                >
                  <I name={icon} size={19} />
                  <span>{label}</span>
                  {key === "inbox" && unread.length > 0 && (
                    <b>{unread.length}</b>
                  )}
                  {key === "requests" && manager && pending.length > 0 && (
                    <b>{pending.length}</b>
                  )}
                </button>
              </div>
            ))}
        </nav>
        <div className="pc-sidebar-bottom">
          <a href="/">
            View public website <I name="arrow" size={15} />
          </a>
          <button onClick={onLogout}>
            <span className="pc-avatar">{initials(person(user))}</span>
            <span>
              {person(user)}
              <small>Sign out</small>
            </span>
            <I name="logout" size={17} />
          </button>
        </div>
      </aside>
      {mobile && (
        <button
          className="pc-mobile-shade"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="pc-main">
        <header className="pc-topbar">
          <div>
            <button
              className="pc-icon-btn pc-mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <I name="menu" />
            </button>
            <span className="pc-topbar-crumb">
              Workspace <span>/</span> <strong>{currentTitle}</strong>
            </span>
          </div>
          <div className="pc-topbar-right">
            <span className="pc-current-date">
              {dateText(dayToday(), true)}
            </span>
            <button
              className="pc-icon-btn pc-notification-btn"
              aria-label="Open inbox"
              onClick={() => navigate("inbox")}
            >
              <I name="bell" />
              {unread.length > 0 && <i />}
            </button>
            <span className="pc-avatar pc-avatar-light">
              {initials(person(user))}
            </span>
          </div>
        </header>
        <main className="pc-content" id="workspace-content">
          <div className={`pc-page-heading ${section === "overview" ? "pc-overview-heading" : ""}`}>
            <div>
              <p className="pc-eyebrow">
                {section === "overview"
                  ? new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
                  : manager ? "YOUR OPERATIONS WORKSPACE" : client ? "YOUR HOME CARE" : "YOUR TEAM WORKSPACE"}
              </p>
              <h1>
                {section === "overview"
                  ? `${greeting}, ${firstName}.`
                  : currentTitle}
              </h1>
              <p>
                {section === "overview"
                  ? manager
                    ? "Let’s help good care happen today."
                    : client
                      ? "Your care arrangements and updates, together in one place."
                      : "Your upcoming visits, team updates and the details you need."
                  : "Keep the details clear, connected and up to date."}
              </p>
            </div>
            <div className="pc-heading-actions">
              <button
                className="pc-icon-btn pc-refresh"
                aria-label="Refresh workspace"
                disabled={loading || Boolean(busy)}
                onClick={() => {
                  setLoading(true);
                  load()
                    .catch((e) => setError(e.message))
                    .finally(() => setLoading(false));
                }}
              >
                <I name="refresh" />
              </button>
              {client && (
                <Button onClick={() => setModal({ kind: "request" })}>
                  <I name="plus" size={17} />
                  Request a service
                </Button>
              )}
              {admin && section === "clients" && (
                <Button onClick={() => setModal({ kind: "client" })}>
                  <I name="plus" size={17} />
                  Add a client
                </Button>
              )}
              {admin && section === "team" && (
                <Button onClick={() => setModal({ kind: "employee" })}>
                  <I name="plus" size={17} />
                  Add team member
                </Button>
              )}
              {section === "households" && (
                <Button onClick={() => setModal({ kind: "household" })}>
                  <I name="plus" size={17} />
                  Add a household
                </Button>
              )}
              {admin && section === "departments" && (
                <Button onClick={() => setModal({ kind: "department" })}>
                  <I name="plus" size={17} />
                  Add department
                </Button>
              )}
              {section === "documents" && (
                <Button onClick={() => setModal({ kind: "document" })}>
                  <I name="plus" size={17} />
                  Upload document
                </Button>
              )}
            </div>
          </div>
          {error && (
            <div className="pc-alert error" role="alert">
              <span>{error}</span>
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <I name="close" size={17} />
              </button>
            </div>
          )}
          {notice && (
            <div className="pc-alert success" role="status">
              <I name="check" size={18} />
              <span>{notice}</span>
              <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
                <I name="close" size={17} />
              </button>
            </div>
          )}
          {user.mustChangePassword && (
            <div className="pc-alert warning">
              <span>
                Please change your temporary password before continuing.
              </span>
              <Button small secondary onClick={() => navigate("settings")}>
                Change password
              </Button>
            </div>
          )}
          {loading ? (
            <div className="pc-loading">
              <span />
              Opening your workspace…
            </div>
          ) : (
            <>
              {section === "overview" && (
                <div className="pc-daily-workspace">
                  <section className="pc-dayboard" aria-labelledby="daily-plan-title">
                    <div className="pc-dayboard-main">
                      <div className="pc-dayboard-intro">
                        <span className="pc-section-kicker">YOUR DAILY PLAN</span>
                        <h2 id="daily-plan-title">
                          {manager ? "Small details. Better days." : client ? "A little help, close to home." : "Your care makes a difference."}
                        </h2>
                        <p>
                          {manager
                            ? "A first look at the requests, visits and conversations that need you."
                            : client
                              ? "Make room for what matters. We’ll help you keep your care arrangements together."
                              : "Take a moment to check your visits and the people you’ll be supporting."}
                        </p>
                      </div>
                      <div className="pc-daily-tasks">
                        {dailyTasks.map((task) => (
                          <button key={task.title} className="pc-daily-task" onClick={task.onClick}>
                            <span className="pc-task-symbol"><I name={task.icon} size={20} /></span>
                            <span className="pc-task-copy">
                              <strong>{task.title}</strong>
                              <span>{task.detail}</span>
                            </span>
                            <span className={`pc-task-value ${String(task.value).startsWith("RWF") ? "is-money" : ""}`}>{task.value}</span>
                            <I name="arrow" size={18} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <figure className="pc-care-photo">
                      <img
                        src={client ? "/images/kigali-home-care.webp" : "/images/community-care.jpg"}
                        alt={client ? "Illustrative home-care scene in a modest Kigali home." : "Black parents and children sharing time on a sofa."}
                      />
                      <figcaption>
                        <span>EVERYDAY LIFE, AT THE HEART OF OUR WORK</span>
                        <p>For the everyday.<br /><em>And the people in it.</em></p>
                        <a className="pc-photo-credit" href="/photo-credits">{client ? "Rwanda photo: Noemi Ciucci · CC BY-SA 4.0" : "Photo credits"}</a>
                      </figcaption>
                    </figure>
                  </section>

                  <div className="pc-desk-layout">
                    <section className="pc-desk-section pc-priority-section" aria-labelledby="priority-title">
                      <div className="pc-desk-heading">
                        <div>
                          <span className="pc-section-kicker">THE NEXT USEFUL STEP</span>
                          <h2 id="priority-title">{manager ? "Needs your attention" : client ? "Let’s keep things moving" : "Before your next visit"}</h2>
                        </div>
                        <button className="pc-text-btn" onClick={() => navigate("requests")}>
                          All {worker ? "assignments" : "services"} <I name="arrow" size={16} />
                        </button>
                      </div>
                      {priorityRequests.length ? (
                        <div className="pc-priority-list">
                          {priorityRequests.slice(0, 4).map((r) => (
                            <button className="pc-priority-item" key={r.id} onClick={() => setSelectedId(r.id)}>
                              <span className={`pc-priority-marker ${r.status === "Complaint open" || r.status === "Delayed" ? "urgent" : ""}`} />
                              <span className="pc-priority-copy">
                                <span className="pc-priority-meta">{r.reference} · {r.neighborhood || "Location to be agreed"}</span>
                                <strong>{SERVICES[r.service] || r.service}</strong>
                                <span>{client ? dateText(requestDate(r)) : person(r)}{!client && ` · ${dateText(requestDate(r))}`}</span>
                                <Badge>{r.status}</Badge>
                              </span>
                              <span className="pc-priority-open">Open <I name="arrow" size={16} /></span>
                            </button>
                          ))}
                          {priorityRequests.length > 4 && (
                            <button className="pc-priority-more" onClick={() => navigate("requests")}>
                              View all {priorityRequests.length} requests needing attention <I name="arrow" size={16} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="pc-desk-empty">
                          <span className="pc-clear-mark"><I name="check" size={23} /></span>
                          <h3>You’re up to date here.</h3>
                          <p>{manager ? "New requests and care concerns will appear here when they need a decision." : "When a service needs your response, you’ll find it here."}</p>
                          <button className="pc-text-btn" onClick={() => navigate("requests")}>View your {worker ? "assignments" : "services"} <I name="arrow" size={16} /></button>
                        </div>
                      )}
                    </section>

                    <section className="pc-desk-section pc-today-section" aria-labelledby="today-title">
                      <div className="pc-desk-heading">
                        <div>
                          <span className="pc-section-kicker">{new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</span>
                          <h2 id="today-title">Today’s visits <span className="pc-visit-count">{todayVisits.length}</span></h2>
                        </div>
                        <button className="pc-text-btn" onClick={() => { navigate("schedule"); setDate(""); }}>
                          Schedule <I name="arrow" size={16} />
                        </button>
                      </div>
                      {todayVisits.length ? (
                        <div className="pc-today-agenda">
                          {todayVisits.slice(0, 4).map((r) => (
                            <button key={r.id} className="pc-today-visit" onClick={() => setSelectedId(r.id)}>
                              <time>{timeText(r.start_time || r.startTime) || "Time TBC"}<span>{r.duration_hours || r.durationHours ? `${r.duration_hours || r.durationHours} hours` : "To be agreed"}</span></time>
                              <span className="pc-agenda-track" />
                              <span className="pc-today-visit-copy">
                                <strong>{SERVICES[r.service] || r.service}</strong>
                                <span>{client ? r.employee_name || r.provider_name || "Care professional to be assigned" : person(r)}</span>
                                <span>{r.neighborhood || "Location to be agreed"}</span>
                                <Badge>{r.status}</Badge>
                              </span>
                              <I name="arrow" size={16} />
                            </button>
                          ))}
                          {todayVisits.length > 4 && <button className="pc-text-btn pc-today-more" onClick={openToday}>See all {todayVisits.length} visits today <I name="arrow" size={16} /></button>}
                        </div>
                      ) : (
                        <div className="pc-today-empty">
                          <I name="calendar" size={30} />
                          <h3>A little room in the day.</h3>
                          <p>There are no confirmed visits scheduled for today.</p>
                        </div>
                      )}
                      {!todayVisits.length && upcoming[0] && (
                        <button className="pc-next-visit" onClick={() => setSelectedId(upcoming[0].id)}>
                          <span>YOUR NEXT VISIT</span>
                          <strong>{dateText(requestDate(upcoming[0]), true)}</strong>
                          <span>{SERVICES[upcoming[0].service] || upcoming[0].service} · {timeText(upcoming[0].start_time || upcoming[0].startTime) || "Time to be agreed"}</span>
                          <I name="arrow" size={17} />
                        </button>
                      )}
                      <div className="pc-care-reminder">
                        <I name={worker ? "pin" : "home"} size={22} />
                        <div>
                          <strong>{worker ? "A good visit starts with the details." : "Help us make every visit feel right."}</strong>
                          <p>{worker ? "Check the household notes before you travel, then record your arrival at the home." : "Keep your contact details and household care notes up to date."}</p>
                          <button className="pc-text-btn" onClick={() => navigate(worker ? "requests" : "households")}>{worker ? "Open assignments" : "Check household details"} <I name="arrow" size={15} /></button>
                        </div>
                      </div>
                    </section>
                  </div>

                  <section className="pc-updates-section" aria-labelledby="updates-title">
                    <div className="pc-desk-heading">
                      <div>
                        <span className="pc-section-kicker">STAY CONNECTED</span>
                        <h2 id="updates-title">A note from your workspace</h2>
                      </div>
                      <button className="pc-text-btn" onClick={() => navigate("inbox")}>Open inbox <I name="arrow" size={16} /></button>
                    </div>
                    {data.notifications.length ? (
                      <div className="pc-workspace-updates">
                        {data.notifications.slice(0, 3).map((n) => (
                          <button key={n.id} className="pc-workspace-update" onClick={() => navigate("inbox")}>
                            <span className={`pc-update-dot ${n.readAt || n.read ? "read" : ""}`} />
                            <span><strong>{n.title}</strong><span>{n.message || n.body}</span></span>
                            <time>{dateText(n.createdAt || n.created_at)}</time>
                            <I name="arrow" size={16} />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="pc-updates-empty">You’re all caught up. New messages and service updates will appear here.</p>
                    )}
                  </section>
                </div>
              )}
              {section === "requests" && (
                <Panel
                  title={
                    manager
                      ? "All service requests"
                      : client
                        ? "Your service requests"
                        : "Assigned visits"
                  }
                  subtitle={`${visible.length} ${visible.length === 1 ? "record" : "records"}`}
                  action={
                    <Button secondary small onClick={exportRows}>
                      <I name="download" size={16} />
                      Export CSV
                    </Button>
                  }
                >
                  <div className="pc-toolbar">
                    <label className="pc-search">
                      <I name="search" size={18} />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name, reference or service…"
                        aria-label="Search requests"
                      />
                    </label>
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      aria-label="Filter request status"
                    >
                      <option>All</option>
                      {STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <DataTable
                    columns={requestColumns}
                    rows={visible}
                    onRow={(r) => setSelectedId(r.id)}
                    empty="No services match this view"
                  />
                </Panel>
              )}
              {section === "schedule" && (
                <Panel
                  title="Visit schedule"
                  subtitle="A clear view of what’s ahead."
                  action={
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      aria-label="Filter schedule by date"
                    />
                  }
                >
                  {(() => {
                    const items = [...reqs]
                      .filter(
                        (r) =>
                          !["Cancelled", "Declined"].includes(r.status) &&
                          (!date || requestDate(r) === date),
                      )
                      .sort((a, b) =>
                        `${requestDate(a)}${a.start_time || a.startTime}`.localeCompare(
                          `${requestDate(b)}${b.start_time || b.startTime}`,
                        ),
                      );
                    const groups = Object.groupBy
                      ? Object.groupBy(items, requestDate)
                      : items.reduce(
                          (a, r) => ({
                            ...a,
                            [requestDate(r)]: [...(a[requestDate(r)] || []), r],
                          }),
                          {},
                        );
                    return items.length ? (
                      <div className="pc-schedule">
                        {Object.entries(groups).map(([d, rows]) => (
                          <section className="pc-schedule-day" key={d}>
                            <header>
                              <strong>{dateText(d, true)}</strong>
                              <span>
                                {rows.length}{" "}
                                {rows.length === 1 ? "visit" : "visits"}
                              </span>
                            </header>
                            {rows.map((r) => (
                              <button
                                className="pc-schedule-visit"
                                onClick={() => setSelectedId(r.id)}
                                key={r.id}
                              >
                                <time>
                                  {timeText(r.start_time || r.startTime)}
                                  <small>
                                    {r.duration_hours || r.durationHours} hours
                                  </small>
                                </time>
                                <span
                                  className={`pc-service-marker ${r.service}`}
                                />
                                <div>
                                  <strong>{SERVICES[r.service]}</strong>
                                  <span>
                                    {person(r)} · {r.neighborhood}
                                  </span>
                                </div>
                                <span className="pc-schedule-worker">
                                  {r.employee_name ||
                                    r.provider_name ||
                                    "Assignment pending"}
                                </span>
                                <Badge>{r.status}</Badge>
                                <I name="arrow" size={17} />
                              </button>
                            ))}
                          </section>
                        ))}
                      </div>
                    ) : (
                      <Empty title="No visits on this schedule" icon="calendar">
                        Choose another date, or open your services to arrange a
                        visit.
                      </Empty>
                    );
                  })()}
                </Panel>
              )}
              {section === "attendance" && manager && (
                <Panel
                  title="Arrival & departure records"
                  subtitle="Location is collected at attendance events. Review discrepancies in their service context."
                >
                  <DataTable
                    rows={reqs.flatMap((r) =>
                      (r.attendance || []).map((a) => ({ ...a, request: r })),
                    )}
                    empty="No attendance recorded yet"
                    columns={[
                      {
                        key: "visit",
                        title: "Visit",
                        render: (a) => (
                          <>
                            <strong>{a.request.reference}</strong>
                            <small>{SERVICES[a.request.service]}</small>
                          </>
                        ),
                      },
                      {
                        key: "employee",
                        title: "Care professional",
                        render: (a) =>
                          a.employee_name ||
                          a.request.employee_name ||
                          a.request.provider_name,
                      },
                      {
                        key: "arrival",
                        title: "Arrival",
                        render: (a) => (
                          <>
                            {dateText(a.check_in_at || a.checkInAt)}
                            <small>
                              {timeText(a.check_in_at || a.checkInAt)}
                            </small>
                          </>
                        ),
                      },
                      {
                        key: "departure",
                        title: "Departure",
                        render: (a) =>
                          a.check_out_at || a.checkOutAt ? (
                            timeText(a.check_out_at || a.checkOutAt)
                          ) : (
                            <span className="pc-muted">Still checked in</span>
                          ),
                      },
                      {
                        key: "verified",
                        title: "Location verification",
                        render: (a) => (
                          <>
                            <Badge>
                              {a.verificationStatus ||
                                a.verification_status ||
                                "Recorded"}
                            </Badge>
                            <small className="pc-clamp">
                              {a.discrepancyNote || a.discrepancy_note || ""}
                            </small>
                          </>
                        ),
                      },
                      {
                        key: "actions",
                        title: "",
                        render: (a) => (
                          <div className="pc-inline-actions">
                            <Button
                              small
                              secondary
                              onClick={() => setSelectedId(a.request.id)}
                            >
                              View visit
                            </Button>
                            {admin &&
                              (a.verificationStatus ||
                                a.verification_status) === "Flagged" && (
                                <button
                                  className="pc-text-btn"
                                  onClick={() =>
                                    setModal({
                                      kind: "attendanceReview",
                                      item: a,
                                    })
                                  }
                                >
                                  Review
                                </button>
                              )}
                          </div>
                        ),
                      },
                    ]}
                  />
                </Panel>
              )}
              {section === "households" && (
                <div className="pc-card-grid">
                  {data.households.length ? (
                    data.households.map((h) => (
                      <article className="pc-household-card" key={h.id}>
                        <div className="pc-card-icon">
                          <I name="home" size={24} />
                        </div>
                        <div className="pc-household-top">
                          <h2>{h.name}</h2>
                          <Button
                            small
                            secondary
                            onClick={() =>
                              setModal({ kind: "household", item: h })
                            }
                          >
                            Edit details
                          </Button>
                        </div>
                        <p>
                          <I name="pin" size={16} />
                          {h.address}
                          <br />
                          {h.neighborhood}
                        </p>
                        <div className="pc-card-divider" />
                        <h3>Household contacts</h3>
                        {h.contacts?.length ? (
                          h.contacts.map((c, i) => (
                            <div className="pc-contact" key={c.id || i}>
                              <span className="pc-avatar pc-avatar-light">
                                {initials(c.name)}
                              </span>
                              <div>
                                <strong>{c.name}</strong>
                                <small>
                                  {c.relationship} · {c.phone}
                                </small>
                                {c.isEmergency && (
                                  <span className="pc-mini-label">
                                    Emergency contact
                                  </span>
                                )}
                                {c.isAuthorized && (
                                  <span className="pc-mini-label">
                                    Authorized contact
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="pc-muted">No contacts added.</p>
                        )}
                        <small className="pc-muted">
                          {h.latitude != null
                            ? `Location saved · ${h.geofenceMeters || 200} m attendance area`
                            : "Add a location for arrival verification."}
                        </small>
                      </article>
                    ))
                  ) : (
                    <Panel title="A home at the heart of the plan">
                      <Empty
                        icon="home"
                        title="Add your first household"
                        action={
                          <Button
                            onClick={() => setModal({ kind: "household" })}
                          >
                            Add a household
                            <I name="plus" size={16} />
                          </Button>
                        }
                      >
                        Save an address and the people authorized to coordinate
                        care.
                      </Empty>
                    </Panel>
                  )}
                </div>
              )}
              {section === "clients" && admin && (
                <Panel
                  title="Client accounts"
                  subtitle="The families behind your service requests, with their care history."
                >
                  <DataTable
                    rows={data.clients || []}
                    empty="No client accounts yet"
                    columns={[
                      {
                        key: "name",
                        title: "Client",
                        render: (c) => (
                          <div className="pc-person-cell">
                            <span className="pc-avatar pc-avatar-light">
                              {initials(person(c))}
                            </span>
                            <div>
                              <strong>{person(c)}</strong>
                              <small>{c.email}</small>
                            </div>
                          </div>
                        ),
                      },
                      { key: "phone", title: "Contact" },
                      {
                        key: "services",
                        title: "Service history",
                        render: (c) => (
                          <>
                            {
                              reqs.filter(
                                (r) =>
                                  (r.client_user_id || r.clientUserId) === c.id,
                              ).length
                            }{" "}
                            requests
                            <small>
                              {
                                reqs.filter(
                                  (r) =>
                                    (r.client_user_id || r.clientUserId) ===
                                      c.id && r.status === "Completed",
                                ).length
                              }{" "}
                              completed
                            </small>
                          </>
                        ),
                      },
                      {
                        key: "homes",
                        title: "Households",
                        render: (c) =>
                          data.households
                            .filter((h) => h.clientId === c.id)
                            .map((h) => h.name)
                            .join(", ") || "Not added",
                      },
                      {
                        key: "status",
                        title: "Access",
                        render: (c) => (
                          <Badge>{c.isActive ? "Active" : "Inactive"}</Badge>
                        ),
                      },
                      {
                        key: "actions",
                        title: "",
                        render: (c) => (
                          <div className="pc-inline-actions">
                            <Button
                              small
                              secondary
                              onClick={() =>
                                setModal({ kind: "client", item: c })
                              }
                            >
                              Manage account
                            </Button>
                            <button
                              className="pc-text-btn"
                              onClick={() => {
                                setSection("requests");
                                setSearch(person(c));
                                setFilter("All");
                              }}
                            >
                              View services
                              <I name="arrow" size={15} />
                            </button>
                          </div>
                        ),
                      },
                    ]}
                  />
                </Panel>
              )}
              {section === "team" && (
                <>
                  <Panel
                    title="Your team"
                    subtitle="Account access, availability and screening records."
                  >
                    <DataTable
                      rows={data.employees}
                      empty="No team members yet"
                      columns={[
                        {
                          key: "fullName",
                          title: "Team member",
                          render: (e) => (
                            <div className="pc-person-cell">
                              <span className="pc-avatar pc-avatar-light">
                                {initials(person(e))}
                              </span>
                              <div>
                                <strong>{person(e)}</strong>
                                <small>{e.email}</small>
                              </div>
                            </div>
                          ),
                        },
                        {
                          key: "role",
                          title: "Role",
                          render: (e) => (
                            <span>
                              {e.role || "EMPLOYEE"}
                              <small>
                                {e.staffProfile?.jobTitle ||
                                  e.profile?.jobTitle}
                              </small>
                            </span>
                          ),
                        },
                        {
                          key: "screening",
                          title: "Screening",
                          render: (e) => (
                            <Badge>
                              {e.staffProfile?.screeningStatus ||
                                e.profile?.screeningStatus ||
                                "Pending"}
                            </Badge>
                          ),
                        },
                        {
                          key: "availability",
                          title: "Access",
                          render: (e) => (
                            <Badge>{e.isActive ? "Active" : "Inactive"}</Badge>
                          ),
                        },
                        {
                          key: "actions",
                          title: "",
                          render: (e) => (
                            <div className="pc-inline-actions">
                              {e.role !== "OPERATIONS" && (
                                <Button
                                  secondary
                                  small
                                  onClick={() =>
                                    setModal({ kind: "staff", item: e })
                                  }
                                >
                                  Manage profile
                                </Button>
                              )}
                              {admin && (
                                <button
                                  className="pc-text-btn"
                                  disabled={Boolean(busy)}
                                  onClick={() =>
                                    run(
                                      e.id,
                                      `/admin/employees/${e.id}/status`,
                                      "PATCH",
                                      { isActive: !e.isActive },
                                      "Team access updated.",
                                    )
                                  }
                                >
                                  {e.isActive
                                    ? "Pause access"
                                    : "Restore access"}
                                </button>
                              )}
                            </div>
                          ),
                        },
                      ]}
                    />
                  </Panel>
                  <Panel
                    title="Provider applications"
                    subtitle="Review experience and consent before approving an application."
                  >
                    <DataTable
                      rows={data.applications}
                      empty="No provider applications to review"
                      columns={[
                        {
                          key: "name",
                          title: "Applicant",
                          render: (a) => (
                            <>
                              <strong>{person(a)}</strong>
                              <small>
                                {a.email} · {a.phone}
                              </small>
                            </>
                          ),
                        },
                        {
                          key: "service",
                          title: "Service",
                          render: (a) => SERVICES[a.service],
                        },
                        {
                          key: "experience",
                          title: "Experience",
                          render: (a) => (
                            <span className="pc-clamp">{a.experience}</span>
                          ),
                        },
                        {
                          key: "status",
                          title: "Status",
                          render: (a) => <Badge>{a.status}</Badge>,
                        },
                        {
                          key: "action",
                          title: "",
                          render: (a) => (
                            <Button
                              small
                              secondary
                              onClick={() =>
                                setModal({ kind: "application", item: a })
                              }
                            >
                              Review application
                            </Button>
                          ),
                        },
                      ]}
                    />
                  </Panel>
                </>
              )}
              {section === "departments" && (
                <div className="pc-card-grid">
                  {data.departments.length ? (
                    data.departments.map((d) => (
                      <article className="pc-department-card" key={d.id}>
                        <span className="pc-card-icon">
                          <I name="layers" size={24} />
                        </span>
                        <Badge>{SERVICES[d.service] || d.service}</Badge>
                        <h2>{d.name}</h2>
                        <p>{d.description}</p>
                        <div className="pc-department-rate">
                          <strong>{money(d.hourlyRateRwf)}</strong>
                          <span>
                            per hour · {d.minimumHours || 2} hour minimum
                          </span>
                        </div>
                        <p className="pc-muted">
                          {(Array.isArray(d.qualificationRules)
                            ? d.qualificationRules.join(" · ")
                            : d.qualificationRules) ||
                            "Screening and qualifications are reviewed before assignment."}
                        </p>
                        <Button
                          secondary
                          small
                          onClick={() =>
                            setModal({ kind: "department", item: d })
                          }
                        >
                          Manage department
                          <I name="arrow" size={16} />
                        </Button>
                      </article>
                    ))
                  ) : (
                    <Panel title="Care departments">
                      <Empty
                        icon="layers"
                        title="Organize your service team"
                        action={
                          <Button
                            onClick={() => setModal({ kind: "department" })}
                          >
                            Create department
                          </Button>
                        }
                      >
                        Set rates, qualifications and service expectations for
                        each department.
                      </Empty>
                    </Panel>
                  )}
                </div>
              )}
              {section === "invoices" && (
                <>
                  <div className="pc-finance-strip">
                    <div>
                      <span>Outstanding balance</span>
                      <strong>{money(outstanding)}</strong>
                    </div>
                    <p>
                      Payments and refunds appear against the invoice they
                      belong to.
                    </p>
                    {admin && (
                      <Button onClick={() => setModal({ kind: "invoice" })}>
                        <I name="plus" size={16} />
                        Create invoice
                      </Button>
                    )}
                  </div>
                  <Panel
                    title="Invoices"
                    subtitle="Open an invoice to view its items, payment history and receipt."
                  >
                    <DataTable
                      rows={invoices}
                      empty="No invoices issued yet"
                      columns={[
                        {
                          key: "number",
                          title: "Invoice",
                          render: (i) => (
                            <>
                              <strong>{i.number || i.reference}</strong>
                              <small>
                                {i.request?.reference ||
                                  i.serviceRequest?.reference}
                              </small>
                            </>
                          ),
                        },
                        {
                          key: "date",
                          title: "Issued / due",
                          render: (i) => (
                            <>
                              {dateText(i.createdAt)}
                              <small>Due {dateText(i.dueDate)}</small>
                            </>
                          ),
                        },
                        {
                          key: "totalRwf",
                          title: "Total",
                          render: (i) => (
                            <strong>{money(i.totalRwf || i.total_rwf)}</strong>
                          ),
                        },
                        {
                          key: "paid",
                          title: "Payments received",
                          render: (i) =>
                            money(i.netPaidRwf ?? i.paidAmountRwf ?? i.paidRwf),
                        },
                        {
                          key: "status",
                          title: "Status",
                          render: (i) => <Badge>{i.status}</Badge>,
                        },
                        {
                          key: "open",
                          title: "",
                          render: (i) => (
                            <Button
                              small
                              secondary
                              onClick={() =>
                                setModal({ kind: "invoiceView", item: i })
                              }
                            >
                              View invoice
                              <I name="arrow" size={15} />
                            </Button>
                          ),
                        },
                      ]}
                    />
                  </Panel>
                </>
              )}
              {section === "earnings" && (
                <>
                  <Panel
                    title={admin ? "Payroll records" : "Your earnings"}
                    subtitle="Calculated from service records and the pay terms on the staff profile."
                    action={
                      admin && (
                        <Button
                          small
                          onClick={() => setModal({ kind: "payroll" })}
                        >
                          <I name="plus" size={16} />
                          Calculate payroll
                        </Button>
                      )
                    }
                  >
                    <DataTable
                      rows={data.payroll}
                      empty="No payroll records yet"
                      columns={[
                        {
                          key: "person",
                          title: "Team member",
                          render: (p) =>
                            person(
                              p.employee ||
                                p.user ||
                                data.employees.find(
                                  (e) => e.id === p.employeeId,
                                ) ||
                                (p.employeeId === user.id ? user : null),
                            ),
                        },
                        {
                          key: "period",
                          title: "Pay period",
                          render: (p) => (
                            <>
                              {dateText(p.periodStart)} –{" "}
                              {dateText(p.periodEnd)}
                            </>
                          ),
                        },
                        {
                          key: "gross",
                          title: "Gross",
                          render: (p) => money(p.grossAmountRwf || p.grossRwf),
                        },
                        {
                          key: "deductions",
                          title: "Deductions",
                          render: (p) => money(p.deductionsRwf),
                        },
                        {
                          key: "net",
                          title: "Net pay",
                          render: (p) => (
                            <strong>{money(p.netAmountRwf || p.netRwf)}</strong>
                          ),
                        },
                        {
                          key: "status",
                          title: "Status",
                          render: (p) => <Badge>{p.status}</Badge>,
                        },
                        {
                          key: "actions",
                          title: "",
                          render: (p) =>
                            admin &&
                            p.status !== "Paid" && (
                              <Button
                                small
                                secondary
                                disabled={Boolean(busy)}
                                onClick={() =>
                                  p.status === "Approved"
                                    ? setModal({
                                        kind: "payrollPayment",
                                        item: p,
                                      })
                                    : run(
                                        p.id,
                                        `/payroll/${p.id}`,
                                        "PATCH",
                                        { status: "Approved" },
                                        "Payroll approved.",
                                      )
                                }
                              >
                                {p.status === "Approved"
                                  ? "Record payment"
                                  : "Approve"}
                              </Button>
                            ),
                        },
                      ]}
                    />
                  </Panel>
                  {admin && (
                    <Panel
                      title="Operating expenses"
                      subtitle="The costs behind your care operations."
                      action={
                        <Button
                          small
                          secondary
                          onClick={() => setModal({ kind: "expense" })}
                        >
                          <I name="plus" size={16} />
                          Record expense
                        </Button>
                      }
                    >
                      <DataTable
                        rows={data.expenses}
                        empty="No operating expenses recorded"
                        columns={[
                          {
                            key: "date",
                            title: "Date",
                            render: (e) => dateText(e.date),
                          },
                          { key: "category", title: "Category" },
                          { key: "description", title: "Description" },
                          {
                            key: "amount",
                            title: "Amount",
                            render: (e) => money(e.amountRwf),
                          },
                          { key: "reference", title: "Reference" },
                        ]}
                      />
                    </Panel>
                  )}
                </>
              )}
              {section === "feedback" && (
                <Panel
                  title={
                    worker
                      ? "Visit reports"
                      : client
                        ? "Your feedback & concerns"
                        : "Customer feedback & concerns"
                  }
                  subtitle={
                    worker
                      ? "Share care notes, incidents and supply needs from the visit details."
                      : "Every message is connected to a service and its follow-up."
                  }
                >
                  {worker ? (
                    <>
                      <div className="pc-panel-note">
                        Open an accepted assignment to send a service note,
                        report an incident or request supplies.
                      </div>
                      <DataTable
                        rows={reqs.flatMap((r) =>
                          (r.reports || []).map((x) => ({ ...x, request: r })),
                        )}
                        empty="No visit reports yet"
                        columns={[
                          {
                            key: "request",
                            title: "Visit",
                            render: (r) => r.request.reference,
                          },
                          {
                            key: "kind",
                            title: "Type",
                            render: (r) => r.kind?.replaceAll("-", " "),
                          },
                          { key: "message", title: "Report" },
                          {
                            key: "date",
                            title: "Sent",
                            render: (r) =>
                              dateText(r.createdAt || r.created_at),
                          },
                        ]}
                      />
                    </>
                  ) : (
                    <DataTable
                      rows={data.feedback}
                      empty={
                        client
                          ? "Thank you for taking care with your feedback"
                          : "No customer messages to review"
                      }
                      columns={[
                        {
                          key: "request",
                          title: "Visit",
                          render: (f) =>
                            f.request?.reference ||
                            f.requestReference ||
                            f.reference ||
                            reqs.find((r) => r.id === f.requestId)?.reference ||
                            "Service feedback",
                        },
                        {
                          key: "kind",
                          title: "Type",
                          render: (f) => (
                            <>
                              {f.kind}
                              <small>
                                {f.rating ? `${f.rating} / 5 rating` : ""}
                              </small>
                            </>
                          ),
                        },
                        {
                          key: "message",
                          title: "Message",
                          render: (f) => (
                            <span className="pc-clamp">{f.message}</span>
                          ),
                        },
                        {
                          key: "status",
                          title: "Status",
                          render: (f) => <Badge>{f.status}</Badge>,
                        },
                        {
                          key: "action",
                          title: "",
                          render: (f) =>
                            manager ? (
                              <Button
                                small
                                secondary
                                onClick={() =>
                                  setModal({ kind: "feedbackReview", item: f })
                                }
                              >
                                Review & respond
                              </Button>
                            ) : (
                              <span className="pc-muted">
                                {f.resolution ||
                                  "Your message is with the team."}
                              </span>
                            ),
                        },
                      ]}
                    />
                  )}{" "}
                  {client && (
                    <div className="pc-panel-note">
                      To rate a completed service or report a concern, open the
                      service in{" "}
                      <button
                        className="pc-text-btn"
                        onClick={() => navigate("requests")}
                      >
                        My services
                      </button>
                      .
                    </div>
                  )}
                </Panel>
              )}
              {section === "changes" && (
                <>
                  {!worker && (
                    <Panel
                      title="Service change requests"
                      subtitle="Changes take effect after the operations team reviews them."
                    >
                      <DataTable
                        rows={data.serviceChanges}
                        empty="No service changes requested"
                        columns={[
                          {
                            key: "service",
                            title: "Service",
                            render: (c) =>
                              c.request?.reference ||
                              reqs.find((r) => r.id === c.requestId)
                                ?.reference ||
                              c.requestId,
                          },
                          { key: "kind", title: "Change" },
                          { key: "reason", title: "Reason" },
                          {
                            key: "date",
                            title: "Proposed date",
                            render: (c) =>
                              c.requestedDate
                                ? `${dateText(c.requestedDate)} · ${timeText(c.startTime)}`
                                : "—",
                          },
                          {
                            key: "status",
                            title: "Status",
                            render: (c) => <Badge>{c.status}</Badge>,
                          },
                          {
                            key: "action",
                            title: "",
                            render: (c) =>
                              manager &&
                              c.status === "Pending" && (
                                <Button
                                  small
                                  secondary
                                  onClick={() =>
                                    setModal({ kind: "changeReview", item: c })
                                  }
                                >
                                  Review
                                </Button>
                              ),
                          },
                        ]}
                      />
                    </Panel>
                  )}
                  {!client && (
                    <Panel
                      title={worker ? "Your time off" : "Team time off"}
                      subtitle="Let the team plan around your availability."
                      action={
                        worker && (
                          <Button
                            small
                            onClick={() => setModal({ kind: "leave" })}
                          >
                            <I name="plus" size={16} />
                            Request time off
                          </Button>
                        )
                      }
                    >
                      <DataTable
                        rows={data.leaveRequests}
                        empty="No time-off requests"
                        columns={[
                          {
                            key: "employee",
                            title: "Team member",
                            render: (l) =>
                              l.employee_name || person(l.employee),
                          },
                          {
                            key: "kind",
                            title: "Request",
                            render: (l) => (
                              <>
                                {l.kind || "Time off"}
                                {l.startTime && l.endTime && (
                                  <small>
                                    {timeText(l.startTime)} –{" "}
                                    {timeText(l.endTime)}
                                  </small>
                                )}
                              </>
                            ),
                          },
                          {
                            key: "dates",
                            title: "Dates",
                            render: (l) => (
                              <>
                                {dateText(l.startDate || l.start_date)} –{" "}
                                {dateText(l.endDate || l.end_date)}
                              </>
                            ),
                          },
                          {
                            key: "reason",
                            title: "Reason / team response",
                            render: (l) => (
                              <>
                                {l.reason}
                                {(l.reviewerNote || l.reviewer_note) && (
                                  <small>
                                    {l.reviewerNote || l.reviewer_note}
                                  </small>
                                )}
                              </>
                            ),
                          },
                          {
                            key: "status",
                            title: "Status",
                            render: (l) => <Badge>{l.status}</Badge>,
                          },
                          {
                            key: "actions",
                            title: "",
                            render: (l) =>
                              manager &&
                              l.status === "Pending" && (
                                <div className="pc-inline-actions">
                                  <Button
                                    secondary
                                    small
                                    disabled={Boolean(busy)}
                                    onClick={() =>
                                      setModal({
                                        kind: "leaveReview",
                                        item: l,
                                        decision: "Approved",
                                      })
                                    }
                                  >
                                    Approve
                                  </Button>
                                  <button
                                    className="pc-text-btn"
                                    disabled={Boolean(busy)}
                                    onClick={() =>
                                      setModal({
                                        kind: "leaveReview",
                                        item: l,
                                        decision: "Declined",
                                      })
                                    }
                                  >
                                    Decline
                                  </button>
                                </div>
                              ),
                          },
                        ]}
                      />
                    </Panel>
                  )}
                </>
              )}
              {section === "documents" && (
                <Panel
                  title="Documents"
                  subtitle="Private records, shared with the people who need them."
                >
                  <DataTable
                    rows={data.documents}
                    empty="No documents uploaded"
                    columns={[
                      {
                        key: "name",
                        title: "Document",
                        render: (d) => (
                          <>
                            <strong>{d.name}</strong>
                            <small>
                              {d.category} ·{" "}
                              {Math.ceil(
                                Number(d.sizeBytes || d.size || 0) / 1024,
                              )}{" "}
                              KB
                            </small>
                          </>
                        ),
                      },
                      {
                        key: "owner",
                        title: "Belongs to",
                        render: (d) =>
                          d.owner?.fullName ||
                          d.ownerName ||
                          data.employees.find((e) => e.id === d.ownerUserId)
                            ?.fullName ||
                          data.clients?.find((c) => c.id === d.ownerUserId)
                            ?.fullName ||
                          data.households.find((h) => h.id === d.householdId)
                            ?.name ||
                          (d.ownerUserId === user.id
                            ? "Your account"
                            : "Household document"),
                      },
                      {
                        key: "status",
                        title: "Review",
                        render: (d) => <Badge>{d.status || "Pending"}</Badge>,
                      },
                      {
                        key: "date",
                        title: "Uploaded",
                        render: (d) => dateText(d.createdAt),
                      },
                      {
                        key: "action",
                        title: "",
                        render: (d) => (
                          <div className="pc-inline-actions">
                            <a
                              className="pc-text-btn"
                              href={`${import.meta.env.VITE_API_URL || "/api"}/documents/${d.id}/download`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Download
                              <I name="download" size={15} />
                            </a>
                            {admin && d.status !== "Approved" && (
                              <Button
                                small
                                secondary
                                disabled={Boolean(busy)}
                                onClick={() =>
                                  setModal({ kind: "documentReview", item: d })
                                }
                              >
                                Review
                              </Button>
                            )}
                          </div>
                        ),
                      },
                    ]}
                  />
                </Panel>
              )}
              {section === "reports" && (
                <>
                  <Panel
                    title="Financial reporting period"
                    subtitle="Filter the financial totals below. CSV downloads contain all recorded rows."
                  >
                    <form
                      className="pc-report-filters"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setReportBusy(true);
                        setError("");
                        try {
                          const params = new URLSearchParams(
                            Object.entries(reportRange).filter(([, v]) => v),
                          );
                          setReportSummary(
                            await apiRequest(`/reports/summary?${params}`),
                          );
                        } catch (error) {
                          setError(error.message);
                        } finally {
                          setReportBusy(false);
                        }
                      }}
                    >
                      <Field label="From">
                        <input
                          type="date"
                          value={reportRange.startDate}
                          onChange={(e) =>
                            setReportRange({
                              ...reportRange,
                              startDate: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Through">
                        <input
                          type="date"
                          min={reportRange.startDate || undefined}
                          value={reportRange.endDate}
                          onChange={(e) =>
                            setReportRange({
                              ...reportRange,
                              endDate: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Button
                        type="submit"
                        secondary
                        small
                        disabled={reportBusy}
                      >
                        {reportBusy ? "Loading…" : "Apply period"}
                      </Button>
                      <button
                        type="button"
                        className="pc-text-btn"
                        onClick={() => {
                          setReportRange({ startDate: "", endDate: "" });
                          setReportSummary(null);
                        }}
                      >
                        All dates
                      </button>
                    </form>
                  </Panel>
                  <div className="pc-stats">
                    {[
                      ["Payments received", reportData.revenueRwf],
                      ["Outstanding invoices", reportData.outstandingRwf],
                      ["Payroll paid", reportData.payrollPaidRwf],
                      ["Operating expenses", reportData.expenseRwf],
                    ].map(([label, value]) => (
                      <section className="pc-stat" key={label}>
                        <div>
                          <span>{label}</span>
                          <I name="wallet" size={18} />
                        </div>
                        <strong className="pc-stat-money">
                          {money(value)}
                        </strong>
                        <p>Across recorded transactions</p>
                      </section>
                    ))}
                  </div>
                  <div className="pc-report-grid">
                    {[
                      [
                        "requests",
                        "Service requests",
                        "Visit volume, status, service and assignment records.",
                      ],
                      [
                        "payments",
                        "Payments & refunds",
                        "Invoice payments and refund transactions.",
                      ],
                      [
                        "payroll",
                        "Payroll",
                        "Team pay calculations and payment records.",
                      ],
                      [
                        "expenses",
                        "Operating expenses",
                        "Recorded costs by date and category.",
                      ],
                      [
                        "providers",
                        "Provider applications",
                        "Screening status and approved provider information.",
                      ],
                      [
                        "complaints",
                        "Feedback & complaints",
                        "Customer cases and their follow-up status.",
                      ],
                      [
                        "attendance",
                        "Attendance",
                        "Arrival, departure and GPS verification records.",
                      ],
                    ].map(([key, title, description]) => (
                      <Panel key={key} title={title} subtitle={description}>
                        <div className="pc-report-export">
                          <span className="pc-card-icon">
                            <I
                              name={key === "requests" ? "file" : "chart"}
                              size={26}
                            />
                          </span>
                          <a
                            className="pc-btn secondary"
                            href={`${import.meta.env.VITE_API_URL || "/api"}/reports/export?type=${key}`}
                            download
                          >
                            Download CSV
                            <I name="download" size={17} />
                          </a>
                        </div>
                      </Panel>
                    ))}
                  </div>
                  <Panel
                    title="Monthly financial statement"
                    subtitle="Payments received, operating expenses and paid payroll by month."
                  >
                    <DataTable
                      rows={reportData.monthly || []}
                      empty="No financial transactions in this period"
                      columns={[
                        { key: "month", title: "Month" },
                        {
                          key: "revenueRwf",
                          title: "Payments received",
                          render: (r) => money(r.revenueRwf),
                        },
                        {
                          key: "expenseRwf",
                          title: "Expenses",
                          render: (r) => money(r.expenseRwf),
                        },
                        {
                          key: "payrollRwf",
                          title: "Payroll paid",
                          render: (r) => money(r.payrollRwf),
                        },
                        {
                          key: "net",
                          title: "Net cash",
                          render: (r) => (
                            <strong>
                              {money(
                                Number(r.revenueRwf) -
                                  Number(r.expenseRwf) -
                                  Number(r.payrollRwf),
                              )}
                            </strong>
                          ),
                        },
                      ]}
                    />
                  </Panel>
                  <Panel
                    title="Service overview"
                    subtitle="Totals calculated from your current records."
                  >
                    <div className="pc-summary-bars">
                      {Object.entries(SERVICES).map(([key, label]) => {
                        const all = reqs.filter(
                          (r) => r.service === key,
                        ).length;
                        return (
                          <div key={key}>
                            <span>{label}</span>
                            <div>
                              <i
                                style={{
                                  width: `${reqs.length ? (all / reqs.length) * 100 : 0}%`,
                                }}
                              />
                            </div>
                            <strong>{all}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                </>
              )}
              {section === "inbox" && (
                <>
                  <Panel
                    title="Your inbox"
                    subtitle={`${unread.length} unread ${unread.length === 1 ? "update" : "updates"}`}
                    action={
                      manager && (
                        <Button
                          small
                          secondary
                          onClick={() => setModal({ kind: "communication" })}
                        >
                          Compose message
                          <I name="plus" size={15} />
                        </Button>
                      )
                    }
                  >
                    {data.notifications.length ? (
                      <div className="pc-inbox">
                        {data.notifications.map((n) => (
                          <article
                            className={!n.readAt && !n.read ? "unread" : ""}
                            key={n.id}
                          >
                            <span className="pc-card-icon">
                              <I name="bell" size={21} />
                            </span>
                            <div>
                              <strong>{n.title}</strong>
                              <p>{n.message || n.body}</p>
                              <small>
                                {dateText(n.createdAt || n.created_at, true)}
                              </small>
                            </div>
                            {!n.readAt && !n.read && (
                              <Button
                                small
                                secondary
                                disabled={Boolean(busy)}
                                onClick={() =>
                                  run(
                                    n.id,
                                    `/notifications/${n.id}`,
                                    "PATCH",
                                    { read: true },
                                    "Marked as read.",
                                  )
                                }
                              >
                                Mark as read
                              </Button>
                            )}
                          </article>
                        ))}
                      </div>
                    ) : (
                      <Empty title="Your inbox is clear" icon="bell">
                        We’ll keep service, team and account updates together
                        here.
                      </Empty>
                    )}
                  </Panel>
                  {manager && (
                    <Panel
                      title="Website enquiries"
                      subtitle="Conversations that started on the public website."
                    >
                      <DataTable
                        rows={data.contacts || []}
                        empty="No website enquiries to review"
                        columns={[
                          {
                            key: "name",
                            title: "From",
                            render: (c) => (
                              <>
                                <strong>{c.name}</strong>
                                <small>
                                  {c.email} · {c.phone}
                                </small>
                              </>
                            ),
                          },
                          {
                            key: "subject",
                            title: "Subject",
                            render: (c) => (
                              <>
                                <strong>{c.subject}</strong>
                                <span className="pc-clamp">{c.message}</span>
                              </>
                            ),
                          },
                          {
                            key: "created",
                            title: "Received",
                            render: (c) => dateText(c.createdAt),
                          },
                          {
                            key: "status",
                            title: "Status",
                            render: (c) => <Badge>{c.status}</Badge>,
                          },
                          {
                            key: "action",
                            title: "",
                            render: (c) => (
                              <Button
                                small
                                secondary
                                onClick={() =>
                                  setModal({ kind: "contactReview", item: c })
                                }
                              >
                                Review enquiry
                              </Button>
                            ),
                          },
                        ]}
                      />
                    </Panel>
                  )}
                </>
              )}
              {section === "website" && admin && contentEditor}
              {section === "settings" && (
                <div className="pc-settings-grid">
                  <Panel
                    title="Your profile"
                    subtitle="The details your care team uses to reach you."
                  >
                    <form
                      className="pc-form"
                      onSubmit={(e) =>
                        formAction(e, (f) =>
                          action(
                            "profile",
                            "/auth/profile",
                            "PATCH",
                            {
                              fullName: val(f, "fullName"),
                              phone: val(f, "phone"),
                            },
                            "Your profile is up to date.",
                          )
                            .then((r) => onUserChange?.(r.user || r))
                            .catch(() => {}),
                        )
                      }
                    >
                      <Field label="Full name">
                        <input
                          name="fullName"
                          defaultValue={person(user)}
                          required
                          minLength="2"
                          maxLength="120"
                        />
                      </Field>
                      <Field
                        label="Email address"
                        hint="Contact an administrator to change your account email."
                      >
                        <input
                          type="email"
                          value={user.email}
                          disabled
                          readOnly
                        />
                      </Field>
                      <Field label="Phone number">
                        <input
                          name="phone"
                          type="tel"
                          defaultValue={user.phone || ""}
                          required
                        />
                      </Field>
                      <Submit busy={busy === "profile"}>Save profile</Submit>
                    </form>
                  </Panel>
                  <Panel
                    title="Password & security"
                    subtitle="Choose a password only you know."
                  >
                    <form
                      className="pc-form"
                      onSubmit={(e) =>
                        formAction(e, (f) => {
                          if (
                            secret(f, "newPassword") !==
                            secret(f, "confirmPassword")
                          ) {
                            setError("Your new passwords do not match.");
                            return;
                          }
                          action(
                            "password",
                            "/auth/password",
                            "POST",
                            {
                              currentPassword: secret(f, "currentPassword"),
                              newPassword: secret(f, "newPassword"),
                            },
                            "Password changed.",
                          )
                            .then(() =>
                              onUserChange?.({
                                ...user,
                                mustChangePassword: false,
                              }),
                            )
                            .catch(() => {});
                        })
                      }
                    >
                      <Field label="Current password">
                        <input
                          type="password"
                          name="currentPassword"
                          autoComplete="current-password"
                          required
                        />
                      </Field>
                      <Field
                        label="New password"
                        hint="Use at least 12 characters."
                      >
                        <input
                          type="password"
                          name="newPassword"
                          autoComplete="new-password"
                          required
                          minLength="12"
                          maxLength="128"
                        />
                      </Field>
                      <Field label="Confirm new password">
                        <input
                          type="password"
                          name="confirmPassword"
                          autoComplete="new-password"
                          required
                          minLength="12"
                        />
                      </Field>
                      <Submit busy={busy === "password"}>
                        Change password
                      </Submit>
                    </form>
                  </Panel>
                  {worker && data.staffProfiles?.length > 0 && (
                    <Panel
                      title="Your work profile"
                      subtitle="Your agreed role, pay terms and availability. Contact operations to request a change."
                    >
                      <div className="pc-own-profile">
                        {data.staffProfiles
                          .filter((p) => p.userId === user.id)
                          .map((p) => (
                            <div key={p.id}>
                              <h3>{p.jobTitle || "Care professional"}</h3>
                              <p>
                                {data.departments.find(
                                  (d) => d.id === p.departmentId,
                                )?.name || "Team member"}
                              </p>
                              <div className="pc-inline-actions">
                                <Badge>{p.status}</Badge>
                                <Badge>{p.screeningStatus}</Badge>
                              </div>
                              <div className="pc-detail-grid">
                                <div>
                                  <span>Hourly rate</span>
                                  <strong>{money(p.hourlyRateRwf)}</strong>
                                </div>
                                <div>
                                  <span>Monthly salary</span>
                                  <strong>{money(p.monthlySalaryRwf)}</strong>
                                </div>
                                <div>
                                  <span>Qualifications</span>
                                  <strong>
                                    {p.qualifications?.join(" · ") ||
                                      "Not yet listed"}
                                  </strong>
                                </div>
                                <div>
                                  <span>Contract</span>
                                  <strong>
                                    {dateText(p.contractStart)}
                                    {p.contractEnd
                                      ? ` – ${dateText(p.contractEnd)}`
                                      : ""}
                                  </strong>
                                </div>
                              </div>
                              <h3>Usual availability</h3>
                              {p.availability?.length ? (
                                p.availability.map((slot, i) => (
                                  <p key={i}>
                                    {
                                      [
                                        "Sunday",
                                        "Monday",
                                        "Tuesday",
                                        "Wednesday",
                                        "Thursday",
                                        "Friday",
                                        "Saturday",
                                      ][slot.day]
                                    }{" "}
                                    · {slot.start}–{slot.end}
                                  </p>
                                ))
                              ) : (
                                <p>No regular hours recorded.</p>
                              )}
                            </div>
                          ))}
                      </div>
                    </Panel>
                  )}
                  {admin && (
                    <Panel
                      title="Connected services"
                      subtitle="Set up credentials on the server to enable these integrations."
                    >
                      <div className="pc-integration-list">
                        {[
                          [
                            "Email notifications",
                            data.settings.emailEnabled ||
                              data.settings.smtpReady ||
                              data.settings.emailConfigured,
                          ],
                          [
                            "Hosted online payments",
                            data.settings.paymentsEnabled ||
                              data.settings.paymentsReady ||
                              data.settings.paymentConfigured,
                          ],
                          [
                            "SMS notifications",
                            data.settings.smsEnabled ||
                              data.settings.smsReady ||
                              data.settings.smsConfigured,
                          ],
                        ].map(([label, ready]) => (
                          <div key={label}>
                            <span>{label}</span>
                            <Badge>
                              {ready ? "Configured" : "Setup required"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      <p className="pc-panel-note">
                        Secret keys stay on the server. Check the project
                        configuration guide for the required environment values.
                      </p>
                    </Panel>
                  )}
                </div>
              )}
            </>
          )}
          <footer className="pc-footer">
            <span>Wellness Home Care</span>
            <span>Thoughtful care. Clear coordination.</span>
            <a href="/">
              Visit website
              <I name="arrow" size={14} />
            </a>
          </footer>
        </main>
      </div>
      {selected && (
        <div
          className="pc-drawer-backdrop"
          onMouseDown={(e) =>
            e.target === e.currentTarget && setSelectedId(null)
          }
        >
          <aside
            ref={drawerRef}
            data-pc-dialog
            tabIndex={-1}
            className="pc-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`Visit ${selected.reference}`}
          >
            <div className="pc-drawer-top">
              <span>VISIT DETAILS</span>
              <button
                className="pc-icon-btn"
                aria-label="Close visit"
                onClick={() => setSelectedId(null)}
              >
                <I name="close" />
              </button>
            </div>
            {error && (
              <div className="pc-alert error" role="alert">
                <span>{error}</span>
                <button aria-label="Dismiss error" onClick={() => setError("")}>
                  <I name="close" size={17} />
                </button>
              </div>
            )}
            {notice && (
              <div className="pc-alert success" role="status">
                <span>{notice}</span>
              </div>
            )}
            <div className="pc-drawer-intro">
              <span className="pc-record-ref">{selected.reference}</span>
              <h2>{SERVICES[selected.service] || selected.service}</h2>
              <Badge>{selected.status}</Badge>
            </div>
            <div className="pc-detail-grid">
              <div>
                <span>Requested date</span>
                <strong>{dateText(requestDate(selected), true)}</strong>
              </div>
              <div>
                <span>Time & duration</span>
                <strong>
                  {timeText(selected.start_time || selected.startTime)} ·{" "}
                  {selected.duration_hours || selected.durationHours} hours
                </strong>
              </div>
              <div>
                <span>Customer</span>
                <strong>{person(selected)}</strong>
              </div>
              <div>
                <span>Area</span>
                <strong>{selected.neighborhood}</strong>
              </div>
              <div>
                <span>Contact</span>
                <strong>{selected.phone}</strong>
                <small>{selected.email}</small>
              </div>
              <div>
                <span>Assigned care team</span>
                <strong>
                  {selected.employee_name ||
                    selected.provider_name ||
                    "Awaiting assignment"}
                </strong>
              </div>
            </div>
            {data.households.find((h) => h.id === selected.householdId) && (
              <div className="pc-drawer-section">
                <h3>Household & handover</h3>
                {data.households
                  .filter((h) => h.id === selected.householdId)
                  .map((h) => (
                    <div key={h.id}>
                      <strong className="pc-household-name">{h.name}</strong>
                      <p className="pc-address">
                        <I name="pin" size={16} />
                        {h.address}
                      </p>
                      {h.contacts?.map((c, i) => (
                        <div className="pc-contact" key={i}>
                          <span className="pc-avatar pc-avatar-light">
                            {initials(c.name)}
                          </span>
                          <div>
                            <strong>
                              {c.name} · {c.relationship}
                            </strong>
                            <small>
                              {c.phone}
                              {c.email ? ` · ${c.email}` : ""}
                            </small>
                            {c.isEmergency && (
                              <span className="pc-mini-label">
                                Emergency contact
                              </span>
                            )}
                            {c.isAuthorized && (
                              <span className="pc-mini-label">
                                Authorized contact
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            )}
            {(manager || client) && (
              <div className="pc-drawer-section">
                <h3>Connect a household</h3>
                <form
                  className="pc-form"
                  onSubmit={(e) =>
                    formAction(e, (f) =>
                      run(
                        "link-household",
                        `/requests/${selected.id}/household`,
                        "PATCH",
                        { householdId: val(f, "householdId") },
                        "Household connected to this service.",
                      ),
                    )
                  }
                >
                  <Field label="Household">
                    <select
                      name="householdId"
                      defaultValue={selected.householdId || ""}
                      required
                    >
                      <option value="">Choose this service’s household</option>
                      {data.households
                        .filter(
                          (h) =>
                            !manager ||
                            !selected.client_user_id ||
                            h.clientId === selected.client_user_id,
                        )
                        .map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name} · {h.neighborhood}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <Submit busy={busy === "link-household"}>
                    Connect household
                  </Submit>
                </form>
              </div>
            )}
            {(selected.service_details || selected.serviceDetails)?.notes && (
              <div className="pc-detail-note">
                <strong>Care instructions</strong>
                <p>
                  {(selected.service_details || selected.serviceDetails).notes}
                </p>
              </div>
            )}
            {selected.service === "driving" &&
              (selected.service_details || selected.serviceDetails)
                ?.vehicleArrangement && (
                <div className="pc-detail-note">
                  <strong>Vehicle arrangement</strong>
                  <p>
                    {{
                      discuss: "Discuss with the team",
                      "household-vehicle": "Household can provide a vehicle",
                      "driver-vehicle": "Customer requests a driver with a vehicle",
                    }[
                      (selected.service_details || selected.serviceDetails)
                        .vehicleArrangement
                    ] || "Discuss with the team"}
                  </p>
                </div>
              )}
            {manager && (
              <>
                <div className="pc-drawer-section">
                  <h3>Manage this service</h3>
                  <form
                    className="pc-form"
                    onSubmit={(e) =>
                      formAction(e, (f) =>
                        run(
                          selected.id,
                          `/admin/requests/${selected.id}/status`,
                          "PATCH",
                          { status: val(f, "status") },
                          "Service status updated.",
                        ),
                      )
                    }
                  >
                    <Field label="Service status">
                      <select name="status" defaultValue={selected.status}>
                        {STATUSES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </Field>
                    <Submit busy={busy === selected.id}>Update status</Submit>
                  </form>
                </div>
                <div className="pc-drawer-section">
                  <h3>Assign a care professional</h3>
                  <p className="pc-muted">
                    Review screening, availability and approved leave before
                    confirming an assignment.
                  </p>
                  <form
                    className="pc-form"
                    onSubmit={(e) =>
                      formAction(e, (f) => {
                        const target = val(f, "assignee");
                        const [kind, id] = target.split(":");
                        run(
                          "assign",
                          `/admin/requests/${selected.id}/${kind === "provider" ? "assignment" : "employee-assignment"}`,
                          "PATCH",
                          kind === "provider"
                            ? { providerId: id || null }
                            : { employeeId: id || null },
                          "Assignment updated.",
                        );
                      })
                    }
                  >
                    <Field label="Team member or approved provider">
                      <select
                        name="assignee"
                        required
                        defaultValue={
                          selected.assigned_employee_id
                            ? `employee:${selected.assigned_employee_id}`
                            : selected.assigned_provider_id
                              ? `provider:${selected.assigned_provider_id}`
                              : ""
                        }
                      >
                        <option value="">
                          Choose an available professional
                        </option>
                        <optgroup label="Team members">
                          {data.employees
                            .filter((e) => e.isActive && e.role === "EMPLOYEE")
                            .map((e) => (
                              <option value={`employee:${e.id}`} key={e.id}>
                                {person(e)} ·{" "}
                                {e.staffProfile?.screeningStatus ||
                                  e.profile?.screeningStatus ||
                                  "Screening pending"}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Approved providers">
                          {data.applications
                            .filter((a) => a.status === "Approved")
                            .map((a) => (
                              <option value={`provider:${a.id}`} key={a.id}>
                                {person(a)} · {SERVICES[a.service]}
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </Field>
                    <Submit busy={busy === "assign"}>Save assignment</Submit>
                  </form>
                  {(selected.assigned_employee_id ||
                    selected.assigned_provider_id) && (
                    <button
                      className="pc-text-btn pc-danger-text"
                      disabled={Boolean(busy)}
                      onClick={() =>
                        run(
                          "unassign",
                          `/admin/requests/${selected.id}/${selected.assigned_provider_id ? "assignment" : "employee-assignment"}`,
                          "PATCH",
                          selected.assigned_provider_id
                            ? { providerId: null }
                            : { employeeId: null },
                          "Assignment removed.",
                        )
                      }
                    >
                      Remove current assignment
                    </button>
                  )}
                </div>
                {admin && (
                  <div className="pc-drawer-section">
                    <h3>Price & billing</h3>
                    <div className="pc-quote">
                      <strong>
                        {selected.quoted_amount_rwf
                          ? money(selected.quoted_amount_rwf)
                          : "Quote to be agreed"}
                      </strong>
                      <Badge>{selected.client_payment_status}</Badge>
                    </div>
                    <Button
                      secondary
                      small
                      onClick={() =>
                        setModal({ kind: "quote", item: selected })
                      }
                    >
                      Update quote
                    </Button>
                    {invoices.find((i) => i.requestId === selected.id) ? (
                      <Button
                        small
                        onClick={() =>
                          setModal({
                            kind: "invoiceView",
                            item: invoices.find(
                              (i) => i.requestId === selected.id,
                            ),
                          })
                        }
                      >
                        View invoice
                      </Button>
                    ) : (
                      <Button
                        small
                        onClick={() =>
                          setModal({ kind: "invoice", requestId: selected.id })
                        }
                      >
                        Create invoice
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
            {(client || manager) && (
              <div className="pc-drawer-section">
                <h3>{manager ? "Schedule changes" : "Your service options"}</h3>
                <div className="pc-button-stack">
                  {!CLOSED.includes(selected.status) &&
                    selected.status !== "In progress" && (
                      <>
                        <Button
                          secondary
                          onClick={() =>
                            setModal({
                              kind: "change",
                              item: selected,
                              changeKind: "Reschedule",
                            })
                          }
                        >
                          <I name="calendar" size={18} />
                          Request a reschedule
                        </Button>
                        <Button
                          secondary
                          danger
                          onClick={() =>
                            setModal({
                              kind: "change",
                              item: selected,
                              changeKind: "Cancel",
                            })
                          }
                        >
                          Request cancellation
                        </Button>
                      </>
                    )}
                  {client && selected.status === "Completed" && (
                    <Button
                      onClick={() =>
                        setModal({ kind: "feedback", item: selected })
                      }
                    >
                      Rate this service
                      <I name="chat" size={18} />
                    </Button>
                  )}
                  {client && (
                    <Button
                      secondary
                      onClick={() =>
                        setModal({
                          kind: "feedback",
                          item: selected,
                          concern: true,
                        })
                      }
                    >
                      Report a concern or new need
                    </Button>
                  )}
                </div>
              </div>
            )}
            {client && selected.workerProfile && (
              <div className="pc-drawer-section">
                <h3>Your assigned professional</h3>
                <strong>
                  {selected.workerProfile.fullName ||
                    selected.employee_name ||
                    selected.provider_name}
                </strong>
                <p className="pc-muted">
                  {selected.workerProfile.jobTitle} ·{" "}
                  {selected.workerProfile.departmentName ||
                    data.departments.find(
                      (d) => d.id === selected.workerProfile.departmentId,
                    )?.name}
                </p>
                <div className="pc-detail-note">
                  <strong>Approved qualifications</strong>
                  <p>
                    {selected.workerProfile.qualifications?.join(" · ") ||
                      "Reviewed by the operations team."}
                  </p>
                </div>
              </div>
            )}
            {worker && (
              <WorkerActions
                request={selected}
                user={user}
                busy={busy}
                action={run}
                attendance={attendance}
                setModal={setModal}
              />
            )}
            {selected.attendance?.length > 0 && (
              <div className="pc-drawer-section">
                <h3>Attendance</h3>
                {selected.attendance.map((a) => (
                  <div className="pc-attendance" key={a.id}>
                    <span className="pc-timeline-dot" />
                    <div>
                      <strong>Arrival recorded</strong>
                      <p>
                        {dateText(a.check_in_at || a.checkInAt)} ·{" "}
                        {timeText(a.check_in_at || a.checkInAt)}
                      </p>
                      <Badge>
                        {a.verificationStatus ||
                          a.verification_status ||
                          "Recorded"}
                      </Badge>
                      {(a.discrepancyNote || a.discrepancy_note) && (
                        <p>{a.discrepancyNote || a.discrepancy_note}</p>
                      )}
                      {admin &&
                        (a.verificationStatus || a.verification_status) ===
                          "Flagged" && (
                          <Button
                            small
                            secondary
                            onClick={() =>
                              setModal({ kind: "attendanceReview", item: a })
                            }
                          >
                            Review attendance
                          </Button>
                        )}
                      {a.check_out_at || a.checkOutAt ? (
                        <>
                          <strong>Departure recorded</strong>
                          <p>
                            {dateText(a.check_out_at || a.checkOutAt)} ·{" "}
                            {timeText(a.check_out_at || a.checkOutAt)}
                          </p>
                        </>
                      ) : (
                        <Badge>In progress</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selected.reports?.length > 0 && (
              <div className="pc-drawer-section">
                <h3>Visit notes</h3>
                {selected.reports.map((r) => (
                  <article className="pc-report-note" key={r.id}>
                    <strong>{r.kind?.replaceAll("-", " ")}</strong>
                    <p>{r.message}</p>
                    <small>
                      {r.employee_name} ·{" "}
                      {dateText(r.created_at || r.createdAt)}
                    </small>
                    {r.response && (
                      <div className="pc-detail-note">
                        <strong>Team follow-up</strong>
                        <p>{r.response}</p>
                      </div>
                    )}
                    {manager && (
                      <Button
                        small
                        secondary
                        onClick={() =>
                          setModal({ kind: "serviceReportReview", item: r })
                        }
                      >
                        Follow up on report
                      </Button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}
      {modal && (
        <Modal
          title={modalTitle(modal)}
          subtitle={modalSubtitle(modal)}
          onClose={() => setModal(null)}
          wide={[
            "household",
            "staff",
            "request",
            "invoice",
            "invoiceView",
          ].includes(modal.kind)}
        >
          {error && (
            <div className="pc-alert error" role="alert">
              <span>{error}</span>
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <I name="close" size={17} />
              </button>
            </div>
          )}
          {modal.kind === "household" && (
            <HouseholdForm
              item={modal.item}
              admin={admin}
              manager={manager}
              clients={
                data.clients || [
                  ...new Map(
                    reqs
                      .filter((r) => r.client_user_id || r.clientUserId)
                      .map((r) => [
                        r.client_user_id || r.clientUserId,
                        {
                          id: r.client_user_id || r.clientUserId,
                          fullName: person(r),
                        },
                      ]),
                  ).values(),
                ]
              }
              busy={Boolean(busy)}
              onSubmit={(f) =>
                run(
                  "household",
                  `/households${modal.item ? `/${modal.item.id}` : ""}`,
                  modal.item ? "PATCH" : "POST",
                  f,
                  "Household details saved.",
                  true,
                )
              }
              acquireLocation={acquireLocation}
            />
          )}
          {modal.kind === "client" && (
            <form
              className="pc-form"
              onSubmit={(e) =>
                formAction(e, (f) =>
                  run(
                    "client",
                    `/admin/clients${modal.item ? `/${modal.item.id}` : ""}`,
                    modal.item ? "PATCH" : "POST",
                    {
                      fullName: val(f, "fullName"),
                      email: val(f, "email"),
                      phone: val(f, "phone"),
                      ...(modal.item
                        ? { isActive: f.get("isActive") === "on" }
                        : { password: secret(f, "password") }),
                    },
                    modal.item
                      ? "Client account updated."
                      : "Client account created. Share the sign-in details privately.",
                    true,
                  ),
                )
              }
            >
              <Field label="Full name">
                <input
                  name="fullName"
                  defaultValue={modal.item ? person(modal.item) : ""}
                  minLength="2"
                  maxLength="120"
                  required
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  name="email"
                  defaultValue={modal.item?.email || ""}
                  disabled={Boolean(modal.item)}
                  required
                />
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  name="phone"
                  defaultValue={modal.item?.phone || ""}
                  required
                />
              </Field>
              {modal.item ? (
                <label className="pc-checkbox">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={modal.item.isActive}
                  />
                  Client account is active
                </label>
              ) : (
                <Field
                  label="Temporary password"
                  hint="At least 12 characters. Share it with the client privately."
                >
                  <input
                    type="password"
                    name="password"
                    minLength="12"
                    maxLength="128"
                    autoComplete="new-password"
                    required
                  />
                </Field>
              )}
              <Submit busy={Boolean(busy)}>
                {modal.item ? "Save client account" : "Create client account"}
              </Submit>
            </form>
          )}
          {modal.kind === "employee" && (
            <form
              className="pc-form"
              onSubmit={(e) =>
                formAction(e, (f) =>
                  run(
                    "employee",
                    "/admin/employees",
                    "POST",
                    {
                      fullName: val(f, "fullName"),
                      email: val(f, "email"),
                      phone: val(f, "phone"),
                      password: secret(f, "password"),
                      role: val(f, "role"),
                    },
                    "Team account created. Share the sign-in details privately.",
                    true,
                  ),
                )
              }
            >
              <Field label="Full name">
                <input name="fullName" minLength="2" maxLength="120" required />
              </Field>
              <Field label="Email address">
                <input type="email" name="email" required />
              </Field>
              <Field label="Phone number">
                <input type="tel" name="phone" />
              </Field>
              <Field label="Account role">
                <select name="role">
                  <option value="EMPLOYEE">Employee / care team member</option>
                  <option value="OPERATIONS">Operations coordinator</option>
                </select>
              </Field>
              <Field
                label="Temporary password"
                hint="At least 12 characters. Share it with the team member privately."
              >
                <input
                  type="password"
                  name="password"
                  minLength="12"
                  maxLength="128"
                  required
                  autoComplete="new-password"
                />
              </Field>
              <Submit busy={Boolean(busy)}>Create team account</Submit>
            </form>
          )}
          {modal.kind === "staff" && (
            <StaffForm
              item={modal.item}
              admin={admin}
              departments={data.departments}
              busy={Boolean(busy)}
              onSubmit={(f) =>
                run(
                  "staff",
                  `/staff-profiles/${modal.item.id}`,
                  "PUT",
                  f,
                  "Staff profile updated.",
                  true,
                )
              }
            />
          )}
          {modal.kind === "department" && (
            <DepartmentForm
              item={modal.item}
              busy={Boolean(busy)}
              onSubmit={(f) =>
                run(
                  "department",
                  `/departments${modal.item ? `/${modal.item.id}` : ""}`,
                  modal.item ? "PATCH" : "POST",
                  f,
                  "Department saved.",
                  true,
                )
              }
            />
          )}
          {modal.kind === "application" && (
            <div className="pc-application-review">
              <div className="pc-detail-grid">
                {[
                  ["Applicant", person(modal.item)],
                  ["Service", SERVICES[modal.item.service]],
                  [
                    "Contact",
                    `${modal.item.phone} · ${modal.item.email || ""}`,
                  ],
                  ["Languages", modal.item.languages],
                  ["Availability", modal.item.availability],
                  ["Area", modal.item.neighborhood],
                ].map(([k, v]) => (
                  <div key={k}>
                    <span>{k}</span>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>
              <div className="pc-detail-note">
                <strong>Experience</strong>
                <p>{modal.item.experience}</p>
                <strong>Training</strong>
                <p>{modal.item.training || "No training listed."}</p>
                <strong>Reference details</strong>
                <p>{modal.item.references_text || modal.item.referencesText}</p>
                <p>
                  Reference contact consent:{" "}
                  {modal.item.reference_consent || modal.item.referenceConsent
                    ? "Given"
                    : "Not given"}{" "}
                  · Screening consent:{" "}
                  {modal.item.screening_consent || modal.item.screeningConsent
                    ? "Given"
                    : "Not given"}
                </p>
              </div>
              <form
                className="pc-form"
                onSubmit={(e) =>
                  formAction(e, (f) =>
                    run(
                      modal.item.id,
                      `/admin/applications/${modal.item.id}/status`,
                      "PATCH",
                      { status: val(f, "status") },
                      "Application status saved.",
                      true,
                    ),
                  )
                }
              >
                <Field label="Review decision">
                  <select name="status" defaultValue={modal.item.status}>
                    {[
                      "Application received",
                      "Under review",
                      "More information required",
                      "Approved",
                      "Not approved",
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Submit busy={Boolean(busy)}>Save decision</Submit>
              </form>
              {admin &&
                modal.item.status === "Approved" &&
                !modal.item.has_account && (
                  <form
                    className="pc-form pc-top-rule"
                    onSubmit={(e) =>
                      formAction(e, (f) =>
                        run(
                          "provider-account",
                          `/admin/applications/${modal.item.id}/account`,
                          "POST",
                          {
                            email: val(f, "email"),
                            password: secret(f, "password"),
                          },
                          "Provider sign-in created. Share details privately.",
                          true,
                        ),
                      )
                    }
                  >
                    <h3>Provider portal access</h3>
                    <Field label="Email">
                      <input
                        type="email"
                        name="email"
                        defaultValue={modal.item.email || ""}
                        required
                      />
                    </Field>
                    <Field label="Temporary password">
                      <input
                        type="password"
                        name="password"
                        minLength="12"
                        maxLength="128"
                        required
                      />
                    </Field>
                    <Submit busy={Boolean(busy)}>
                      Create provider account
                    </Submit>
                  </form>
                )}
            </div>
          )}
          {modal.kind === "request" && (
            <RequestForm
              user={user}
              households={data.households}
              busy={Boolean(busy)}
              onSubmit={(f) =>
                run(
                  "request",
                  "/requests",
                  "POST",
                  f,
                  "Your service request has been sent. The team will confirm the details with you.",
                  true,
                )
              }
            />
          )}
          {modal.kind === "change" && (
            <form
              className="pc-form"
              onSubmit={(e) =>
                formAction(e, (f) =>
                  run(
                    "change",
                    "/service-changes",
                    "POST",
                    {
                      requestId: modal.item.id,
                      kind: modal.changeKind,
                      reason: val(f, "reason"),
                      ...(modal.changeKind === "Reschedule"
                        ? {
                            requestedDate: val(f, "requestedDate"),
                            startTime: val(f, "startTime"),
                            durationHours: Number(val(f, "durationHours")),
                          }
                        : {}),
                    },
                    "Your change request is with the operations team.",
                    true,
                  ),
                )
              }
            >
              {modal.changeKind === "Reschedule" && (
                <>
                  <Field label="Preferred new date">
                    <input
                      type="date"
                      min={dayToday()}
                      name="requestedDate"
                      required
                    />
                  </Field>
                  <Field label="Preferred time">
                    <input type="time" name="startTime" required />
                  </Field>
                  <Field label="Duration">
                    <select
                      name="durationHours"
                      defaultValue={modal.item.duration_hours || 2}
                    >
                      {[2, 3, 4, 6, 8].map((n) => (
                        <option value={n} key={n}>
                          {n} hours
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              )}
              <Field label="Reason for the change">
                <textarea
                  name="reason"
                  rows="4"
                  minLength="10"
                  maxLength="1000"
                  required
                  placeholder="Let us know what has changed."
                />
              </Field>
              <p className="pc-form-note">
                Your current booking stays in place until the team approves this
                request. Agreed cancellation terms still apply.
              </p>
              <Submit busy={Boolean(busy)}>Send change request</Submit>
            </form>
          )}
          {modal.kind === "changeReview" && (
            <form
              className="pc-form"
              onSubmit={(e) =>
                formAction(e, (f) =>
                  run(
                    "review",
                    `/service-changes/${modal.item.id}`,
                    "PATCH",
                    {
                      status: val(f, "status"),
                      reviewerNote: val(f, "reviewerNote"),
                    },
                    "Service change reviewed.",
                    true,
                  ),
                )
              }
            >
              <p>
                {modal.item.kind}: {modal.item.reason}
              </p>
              {modal.item.requestedDate && (
                <p>
                  Proposed: {dateText(modal.item.requestedDate)} at{" "}
                  {timeText(modal.item.startTime)}
                </p>
              )}
              <Field label="Decision">
                <select name="status">
                  <option>Approved</option>
                  <option>Declined</option>
                </select>
              </Field>
              <Field label="Note to the customer">
                <textarea
                  name="reviewerNote"
                  rows="3"
                  maxLength="1000"
                  required
                />
              </Field>
              <Submit busy={Boolean(busy)}>Save decision</Submit>
            </form>
          )}
          {modal.kind === "feedback" && (
            <form
              className="pc-form"
              onSubmit={(e) =>
                formAction(e, (f) =>
                  run(
                    "feedback",
                    `/client/requests/${modal.item.id}/feedback`,
                    "POST",
                    {
                      kind: val(f, "kind"),
                      rating:
                        val(f, "kind") === "feedback"
                          ? Number(val(f, "rating"))
                          : null,
                      message: val(f, "message"),
                    },
                    "Thank you. Your message has been sent to the team.",
                    true,
                  ),
                )
              }
            >
              <Field label="Message type">
                <select
                  name="kind"
                  defaultValue={modal.concern ? "complaint" : "feedback"}
                >
                  <option value="feedback">Service feedback</option>
                  <option value="complaint">Concern or complaint</option>
                  <option value="new-need">A new care need</option>
                </select>
              </Field>
              <Field label="Service rating">
                <select name="rating" defaultValue="5">
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option value={n} key={n}>
                      {n} / 5 —{" "}
                      {
                        [
                          "",
                          "Poor",
                          "Could be better",
                          "Good",
                          "Very good",
                          "Excellent",
                        ][n]
                      }
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Your message">
                <textarea
                  name="message"
                  minLength="10"
                  maxLength="2000"
                  rows="4"
                  required
                />
              </Field>
              <Submit busy={Boolean(busy)}>Send feedback</Submit>
            </form>
          )}
          {modal.kind === "feedbackReview" && (
            <form
              className="pc-form"
              onSubmit={(e) =>
                formAction(e, (f) =>
                  run(
                    "feedback-review",
                    `/feedback/${modal.item.id}`,
                    "PATCH",
                    {
                      status: val(f, "status"),
                      assignedTo: val(f, "assignedTo") || undefined,
                      resolution: val(f, "resolution"),
                    },
                    "Feedback follow-up saved.",
                    true,
                  ),
                )
              }
            >
              <div className="pc-detail-note">{modal.item.message}</div>
              <Field label="Follow-up status">
                <select name="status" defaultValue={modal.item.status}>
                  {["Received", "Under review", "Resolved"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Assigned team member">
                <select
                  name="assignedTo"
                  defaultValue={modal.item.assignedTo || ""}
                >
                  <option value="">Operations team</option>
                  {(data.administrators || [user]).map((e) => (
                    <option key={e.id} value={e.id}>
                      {person(e)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Resolution / follow-up notes">
                <textarea
                  rows="4"
                  name="resolution"
                  maxLength="2000"
                  defaultValue={modal.item.resolution || ""}
                />
              </Field>
              <Submit busy={Boolean(busy)}>Save follow-up</Submit>
            </form>
          )}
          {modal.kind === "leave" && (
            <LeaveForm
              busy={Boolean(busy)}
              onSubmit={(f) =>
                run(
                  "leave",
                  "/employee/leave-requests",
                  "POST",
                  f,
                  "Your time-off request is ready for review.",
                  true,
                )
              }
            />
          )}
          {modal.kind === "leaveReview" && (
            <form
              className="pc-form"
              onSubmit={(e) =>
                formAction(e, (f) =>
                  run(
                    "leave-review",
                    `/admin/leave-requests/${modal.item.id}/status`,
                    "PATCH",
                    {
                      status: val(f, "status"),
                      reviewerNote: val(f, "reviewerNote"),
                    },
                    "Time-off decision saved.",
                    true,
                  ),
                )
              }
            >
              <div className="pc-detail-note">
                <strong>
                  {modal.item.employee_name || person(modal.item.employee)}
                </strong>
                <p>
                  {modal.item.kind || "Time off"} ·{" "}
                  {dateText(modal.item.startDate || modal.item.start_date)} –{" "}
                  {dateText(modal.item.endDate || modal.item.end_date)}
                </p>
                {modal.item.startTime && modal.item.endTime && (
                  <p>
                    {timeText(modal.item.startTime)} –{" "}
                    {timeText(modal.item.endTime)}
                  </p>
                )}
                <p>{modal.item.reason}</p>
              </div>
              <Field label="Decision">
                <select
                  name="status"
                  defaultValue={modal.decision || "Approved"}
                >
                  <option>Approved</option>
                  <option>Declined</option>
                </select>
              </Field>
              <Field label="Note to the team member (optional)">
                <textarea name="reviewerNote" rows="3" maxLength="500" />
              </Field>
              <Submit busy={Boolean(busy)}>Save time-off decision</Submit>
            </form>
          )}
          {modal.kind === "decline" && (
            <form
              className="pc-form"
              onSubmit={(e) =>
                formAction(e, (f) =>
                  run(
                    "decline",
                    `/${user.role === "PROVIDER" ? "provider" : "employee"}/assignments/${modal.item.id}/response`,
                    "PATCH",
                    { response: "Declined", note: val(f, "note") },
                    "Your response has been sent to operations.",
                    true,
                  ),
                )
              }
            >
              <Field label="Why can’t you take this visit?">
                <textarea
                  name="note"
                  minLength="10"
                  maxLength="500"
                  rows="4"
                  required
                />
              </Field>
              <Submit busy={Boolean(busy)}>Send decline</Submit>
            </form>
          )}
          {modal.kind === "visitReport" && (
            <form
              className="pc-form"
              onSubmit={(e) =>
                formAction(e, (f) =>
                  run(
                    "report",
                    `/employee/assignments/${modal.item.id}/reports`,
                    "POST",
                    {
                      kind:
                        val(f, "kind") === "technical"
                          ? "incident"
                          : val(f, "kind"),
                      message:
                        (val(f, "kind") === "technical"
                          ? "GPS / attendance problem: "
                          : "") + val(f, "message"),
                    },
                    "Your report has been sent to the team.",
                    true,
                  ),
                )
              }
            >
              <Field label="Report type">
                <select name="kind">
                  <option value="service-note">
                    Daily activity / service note
                  </option>
                  <option value="incident">Incident</option>
                  <option value="supplies">Supplies needed</option>
                  <option value="technical">GPS / attendance problem</option>
                </select>
              </Field>
              <Field label="What should the team know?">
                <textarea
                  name="message"
                  minLength="10"
                  maxLength="1970"
                  rows="5"
                  required
                />
              </Field>
              <p className="pc-form-note">
                Daily activity and service notes are shared with the household.
                Incident, supplies and GPS reports go to the operations team.
              </p>
              <p className="pc-form-note">
                For an urgent safety concern, contact your supervisor and the
                appropriate emergency service directly.
              </p>
              <Submit busy={Boolean(busy)}>Send visit report</Submit>
            </form>
          )}
          {modal.kind === "progress" && (
            <form
              className="pc-form"
              onSubmit={(e) =>
                formAction(e, (f) =>
                  run(
                    "progress",
                    `/employee/assignments/${modal.item.id}/status`,
                    "PATCH",
                    { status: val(f, "status"), note: val(f, "note") },
                    "Your service update has been shared with the team.",
                    true,
                  ),
                )
              }
            >
              <Field label="What has changed?">
                <select name="status">
                  <option>Delayed</option>
                  <option>Unable to Complete</option>
                </select>
              </Field>
              <Field label="Reason & next steps">
                <textarea
                  name="note"
                  minLength="10"
                  maxLength="1000"
                  rows="4"
                  placeholder="Explain the delay or problem so the team can help."
                  required
                />
              </Field>
              <Submit busy={Boolean(busy)}>Send service update</Submit>
            </form>
          )}
          {modal.kind === "attendanceReview" && (
            <form
              className="pc-form"
              onSubmit={(e) =>
                formAction(e, (f) =>
                  run(
                    "attendance-review",
                    `/attendance/${modal.item.id}/review`,
                    "PATCH",
                    { status: val(f, "status"), note: val(f, "note") },
                    "Attendance discrepancy reviewed.",
                    true,
                  ),
                )
              }
            >
              <div className="pc-detail-note">
                {modal.item.discrepancyNote ||
                  modal.item.discrepancy_note ||
                  "Review the recorded location and service details before deciding."}
              </div>
              <Field label="Review decision">
                <select name="status">
                  <option value="Approved">Approve recorded attendance</option>
                  <option value="Rejected">Reject recorded attendance</option>
                </select>
              </Field>
              <Field label="Reason for the decision">
                <textarea
                  name="note"
                  rows="4"
                  minLength="10"
                  maxLength="1000"
                  required
                />
              </Field>
              <Submit busy={Boolean(busy)}>Save attendance review</Submit>
            </form>
          )}
          {modal.kind === "serviceReportReview" && (
            <form
              className="pc-form"
              onSubmit={(e) =>
                formAction(e, (f) =>
                  run(
                    "report-review",
                    `/service-reports/${modal.item.id}`,
                    "PATCH",
                    { status: val(f, "status"), response: val(f, "response") },
                    "Visit report follow-up saved.",
                    true,
                  ),
                )
              }
            >
              <div className="pc-detail-note">{modal.item.message}</div>
              <Field label="Follow-up status">
                <select
                  name="status"
                  defaultValue={modal.item.status || "Open"}
                >
                  {["Open", "Under review", "Resolved"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Response & follow-up">
                <textarea
                  name="response"
                  rows="4"
                  minLength="5"
                  maxLength="2000"
                  defaultValue={modal.item.response || ""}
                  required
                />
              </Field>
              <Submit busy={Boolean(busy)}>Save follow-up</Submit>
            </form>
          )}
          {modal.kind === "document" && (
            <form
              className="pc-form"
              onSubmit={(e) => formAction(e, uploadDocument)}
            >
              <Field label="Document category">
                <select name="category">
                  {[
                    "Identity",
                    "Qualification",
                    "Contract",
                    "Background check",
                    "Medical clearance",
                    "Household",
                    "Other",
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              {admin && (
                <Field label="Document owner">
                  <select name="ownerUserId">
                    <option value="">My account</option>
                    {(data.clients || []).length > 0 && (
                      <optgroup label="Clients & families">
                        {data.clients.map((c) => (
                          <option value={c.id} key={c.id}>
                            {person(c)} · {c.email}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Team members">
                      {data.employees
                        .filter((e) => e.role !== "OPERATIONS")
                        .map((e) => (
                          <option value={e.id} key={e.id}>
                            {person(e)} · {e.email}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </Field>
              )}
              {!worker && (
                <Field label="Household (optional)">
                  <select name="householdId">
                    <option value="">Not linked to a household</option>
                    {data.households.map((h) => (
                      <option value={h.id} key={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Choose a file" hint="PDF, JPG or PNG · up to 5 MB">
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  required
                  onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                />
              </Field>
              <Submit busy={Boolean(busy)}>Upload securely</Submit>
            </form>
          )}
          {modal.kind === "documentReview" && (
            <form
              className="pc-form"
              onSubmit={(e) =>
                formAction(e, (f) =>
                  run(
                    "review-document",
                    `/documents/${modal.item.id}/review`,
                    "PATCH",
                    { status: val(f, "status"), note: val(f, "note") },
                    "Document review saved.",
                    true,
                  ),
                )
              }
            >
              <a
                className="pc-text-btn"
                target="_blank"
                rel="noreferrer"
                href={`${import.meta.env.VITE_API_URL || "/api"}/documents/${modal.item.id}/download`}
              >
                Open {modal.item.name}
                <I name="arrow" size={16} />
              </a>
              <Field label="Review decision">
                <select name="status">
                  <option>Approved</option>
                  <option>Rejected</option>
                </select>
              </Field>
              <Field label="Review note">
                <textarea name="note" rows="3" maxLength="1000" required />
              </Field>
              <Submit busy={Boolean(busy)}>Save review</Submit>
            </form>
          )}
          {modal.kind === "quote" && (
            <form
              className="pc-form"
              onSubmit={(e) =>
                formAction(e, (f) =>
                  run(
                    "quote",
                    `/admin/requests/${modal.item.id}/payment`,
                    "PATCH",
                    {
                      quotedAmount: val(f, "quotedAmount"),
                      paymentMethod: val(f, "paymentMethod"),
                      clientPaymentStatus: "Quoted",
                      providerPaymentStatus:
                        modal.item.provider_payment_status || "Not recorded",
                      transactionReference:
                        modal.item.transaction_reference || "",
                    },
                    "Quote updated. Issue an invoice when the scope is agreed.",
                    true,
                  ),
                )
              }
            >
              <Field label="Agreed quote (RWF)">
                <input
                  type="number"
                  name="quotedAmount"
                  min="0"
                  step="1"
                  defaultValue={modal.item.quoted_amount_rwf || ""}
                  required
                />
              </Field>
              <Field label="Payment method">
                <select
                  name="paymentMethod"
                  defaultValue={modal.item.payment_method || "Not decided"}
                >
                  {[
                    "Not decided",
                    "Cash",
                    "Bank transfer",
                    "Mobile money",
                    "Other",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Submit busy={Boolean(busy)}>Save quote</Submit>
            </form>
          )}
          {modal.kind === "invoice" && (
            <InvoiceForm
              requests={reqs}
              requestId={modal.requestId}
              busy={Boolean(busy)}
              onSubmit={(f) =>
                run("invoice", "/invoices", "POST", f, "Invoice issued.", true)
              }
            />
          )}
          {modal.kind === "invoiceView" && (
            <InvoiceView
              invoice={
                invoices.find((i) => i.id === modal.item.id) || modal.item
              }
              admin={admin}
              busy={busy}
              paymentsEnabled={data.settings.paymentsEnabled === true}
              checkout={checkout}
              onPayment={(i) => setModal({ kind: "invoicePayment", item: i })}
            />
          )}
          {modal.kind === "invoicePayment" && (
            <form
              className="pc-form"
              onSubmit={(e) =>
                formAction(e, (f) =>
                  run(
                    "invoice-payment",
                    `/invoices/${modal.item.id}/payments`,
                    "POST",
                    {
                      amountRwf: Number(val(f, "amountRwf")),
                      kind: val(f, "kind"),
                      method: val(f, "method"),
                      reference: val(f, "reference"),
                    },
                    "Invoice transaction recorded.",
                    true,
                  ),
                )
              }
            >
              <Field label="Transaction">
                <select name="kind">
                  <option value="PAYMENT">Payment received</option>
                  <option value="REFUND">Refund issued</option>
                </select>
              </Field>
              <Field label="Amount (RWF)">
                <input type="number" name="amountRwf" min="1" required />
              </Field>
              <Field label="Method">
                <select name="method">
                  {["Cash", "Bank transfer", "Mobile money", "Other"].map(
                    (s) => (
                      <option key={s}>{s}</option>
                    ),
                  )}
                </select>
              </Field>
              <Field label="Transaction reference">
                <input name="reference" maxLength="120" required />
              </Field>
              <p className="pc-form-note">
                Record a payment or refund after the money has been received or
                returned. This form saves the transaction record.
              </p>
              <Submit busy={Boolean(busy)}>Record transaction</Submit>
            </form>
          )}
          {modal.kind === "payroll" && (
            <form
              className="pc-form"
              onSubmit={(e) =>
                formAction(e, (f) =>
                  run(
                    "payroll",
                    "/payroll/calculate",
                    "POST",
                    {
                      employeeId: val(f, "employeeId"),
                      periodStart: val(f, "periodStart"),
                      periodEnd: val(f, "periodEnd"),
                      deductionsRwf: Number(val(f, "deductionsRwf") || 0),
                    },
                    "Payroll calculated from attendance and pay terms.",
                    true,
                  ),
                )
              }
            >
              <Field label="Team member">
                <select name="employeeId" required>
                  <option value="">Choose a team member</option>
                  {data.employees
                    .filter((e) => ["EMPLOYEE", "PROVIDER"].includes(e.role))
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {person(e)}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Period start">
                <input type="date" name="periodStart" required />
              </Field>
              <Field label="Period end">
                <input type="date" name="periodEnd" required />
              </Field>
              <Field label="Agreed deductions (RWF)">
                <input
                  type="number"
                  name="deductionsRwf"
                  min="0"
                  defaultValue="0"
                />
              </Field>
              <Submit busy={Boolean(busy)}>Calculate payroll</Submit>
            </form>
          )}
          {modal.kind === "payrollPayment" && (
            <form
              className="pc-form"
              onSubmit={(e) =>
                formAction(e, (f) =>
                  run(
                    "payroll-paid",
                    `/payroll/${modal.item.id}`,
                    "PATCH",
                    { status: "Paid", reference: val(f, "reference") },
                    "Payroll payment recorded.",
                    true,
                  ),
                )
              }
            >
              <p>
                Record the payment of{" "}
                {money(modal.item.netAmountRwf || modal.item.netRwf)} after
                sending it to the team member.
              </p>
              <Field label="Payment transaction reference">
                <input name="reference" maxLength="120" required />
              </Field>
              <Submit busy={Boolean(busy)}>Record payroll as paid</Submit>
            </form>
          )}
          {modal.kind === "contactReview" && (
            <form
              className="pc-form"
              onSubmit={(e) =>
                formAction(e, (f) =>
                  run(
                    "contact-review",
                    `/contacts/${modal.item.id}`,
                    "PATCH",
                    {
                      status: val(f, "status"),
                      responseNote: val(f, "responseNote"),
                    },
                    "Enquiry follow-up recorded.",
                    true,
                  ),
                )
              }
            >
              <div className="pc-detail-note">
                <strong>{modal.item.subject}</strong>
                <p>{modal.item.message}</p>
                <p>
                  {modal.item.name} · {modal.item.email} · {modal.item.phone}
                </p>
              </div>
              <Field label="Follow-up status">
                <select name="status" defaultValue={modal.item.status}>
                  {["New", "Under review", "Resolved"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Internal follow-up notes">
                <textarea
                  name="responseNote"
                  rows="4"
                  defaultValue={modal.item.responseNote || ""}
                  maxLength="2000"
                  required
                />
              </Field>
              <p className="pc-form-note">
                These notes stay with the enquiry. Contact the sender using the
                email address or phone above to send a reply.
              </p>
              <Submit busy={Boolean(busy)}>Save follow-up</Submit>
            </form>
          )}
          {modal.kind === "communication" && (
            <form
              className="pc-form"
              onSubmit={(e) =>
                formAction(e, (f) =>
                  run(
                    "communication",
                    "/communications",
                    "POST",
                    {
                      userId: val(f, "userId"),
                      channel: val(f, "channel"),
                      subject: val(f, "subject"),
                      message: val(f, "message"),
                      consentConfirmed: f.get("consentConfirmed") === "on",
                    },
                    "Message submitted to the configured delivery service.",
                    true,
                  ),
                )
              }
            >
              <Field label="Recipient account">
                <select name="userId" required>
                  <option value="">Choose a recipient</option>
                  {[...(data.clients || []), ...data.employees].map((u) => (
                    <option key={u.id} value={u.id}>
                      {person(u)} · {u.email}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Delivery channel">
                <select name="channel">
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </Field>
              <Field label="Subject (email)">
                <input name="subject" maxLength="180" />
              </Field>
              <Field label="Message">
                <textarea
                  rows="5"
                  name="message"
                  minLength="5"
                  maxLength="1000"
                  required
                />
              </Field>
              <label className="pc-checkbox">
                <input name="consentConfirmed" type="checkbox" />
                The recipient has agreed to receive messages on this channel.
              </label>
              <p className="pc-form-note">
                Delivery requires the channel’s server credentials. Submission
                is confirmed only after the provider accepts the message.
              </p>
              <Submit busy={Boolean(busy)}>Send message</Submit>
            </form>
          )}
          {modal.kind === "expense" && (
            <form
              className="pc-form"
              onSubmit={(e) =>
                formAction(e, (f) =>
                  run(
                    "expense",
                    "/expenses",
                    "POST",
                    {
                      date: val(f, "date"),
                      category: val(f, "category"),
                      description: val(f, "description"),
                      amountRwf: Number(val(f, "amountRwf")),
                      reference: val(f, "reference"),
                    },
                    "Operating expense recorded.",
                    true,
                  ),
                )
              }
            >
              <Field label="Date">
                <input
                  name="date"
                  type="date"
                  defaultValue={dayToday()}
                  required
                />
              </Field>
              <Field label="Category">
                <select name="category">
                  {[
                    "Transport",
                    "Supplies",
                    "Utilities",
                    "Equipment",
                    "Office",
                    "Other",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Description">
                <input name="description" maxLength="500" required />
              </Field>
              <Field label="Amount (RWF)">
                <input name="amountRwf" type="number" min="1" required />
              </Field>
              <Field label="Receipt / reference">
                <input name="reference" maxLength="120" />
              </Field>
              <Submit busy={Boolean(busy)}>Save expense</Submit>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
function WorkerActions({
  request: r,
  user,
  busy,
  action,
  attendance,
  setModal,
}) {
  const response =
    user.role === "PROVIDER" ? r.provider_response : r.employee_response;
  const record =
    r.attendance?.find(
      (a) => a.employee_id === user.id || a.employeeId === user.id,
    ) || r.attendance?.[0];
  return (
    <div className="pc-drawer-section">
      <h3>Your visit</h3>
      <Badge>{response || "Pending"}</Badge>
      {response === "Pending" ? (
        <div className="pc-button-stack">
          <Button
            disabled={Boolean(busy)}
            onClick={() =>
              action(
                r.id,
                `/${user.role === "PROVIDER" ? "provider" : "employee"}/assignments/${r.id}/response`,
                "PATCH",
                { response: "Accepted", note: "" },
                "Visit accepted. Record arrival when you reach the household.",
              )
            }
          >
            <I name="check" size={18} />
            Accept assignment
          </Button>
          <Button
            secondary
            onClick={() => setModal({ kind: "decline", item: r })}
          >
            Decline with a reason
          </Button>
        </div>
      ) : (
        response === "Accepted" && (
          <div className="pc-button-stack">
            {!CLOSED.includes(r.status) &&
              (!record ? (
                <Button
                  disabled={Boolean(busy)}
                  onClick={() => attendance(r, "check-in")}
                >
                  <I name="pin" size={18} />
                  {busy === `attendance-${r.id}`
                    ? "Collecting location…"
                    : "Record arrival"}
                </Button>
              ) : (
                !(record.check_out_at || record.checkOutAt) && (
                  <Button
                    disabled={Boolean(busy)}
                    onClick={() => attendance(r, "check-out")}
                  >
                    <I name="check" size={18} />
                    {busy === `attendance-${r.id}`
                      ? "Collecting location…"
                      : "Record departure & complete"}
                  </Button>
                )
              ))}
            <Button
              secondary
              onClick={() => setModal({ kind: "visitReport", item: r })}
            >
              <I name="file" size={18} />
              Send a visit note or report
            </Button>
            {!CLOSED.includes(r.status) && (
              <Button
                secondary
                onClick={() => setModal({ kind: "progress", item: r })}
              >
                <I name="clock" size={18} />
                Report a delay or service problem
              </Button>
            )}
            <p className="pc-form-note">
              Location is requested only when you record arrival or departure.
              Allow precise location, stay still and let your phone collect a
              fresh reading.
            </p>
          </div>
        )
      )}
    </div>
  );
}
function modalTitle(m) {
  return (
    {
      household: m.item ? "Edit household" : "A home for your care plan",
      client: m.item ? "Manage client account" : "Add a client account",
      employee: "Add a team member",
      staff: `${person(m.item)} · staff profile`,
      department: m.item ? "Edit department" : "Create a department",
      application: "Provider application",
      request: "Arrange some help at home",
      change:
        m.changeKind === "Cancel"
          ? "Request a cancellation"
          : "Find a better time",
      changeReview: "Review service change",
      feedback: "We’re listening",
      feedbackReview: "Follow up on customer feedback",
      leave: "Request some time off",
      leaveReview: "Review a time-off request",
      decline: "Decline this assignment",
      visitReport: "Share a visit update",
      progress: "Update your visit progress",
      attendanceReview: "Review an attendance discrepancy",
      serviceReportReview: "Follow up on a visit report",
      document: "Upload a document",
      documentReview: "Review document",
      quote: "Agree the service quote",
      invoice: "Create an invoice",
      invoiceView: "Invoice details",
      invoicePayment: "Record a payment or refund",
      payroll: "Calculate team pay",
      payrollPayment: "Record payroll payment",
      expense: "Record an operating expense",
      contactReview: "Follow up on a website enquiry",
      communication: "Send an account message",
    }[m.kind] || "Details"
  );
}
function modalSubtitle(m) {
  return (
    m.item?.reference ||
    {
      household:
        "The address, contacts and details that help us coordinate care.",
      request:
        "Tell us the details. The team will confirm scope, availability and pricing with you.",
      staff:
        "Keep qualifications, screening, availability and pay terms together.",
      invoice: "Issue a clear record of the services and agreed costs.",
      document: "Keep documents private and connected to the right person.",
    }[m.kind]
  );
}
function HouseholdForm({
  item,
  admin,
  manager,
  clients = [],
  busy,
  onSubmit,
  acquireLocation,
}) {
  const [contacts, setContacts] = useState(
    item?.contacts?.length
      ? item.contacts
      : [
          {
            name: "",
            relationship: "",
            phone: "",
            email: "",
            isEmergency: true,
            isAuthorized: true,
          },
        ],
  );
  const [location, setLocation] = useState({
    latitude: item?.latitude ?? "",
    longitude: item?.longitude ?? "",
  });
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const changeContact = (i, k, v) =>
    setContacts((c) => c.map((r, j) => (i === j ? { ...r, [k]: v } : r)));
  return (
    <form
      className="pc-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSubmit({
          clientId: manager ? val(f, "clientId") : undefined,
          locationApproved: admin
            ? f.get("locationApproved") === "on"
            : undefined,
          name: val(f, "name"),
          address: val(f, "address"),
          neighborhood: val(f, "neighborhood"),
          latitude: location.latitude === "" ? null : Number(location.latitude),
          longitude:
            location.longitude === "" ? null : Number(location.longitude),
          geofenceMeters: Number(val(f, "geofenceMeters") || 200),
          contacts: contacts.filter((c) => c.name.trim()),
        });
      }}
    >
      {manager && !item && (
        <Field label="Client account">
          <select name="clientId" required>
            <option value="">Select the client who owns this household</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {person(c)}
                {c.email ? ` · ${c.email}` : ""}
              </option>
            ))}
          </select>
        </Field>
      )}
      <div className="pc-form-grid">
        <Field label="Household name">
          <input
            name="name"
            defaultValue={item?.name || ""}
            placeholder="e.g. The Uwimana home"
            required
            maxLength="120"
          />
        </Field>
        <Field label="Neighborhood / area">
          <input
            name="neighborhood"
            defaultValue={item?.neighborhood || ""}
            required
            maxLength="100"
          />
        </Field>
        <Field label="Full address" wide>
          <textarea
            rows="2"
            name="address"
            defaultValue={item?.address || ""}
            placeholder="Street, house number and directions"
            required
            maxLength="1000"
          />
        </Field>
      </div>
      <div className="pc-form-subhead">
        <h3>Arrival location</h3>
        <Button
          small
          secondary
          disabled={gpsBusy}
          onClick={async () => {
            setGpsBusy(true);
            setGpsError("");
            try {
              const l = await acquireLocation();
              setLocation({ latitude: l.latitude, longitude: l.longitude });
            } catch (e) {
              setGpsError(e.message);
            } finally {
              setGpsBusy(false);
            }
          }}
        >
          <I name="pin" size={16} />
          {gpsBusy ? "Collecting location…" : "Use my current location"}
        </Button>
      </div>
      <p className="pc-form-note">
        Capture this when you are at the household. It helps verify team
        arrivals.
      </p>
      {gpsError && <p className="pc-inline-error">{gpsError}</p>}
      <div className="pc-form-grid">
        <Field label="Latitude">
          <input
            type="number"
            step="any"
            min="-90"
            max="90"
            required={location.longitude !== ""}
            value={location.latitude}
            onChange={(e) =>
              setLocation({ ...location, latitude: e.target.value })
            }
          />
        </Field>
        <Field label="Longitude">
          <input
            type="number"
            step="any"
            min="-180"
            max="180"
            required={location.latitude !== ""}
            value={location.longitude}
            onChange={(e) =>
              setLocation({ ...location, longitude: e.target.value })
            }
          />
        </Field>
        <Field label="Arrival verification radius (meters)">
          <input
            type="number"
            name="geofenceMeters"
            min="50"
            max="1000"
            defaultValue={item?.geofenceMeters || 200}
          />
        </Field>
      </div>
      {admin && (
        <label className="pc-checkbox">
          <input
            type="checkbox"
            name="locationApproved"
            defaultChecked={item?.locationApproved || false}
          />
          I have verified and approve this household location for attendance
        </label>
      )}
      <div className="pc-form-subhead">
        <h3>People we can contact</h3>
        <button
          type="button"
          className="pc-text-btn"
          onClick={() =>
            setContacts((c) => [
              ...c,
              {
                name: "",
                relationship: "",
                phone: "",
                email: "",
                isEmergency: false,
                isAuthorized: false,
              },
            ])
          }
        >
          Add contact
          <I name="plus" size={15} />
        </button>
      </div>
      {contacts.map((c, i) => (
        <div className="pc-contact-form" key={i}>
          <div className="pc-contact-form-head">
            <strong>Contact {i + 1}</strong>
            {contacts.length > 1 && (
              <button
                type="button"
                className="pc-text-btn"
                onClick={() =>
                  setContacts((cs) => cs.filter((_, j) => j !== i))
                }
              >
                Remove
              </button>
            )}
          </div>
          <div className="pc-form-grid">
            <Field label="Full name">
              <input
                value={c.name}
                onChange={(e) => changeContact(i, "name", e.target.value)}
                required
                minLength="2"
                maxLength="120"
              />
            </Field>
            <Field label="Relationship">
              <input
                value={c.relationship}
                onChange={(e) =>
                  changeContact(i, "relationship", e.target.value)
                }
                placeholder="Parent, spouse, family contact…"
                required
                maxLength="80"
              />
            </Field>
            <Field label="Phone">
              <input
                type="tel"
                value={c.phone}
                onChange={(e) => changeContact(i, "phone", e.target.value)}
                required
              />
            </Field>
            <Field label="Email (optional)">
              <input
                type="email"
                value={c.email || ""}
                onChange={(e) => changeContact(i, "email", e.target.value)}
              />
            </Field>
          </div>
          <label className="pc-checkbox">
            <input
              type="checkbox"
              checked={c.isEmergency}
              onChange={(e) =>
                changeContact(i, "isEmergency", e.target.checked)
              }
            />
            Emergency contact
          </label>
          <label className="pc-checkbox">
            <input
              type="checkbox"
              checked={c.isAuthorized}
              onChange={(e) =>
                changeContact(i, "isAuthorized", e.target.checked)
              }
            />
            Authorized to coordinate services
          </label>
        </div>
      ))}
      <Submit busy={busy}>Save household</Submit>
    </form>
  );
}
function LeaveForm({ busy, onSubmit }) {
  const [kind, setKind] = useState("Time off");
  const [startDate, setStartDate] = useState("");
  const partial = ["Early departure permission", "Schedule change"].includes(
    kind,
  );
  return (
    <form
      className="pc-form"
      onSubmit={(event) => {
        event.preventDefault();
        const f = new FormData(event.currentTarget);
        onSubmit({
          kind,
          startDate,
          endDate: partial ? startDate : val(f, "endDate"),
          startTime: partial ? val(f, "startTime") : null,
          endTime: partial ? val(f, "endTime") : null,
          reason: val(f, "reason"),
        });
      }}
    >
      <Field label="What do you need?">
        <select value={kind} onChange={(event) => setKind(event.target.value)}>
          {[
            "Time off",
            "Absence",
            "Early departure permission",
            "Schedule change",
          ].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </Field>
      <Field label={partial ? "Date" : "From"}>
        <input
          type="date"
          min={dayToday()}
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          required
        />
      </Field>
      {partial ? (
        <>
          <p className="pc-form-note">
            Choose the period on this date when you will be unavailable.
          </p>
          <div className="pc-form-grid">
            <Field label="Unavailable from">
              <input type="time" name="startTime" required />
            </Field>
            <Field label="Unavailable until">
              <input type="time" name="endTime" required />
            </Field>
          </div>
        </>
      ) : (
        <Field label="Through">
          <input
            type="date"
            min={startDate || dayToday()}
            name="endDate"
            required
          />
        </Field>
      )}
      <Field label="Reason">
        <textarea
          name="reason"
          rows="3"
          minLength="10"
          maxLength="1000"
          required
        />
      </Field>
      <Submit busy={busy}>Send time-off request</Submit>
    </form>
  );
}
function StaffForm({ item, admin, departments, busy, onSubmit }) {
  const p = item.staffProfile || item.profile || {};
  const [days, setDays] = useState(p.availability?.map((d) => d.day) || []);
  return (
    <form
      className="pc-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSubmit({
          departmentId: val(f, "departmentId") || null,
          jobTitle: val(f, "jobTitle"),
          screeningStatus: val(f, "screeningStatus"),
          screeningNotes: val(f, "screeningNotes"),
          qualifications: val(f, "qualifications")
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          availability: days.map((day) => ({
            day,
            start: val(f, `start-${day}`),
            end: val(f, `end-${day}`),
          })),
          ...(admin
            ? {
                hourlyRateRwf: Number(val(f, "hourlyRateRwf") || 0),
                monthlySalaryRwf: Number(val(f, "monthlySalaryRwf") || 0),
                contractStart: val(f, "contractStart") || null,
                contractEnd: val(f, "contractEnd") || null,
              }
            : {}),
          status: val(f, "status"),
        });
      }}
    >
      <div className="pc-form-grid">
        <Field label="Department">
          <select name="departmentId" defaultValue={p.departmentId || ""}>
            <option value="">Choose department</option>
            {departments.map((d) => (
              <option value={d.id} key={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Job title">
          <input
            name="jobTitle"
            defaultValue={p.jobTitle || ""}
            required
            maxLength="120"
          />
        </Field>
        <Field label="Screening status">
          <select
            name="screeningStatus"
            defaultValue={p.screeningStatus || "Pending"}
          >
            {["Pending", "In review", "Cleared", "Rejected"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Work status">
          <select name="status" defaultValue={p.status || "Active"}>
            {["Active", "Paused", "Ended"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Qualifications — one per line" wide>
          <textarea
            name="qualifications"
            rows="3"
            defaultValue={(p.qualifications || []).join("\n")}
            maxLength="2000"
          />
        </Field>
        <Field label="Screening notes" wide>
          <textarea
            name="screeningNotes"
            rows="3"
            defaultValue={p.screeningNotes || ""}
            maxLength="2000"
          />
        </Field>
        {admin && (
          <>
            <Field label="Contract start">
              <input
                type="date"
                name="contractStart"
                defaultValue={p.contractStart?.slice(0, 10) || ""}
              />
            </Field>
            <Field label="Contract end">
              <input
                type="date"
                name="contractEnd"
                defaultValue={p.contractEnd?.slice(0, 10) || ""}
              />
            </Field>
            <Field label="Hourly rate (RWF)">
              <input
                type="number"
                name="hourlyRateRwf"
                min="0"
                defaultValue={p.hourlyRateRwf || 0}
              />
            </Field>
            <Field label="Monthly salary (RWF)">
              <input
                type="number"
                name="monthlySalaryRwf"
                min="0"
                defaultValue={p.monthlySalaryRwf || 0}
              />
            </Field>
          </>
        )}
      </div>
      <h3>Usual availability</h3>
      <div className="pc-day-picker">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
          <label className={days.includes(i) ? "selected" : ""} key={d}>
            <input
              type="checkbox"
              checked={days.includes(i)}
              onChange={(e) =>
                setDays((x) =>
                  e.target.checked ? [...x, i] : x.filter((n) => n !== i),
                )
              }
            />
            {d}
          </label>
        ))}
      </div>
      {[...days]
        .sort((a, b) => a - b)
        .map((day) => {
          const available = p.availability?.find(
            (entry) => Number(entry.day) === day,
          );
          const dayName = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ][day];
          return (
            <div className="pc-form-grid" key={day}>
              <Field label={`${dayName} from`}>
                <input
                  type="time"
                  name={`start-${day}`}
                  defaultValue={available?.start || "08:00"}
                  required
                />
              </Field>
              <Field label={`${dayName} to`}>
                <input
                  type="time"
                  name={`end-${day}`}
                  defaultValue={available?.end || "17:00"}
                  required
                />
              </Field>
            </div>
          );
        })}
      <Submit busy={busy}>Save staff profile</Submit>
    </form>
  );
}
function DepartmentForm({ item: d, busy, onSubmit }) {
  return (
    <form
      className="pc-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSubmit({
          name: val(f, "name"),
          service: val(f, "service"),
          description: val(f, "description"),
          hourlyRateRwf: Number(val(f, "hourlyRateRwf")),
          minimumHours: Number(val(f, "minimumHours")),
          qualificationRules: val(f, "qualificationRules")
            .split("\n")
            .map((v) => v.trim())
            .filter(Boolean),
        });
      }}
    >
      <Field label="Department name">
        <input
          name="name"
          defaultValue={d?.name || ""}
          required
          maxLength="120"
        />
      </Field>
      <Field label="Service">
        <select name="service" defaultValue={d?.service || "elderly"}>
          {Object.entries(SERVICES).map(([k, v]) => (
            <option value={k} key={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Description">
        <textarea
          name="description"
          rows="3"
          defaultValue={d?.description || ""}
          required
          maxLength="2000"
        />
      </Field>
      <div className="pc-form-grid">
        <Field label="Hourly rate (RWF)">
          <input
            type="number"
            name="hourlyRateRwf"
            min="0"
            defaultValue={d?.hourlyRateRwf || 0}
            required
          />
        </Field>
        <Field label="Minimum hours">
          <input
            type="number"
            name="minimumHours"
            min="1"
            max="24"
            defaultValue={d?.minimumHours || 2}
            required
          />
        </Field>
      </div>
      <Field label="Qualification & screening requirements">
        <textarea
          name="qualificationRules"
          rows="3"
          defaultValue={
            Array.isArray(d?.qualificationRules)
              ? d.qualificationRules.join("\n")
              : d?.qualificationRules || ""
          }
          maxLength="2000"
        />
      </Field>
      <Submit busy={busy}>Save department</Submit>
    </form>
  );
}
function RequestForm({ user, households, busy, onSubmit }) {
  const [service, setService] = useState("elderly");
  const [recurring, setRecurring] = useState(false);
  return (
    <form
      className="pc-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSubmit({
          fullName: val(f, "fullName"),
          email: user.email,
          phone: val(f, "phone"),
          preferredContact: val(f, "preferredContact"),
          service,
          neighborhood: val(f, "neighborhood"),
          householdId: val(f, "householdId") || undefined,
          date: val(f, "date"),
          time: val(f, "time"),
          duration: Number(val(f, "duration")),
          recurring,
          recurringWeeks: recurring ? Number(val(f, "recurringWeeks")) : 1,
          contactConsent: true,
          details: {
            notes: [
              val(f, "notes"),
              val(f, "preferredProfessional")
                ? `Preferred professional (subject to approval): ${val(f, "preferredProfessional")}`
                : "",
            ]
              .filter(Boolean)
              .join("\n"),
            ...(service === "childcare"
              ? {
                  ageRange: val(f, "ageRange"),
                  guardianAuthorization:
                    f.get("guardianAuthorization") === "on",
                }
              : {}),
            ...(service === "cooking"
              ? { people: Number(val(f, "people")) }
              : {}),
          },
        });
      }}
    >
      <div className="pc-form-grid">
        <Field label="Full name">
          <input
            name="fullName"
            defaultValue={person(user)}
            required
            minLength="2"
            maxLength="100"
          />
        </Field>
        <Field label="Phone">
          <input
            name="phone"
            type="tel"
            defaultValue={user.phone || ""}
            required
          />
        </Field>
        <Field label="Household">
          <select name="householdId">
            <option value="">Not linked to a saved household</option>
            {households.map((h) => (
              <option value={h.id} key={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Neighborhood / area">
          <input name="neighborhood" required maxLength="100" />
        </Field>
        <Field label="Service" wide>
          <select value={service} onChange={(e) => setService(e.target.value)}>
            {Object.entries(SERVICES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Preferred date">
          <input type="date" min={dayToday()} name="date" required />
        </Field>
        <Field label="Preferred time">
          <input type="time" name="time" required />
        </Field>
        <Field label="Duration">
          <select name="duration">
            {[2, 3, 4, 6, 8].map((n) => (
              <option value={n} key={n}>
                {n} hours
              </option>
            ))}
          </select>
        </Field>
        <Field label="Contact preference">
          <select name="preferredContact">
            <option value="phone">Phone call</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
          </select>
        </Field>
        {service === "childcare" && (
          <Field label="Child’s age range">
            <select name="ageRange">
              {["Under 2", "2–5", "6–12", "13–17"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        )}
        {service === "cooking" && (
          <Field label="People to cook for">
            <input
              type="number"
              name="people"
              min="1"
              max="12"
              required
              defaultValue="2"
            />
          </Field>
        )}
        <Field
          label="Preferred professional (optional)"
          wide
          hint="If you know someone you would like to work with, tell us their name. The team will check suitability and availability."
        >
          <input name="preferredProfessional" maxLength="120" />
        </Field>
        <Field label="What would help?" wide>
          <textarea
            name="notes"
            rows="3"
            maxLength="420"
            placeholder="Share practical details about the service. Please avoid medical records or identity numbers."
          />
        </Field>
      </div>
      {service === "childcare" && (
        <label className="pc-checkbox">
          <input name="guardianAuthorization" type="checkbox" required />I am
          the child’s parent or guardian and authorize this childcare request.
        </label>
      )}
      <label className="pc-checkbox">
        <input
          name="recurring"
          type="checkbox"
          checked={recurring}
          onChange={(e) => setRecurring(e.target.checked)}
        />
        I’d like to arrange weekly visits
      </label>
      {recurring && (
        <Field
          label="Number of weekly visits"
          hint="Each visit has its own schedule, assignment and invoice."
        >
          <input
            type="number"
            min="2"
            max="12"
            name="recurringWeeks"
            defaultValue="4"
            required
          />
        </Field>
      )}
      <label className="pc-checkbox">
        <input name="consent" type="checkbox" required />I agree to be contacted
        about this service request.
      </label>
      <p className="pc-form-note">
        This is a request, rather than a confirmed booking. We’ll agree the
        provider, scope, price and terms with you first.
      </p>
      <Submit busy={busy}>Send service request</Submit>
    </form>
  );
}
function InvoiceForm({ requests, requestId, busy, onSubmit }) {
  const [lines, setLines] = useState([
    { description: "", quantity: 1, unitPriceRwf: "" },
  ]);
  return (
    <form
      className="pc-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSubmit({
          requestId: val(f, "requestId"),
          dueDate: val(f, "dueDate") || undefined,
          lineItems: lines.map((l) => ({
            ...l,
            quantity: Number(l.quantity),
            unitPriceRwf: Number(l.unitPriceRwf),
          })),
        });
      }}
    >
      <div className="pc-form-grid">
        <Field label="Service request">
          <select name="requestId" defaultValue={requestId || ""} required>
            <option value="">Choose a request</option>
            {requests.map((r) => (
              <option key={r.id} value={r.id}>
                {r.reference} · {person(r)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Payment due">
          <input type="date" name="dueDate" />
        </Field>
      </div>
      <div className="pc-form-subhead">
        <h3>Invoice items</h3>
        <button
          type="button"
          className="pc-text-btn"
          onClick={() =>
            setLines((ls) => [
              ...ls,
              { description: "", quantity: 1, unitPriceRwf: "" },
            ])
          }
        >
          Add item
          <I name="plus" size={15} />
        </button>
      </div>
      {lines.map((l, i) => (
        <div className="pc-invoice-line" key={i}>
          <Field label="Description">
            <input
              value={l.description}
              onChange={(e) =>
                setLines((ls) =>
                  ls.map((r, j) =>
                    i === j ? { ...r, description: e.target.value } : r,
                  ),
                )
              }
              required
              maxLength="200"
            />
          </Field>
          <Field label="Quantity">
            <input
              type="number"
              min="0.25"
              step="0.25"
              value={l.quantity}
              onChange={(e) =>
                setLines((ls) =>
                  ls.map((r, j) =>
                    i === j ? { ...r, quantity: e.target.value } : r,
                  ),
                )
              }
              required
            />
          </Field>
          <Field label="Unit price (RWF)">
            <input
              type="number"
              min="0"
              step="1"
              value={l.unitPriceRwf}
              onChange={(e) =>
                setLines((ls) =>
                  ls.map((r, j) =>
                    i === j ? { ...r, unitPriceRwf: e.target.value } : r,
                  ),
                )
              }
              required
            />
          </Field>
          {lines.length > 1 && (
            <button
              type="button"
              className="pc-icon-btn"
              aria-label="Remove invoice item"
              onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
            >
              <I name="close" size={17} />
            </button>
          )}
        </div>
      ))}
      <div className="pc-invoice-total">
        <span>Total</span>
        <strong>
          {money(
            lines.reduce(
              (n, l) => n + Number(l.quantity) * Number(l.unitPriceRwf),
              0,
            ),
          )}
        </strong>
      </div>
      <Submit busy={busy}>Issue invoice</Submit>
    </form>
  );
}
function InvoiceView({
  invoice: i,
  admin,
  busy,
  paymentsEnabled,
  checkout,
  onPayment,
}) {
  const total = Number(i.totalRwf || i.total_rwf || 0);
  const paid = Number(i.netPaidRwf ?? i.paidAmountRwf ?? i.paidRwf ?? 0);
  const transactions = i.payments || i.transactions || [];
  return (
    <div className="pc-invoice-view">
      <div className="pc-invoice-brand">
        <span>
          wellness <small>HOME CARE</small>
        </span>
        <Badge>{i.status}</Badge>
      </div>
      <div className="pc-invoice-meta">
        <div>
          <p className="pc-eyebrow">INVOICE</p>
          <h3>{i.number || i.reference}</h3>
          <p>
            {i.customer?.fullName ||
              i.request?.fullName ||
              i.request?.full_name ||
              i.customerName}
          </p>
        </div>
        <div>
          <span>Issued {dateText(i.createdAt)}</span>
          <span>Due {dateText(i.dueDate)}</span>
        </div>
      </div>
      <DataTable
        rows={i.lineItems || []}
        columns={[
          { key: "description", title: "Description" },
          { key: "quantity", title: "Qty" },
          {
            key: "unitPriceRwf",
            title: "Unit price",
            render: (l) => money(l.unitPriceRwf),
          },
          {
            key: "total",
            title: "Amount",
            render: (l) => money(Number(l.quantity) * Number(l.unitPriceRwf)),
          },
        ]}
      />
      <div className="pc-invoice-summary">
        <div>
          <span>Invoice total</span>
          <strong>{money(total)}</strong>
        </div>
        <div>
          <span>Payments received</span>
          <span>{money(paid)}</span>
        </div>
        <div>
          <span>Balance due</span>
          <strong>{money(Math.max(0, total - paid))}</strong>
        </div>
      </div>
      <h3>Payment history</h3>
      {transactions.length ? (
        transactions.map((t) => (
          <div className="pc-payment-record" key={t.id}>
            <div>
              <strong>
                {t.kind === "REFUND" ? "Refund" : "Payment"} · {t.method}
              </strong>
              <small>
                {t.reference} · {dateText(t.createdAt)}
              </small>
            </div>
            <strong>{money(t.amountRwf)}</strong>
          </div>
        ))
      ) : (
        <p className="pc-muted">No payments recorded yet.</p>
      )}
      <div className="pc-button-stack pc-no-print">
        {paid < total && paymentsEnabled && (
          <Button disabled={Boolean(busy)} onClick={() => checkout(i)}>
            Pay securely online
            <I name="arrow" size={17} />
          </Button>
        )}
        {admin && (
          <Button secondary onClick={() => onPayment(i)}>
            Record payment or refund
          </Button>
        )}
        <Button secondary onClick={() => window.print()}>
          <I name="download" size={17} />
          Print / save invoice & receipt
        </Button>
      </div>
      <p className="pc-form-note">
        {paymentsEnabled
          ? "Online payment opens a secure hosted payment page. No card details are collected in this portal."
          : "Contact the team to arrange payment and have it recorded against this invoice."}
      </p>
    </div>
  );
}
