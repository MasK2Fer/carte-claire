/* Carte Claire — code commun à l'espace client et à l'espace restaurateur.
   La carte client ne reçoit que les plats, leurs prix de vente et leurs allergènes :
   aucun ingrédient, aucun coût, aucune marge. */
(function () {
  "use strict";

  // Les 14 allergènes à déclaration obligatoire (règlement INCO, annexe II)
  var ALLERGENES = [
    { c: "gluten", fr: "Gluten", long: "Céréales contenant du gluten", en: "Gluten", de: "Gluten", it: "Glutine" },
    { c: "crustaces", fr: "Crustacés", en: "Crustaceans", de: "Krebstiere", it: "Crostacei" },
    { c: "oeufs", fr: "Œufs", en: "Eggs", de: "Eier", it: "Uova" },
    { c: "poissons", fr: "Poissons", en: "Fish", de: "Fisch", it: "Pesce" },
    { c: "arachides", fr: "Arachides", en: "Peanuts", de: "Erdnüsse", it: "Arachidi" },
    { c: "soja", fr: "Soja", en: "Soy", de: "Soja", it: "Soia" },
    { c: "lait", fr: "Lait", en: "Milk", de: "Milch", it: "Latte" },
    { c: "fruits_coque", fr: "Fruits à coque", en: "Tree nuts", de: "Schalenfrüchte", it: "Frutta a guscio" },
    { c: "celeri", fr: "Céleri", en: "Celery", de: "Sellerie", it: "Sedano" },
    { c: "moutarde", fr: "Moutarde", en: "Mustard", de: "Senf", it: "Senape" },
    { c: "sesame", fr: "Sésame", long: "Graines de sésame", en: "Sesame", de: "Sesam", it: "Sesamo" },
    { c: "sulfites", fr: "Sulfites", long: "Anhydride sulfureux et sulfites", en: "Sulphites", de: "Sulfite", it: "Solfiti" },
    { c: "lupin", fr: "Lupin", en: "Lupin", de: "Lupinen", it: "Lupini" },
    { c: "mollusques", fr: "Mollusques", en: "Molluscs", de: "Weichtiere", it: "Molluschi" }
  ];
  var A = {}; ALLERGENES.forEach(function (a) { A[a.c] = a; });

  var UI = {
    fr: { title: "Notre carte", choose: "Je suis allergique ou intolérant à :", ok: "Plats que vous pouvez choisir", all: "Tous nos plats", none: "Aucun plat ne convient à votre sélection.", hidden: "Plats qui ne conviennent pas", contains: "Contient", traces: "Peut contenir des traces de", onRequest: "Possible sur demande", free: "Sans allergène à déclarer", warn: "Signalez toujours votre allergie au personnel avant de commander.", privacy: "Vos choix restent sur votre téléphone : rien n'est enregistré." },
    en: { title: "Our menu", choose: "I am allergic or intolerant to:", ok: "Dishes you can choose", all: "All our dishes", none: "No dish matches your selection.", hidden: "Dishes that are not suitable", contains: "Contains", traces: "May contain traces of", onRequest: "Possible on request", free: "No allergen to declare", warn: "Always tell the staff about your allergy before ordering.", privacy: "Your choices stay on your phone: nothing is saved." },
    de: { title: "Unsere Karte", choose: "Ich bin allergisch oder unverträglich gegen:", ok: "Gerichte, die Sie wählen können", all: "Alle unsere Gerichte", none: "Kein Gericht passt zu Ihrer Auswahl.", hidden: "Nicht geeignete Gerichte", contains: "Enthält", traces: "Kann Spuren enthalten von", onRequest: "Auf Anfrage möglich", free: "Keine deklarationspflichtigen Allergene", warn: "Bitte informieren Sie das Personal vor der Bestellung über Ihre Allergie.", privacy: "Ihre Auswahl bleibt auf Ihrem Telefon: Es wird nichts gespeichert." },
    it: { title: "Il nostro menu", choose: "Sono allergico o intollerante a:", ok: "Piatti che puoi scegliere", all: "Tutti i nostri piatti", none: "Nessun piatto è adatto alla tua selezione.", hidden: "Piatti non adatti", contains: "Contiene", traces: "Può contenere tracce di", onRequest: "Possibile su richiesta", free: "Nessun allergene da dichiarare", warn: "Segnala sempre la tua allergia al personale prima di ordinare.", privacy: "Le tue scelte restano sul tuo telefono: non viene salvato nulla." }
  };
  var LANGS = ["fr", "en", "de", "it"];

  // Clé de la carte publiée : ne contient que ce que le client a le droit de voir
  var CARTE_KEY = "carte-claire-carte-v1";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function eur(n) { return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"; }
  function aName(c, lang) { return A[c] ? (A[c][lang] || A[c].fr) : c; }
  function nomPlat(d, lang) { return (lang !== "fr" && d.noms && d.noms[lang]) ? d.noms[lang] : d.nom; }

  // Contenu de la carte vue par le client.
  // data = { resto, plats: [{ nom, noms, prix, contient: [], traces: [], variante: { fr, en, de, it, retire: [] } }] }
  function carteHTML(data, lang, sel) {
    var u = UI[lang] || UI.fr;
    var sep = lang === "fr" ? " : " : ": ";
    var h = '<div class="row" style="justify-content:space-between"><h3>' + esc(data.resto) + '</h3><div class="langs" role="group" aria-label="Langue / Language">';
    LANGS.forEach(function (l) { h += '<button class="lang" data-act="lang" data-lang="' + l + '" aria-pressed="' + (l === lang) + '">' + l.toUpperCase() + "</button>"; });
    h += "</div></div>";
    h += '<p class="label">' + esc(u.title) + "</p>";
    h += "<p><b>" + esc(u.choose) + '</b></p><div class="allergen-pick">';
    ALLERGENES.forEach(function (a) {
      h += '<label class="toggle"><input type="checkbox" data-act="pick" id="pick-' + a.c + '" value="' + a.c + '"' + (sel.indexOf(a.c) >= 0 ? " checked" : "") + "><span>" + esc(aName(a.c, lang)) + "</span></label>";
    });
    h += "</div>";

    var okList = [], noList = [];
    data.plats.forEach(function (d) {
      var bloque = d.contient.filter(function (x) { return sel.indexOf(x) >= 0; });
      var v = d.variante || { retire: [] }, rv = v.retire || [];
      var sauvable = bloque.length > 0 && v.fr && bloque.every(function (x) { return rv.indexOf(x) >= 0; });
      if (!bloque.length) okList.push({ d: d }); else if (sauvable) okList.push({ d: d, variante: true }); else noList.push({ d: d, bloque: bloque });
    });
    h += '<p class="label">' + esc(sel.length ? u.ok : u.all) + "</p><div>";
    if (!okList.length) h += '<p class="note bad">' + esc(u.none) + "</p>";
    okList.forEach(function (o) {
      var d = o.d, tSel = sel.length ? d.traces.filter(function (x) { return sel.indexOf(x) >= 0; }) : d.traces;
      h += '<div class="dish"><div class="dish-name"><span>' + esc(nomPlat(d, lang)) + '</span><span class="num">' + eur(d.prix) + "</span></div>";
      if (o.variante) {
        h += '<p class="note ok">' + esc(u.onRequest) + sep + esc(d.variante[lang] || d.variante.fr) + "</p>";
      } else if (!sel.length) {
        h += '<p class="note muted">' + (d.contient.length ? esc(u.contains) + sep + esc(d.contient.map(function (x) { return aName(x, lang); }).join(", ")) : esc(u.free)) + "</p>";
      }
      if (tSel.length) h += '<p class="note warn">' + esc(u.traces) + sep + esc(tSel.map(function (x) { return aName(x, lang); }).join(", ")) + "</p>";
      h += "</div>";
    });
    h += "</div>";
    if (noList.length) {
      h += "<details><summary>" + esc(u.hidden) + " (" + noList.length + ")</summary><div>";
      noList.forEach(function (o) {
        h += '<div class="dish"><div class="dish-name"><span class="muted">' + esc(nomPlat(o.d, lang)) + '</span></div><p class="note bad">' + esc(u.contains) + sep + esc(o.bloque.map(function (x) { return aName(x, lang); }).join(", ")) + "</p></div>";
      });
      h += "</div></details>";
    }
    h += '<p class="notice">' + esc(u.warn) + "<br>" + esc(u.privacy) + "</p>";
    return h;
  }

  function lireCarte() { try { return JSON.parse(localStorage.getItem(CARTE_KEY) || "null"); } catch (e) { return null; } }
  function ecrireCarte(data) { try { localStorage.setItem(CARTE_KEY, JSON.stringify(data)); } catch (e) {} }

  window.CC = { ALLERGENES: ALLERGENES, A: A, UI: UI, LANGS: LANGS, esc: esc, eur: eur, aName: aName, carteHTML: carteHTML, lireCarte: lireCarte, ecrireCarte: ecrireCarte };
})();
