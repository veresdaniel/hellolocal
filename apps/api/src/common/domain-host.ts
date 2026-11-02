/** Host only: no scheme, path, port, userinfo, or trailing dot. */
export function normalizeDomainHost(value: string | null | undefined): string | null {
  if (!value) return null;
  let host = value.trim().toLowerCase();
  host = host.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  host = host.replace(/^\/+/, "");
  const at = host.lastIndexOf("@");
  if (at !== -1) host = host.slice(at + 1);
  host = host.split("/")[0]?.split("?")[0]?.split("#")[0] ?? "";
  host = host.split(",")[0]?.trim() ?? "";
  host = host.replace(/:\d+$/, "");
  host = host.replace(/\.+$/, "");
  if (!isRegistrableHost(host)) return null;
  if (host === "localhost" || host.startsWith("localhost.")) return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;
  if (
    host === "hello-local.io" ||
    host === "www.hello-local.io" ||
    host === "api.hello-local.io" ||
    host === "beta.hello-local.io" ||
    host === "api.beta.hello-local.io" ||
    host === "devel.hello-local.io" ||
    host === "api.devel.hello-local.io" ||
    host.endsWith(".hello-local.io")
  ) {
    return null;
  }
  return host;
}

function isRegistrableHost(host: string): boolean {
  if (!host || host.length > 253 || !host.includes(".")) return false;
  return host.split(".").every((label) => {
    return label.length > 0 && label.length <= 63 && /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(label);
  });
}
