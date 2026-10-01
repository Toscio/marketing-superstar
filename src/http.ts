/**
 * Shared HTTP helpers for read-only site checks.
 * Never submit forms or run load tests.
 */

export type FetchResult = {
  url: string;
  finalUrl: string;
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  body: string;
  contentType: string;
  elapsedMs: number;
};

const DEFAULT_UA =
  "MarketingSuperstarAudit/0.1 (+https://github.com/Toscio/marketing-superstar; read-only SEO audit)";

export async function fetchPage(
  url: string,
  options: { timeoutMs?: number; method?: "GET" | "HEAD" } = {},
): Promise<FetchResult> {
  const timeoutMs = options.timeoutMs ?? 20_000;
  const method = options.method ?? "GET";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();

  try {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": DEFAULT_UA,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const body = method === "HEAD" ? "" : await res.text();
    return {
      url,
      finalUrl: res.url,
      status: res.status,
      ok: res.ok,
      headers,
      body,
      contentType: headers["content-type"] ?? "",
      elapsedMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function absoluteUrl(base: string, href: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

export function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

export function normalizePath(url: string): string {
  try {
    const u = new URL(url);
    let path = u.pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    return path || "/";
  } catch {
    return url;
  }
}
