import { request as httpsRequest } from "node:https";

const ministryHosts = new Set(["drh.sante.gov.ma", "auth-drh.sante.gov.ma"]);

export type MinistryFetchOptions = {
  headers?: HeadersInit;
};

function isMinistryUrl(url: string) {
  try {
    return ministryHosts.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

function headersToRecord(headers?: HeadersInit) {
  const result: Record<string, string> = {};
  if (!headers) return result;

  new Headers(headers).forEach((value, key) => {
    result[key] = value;
  });

  return result;
}

function responseHeadersToHeaders(
  headers: Record<string, string | string[] | undefined>,
) {
  const result = new Headers();

  for (const [key, value] of Object.entries(headers)) {
    if (!value) continue;
    result.set(key, Array.isArray(value) ? value.join(", ") : value);
  }

  return result;
}

async function relaxedHttpsFetch(
  url: string,
  options: MinistryFetchOptions,
  redirects = 0,
): Promise<Response> {
  if (redirects > 5) {
    throw new Error(`Too many redirects while fetching ${url}`);
  }

  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = httpsRequest(
      {
        hostname: parsed.hostname,
        path: `${parsed.pathname}${parsed.search}`,
        method: "GET",
        port: parsed.port || 443,
        protocol: parsed.protocol,
        rejectUnauthorized: false,
        headers: headersToRecord(options.headers),
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = res.headers.location;

        if (
          location &&
          [301, 302, 303, 307, 308].includes(status)
        ) {
          res.resume();
          const nextUrl = new URL(location, url).toString();
          relaxedHttpsFetch(nextUrl, options, redirects + 1)
            .then(resolve)
            .catch(reject);
          return;
        }

        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => {
          resolve(
            new Response(Buffer.concat(chunks), {
              status,
              statusText: res.statusMessage,
              headers: responseHeadersToHeaders(res.headers),
            }),
          );
        });
      },
    );

    req.on("error", reject);
    req.setTimeout(30_000, () => {
      req.destroy(new Error(`Timed out fetching ${url}`));
    });
    req.end();
  });
}

export async function fetchMinistryResource(
  url: string,
  options: MinistryFetchOptions = {},
) {
  const headers = {
    "user-agent": "cncr-watcher/1.0 (+personal concours notification utility)",
    ...headersToRecord(options.headers),
  };

  try {
    return await fetch(url, { headers });
  } catch (error) {
    if (!isMinistryUrl(url)) throw error;
    return relaxedHttpsFetch(url, { headers });
  }
}
