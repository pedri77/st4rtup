/**
 * Cookie CMP — RGPD Art.7 compliant consent banner
 * 0 EUR, vanilla JS, no dependencies
 *
 * Usage: <script src="/cookie-cmp.js" defer></script>
 *
 * Blocks GTM and PostHog until user accepts.
 * Consent stored in localStorage for 180 days.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'cookie_consent';
  var CONSENT_DAYS = 180;
  var POLICY_URL = '/privacidad.html';

  // Check if consent already given
  var stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      var consent = JSON.parse(stored);
      var expiry = new Date(consent.date);
      expiry.setDate(expiry.getDate() + CONSENT_DAYS);
      if (expiry > new Date()) {
        if (consent.analytics) enableAnalytics();
        return; // Don't show banner
      }
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  // Block GTM/PostHog scripts that haven't loaded yet
  // (they should be added with type="text/plain" data-cookiecategory="analytics")
  // Or we load them dynamically after consent

  // Inject CSS
  var style = document.createElement('style');
  style.textContent = [
    '#cmp-banner{position:fixed;bottom:0;left:0;right:0;z-index:2147483647;',
    'background:#1a1a2e;color:#e0e0e0;padding:16px 20px;',
    'font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;',
    'box-shadow:0 -4px 20px rgba(0,0,0,0.3);display:flex;flex-wrap:wrap;',
    'align-items:center;gap:12px;line-height:1.5}',
    '#cmp-banner a{color:#64b5f6;text-decoration:underline}',
    '#cmp-text{flex:1;min-width:280px}',
    '#cmp-buttons{display:flex;gap:8px;flex-shrink:0}',
    '#cmp-buttons button{padding:8px 20px;border:none;border-radius:6px;',
    'font-size:14px;font-weight:600;cursor:pointer;transition:opacity 0.2s}',
    '#cmp-accept{background:#4caf50;color:#fff}',
    '#cmp-reject{background:transparent;color:#e0e0e0;border:1px solid #555!important}',
    '#cmp-config{background:transparent;color:#aaa;font-size:12px;text-decoration:underline;',
    'border:none!important;padding:4px 8px}',
    '#cmp-detail{display:none;margin-top:12px;padding:12px;background:#0d0d1a;',
    'border-radius:8px;width:100%}',
    '#cmp-detail label{display:block;margin:6px 0;cursor:pointer}',
    '#cmp-detail input{margin-right:8px}',
    '@media(max-width:600px){#cmp-banner{flex-direction:column;text-align:center}',
    '#cmp-buttons{justify-content:center}}'
  ].join('');
  document.head.appendChild(style);

  // Inject banner HTML
  var banner = document.createElement('div');
  banner.id = 'cmp-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Consentimiento de cookies');
  banner.innerHTML = [
    '<div id="cmp-text">',
    'Usamos cookies propias y de terceros para analizar el uso del sitio y mejorar tu experiencia. ',
    'Puedes aceptar, rechazar o configurar tus preferencias. ',
    '<a href="' + POLICY_URL + '" target="_blank">Politica de privacidad</a>.',
    '</div>',
    '<div id="cmp-buttons">',
    '<button id="cmp-accept">Aceptar</button>',
    '<button id="cmp-reject">Rechazar</button>',
    '<button id="cmp-config">Configurar</button>',
    '</div>',
    '<div id="cmp-detail">',
    '<label><input type="checkbox" checked disabled> Necesarias (siempre activas)</label>',
    '<label><input type="checkbox" id="cmp-chk-analytics"> Analiticas (PostHog, Google Analytics)</label>',
    '<label><input type="checkbox" id="cmp-chk-marketing"> Marketing (GTM, remarketing)</label>',
    '<div style="margin-top:10px">',
    '<button id="cmp-save" style="background:#4caf50;color:#fff;padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-weight:600">Guardar preferencias</button>',
    '</div>',
    '</div>'
  ].join('');

  var consentSaved = false;

  // Wait for body
  function insertBanner() {
    document.body.appendChild(banner);

    // Query within banner to avoid ID collisions with host page elements
    banner.querySelector('#cmp-accept').addEventListener('click', function () {
      saveConsent(true, true);
    });

    banner.querySelector('#cmp-reject').addEventListener('click', function () {
      saveConsent(false, false);
    });

    banner.querySelector('#cmp-config').addEventListener('click', function () {
      var detail = banner.querySelector('#cmp-detail');
      detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
    });

    banner.querySelector('#cmp-save').addEventListener('click', function () {
      var analytics = banner.querySelector('#cmp-chk-analytics').checked;
      var marketing = banner.querySelector('#cmp-chk-marketing').checked;
      saveConsent(analytics, marketing);
    });
  }

  if (document.body) {
    insertBanner();
  } else {
    document.addEventListener('DOMContentLoaded', insertBanner);
  }

  function saveConsent(analytics, marketing) {
    if (consentSaved) return; // Guard against double-click
    consentSaved = true;
    var consent = {
      date: new Date().toISOString(),
      necessary: true,
      analytics: analytics,
      marketing: marketing
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    banner.remove();
    if (analytics || marketing) enableAnalytics();
    // Notify lead popup it can now check for cookie_consent
    window.dispatchEvent(new CustomEvent('cmpConsentSaved'));
  }

  function enableAnalytics() {
    // Activate GTM if container ID is in meta tag or data attribute
    var gtmId = document.querySelector('meta[name="gtm-id"]');
    if (gtmId) {
      loadGTM(gtmId.getAttribute('content'));
    }

    // Activate any deferred scripts
    var deferred = document.querySelectorAll('script[data-cookiecategory="analytics"]');
    deferred.forEach(function (s) {
      var ns = document.createElement('script');
      ns.src = s.src || '';
      ns.textContent = s.textContent || '';
      ns.type = 'text/javascript';
      document.head.appendChild(ns);
    });

    // Dispatch event for custom integrations
    window.dispatchEvent(new CustomEvent('cookieConsentGranted', {
      detail: JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    }));
  }

  function loadGTM(id) {
    if (!id || window['google_tag_manager']) return;
    (function (w, d, s, l, i) {
      w[l] = w[l] || [];
      w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
      var f = d.getElementsByTagName(s)[0],
        j = d.createElement(s);
      j.async = true;
      j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i;
      f.parentNode.insertBefore(j, f);
    })(window, document, 'script', 'dataLayer', id);
  }
})();
