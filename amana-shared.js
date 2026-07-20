/**
 * amana-shared.js
 *
 * Pure business-logic module shared by index.html, status.html, and
 * admin.html — pricing math, formatting, and the category/condition/
 * payout label tables. No DOM access here on purpose: this is the part
 * of the frontend that's still useful once this becomes a proper
 * multi-page app with routing, so it stays plain and portable rather
 * than tied to any one page's markup.
 *
 * CATEGORY_LABELS / CONDITION_LABELS / PAYOUT_LABELS below mirror
 * amana-backend/routes/listings.js (VALID_CATEGORIES, VALID_CONDITIONS)
 * and amana-backend/routes/orders.js (VALID_PAYOUT_STATUSES). There's
 * no build step wiring frontend to backend, so these are typed twice
 * on purpose — if you add a category/condition/payout status on the
 * backend, update the matching table here too.
 *
 * Loaded as a plain <script src="amana-shared.js"> global (window.Amana)
 * today; also exports via module.exports so it drops into a bundler or
 * ES-module setup later with no rewrite.
 */
(function (global) {
  'use strict';

  // ---- payout account — where buyers send payment for marketplace orders ----
  // Manual-transfer model: there's no payment gateway here, so this is the
  // one account every buyer pays into. If this ever changes, update it here
  // only — index.html and status.html both read it through Amana.PAYOUT_ACCOUNT.
  var PAYOUT_ACCOUNT = {
    bank: 'OPay',
    accountNumber: '8060001731',
    accountName: 'Ibrahim Mohammad Mansur'
  };

  // Builds the "send payment here" box shown after checkout and on the
  // status page for unpaid orders. orderId is included as the transfer
  // reference so payments can be matched to orders on reconciliation —
  // it's not enforced by any bank, just asked for as a narration.
  function bankDetailsHTML(orderId) {
    var acct = PAYOUT_ACCOUNT;
    var refLine = orderId
      ? '<div class="bank-row"><span class="bank-label">Reference</span>' +
        '<span class="bank-value">' + orderId + '</span></div>'
      : '';
    return (
      '<div class="bank-details-box">' +
        '<p class="bank-details-title">Send payment to</p>' +
        '<div class="bank-row"><span class="bank-label">Bank</span><span class="bank-value">' + acct.bank + '</span></div>' +
        '<div class="bank-row"><span class="bank-label">Account number</span>' +
          '<span class="bank-value bank-value-mono" id="acctNum-' + (orderId || 'default') + '">' + acct.accountNumber + '</span>' +
          '<button type="button" class="bank-copy-btn" onclick="Amana.copyAccountNumber(this, \'' + acct.accountNumber + '\')">Copy</button>' +
        '</div>' +
        '<div class="bank-row"><span class="bank-label">Account name</span><span class="bank-value">' + acct.accountName + '</span></div>' +
        refLine +
        '<p class="bank-details-note">Include the reference above so we can match your payment to this order.</p>' +
      '</div>'
    );
  }

  // Shared copy-to-clipboard handler for the account-number "Copy" button.
  // Falls back silently if the Clipboard API isn't available (older
  // in-app browsers) — the number is still visible to copy by hand.
  function copyAccountNumber(btnEl, accountNumber) {
    var restoreLabel = btnEl.textContent;
    function showCopied() {
      btnEl.textContent = 'Copied';
      setTimeout(function () { btnEl.textContent = restoreLabel; }, 1500);
    }
    if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
      global.navigator.clipboard.writeText(accountNumber).then(showCopied).catch(function () {});
    }
  }

  // ---- category / condition tables — keep in sync with amana-backend/routes/listings.js ----
  var CATEGORIES = [
    { value: 'electronics',     label: 'Electronics' },
    { value: 'fashion',         label: 'Fashion & Clothing' },
    { value: 'home',            label: 'Home & Kitchen' },
    { value: 'beauty',          label: 'Beauty & Personal Care' },
    { value: 'baby_kids',       label: 'Baby & Kids' },
    { value: 'sports_outdoors', label: 'Sports & Outdoors' },
    { value: 'other',           label: 'Other' }
  ];

  var CATEGORY_LABELS = {
    electronics: 'Electronics',
    fashion: 'Fashion & Clothing',
    home: 'Home & Kitchen',
    beauty: 'Beauty & Personal Care',
    baby_kids: 'Baby & Kids',
    sports_outdoors: 'Sports & Outdoors',
    other: 'Other'
  };

  var CONDITION_LABELS = {
    new: 'New',
    like_new: 'Like new',
    good: 'Good',
    fair: 'Fair'
  };

  // keep in sync with amana-backend/routes/orders.js VALID_PAYOUT_STATUSES
  var PAYOUT_LABELS = {
    not_applicable: 'Not applicable',
    held: 'Held in escrow',
    released: 'Released to seller',
    refunded: 'Refunded'
  };

  // keep in sync with amana-backend/routes/listings.js VALID_DELIVERY_AREAS
  var DELIVERY_AREA_LABELS = {
    katsina_only: 'Katsina only',
    nationwide: 'Nationwide'
  };

  // keep in sync with amana-backend/lib/delivery.js DELIVERY_ZONES — fee/eta
  // here are for display only; the backend is what actually computes and
  // charges delivery_fee_ngn on an order, this just avoids re-deriving the
  // same numbers by hand in multiple places in index.html/admin.html.
  var DELIVERY_ZONES = {
    katsina_metro: { label: 'Katsina metro (same city)', feeNgn: 1000, etaLabel: 'Same day' },
    katsina_other_lga: { label: 'Other Katsina LGA', feeNgn: 2500, etaLabel: '1–2 days' }
  };

  function categoryLabel(c) { return CATEGORY_LABELS[c] || c; }
  function conditionLabel(c) { return CONDITION_LABELS[c] || c; }
  function payoutLabel(status) { return PAYOUT_LABELS[status] || status; }
  function deliveryAreaLabel(a) { return DELIVERY_AREA_LABELS[a] || a; }
  function deliveryZoneLabel(z) { return (DELIVERY_ZONES[z] || {}).label || z; }
  function deliveryZoneFeeNgn(z) { return (DELIVERY_ZONES[z] || {}).feeNgn || 0; }
  function deliveryZoneEtaLabel(z) { return (DELIVERY_ZONES[z] || {}).etaLabel || ''; }

  // ---- pricing — edit these by hand as the real numbers change; mirrors amana-backend/.env USD_TO_NGN / FEE_PERCENT ----
  var USD_TO_NGN = 1374;
  var FEE_PERCENT = 5;
  var RATE_UPDATED = '2026-07-18'; // date USD_TO_NGN was last checked — bump this whenever you update the rate

  function calcPricing(priceUSD) {
    var price = Number(priceUSD) || 0;
    var fee = price * (FEE_PERCENT / 100);       // Amana's cut
    var totalNGN = (price + fee) * USD_TO_NGN;
    return {
      priceUSD: price,
      fee: fee,
      totalNGN: totalNGN
    };
  }

  // ---- formatting ----
  function formatNGN(n) {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Math.round(n));
  }

  function formatUSD(n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  }

  // Expects the sqlite-style "YYYY-MM-DD HH:MM:SS" strings the backend
  // stores (space separator, no timezone — treated as UTC). Shows the
  // year, unlike status.html's own terser local fmtDate, which
  // intentionally drops the year for its compact tracker list.
  function fmtDate(sqliteDateStr) {
    if (!sqliteDateStr) return '';
    var d = new Date(String(sqliteDateStr).replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return sqliteDateStr;
    return d.toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatRateDate() {
    var d = new Date(RATE_UPDATED + 'T00:00:00Z');
    if (isNaN(d.getTime())) return RATE_UPDATED;
    return d.toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // ---- escrow status copy (buyer-facing, status.html order tracker) ----
  function escrowNote(order) {
    if (!order) return '';
    if (order.disputed_at && order.payout_status === 'held') {
      return "You've flagged this order as not as described — Amana will review and get back to you before releasing payment.";
    }
    switch (order.payout_status) {
      case 'held':
        return 'Amana is holding this payment in escrow until you confirm the item has arrived.';
      case 'released':
        return 'Payment has been released to the seller.';
      case 'refunded':
        return 'This payment was refunded to you.';
      default:
        return '';
    }
  }

  // ---- one-OTP-per-session ----
  //
  // Every page (index.html, status.html) used to make the buyer/seller
  // verify by email OTP again for every single action — buying, saving an
  // item, posting a listing, checking order status — even seconds apart.
  // That was never a backend requirement; the backend already issues a
  // JWT good for SESSION_TTL_HOURS (30 days by default) on verify-otp.
  // The gap was purely that the frontend threw the token away instead of
  // reusing it.
  //
  // This stores one token per email address in localStorage, so:
  //  - the same browser verifying the same email twice in one sitting
  //    (e.g. buy something, then also save an item) never re-sends an OTP
  //  - it survives a page refresh / navigating between index.html and
  //    status.html, since both load this same script
  //  - a JWT is decoded client-side ONLY to read its own `exp` claim, so
  //    an about-to-expire token can be proactively treated as gone rather
  //    than failing a request first. This is not a trust decision — the
  //    backend still verifies the signature on every request; a forged
  //    or tampered token is simply rejected there as before.
  var SESSION_STORAGE_KEY = 'amana_sessions_v1';

  function readSessionStore() {
    try {
      var raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function writeSessionStore(store) {
    try { window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(store)); }
    catch (e) { /* storage unavailable (private mode, quota) — sessions just won't persist */ }
  }

  // Reads the `exp` (seconds since epoch) claim out of a JWT without
  // verifying its signature — purely a client-side "is this worth trying"
  // check, never a security boundary. Returns null if unparseable, which
  // callers treat as "assume expired, ask for a fresh OTP."
  function jwtExpiry(token) {
    try {
      var payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
    } catch (e) { return null; }
  }

  function normalizeEmailKey(email) {
    return String(email || '').trim().toLowerCase();
  }

  // Returns a still-good token for this email, or null if there isn't one
  // (never verified, or it's expired / about to in the next 5 minutes —
  // that margin avoids a token dying mid-request on a slow connection).
  function getSessionToken(email) {
    var key = normalizeEmailKey(email);
    if (!key) return null;
    var store = readSessionStore();
    var entry = store[key];
    if (!entry || !entry.token) return null;
    var expiresAt = jwtExpiry(entry.token);
    if (expiresAt === null || expiresAt < Date.now() + 5 * 60 * 1000) {
      delete store[key];
      writeSessionStore(store);
      return null;
    }
    return entry.token;
  }

  // Called right after a successful /auth/verify-otp — remembers the
  // token so every later action for this email skips straight past the
  // OTP step for as long as the token stays valid.
  function saveSessionToken(email, token) {
    var key = normalizeEmailKey(email);
    if (!key || !token) return;
    var store = readSessionStore();
    store[key] = { token: token, savedAt: Date.now() };
    writeSessionStore(store);
  }

  // Called on a 401/403 from the backend (token rejected server-side —
  // expired, or signature no longer valid e.g. JWT_SECRET rotated) so the
  // next attempt for this email falls back to asking for a fresh OTP
  // instead of retrying a dead token forever.
  function clearSessionToken(email) {
    var key = normalizeEmailKey(email);
    if (!key) return;
    var store = readSessionStore();
    delete store[key];
    writeSessionStore(store);
  }

  var Amana = {
    CATEGORIES: CATEGORIES,
    PAYOUT_ACCOUNT: PAYOUT_ACCOUNT,
    bankDetailsHTML: bankDetailsHTML,
    copyAccountNumber: copyAccountNumber,
    FEE_PERCENT: FEE_PERCENT,
    USD_TO_NGN: USD_TO_NGN,
    RATE_UPDATED: RATE_UPDATED,
    calcPricing: calcPricing,
    categoryLabel: categoryLabel,
    conditionLabel: conditionLabel,
    deliveryAreaLabel: deliveryAreaLabel,
    deliveryZoneLabel: deliveryZoneLabel,
    deliveryZoneFeeNgn: deliveryZoneFeeNgn,
    deliveryZoneEtaLabel: deliveryZoneEtaLabel,
    DELIVERY_ZONES: DELIVERY_ZONES,
    payoutLabel: payoutLabel,
    escrowNote: escrowNote,
    formatNGN: formatNGN,
    formatUSD: formatUSD,
    fmtDate: fmtDate,
    formatRateDate: formatRateDate,
    getSessionToken: getSessionToken,
    saveSessionToken: saveSessionToken,
    clearSessionToken: clearSessionToken
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Amana;
  } else {
    global.Amana = Amana;
  }
})(typeof window !== 'undefined' ? window : this);
