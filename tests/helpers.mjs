// Test helpers: an offline fetch mock that answers by URL substring.
process.env.CBYB_NO_CACHE = '1';
process.env.CBYB_NO_GH = '1';
delete process.env.GITHUB_TOKEN;
delete process.env.GH_TOKEN;

export const SCRIPTS = new URL('../skills/check-before-you-build/scripts/', import.meta.url);

/**
 * Replace globalThis.fetch. `routes` is a list of [substring, responseSpec].
 * responseSpec: { status = 200, json, headers = {} }. Returns the list of requested URLs.
 */
export function mockFetch(routes) {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    const match = routes.find(([part]) => String(url).includes(part));
    if (!match) throw new Error(`no mock for ${url}`);
    const { status = 200, json = null, headers = {} } = match[1];
    return new Response(json === null ? null : JSON.stringify(json), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    });
  };
  return calls;
}

export async function load(name) {
  return import(new URL(name, SCRIPTS));
}
