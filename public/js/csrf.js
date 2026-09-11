// Shared by login.js, settings.js, and nav.js. The CSRF cookie is set by
// the server (non-HttpOnly, readable here) on every response; we just
// echo its value back as a header so the server can confirm the request
// actually came from a page that could read this origin's cookies.
function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)bmb_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function csrfHeaders(extra) {
  return Object.assign({ 'X-CSRF-Token': getCsrfToken() }, extra || {});
}
