import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type Role = "agent" | "supervisor" | "admin";

type AuthViewState = {
  user: User | null;
  role: Role | null;
  fullName: string;
  loadingSession: boolean;
  loadingLogin: boolean;
  loadingProfile: boolean;
  email: string;
  password: string;
  error: string;
  toast: string;
  toastPersistent: boolean;
};

type ProfileRow = {
  role: string | null;
  full_name: string | null;
};

type Feature = {
  icon: string;
  label: string;
  path: string;
  primary?: boolean;
};

const ROLE_SET = new Set<Role>(["agent", "supervisor", "admin"]);
const FEATURE_MAP: Record<Role, Feature[]> = {
  agent: [
    { icon: "RQ", label: "Request Leave", path: "/agent/request", primary: true },
    { icon: "ML", label: "My Leaves", path: "/agent/leaves" },
    { icon: "LB", label: "Leave Balance Summary", path: "/agent/balance" },
    { icon: "PR", label: "Profile", path: "/agent/profile" },
  ],
  supervisor: [
    { icon: "AP", label: "Approve Leaves", path: "/supervisor/approve", primary: true },
    { icon: "TL", label: "Team Leaves", path: "/supervisor/leaves" },
    { icon: "TO", label: "Team Overview", path: "/supervisor/overview" },
    { icon: "RP", label: "Reports", path: "/supervisor/reports" },
  ],
  admin: [
    { icon: "MU", label: "Manage Users", path: "/admin/users", primary: true },
    { icon: "SS", label: "System Settings", path: "/admin/settings" },
    { icon: "AL", label: "Audit Logs", path: "/admin/audit" },
    { icon: "RM", label: "Role Management", path: "/admin/roles" },
    { icon: "LP", label: "Leave Policy Config", path: "/admin/policies" },
  ],
};
const PROFILE_TIMEOUT_MS = 7000;
const DRAFT_EMAIL_KEY = "leaveflow_popup_email";
const DASHBOARD_BASE =
  (import.meta.env.VITE_DASHBOARD_URL as string | undefined)?.trim() ||
  "https://emp-saas-platform.vercel.app";
const ROLE_HOME_MAP: Record<Role, string> = {
  agent: "/agent/overview",
  supervisor: "/supervisor/overview",
  admin: "/admin/overview",
};

const THEME = {
  bg0: "#070a12",
  bg1: "#0f172a",
  card: "rgba(11, 18, 32, 0.9)",
  stroke: "rgba(148, 163, 184, 0.24)",
  text: "#e2e8f0",
  muted: "#94a3b8",
  violet: "#7c3aed",
  teal: "#10b981",
  amber: "#f59e0b",
};

const INITIAL_STATE: AuthViewState = {
  user: null,
  role: null,
  fullName: "",
  loadingSession: true,
  loadingLogin: false,
  loadingProfile: false,
  email: "",
  password: "",
  error: "",
  toast: "",
  toastPersistent: false,
};

function debugLog(...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.info("[leaveflow-popup]", ...args);
  }
}

function parseRole(value: unknown): Role | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return ROLE_SET.has(normalized as Role) ? (normalized as Role) : null;
}

function emailLocalPart(email: string | null | undefined): string {
  if (!email) return "";
  const [local] = email.split("@");
  return local || "";
}

function nameFromMetadata(user: User): string {
  const uName = user.user_metadata?.full_name;
  if (typeof uName === "string" && uName.trim()) {
    return uName.trim();
  }

  const aName = user.app_metadata?.full_name;
  if (typeof aName === "string" && aName.trim()) {
    return aName.trim();
  }

  return "";
}

function resolveAgentId(user: User): string {
  const userAgentId = user.user_metadata?.agent_id;
  if (typeof userAgentId === "string" && userAgentId.trim()) {
    return userAgentId.trim();
  }
  if (typeof userAgentId === "number") {
    return String(userAgentId);
  }

  const appAgentId = user.app_metadata?.agent_id;
  if (typeof appAgentId === "string" && appAgentId.trim()) {
    return appAgentId.trim();
  }
  if (typeof appAgentId === "number") {
    return String(appAgentId);
  }

  return "";
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function roleHomePath(role: Role): string {
  return ROLE_HOME_MAP[role];
}

type OpenDashboardResult = {
  ok: boolean;
  message?: string;
  persistent?: boolean;
};

type DashboardTokens = {
  accessToken?: string;
  refreshToken?: string;
};

function buildDashboardUrl(
  role: Role,
  path?: string,
  tokens?: DashboardTokens
): { url?: string; message?: string; persistent?: boolean } {
  if (!DASHBOARD_BASE) {
    return { message: "Dashboard URL not configured — set VITE_DASHBOARD_URL", persistent: true };
  }

  const rolePath = ROLE_HOME_MAP[role];
  if (!rolePath) {
    return { message: "Dashboard route is invalid for your role.", persistent: true };
  }

  const targetPath = (path || rolePath).startsWith("/") ? (path || rolePath) : `/${path || rolePath}`;
  const base = normalizeBaseUrl(DASHBOARD_BASE);
  try {
    const url = new URL(`${base}${targetPath}`);
    url.searchParams.set("role", role);
    if (tokens?.accessToken) {
      url.searchParams.set("access_token", tokens.accessToken);
    }
    if (tokens?.refreshToken) {
      url.searchParams.set("refresh_token", tokens.refreshToken);
    }
    return { url: url.toString() };
  } catch {
    return { message: "Dashboard URL is invalid — check VITE_DASHBOARD_URL", persistent: true };
  }
}

function openDashboard(path: string, role: Role, tokens?: DashboardTokens): OpenDashboardResult {
  const { url, message, persistent } = buildDashboardUrl(role, path, tokens);
  if (!url) {
    return { ok: false, message, persistent };
  }

  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    return { ok: false, message: "Unable to open dashboard tab.", persistent: false };
  }
  return { ok: true };
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header style={styles.header}>
      <div style={styles.headerGlowViolet} />
      <div style={styles.headerGlowTeal} />
      <div style={styles.logo}>LF</div>
      <div>
        <h3 style={styles.headerTitle}>{title}</h3>
        <p style={styles.headerSubtitle}>{subtitle}</p>
      </div>
    </header>
  );
}

function FeatureButton({
  icon,
  label,
  onClick,
  primary,
  accent,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  primary?: boolean;
  accent: "teal" | "violet" | "amber";
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const dynamic: CSSProperties = {
    transform: pressed ? "scale(0.986)" : hovered ? "scale(1.01)" : "scale(1)",
    borderColor:
      primary && hovered
        ? accent === "teal"
          ? "rgba(16,185,129,0.7)"
          : accent === "amber"
            ? "rgba(245,158,11,0.75)"
            : "rgba(124,58,237,0.75)"
        : undefined,
    boxShadow: primary
      ? hovered
        ? accent === "teal"
          ? "0 0 0 1px rgba(16,185,129,0.42), 0 10px 20px rgba(16,185,129,0.28)"
          : accent === "amber"
            ? "0 0 0 1px rgba(245,158,11,0.42), 0 10px 20px rgba(245,158,11,0.26)"
            : "0 0 0 1px rgba(124,58,237,0.42), 0 10px 20px rgba(124,58,237,0.36)"
        : accent === "teal"
          ? "0 0 0 1px rgba(16,185,129,0.28), 0 6px 14px rgba(16,185,129,0.2)"
          : accent === "amber"
            ? "0 0 0 1px rgba(245,158,11,0.28), 0 6px 14px rgba(245,158,11,0.2)"
            : "0 0 0 1px rgba(124,58,237,0.28), 0 6px 14px rgba(124,58,237,0.24)"
      : hovered
        ? "0 8px 14px rgba(2, 6, 23, 0.36)"
        : "0 4px 9px rgba(2, 6, 23, 0.24)",
  };

  return (
    <button
      type="button"
      style={{ ...(primary ? styles.featurePrimary : styles.feature), ...dynamic }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onClick={onClick}
    >
      <span style={styles.featureIcon}>{icon}</span>
      <span style={styles.featureLabel}>{label}</span>
      <span style={styles.featureArrow}>{">"}</span>
    </button>
  );
}

function RoleFeatures({ role, onNavigate }: { role: Role; onNavigate: (path: string) => void }) {
  const accent: "teal" | "violet" | "amber" =
    role === "admin" ? "amber" : role === "supervisor" ? "violet" : "teal";
  const features = FEATURE_MAP[role] ?? FEATURE_MAP.agent;
  if (!FEATURE_MAP[role]) {
    debugLog("Unknown role for feature map. Falling back to agent.", role);
  }

  return (
    <div style={styles.featureList}>
      {features.map((feature) => (
        <FeatureButton
          key={feature.label}
          icon={feature.icon}
          label={feature.label}
          primary={feature.primary}
          accent={accent}
          onClick={() => onNavigate(feature.path)}
        />
      ))}
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<AuthViewState>(INITIAL_STATE);
  const lastHeightRef = useRef<number>(0);

  async function queryById(userId: string): Promise<ProfileRow | null> {
    const query = supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", userId)
      .maybeSingle();

    const { data, error } = await withTimeout(query, PROFILE_TIMEOUT_MS, "Profile query timed out");
    if (error) {
      throw new Error(error.message);
    }
    return (data as ProfileRow | null) ?? null;
  }

  async function queryByAgentId(agentId: string): Promise<ProfileRow | null> {
    const query = supabase
      .from("profiles")
      .select("role, full_name")
      .eq("agent_id", agentId)
      .maybeSingle();

    const { data, error } = await withTimeout(query, PROFILE_TIMEOUT_MS, "Profile query timed out");
    if (error) {
      throw new Error(error.message);
    }
    return (data as ProfileRow | null) ?? null;
  }

  async function resolveProfile(user: User, source: string) {
    debugLog("resolveProfile start", source, user.id);

    const appRole = parseRole(user.app_metadata?.role);
    const userMetaRole = parseRole(user.user_metadata?.role);
    const jwtRole: Role = appRole ?? userMetaRole ?? "agent";
    const metadataName = nameFromMetadata(user);
    const initialName = metadataName || emailLocalPart(user.email) || "User";

    // Never block feature rendering on profile query.
    setState((prev) => ({
      ...prev,
      user,
      role: jwtRole,
      fullName: initialName,
      loadingProfile: false,
      error: "",
    }));

    try {
      let finalRole: Role = jwtRole;
      let resolvedName = initialName;
      let profile: ProfileRow | null = null;

      try {
        debugLog("profile query by id", source, user.id);
        profile = await queryById(user.id);
      } catch (idError) {
        debugLog("profile query by id error", idError);
      }

      if (!profile) {
        const agentId = resolveAgentId(user);
        if (agentId) {
          try {
            debugLog("profile query by agent_id", source, agentId);
            profile = await queryByAgentId(agentId);
          } catch (agentError) {
            debugLog("profile query by agent_id error", agentError);
          }
        }
      }

      const dbRole = parseRole(profile?.role);
      finalRole = dbRole ?? jwtRole;

      if (typeof profile?.full_name === "string" && profile.full_name.trim()) {
        resolvedName = profile.full_name.trim();
      }

      debugLog("AUTH USER ID:", user.id);
      debugLog("JWT ROLE:", jwtRole);
      debugLog("PROFILE ROLE:", profile?.role);
      debugLog("FINAL ROLE:", finalRole);

      setState((prev) => ({
        ...prev,
        user,
        role: finalRole,
        fullName: resolvedName,
        loadingProfile: false,
        error: "",
      }));
      debugLog("resolveProfile done", source, finalRole, resolvedName);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Profile loading failed";
      const fallbackRole = jwtRole;
      const fallbackName = metadataName || emailLocalPart(user.email) || "User";

      setState((prev) => ({
        ...prev,
        user,
        role: fallbackRole,
        fullName: fallbackName,
        loadingProfile: false,
        error: message,
      }));
      debugLog("resolveProfile error", source, message);
    } finally {
      setState((prev) =>
        prev.loadingProfile ? { ...prev, loadingProfile: false } : prev
      );
      debugLog("resolveProfile end", source, user.id);
    }
  }

  useEffect(() => {
    const savedEmail = window.localStorage.getItem(DRAFT_EMAIL_KEY);
    if (savedEmail) {
      setState((prev) => ({ ...prev, email: savedEmail }));
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DRAFT_EMAIL_KEY, state.email);
  }, [state.email]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      if (Math.abs(height - lastHeightRef.current) < 2) return;
      lastHeightRef.current = height;
      if (typeof window.resizeTo === "function") {
        window.resizeTo(360, Math.min(height + 20, 650));
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [state.role, state.loadingProfile, state.loadingSession, state.toast, state.error]);

  useEffect(() => {
    let active = true;

    async function boot() {
      debugLog("boot start");
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error) {
        setState((prev) => ({ ...prev, loadingSession: false, loadingProfile: false, error: error.message, toast: "Session expired" }));
        return;
      }

      const user = data.session?.user ?? null;
      setState((prev) => ({
        ...prev,
        user,
        role: user
          ? parseRole(user.app_metadata?.role) ??
            parseRole(user.user_metadata?.role) ??
            "agent"
          : null,
        loadingSession: false,
      }));

      if (user) {
        await resolveProfile(user, "boot");
      }
    }

    const { data: authSub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return;
      const user = session?.user ?? null;

      debugLog("auth change", event, user?.id ?? null);

      if (!user) {
        setState((prev) => ({
          ...prev,
          user: null,
          role: null,
          fullName: "",
          loadingProfile: false,
          error: "",
          toast: event === "SIGNED_OUT" ? "Session expired" : "",
          toastPersistent: false,
        }));
        return;
      }

      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        setState((prev) => ({ ...prev, user, error: "" }));
        return;
      }

      setState((prev) => ({
        ...prev,
        user,
        role:
          parseRole(user.app_metadata?.role) ??
          parseRole(user.user_metadata?.role) ??
          "agent",
        error: "",
      }));
      await resolveProfile(user, `auth:${event}`);
    });

    void boot();

    return () => {
      active = false;
      authSub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!state.toast || state.toastPersistent) return;
    const timer = window.setTimeout(() => {
      setState((prev) => ({ ...prev, toast: "", toastPersistent: false }));
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [state.toast]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!state.email.trim() || !state.password) {
      setState((prev) => ({ ...prev, error: "Email and password are required." }));
      return;
    }

    setState((prev) => ({ ...prev, loadingLogin: true, error: "" }));

    const { error } = await supabase.auth.signInWithPassword({
      email: state.email.trim(),
      password: state.password,
    });

    if (error) {
      setState((prev) => ({ ...prev, loadingLogin: false, error: error.message }));
      return;
    }

    setState((prev) => ({ ...prev, password: "", loadingLogin: false, error: "" }));
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setState((prev) => ({ ...prev, error: error.message }));
      return;
    }

    setState((prev) => ({
      ...prev,
      user: null,
      role: null,
      fullName: "",
      password: "",
      loadingProfile: false,
      loadingLogin: false,
      error: "",
      toast: "",
      toastPersistent: false,
    }));
  }

  async function navigate(path: string) {
    if (!state.role) return;
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    const result = openDashboard(path, state.role as Role, {
      accessToken: session?.access_token,
      refreshToken: session?.refresh_token,
    });
    if (!result.ok) {
      setState((prev) => ({
        ...prev,
        toast: result.message ?? "Unable to open dashboard.",
        toastPersistent: Boolean(result.persistent),
      }));
    }
  }

  const roleLabel = useMemo(() => {
    if (!state.role) return "";
    return state.role.charAt(0).toUpperCase() + state.role.slice(1);
  }, [state.role]);

  const avatarText = useMemo(() => {
    const base = state.fullName || emailLocalPart(state.user?.email);
    if (!base) return "LF";
    const parts = base.split(/\s+/).filter(Boolean);
    const initials = parts.slice(0, 2).map((v) => v[0]?.toUpperCase() ?? "").join("");
    return initials || "LF";
  }, [state.fullName, state.user?.email]);

  const roleBadgeStyle = useMemo<CSSProperties>(() => {
    if (state.role === "admin") {
      return {
        color: "#fcd34d",
        borderColor: "rgba(245,158,11,0.42)",
        background: "linear-gradient(145deg, rgba(120,53,15,0.34), rgba(30,41,59,0.55))",
        boxShadow: "0 0 0 1px rgba(245,158,11,0.24), 0 0 16px rgba(245,158,11,0.18)",
      };
    }

    if (state.role === "supervisor") {
      return {
        color: "#ddd6fe",
        borderColor: "rgba(124,58,237,0.5)",
        background: "linear-gradient(145deg, rgba(76,29,149,0.34), rgba(30,41,59,0.55))",
        boxShadow: "0 0 0 1px rgba(124,58,237,0.25), 0 0 16px rgba(124,58,237,0.22)",
      };
    }

    return {
      color: "#a7f3d0",
      borderColor: "rgba(16,185,129,0.46)",
      background: "linear-gradient(145deg, rgba(6,95,70,0.34), rgba(30,41,59,0.55))",
      boxShadow: "0 0 0 1px rgba(16,185,129,0.24), 0 0 14px rgba(16,185,129,0.2)",
    };
  }, [state.role]);

  debugLog("RENDER ROLE:", state.role);

  if (state.loadingSession) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <Header title="LeaveFlow" subtitle="Initializing secure session" />
          <div style={styles.body}>
            <p style={styles.muted}>Loading session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!state.user) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <Header title="LeaveFlow" subtitle="Sign in to continue" />
          <form style={styles.body} onSubmit={handleLogin}>
            <label style={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              style={styles.input}
              value={state.email}
              onChange={(e) => setState((prev) => ({ ...prev, email: e.target.value }))}
              autoComplete="email"
              disabled={state.loadingLogin}
            />

            <label style={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              style={styles.input}
              value={state.password}
              onChange={(e) => setState((prev) => ({ ...prev, password: e.target.value }))}
              autoComplete="current-password"
              disabled={state.loadingLogin}
            />

            {state.error ? <p style={styles.errorText}>{state.error}</p> : null}

            <button type="submit" style={styles.loginButton} disabled={state.loadingLogin}>
              {state.loadingLogin ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!state.role) return null;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <Header title="LeaveFlow" subtitle="Role Workspace" />

        <div style={styles.body}>
          <section style={styles.identityCard}>
            <div style={styles.identityTopRow}>
              <div style={styles.avatar}>{avatarText}</div>
              <div style={{ ...styles.roleBadge, ...roleBadgeStyle }}>{roleLabel}</div>
            </div>
            <p style={styles.welcomeText}>
              Welcome, <strong>{state.fullName || emailLocalPart(state.user.email)}</strong>
            </p>
            <p style={styles.subline}>{state.user.email} • {roleLabel || "Agent"}</p>
            <div style={styles.divider} />
          </section>

          <RoleFeatures role={state.role} onNavigate={(path) => void navigate(path)} />

          <button
            type="button"
            style={styles.fullDashboardButton}
            onClick={() => void navigate(roleHomePath(state.role))}
          >
            Open Full Dashboard
          </button>

          <button type="button" style={styles.logoutButton} onClick={handleLogout}>
            Logout
          </button>

          {state.error ? <p style={styles.warningText}>{state.error}</p> : null}

          <section style={styles.signatureCard}>
            <div style={styles.signatureBadgeRow}>
              <span style={styles.signatureBadgePrimary}>EMP Signature</span>
              <span style={styles.signatureBadgeSecondary}>Muhammad Umair</span>
            </div>
            <p style={styles.signatureTitle}>Product Owner and Creator</p>
            <p style={styles.signatureName}>Muhammad Umair</p>
            <a href="tel:03106598623" style={styles.signaturePhone}>
              03106598623
            </a>
          </section>
        </div>
      </div>

      {state.toast ? (
        <div style={styles.toast}>
          <span>{state.toast}</span>
          <button
            type="button"
            style={styles.toastDismiss}
            onClick={() => setState((prev) => ({ ...prev, toast: "", toastPersistent: false }))}
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    width: "100%",
    minWidth: 320,
    maxWidth: 360,
    boxSizing: "border-box",
    margin: 0,
    padding: 10,
    color: THEME.text,
    fontFamily: "'Segoe UI', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    background: [
      "radial-gradient(circle at 88% 8%, rgba(124,58,237,0.24) 0%, rgba(124,58,237,0) 36%)",
      "radial-gradient(circle at 10% 88%, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0) 40%)",
      "radial-gradient(circle at 55% 100%, rgba(245,158,11,0.11) 0%, rgba(245,158,11,0) 38%)",
      `linear-gradient(145deg, ${THEME.bg0} 0%, ${THEME.bg1} 100%)`,
    ].join(","),
  },
  card: {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 16,
    overflow: "hidden",
    border: `1px solid ${THEME.stroke}`,
    background: THEME.card,
    boxShadow: "0 18px 30px rgba(2,6,23,0.54)",
    backdropFilter: "blur(8px)",
  },
  header: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "14px 14px",
    background:
      "linear-gradient(125deg, #0f172a 0%, #2c1f63 44%, #7c3aed 75%, #0f766e 100%)",
    backgroundSize: "180% 180%",
    animation: "headerGradientShift 16s ease-in-out infinite",
    borderBottom: `1px solid ${THEME.stroke}`,
  },
  headerGlowViolet: {
    position: "absolute",
    right: -30,
    top: -35,
    width: 118,
    height: 118,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(124,58,237,0.3) 0%, rgba(124,58,237,0) 70%)",
    pointerEvents: "none",
  },
  headerGlowTeal: {
    position: "absolute",
    left: -30,
    bottom: -45,
    width: 130,
    height: 130,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0) 70%)",
    pointerEvents: "none",
  },
  logo: {
    position: "relative",
    zIndex: 1,
    width: 36,
    height: 36,
    borderRadius: 11,
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: 13,
    letterSpacing: 0.2,
    background: "rgba(255,255,255,0.16)",
    border: "1px solid rgba(255,255,255,0.34)",
    color: "#eef2ff",
  },
  headerTitle: {
    margin: 0,
    fontSize: 17,
    lineHeight: 1.12,
    color: "#f8fafc",
    zIndex: 1,
  },
  headerSubtitle: {
    margin: "2px 0 0",
    fontSize: 12,
    color: "#dbeafe",
    opacity: 0.95,
    zIndex: 1,
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 14,
  },
  identityCard: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: 11,
    borderRadius: 12,
    border: `1px solid ${THEME.stroke}`,
    background: "linear-gradient(160deg, rgba(15,23,42,0.96), rgba(15,23,42,0.7) 55%, rgba(30,41,59,0.5))",
    boxShadow: "inset 0 1px 0 rgba(148,163,184,0.22)",
  },
  identityTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    fontSize: 11,
    fontWeight: 700,
    color: "#dbeafe",
    border: "1px solid rgba(148,163,184,0.35)",
    background: "linear-gradient(135deg, rgba(51,65,85,0.85), rgba(15,23,42,0.95))",
  },
  roleBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 11,
    fontWeight: 700,
    border: "1px solid transparent",
    background: "rgba(15,23,42,0.6)",
    letterSpacing: 0.2,
  },
  welcomeText: {
    margin: 0,
    fontSize: 14,
    color: "#f8fafc",
  },
  subline: {
    margin: 0,
    fontSize: 12,
    color: THEME.muted,
    wordBreak: "break-all",
  },
  divider: {
    marginTop: 2,
    height: 1,
    width: "100%",
    background: "linear-gradient(90deg, rgba(148,163,184,0.4), rgba(148,163,184,0.08))",
  },
  label: {
    fontSize: 12,
    color: "#cbd5e1",
    fontWeight: 600,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 12,
    border: `1px solid ${THEME.stroke}`,
    background: "rgba(2,6,23,0.45)",
    color: "#f8fafc",
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
  },
  loginButton: {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 12,
    border: "1px solid rgba(124,58,237,0.8)",
    padding: "10px 12px",
    fontWeight: 700,
    color: "#f8fafc",
    cursor: "pointer",
    background: "linear-gradient(120deg, #7c3aed 0%, #6d28d9 68%, #10b981 140%)",
    boxShadow: "0 0 0 1px rgba(124,58,237,0.32), 0 10px 18px rgba(124,58,237,0.3)",
    transition: "transform 120ms ease, box-shadow 160ms ease",
  },
  featureList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  feature: {
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: 9,
    borderRadius: 12,
    border: `1px solid ${THEME.stroke}`,
    background: "linear-gradient(150deg, rgba(30,41,59,0.6), rgba(15,23,42,0.76))",
    color: THEME.text,
    padding: "9px 11px",
    cursor: "pointer",
    transition: "transform 120ms ease, box-shadow 160ms ease",
  },
  featurePrimary: {
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: 9,
    borderRadius: 12,
    border: "1px solid rgba(124,58,237,0.55)",
    background: "linear-gradient(120deg, rgba(76,29,149,0.42), rgba(15,23,42,0.85))",
    color: "#ede9fe",
    padding: "9px 11px",
    cursor: "pointer",
    transition: "transform 120ms ease, box-shadow 160ms ease",
  },
  featureIcon: {
    width: 22,
    height: 22,
    borderRadius: 8,
    border: `1px solid ${THEME.stroke}`,
    background: "rgba(15,23,42,0.72)",
    color: "#c4b5fd",
    display: "grid",
    placeItems: "center",
    fontSize: 10,
    fontWeight: 700,
    flexShrink: 0,
  },
  featureLabel: {
    fontSize: 13,
    fontWeight: 600,
    textAlign: "left",
  },
  featureArrow: {
    marginLeft: "auto",
    fontSize: 13,
    color: "#64748b",
    fontWeight: 700,
  },
  fullDashboardButton: {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 12,
    border: "1px solid rgba(16,185,129,0.6)",
    background: "linear-gradient(122deg, rgba(6,95,70,0.74), rgba(15,23,42,0.9))",
    color: "#d1fae5",
    padding: "10px 12px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 0 0 1px rgba(16,185,129,0.24), 0 10px 18px rgba(16,185,129,0.22)",
  },
  logoutButton: {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 12,
    border: "1px solid rgba(248,113,113,0.5)",
    background: "rgba(127,29,29,0.2)",
    color: "#fecaca",
    padding: "9px 12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  muted: {
    margin: 0,
    color: THEME.muted,
    fontSize: 13,
  },
  warningText: {
    margin: 0,
    color: "#fcd34d",
    fontSize: 12,
  },
  signatureCard: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: 11,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.24)",
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(15,23,42,0.44)), radial-gradient(circle at top right, rgba(16,185,129,0.18), transparent 36%)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
  },
  signatureBadgeRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  signatureBadgePrimary: {
    borderRadius: 999,
    padding: "4px 9px",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#d1fae5",
    border: "1px solid rgba(16,185,129,0.38)",
    background: "rgba(6,95,70,0.34)",
  },
  signatureBadgeSecondary: {
    borderRadius: 999,
    padding: "4px 9px",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#e2e8f0",
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(15,23,42,0.44)",
  },
  signatureTitle: {
    margin: 0,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: "#94a3b8",
  },
  signatureName: {
    margin: 0,
    fontSize: 15,
    fontWeight: 700,
    color: "#f8fafc",
  },
  signaturePhone: {
    display: "inline-flex",
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    padding: "7px 10px",
    border: "1px solid rgba(16,185,129,0.38)",
    color: "#d1fae5",
    background: "rgba(6,95,70,0.28)",
    textDecoration: "none",
    fontSize: 12,
    fontWeight: 700,
  },
  errorText: {
    margin: 0,
    color: "#fda4af",
    fontSize: 12,
  },
  toast: {
    marginTop: 8,
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 10,
    border: `1px solid ${THEME.stroke}`,
    padding: "8px 10px",
    color: "#fde68a",
    background: "rgba(120,53,15,0.3)",
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  toastDismiss: {
    borderRadius: 8,
    border: "1px solid rgba(148,163,184,0.4)",
    background: "rgba(15,23,42,0.6)",
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: 600,
    padding: "4px 8px",
    cursor: "pointer",
  },
};
