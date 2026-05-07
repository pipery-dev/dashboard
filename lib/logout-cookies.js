const DEFAULT_SESSION_COOKIE_PREFIX = "__Secure-pipery-auth";
const LEGACY_COOKIE_NAMES = [
  "__Secure-pipery-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
  "__Secure-pipery-auth.callback-url",
  "__Secure-next-auth.callback-url",
  "next-auth.callback-url",
  "__Host-pipery-auth.csrf-token",
  "__Host-next-auth.csrf-token",
  "next-auth.csrf-token"
];

function sessionCookiePrefix() {
  return process.env.PIPERY_AUTH_SESSION_COOKIE_PREFIX || DEFAULT_SESSION_COOKIE_PREFIX;
}

function githubCookieNames() {
  const prefixes = new Set([sessionCookiePrefix(), DEFAULT_SESSION_COOKIE_PREFIX]);
  return [
    ...Array.from(prefixes).flatMap((prefix) => [
      `${prefix}.github.session-token`,
      `${prefix}.github.callback-url`
    ]),
    "__Host-pipery-auth.csrf-token"
  ];
}

function expireCookie(response, name, domain) {
  const cookie = [
    `${name}=`,
    "Path=/",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Max-Age=0",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    domain ? `Domain=${domain}` : ""
  ]
    .filter(Boolean)
    .join("; ");

  response.headers.append("Set-Cookie", cookie);
}

function matchesLogoutCookieName(name) {
  return name.includes("next-auth") || name.includes("pipery-auth");
}

export function expirePiperyAuthCookies(response, request) {
  const requestCookieNames = (request.headers.get("cookie") || "")
    .split(";")
    .map((cookie) => cookie.trim().split("=")[0])
    .filter(Boolean);
  const baseCookieNames = [...githubCookieNames(), ...LEGACY_COOKIE_NAMES];
  const cookiePrefixes = baseCookieNames.map((name) => `${name}.`);
  const namesToExpire = new Set([
    ...baseCookieNames,
    ...requestCookieNames.filter(
      (name) =>
        baseCookieNames.includes(name) ||
        cookiePrefixes.some((prefix) => name.startsWith(prefix)) ||
        matchesLogoutCookieName(name)
    )
  ]);

  for (const name of namesToExpire) {
    expireCookie(response, name);
    if (!name.startsWith("__Host-")) {
      expireCookie(response, name, ".pipery.dev");
      expireCookie(response, name, "pipery.dev");
      expireCookie(response, name, "dash.pipery.dev");
    }
  }
}
