export interface AdminRedirectTarget {
  path: string;
  query?: Record<string, string>;
  hash?: string;
}

export function resolveAdminRedirect(raw: unknown): AdminRedirectTarget {
  const redirect = String(raw || "").trim();
  if (!redirect.startsWith("/admin")) {
    return { path: "/admin/dashboard" };
  }

  try {
    const parsed = new URL(redirect, "http://localhost");
    if (!parsed.pathname.startsWith("/admin")) {
      return { path: "/admin/dashboard" };
    }

    const query: Record<string, string> = {};
    for (const [key, value] of parsed.searchParams.entries()) {
      query[key] = value;
    }

    const hash = parsed.hash || undefined;
    if (!Object.keys(query).length && !hash) {
      return { path: parsed.pathname };
    }

    return {
      path: parsed.pathname,
      query: Object.keys(query).length ? query : undefined,
      hash,
    };
  } catch {
    return { path: "/admin/dashboard" };
  }
}
