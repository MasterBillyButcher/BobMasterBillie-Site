'use strict';

/** Minimal cookie jar for exercising the app with the global fetch API. */
class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  /** Reads Set-Cookie headers off a fetch Response and stores name=value pairs. */
  absorb(response) {
    const raw = response.headers.getSetCookie
      ? response.headers.getSetCookie()
      : response.headers.raw
      ? response.headers.raw()['set-cookie'] || []
      : [];

    for (const cookieStr of raw) {
      const [pair] = cookieStr.split(';');
      const eqIndex = pair.indexOf('=');
      if (eqIndex === -1) continue;
      const name = pair.slice(0, eqIndex).trim();
      const value = pair.slice(eqIndex + 1).trim();
      if (value === '' && cookieStr.toLowerCase().includes('expires=thu, 01 jan 1970')) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  header() {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  get(name) {
    return this.cookies.get(name);
  }
}

module.exports = { CookieJar };
