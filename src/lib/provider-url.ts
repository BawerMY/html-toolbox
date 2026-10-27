import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

// Users' base URLs are fetched by this server, so they must not point at private networks
// (the database, cloud metadata, other internal services).
const PRIVATE = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
] as const) {
  PRIVATE.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
] as const) {
  PRIVATE.addSubnet(network, prefix, "ipv6");
}

function isPrivate(address: string): boolean {
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  if (mapped) return PRIVATE.check(mapped, "ipv4");
  return PRIVATE.check(address, isIP(address) === 6 ? "ipv6" : "ipv4");
}

/**
 * Returns why a user's provider URL can't be used, or null if it can.
 * Set ALLOW_PRIVATE_PROVIDER_URLS=true to allow http and local addresses (e.g. Ollama on this machine).
 */
export async function checkProviderUrl(value: string): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "Enter a full URL, like https://api.openai.com/v1.";
  }
  if (process.env.ALLOW_PRIVATE_PROVIDER_URLS === "true") {
    return url.protocol === "https:" || url.protocol === "http:" ? null : "The URL must start with https://.";
  }
  if (url.protocol !== "https:") return "The URL must start with https://.";
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  let addresses: string[];
  try {
    addresses = isIP(hostname) ? [hostname] : (await lookup(hostname, { all: true })).map((entry) => entry.address);
  } catch {
    return `Couldn’t find ${url.hostname}.`;
  }
  if (addresses.some(isPrivate)) return "This URL points to a private network address, which isn’t allowed.";
  return null;
}
