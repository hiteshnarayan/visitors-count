// Drop this snippet into your static site (or include it via a <script src="/ping.js">)
(function(){
  const repoKey = 'my-repo'; // change this
  const endpoint = (window.__VISITOR_BADGE_BASE || '') + `/api/hit/${repoKey}`;

  // privacy-aware: only ping if user hasn't opted out (example cookie check)
  function getCookie(name) {
    return document.cookie.split('; ').reduce((r, v) => {
      const parts = v.split('='); return parts[0] === name ? decodeURIComponent(parts[1]) : r
    }, '');
  }
  if (getCookie('no_analytics') === '1') return;

  fetch(endpoint, { method: 'GET', mode: 'no-cors' }).catch(()=>{});
})();
