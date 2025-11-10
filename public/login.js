// Simple login snippet: opens the GitHub OAuth login for the given key
function startLogin(key, redirect) {
  const params = new URLSearchParams({ key });
  if (redirect) params.set('redirect', redirect);
  window.location = `/api/auth/login?${params.toString()}`;
}

// export for modules
window.startVisitorLogin = startLogin;
