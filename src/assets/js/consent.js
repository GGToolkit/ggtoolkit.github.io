/* Cookie consent with Google Consent Mode v2.
 * GA4 (if configured) loads in <head> with consent defaulting to DENIED — no
 * cookies, cookieless modeled pings only. This flips consent to GRANTED on
 * Accept; stays DENIED on Reject. Choice stored in localStorage; changeable
 * via the footer "manage cookies" link. */
(function () {
  'use strict';
  var GA4 = window.GA4_ID || '';
  var banner = document.getElementById('consent');
  var manage = document.getElementById('cookieSettings');
  var KEY = 'gg_consent';
  function grant() {
    if (window.gtag) window.gtag('consent', 'update', {
      ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted'
    });
  }
  function get(){ try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v){ try { localStorage.setItem(KEY, v); } catch (e) {} }
  function show(){ if (banner) banner.hidden = false; }
  function hide(){ if (banner) banner.hidden = true; }
  if (manage) manage.addEventListener('click', function (e) { e.preventDefault(); show(); });
  if (!GA4) { hide(); if (manage) manage.style.display = 'none'; return; }
  var a = document.getElementById('consentAccept'), r = document.getElementById('consentReject');
  if (a) a.addEventListener('click', function () { set('accept'); hide(); grant(); });
  if (r) r.addEventListener('click', function () { set('reject'); hide(); });
  var c = get();
  if (c === 'accept') { hide(); grant(); }
  else if (c === 'reject') { hide(); }
  else { show(); }
})();
