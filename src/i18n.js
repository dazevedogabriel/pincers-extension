// Translations for the extension pages, from the browser's standard
// _locales/<lang>/messages.json (the browser picks the language of its UI and
// falls back to "default_locale" in the manifest).
//
//   <span data-i18n="key">                text
//   <span data-i18n-html="key">           text that may contain <kbd>…</kbd>
//   <input data-i18n-placeholder="key">   placeholder

const i18nApi =
  typeof browser !== "undefined" && typeof browser.runtime?.getBrowserInfo === "function" ? browser : chrome;

/** Message `key` with `$1`, `$2`… filled from `subs`; the key itself if missing. */
function t(key, ...subs) {
  return i18nApi.i18n.getMessage(key, subs.map(String)) || key;
}

/** Escapes everything except <kbd> and </kbd>. */
function withKbd(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&lt;(\/?)kbd&gt;/g, "<$1kbd>");
}

function applyI18n(root = document) {
  document.documentElement.lang = i18nApi.i18n.getUILanguage();
  root.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll("[data-i18n-html]").forEach((el) => (el.innerHTML = withKbd(t(el.dataset.i18nHtml))));
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => (el.placeholder = t(el.dataset.i18nPlaceholder)));
}

applyI18n();
