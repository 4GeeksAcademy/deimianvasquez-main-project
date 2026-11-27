/**
 * HealthCore — Sistema de internacionalización (i18n)
 * Compartido entre index.html y application.html
 *
 * Cada página define su propio objeto `var LANG = {...}` ANTES de incluir este script.
 * Este script contiene la lógica de cambio de idioma (setLang) e inicialización.
 *
 * Uso en cada HTML:
 *   <script>var LANG = { en: {...}, es: {...} };</script>
 *   <script src="i18n.js"></script>
 */

(function () {
  "use strict";

  var currentLang = localStorage.getItem("healthcore-lang") || "en";

  /**
   * Cambia el idioma activo y actualiza todos los elementos [data-i18n] en la página.
   * @param {"en"|"es"} lang
   */
  window.setLang = function (lang) {
    currentLang = lang;
    localStorage.setItem("healthcore-lang", lang);
    document.documentElement.lang = lang === "es" ? "es" : "en";
    document.querySelector("body").classList.add("lang-switching");

    var els = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute("data-i18n");
      if (LANG[lang] && LANG[lang][key]) {
        els[i].textContent = LANG[lang][key];
      }
    }

    // Actualizar estilo del botón de idioma activo
    var btns = document.querySelectorAll("[data-lang-btn]");
    for (var j = 0; j < btns.length; j++) {
      btns[j].classList.remove("bg-[#123047]", "text-white");
      btns[j].classList.add("text-[#18323D]");
    }
    var active = document.getElementById("lang-" + lang);
    if (active) {
      active.classList.add("bg-[#123047]", "text-white");
      active.classList.remove("text-[#18323D]");
    }

    setTimeout(function () {
      document.querySelector("body").classList.remove("lang-switching");
    }, 150);
  };

  // Inicializar idioma al cargar
  window.setLang(currentLang);
})();