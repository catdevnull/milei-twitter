// @ts-check
const simpleTwitterPathRegexp = /\/[^/]+\/status\/([0-9]+)\/?/;
const usernameTwitterPathRegexp = /^\/(\w+)\/status\//i;

/**
 * @param {string} s URL de tweet a parsear
 * @returns {{ error: string } | { id: string; username?: string } | null }
 */
export function parsearLinkDeTwitter(s) {
  /** @type {URL} */
  let url;
  try {
    if (s.startsWith("x.com") || s.startsWith("twitter.com"))
      s = `https://${s}`;
    url = new URL(s);
  } catch {
    return { error: "La URL es inválida" };
  }
  if (!(url.hostname === "x.com" || url.hostname === "twitter.com"))
    return { error: "El link no es de Twitter" };
  const matches = url.pathname.match(simpleTwitterPathRegexp);
  if (matches) {
    const id = matches[1];
    /** @type {undefined | string} */
    let username;

    const usernameMatches = url.pathname.match(usernameTwitterPathRegexp);
    if (usernameMatches) username = usernameMatches[1];

    return { id, username };
  } else {
    return null;
  }
}
