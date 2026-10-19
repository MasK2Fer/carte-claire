/* Carte Claire : calcul du coût matière, sans dépendance à la page.
   Utilisé par pro.html (window.CM) et par les tests (require).

   Modèle :
   - ingrédient : { id, nom, unite, prix, al, rendement?, poidsPiece?, densite? }
       prix      : prix d'achat par unité (€/kg, €/L, €/pièce, €/botte)
       rendement : part utilisable après parage, épluchage, cuisson (0 à 1, 1 par défaut).
                   Les quantités des recettes sont nettes : 100 g de carottes à 80 % de rendement
                   coûtent 125 g de carottes achetées.
       poidsPiece : kg par pièce ou par botte, pour passer de la pièce au poids
       densite    : kg par litre, pour passer du volume au poids
   - ligne de recette : { ing, q, u } ou { rec, q, u } pour une préparation de base (sous-recette)
   - recette : { id, nom, prix (TTC), tva (5.5, 10 ou 20 ; 10 par défaut), lignes,
                 sousRecette?, production?: { q, u } (ce que donne la recette, ex. 1 L de fond) } */
(function (root) {
  "use strict";

  // Taux de TVA en restauration
  var TVA = [
    { taux: 5.5, nom: "5,5 % · à emporter, consommation différée" },
    { taux: 10, nom: "10 % · sur place ou à emporter immédiat" },
    { taux: 20, nom: "20 % · boissons alcoolisées" }
  ];
  var TVA_DEFAUT = 10;

  // Chaque unité appartient à une famille et vaut un facteur de l'unité de référence de sa famille
  var UNITES = {
    g: { f: "masse", k: 0.001 }, kg: { f: "masse", k: 1 },
    ml: { f: "volume", k: 0.001 }, cl: { f: "volume", k: 0.01 }, L: { f: "volume", k: 1 },
    "pièce": { f: "pièce", k: 1 }, botte: { f: "botte", k: 1 }, portion: { f: "portion", k: 1 }
  };
  var ORDRE = ["g", "kg", "ml", "cl", "L", "pièce", "botte", "portion"];

  function famille(u) { return UNITES[u] ? UNITES[u].f : null; }

  // Poids en kg d'une unité de référence de la famille f pour cet ingrédient, ou null si inconnu
  function kgPar(f, g) {
    if (f === "masse") return 1;
    if (f === "volume") return g && g.densite > 0 ? g.densite : null;
    if ((f === "pièce" || f === "botte") && g && famille(g.unite) === f) return g.poidsPiece > 0 ? g.poidsPiece : null;
    return null;
  }

  // Convertit q de l'unité « de » vers l'unité « vers ». Renvoie NaN si la conversion est impossible.
  // g (facultatif) est l'ingrédient, qui peut donner sa densité ou son poids à la pièce.
  function convertir(q, de, vers, g) {
    var a = UNITES[de], b = UNITES[vers];
    if (!a || !b) return NaN;
    if (a.f === b.f) return q * a.k / b.k;
    var ka = kgPar(a.f, g), kb = kgPar(b.f, g);
    if (ka == null || kb == null) return NaN;
    return q * a.k * ka / (b.k * kb);
  }

  // Unités dans lesquelles on peut saisir une quantité de cette unité (pour cet ingrédient)
  function unitesPour(u, g) {
    return ORDRE.filter(function (x) { return !isNaN(convertir(1, x, u, g)); });
  }

  function trouver(liste, id) { for (var i = 0; i < liste.length; i++) if (liste[i].id === id) return liste[i]; return null; }
  function ingredient(ctx, id) { return trouver(ctx.ingredients || [], id); }
  function recette(ctx, id) { return trouver(ctx.recettes || [], id); }

  function rendement(g) { var r = g && g.rendement; return r > 0 && r <= 1 ? r : 1; }
  function tva(r) { var t = r && r.tva; return TVA.some(function (x) { return x.taux === t; }) ? t : TVA_DEFAUT; }
  function production(r) {
    var p = r && r.production;
    return p && p.q > 0 && UNITES[p.u] ? p : { q: 1, u: "portion" };
  }

  // Coût d'achat d'une ligne. « vus » protège contre une sous-recette qui s'utiliserait elle-même.
  function coutLigne(l, ctx, vus) {
    if (l.rec) {
      var s = recette(ctx, l.rec);
      if (!s || (vus || []).indexOf(s.id) >= 0) return 0;
      var p = production(s), q = convertir(l.q, l.u || p.u, p.u);
      return isNaN(q) ? 0 : cout(s, ctx, vus) * q / p.q;
    }
    var g = ingredient(ctx, l.ing);
    if (!g) return 0;
    var qa = convertir(l.q, l.u || g.unite, g.unite, g);
    return isNaN(qa) ? 0 : g.prix * qa / rendement(g);
  }

  // Coût matière de la recette : une portion pour un plat, tout le lot pour une sous-recette
  function cout(r, ctx, vus) {
    var v = (vus || []).concat(r.id);
    return r.lignes.reduce(function (s, l) { return s + coutLigne(l, ctx, v); }, 0);
  }

  // Coût d'une unité de production d'une sous-recette (ex. € par litre de fond)
  function coutUnitaire(s, ctx) { var p = production(s); return cout(s, ctx) / p.q; }

  function ht(ttc, taux) { return ttc / (1 + (taux == null ? TVA_DEFAUT : taux) / 100); }
  function ratio(r, ctx) { return r.prix > 0 ? cout(r, ctx) / ht(r.prix, tva(r)) : 0; }

  // Prix TTC minimum pour tenir le coût matière visé (cible en %), arrondi au demi-euro supérieur
  function prixConseille(r, ctx, cible) {
    var p = cout(r, ctx) / (cible / 100) * (1 + tva(r) / 100);
    return Math.ceil(Math.round(p * 2 * 1e6) / 1e6) / 2;
  }

  // Allergènes, y compris ceux des sous-recettes. Les traces d'une sous-recette restent des traces.
  function allergenes(r, ctx, vus) {
    var v = (vus || []).concat(r.id), c = [], t = (r.traces || []).slice();
    r.lignes.forEach(function (l) {
      if (l.rec) {
        var s = recette(ctx, l.rec);
        if (!s || v.indexOf(s.id) >= 0) return;
        var a = allergenes(s, ctx, v); c = c.concat(a.contient); t = t.concat(a.traces);
      } else {
        var g = ingredient(ctx, l.ing); if (g) c = c.concat(g.al || []);
      }
    });
    c = uniq(c);
    return { contient: c, traces: uniq(t).filter(function (x) { return c.indexOf(x) < 0; }) };
  }

  // Vrai si ajouter la sous-recette sousId dans la recette id créerait une boucle
  function creeBoucle(id, sousId, ctx) {
    if (id === sousId) return true;
    var s = recette(ctx, sousId);
    if (!s) return false;
    return s.lignes.some(function (l) { return l.rec && creeBoucle(id, l.rec, ctx); });
  }

  // Recettes qui utilisent directement la sous-recette id
  function utilisations(id, ctx) {
    return (ctx.recettes || []).filter(function (r) { return r.lignes.some(function (l) { return l.rec === id; }); });
  }

  // Données enregistrées avant les unités par ligne : la quantité était dans l'unité de l'ingrédient.
  // On passe en g ou ml pour les kg et L, comme l'affichait déjà l'éditeur.
  function migrer(ctx) {
    (ctx.recettes || []).forEach(function (r) {
      r.lignes.forEach(function (l) {
        if (l.u) return;
        if (l.rec) { l.u = production(recette(ctx, l.rec)).u; return; }
        var g = ingredient(ctx, l.ing); if (!g) return;
        if (g.unite === "kg" || g.unite === "L") { l.u = g.unite === "kg" ? "g" : "ml"; l.q = Math.round(l.q * 1000 * 1000) / 1000; }
        else l.u = g.unite;
      });
    });
    return ctx;
  }

  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }

  var CM = {
    TVA: TVA, TVA_DEFAUT: TVA_DEFAUT, UNITES: ORDRE.slice(),
    famille: famille, convertir: convertir, unitesPour: unitesPour,
    rendement: rendement, tva: tva, production: production,
    coutLigne: coutLigne, cout: cout, coutUnitaire: coutUnitaire,
    ht: ht, ratio: ratio, prixConseille: prixConseille,
    allergenes: allergenes, creeBoucle: creeBoucle, utilisations: utilisations, migrer: migrer
  };
  if (typeof module === "object" && module.exports) module.exports = CM; else root.CM = CM;
})(this);
