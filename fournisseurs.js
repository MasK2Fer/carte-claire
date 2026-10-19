/* Carte Claire : prix d'achat par fournisseur, sans dépendance à la page.
   Utilisé par pro.html (window.FO) et par les tests (require).

   Le restaurateur choisit ses fournisseurs (Metro, Promocash...). Chaque fournisseur a un catalogue de
   produits ; un produit est relié à un ingrédient de la base et vendu par colis :
   - fournisseur : { id, nom, type, note }
   - produit     : { id, f (id du fournisseur), ref, nom, ing (id de l'ingrédient), cond: { q, u }, prixHT, exemple? }
       cond   : ce que contient le colis (ex. { q: 5, u: "kg" }, { q: 30, u: "pièce" })
       prixHT : prix du colis, hors taxes
   Le prix de l'ingrédient (€ HT par unité de l'ingrédient) vient alors de l'offre choisie parmi les
   fournisseurs retenus, sauf si le restaurateur l'a saisi à la main (g.prixManuel).

   Contexte : { ingredients, recettes, fournisseurs: [ids retenus], catalogue: [produits importés], fournisseursPerso: [] }

   Les catalogues de ce fichier sont des EXEMPLES aux prix fictifs. Les grossistes ne publient pas leurs prix
   professionnels en accès libre : les vrais prix arrivent par l'import de la mercuriale ou de l'historique
   d'achats que le fournisseur remet à son client (voir importer()). */
(function (root) {
  "use strict";

  var CM = typeof module === "object" && module.exports ? require("./cout.js") : root.CM;

  var FOURNISSEURS = [
    { id: "metro", nom: "Metro", type: "Libre-service de gros et livraison" },
    { id: "promocash", nom: "Promocash", type: "Libre-service de gros" },
    { id: "transgourmet", nom: "Transgourmet", type: "Livraison" },
    { id: "episaveurs", nom: "EpiSaveurs", type: "Livraison" },
    { id: "primeur", nom: "Primeur du marché", type: "Producteur ou primeur local" }
  ];

  // Catalogue d'exemple : prix fictifs, pour montrer la comparaison
  function P(f, ref, nom, ing, q, u, prixHT) { return { id: f + ":" + ref, f: f, ref: ref, nom: nom, ing: ing, cond: { q: q, u: u }, prixHT: prixHT, exemple: true }; }
  var CATALOGUE = [
    P("metro", "100231", "Champignons de Paris blancs, caisse 3 kg", "champignon", 3, "kg", 12.90),
    P("metro", "100412", "Oignons jaunes, filet 5 kg", "oignon", 5, "kg", 5.95),
    P("metro", "200110", "Beurre doux 82 % MG, plaque 1 kg", "beurre", 1, "kg", 9.20),
    P("metro", "200245", "Crème liquide 35 % UHT, brique 1 L", "creme", 1, "L", 4.95),
    P("metro", "100520", "Céleri branche, colis 5 kg", "celeri", 5, "kg", 14.50),
    P("metro", "300015", "Moules de bouchot, sac 5 kg", "moules", 5, "kg", 21.00),
    P("metro", "400310", "Vin blanc sec cuisine, cubi 5 L", "vin_blanc", 5, "L", 17.50),
    P("metro", "100610", "Pommes de terre spéciale frites, sac 25 kg", "pdt", 25, "kg", 23.75),
    P("metro", "400120", "Huile de tournesol, bidon 10 L", "huile_tournesol", 10, "L", 22.90),
    P("metro", "300120", "Pavé de saumon Atlantique, sous vide 1 kg", "saumon", 1, "kg", 23.50),
    P("metro", "100710", "Courgettes, colis 5 kg", "courgette", 5, "kg", 10.50),
    P("metro", "100720", "Carottes, sac 10 kg", "carotte", 10, "kg", 10.90),
    P("metro", "100810", "Citrons jaunes, colis 5 kg", "citron", 5, "kg", 13.50),
    P("metro", "400510", "Tagliatelles blé dur, sac 5 kg", "pates", 5, "kg", 10.40),
    P("metro", "400620", "Chocolat noir de couverture 70 %, sac 2,5 kg", "chocolat", 2.5, "kg", 37.50),
    P("metro", "200510", "Œufs frais calibre M, plateau 30", "oeuf", 30, "pièce", 7.90),
    P("metro", "400710", "Sucre semoule, sac 5 kg", "sucre", 5, "kg", 5.25),
    P("metro", "400810", "Farine de blé T55, sac 10 kg", "farine", 10, "kg", 8.40),
    P("metro", "200610", "Parmigiano Reggiano 24 mois, pointe 1 kg", "parmesan", 1, "kg", 21.90),
    P("metro", "400130", "Huile d'olive vierge extra, bidon 5 L", "huile_olive", 5, "L", 44.50),
    P("metro", "400910", "Vinaigre de vin blanc, bouteille 1 L", "vinaigre", 1, "L", 2.30),

    P("promocash", "PC8821", "Champignons de Paris, barquette 2 kg", "champignon", 2, "kg", 8.60),
    P("promocash", "PC1020", "Oignons jaunes, sac 10 kg", "oignon", 10, "kg", 11.90),
    P("promocash", "PC3301", "Beurre doux, plaque 1 kg", "beurre", 1, "kg", 9.65),
    P("promocash", "PC3410", "Crème fleurette 35 %, brique 1 L", "creme", 1, "L", 4.75),
    P("promocash", "PC5100", "Moules de corde, sac 10 kg", "moules", 10, "kg", 39.00),
    P("promocash", "PC1180", "Pommes de terre, sac 25 kg", "pdt", 25, "kg", 21.50),
    P("promocash", "PC6020", "Huile de tournesol, bidon 25 L", "huile_tournesol", 25, "L", 54.00),
    P("promocash", "PC5210", "Filet de saumon avec peau, 1,2 kg", "saumon", 1.2, "kg", 27.60),
    P("promocash", "PC1240", "Courgettes, colis 6 kg", "courgette", 6, "kg", 12.60),
    P("promocash", "PC1250", "Carottes, sac 10 kg", "carotte", 10, "kg", 9.90),
    P("promocash", "PC6230", "Tagliatelles aux œufs, sac 3 kg", "pates", 3, "kg", 8.10),
    P("promocash", "PC3520", "Œufs plein air, plateau 30", "oeuf", 30, "pièce", 8.40),
    P("promocash", "PC6410", "Sucre semoule, sac 10 kg", "sucre", 10, "kg", 10.20),
    P("promocash", "PC6510", "Farine T55, sac 25 kg", "farine", 25, "kg", 19.75),
    P("promocash", "PC6610", "Noisettes décortiquées, sachet 1 kg", "noisettes", 1, "kg", 17.20),
    P("promocash", "PC1310", "Ail blanc, filet 1 kg", "ail", 1, "kg", 5.40),
    P("promocash", "PC1320", "Basilic, botte", "basilic", 1, "botte", 0.95),
    P("promocash", "PC6120", "Vin blanc de cuisine, cubi 10 L", "vin_blanc", 10, "L", 32.00),

    P("transgourmet", "TG40021", "Beurre doux AOP, plaque 1 kg", "beurre", 1, "kg", 10.40),
    P("transgourmet", "TG41102", "Crème liquide 35 %, brique 1 L", "creme", 1, "L", 4.60),
    P("transgourmet", "TG52010", "Saumon label rouge, filet 1,5 kg", "saumon", 1.5, "kg", 39.00),
    P("transgourmet", "TG60310", "Chocolat noir 70 %, pistoles 5 kg", "chocolat", 5, "kg", 72.50),
    P("transgourmet", "TG61010", "Huile d'olive vierge extra, bidon 5 L", "huile_olive", 5, "L", 41.90),
    P("transgourmet", "TG42010", "Parmesan râpé frais, sachet 1 kg", "parmesan", 1, "kg", 19.80),

    P("episaveurs", "ES7010", "Pâtes tagliatelles, carton 6 kg", "pates", 6, "kg", 11.70),
    P("episaveurs", "ES7120", "Sucre semoule, sac 25 kg", "sucre", 25, "kg", 24.50),
    P("episaveurs", "ES7210", "Farine de blé T55, sac 25 kg", "farine", 25, "kg", 18.90),
    P("episaveurs", "ES7310", "Noisettes entières, sac 1 kg", "noisettes", 1, "kg", 16.40),
    P("episaveurs", "ES7410", "Vinaigre de vin blanc, bidon 5 L", "vinaigre", 5, "L", 9.50),

    P("primeur", "CHA", "Champignons de Paris, cagette", "champignon", 3, "kg", 13.50),
    P("primeur", "COU", "Courgettes de saison", "courgette", 1, "kg", 1.90),
    P("primeur", "CAR", "Carottes fanes", "carotte", 1, "kg", 1.40),
    P("primeur", "CEL", "Céleri branche", "celeri", 1, "kg", 2.60),
    P("primeur", "CIT", "Citrons de Menton", "citron", 1, "pièce", 0.45),
    P("primeur", "BAS", "Basilic, botte", "basilic", 1, "botte", 1.10),
    P("primeur", "AIL", "Ail rose, tresse 1 kg", "ail", 1, "kg", 7.50)
  ];

  // Fournisseurs proposés, plus ceux que le restaurateur a ajoutés (ctx.fournisseursPerso)
  function tous(ctx) { return FOURNISSEURS.concat((ctx && ctx.fournisseursPerso) || []); }
  function fournisseur(ctx, id) {
    var l = tous(ctx);
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  }
  function ingredient(ctx, id) { var l = ctx.ingredients || []; for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  // Catalogue d'exemple (sauf ctx.exemples === false) complété par les produits importés (ctx.catalogue),
  // qui remplacent un produit d'exemple de même id
  function catalogue(ctx) { return fusionner(ctx.exemples === false ? [] : CATALOGUE, ctx.catalogue || []); }
  function retenu(ctx, f) { return (ctx.fournisseurs || []).indexOf(f) >= 0; }

  // Prix HT d'une unité de l'ingrédient (€/kg, €/L, €/pièce...) pour ce produit, ou NaN si les unités ne se convertissent pas
  function prixUnitaire(p, g) {
    var q = CM.convertir(p.cond.q, p.cond.u, g.unite, g);
    return q > 0 ? p.prixHT / q : NaN;
  }

  // Offres pour un ingrédient chez les fournisseurs retenus, de la moins chère à la plus chère
  function offres(ctx, ingId) {
    var g = ingredient(ctx, ingId);
    if (!g) return [];
    return catalogue(ctx)
      .filter(function (p) { return p.ing === ingId && retenu(ctx, p.f); })
      .map(function (p) { return { produit: p, prix: prixUnitaire(p, g) }; })
      .filter(function (o) { return !isNaN(o.prix); })
      .sort(function (a, b) { return a.prix - b.prix; });
  }

  // Offre utilisée pour l'ingrédient : celle qu'il a choisie si elle est encore disponible, sinon la moins chère
  function offreRetenue(ctx, g) {
    var os = offres(ctx, g.id);
    if (!os.length) return null;
    for (var i = 0; i < os.length; i++) if (os[i].produit.id === g.offre) return os[i];
    return os[0];
  }

  function source(ctx, p) {
    var f = fournisseur(ctx, p.f);
    return (f ? f.nom : p.f) + " · réf. " + p.ref + (p.exemple ? " · prix d'exemple" : "");
  }

  // Met le prix de chaque ingrédient au prix de son offre retenue. Les prix saisis à la main ne bougent pas.
  // Renvoie le nombre d'ingrédients dont le prix a changé.
  function appliquer(ctx) {
    var n = 0;
    (ctx.ingredients || []).forEach(function (g) {
      if (g.prixManuel) return;
      var o = offreRetenue(ctx, g);
      if (!o) { if (g.offre) { delete g.offre; delete g.src; } return; }
      var prix = Math.round(o.prix * 10000) / 10000;
      if (g.prix !== prix) n++;
      g.prix = prix; g.offre = o.produit.id; g.src = source(ctx, o.produit);
    });
    return n;
  }

  // Ingrédients utilisés par au moins une recette
  function utilises(ctx) {
    var ids = [];
    (ctx.recettes || []).forEach(function (r) { r.lignes.forEach(function (l) { if (l.ing && ids.indexOf(l.ing) < 0) ids.push(l.ing); }); });
    return ids.map(function (id) { return ingredient(ctx, id); }).filter(Boolean);
  }

  // Ingrédients utilisés qui coûteraient moins cher chez un autre fournisseur retenu
  function economies(ctx) {
    return utilises(ctx).map(function (g) {
      var os = offres(ctx, g.id);
      if (!os.length) return null;
      var moinsCher = os[0], ecart = g.prix - moinsCher.prix;
      return ecart > 0.005 ? { ing: g, offre: moinsCher, ecart: ecart, part: ecart / g.prix } : null;
    }).filter(Boolean).sort(function (a, b) { return b.part - a.part; });
  }

  // Pour chaque fournisseur retenu : combien d'ingrédients de la carte il propose, et ce que coûterait
  // la carte (une portion de chaque plat) en achetant chez lui tout ce qu'il a, le reste au prix actuel.
  function comparer(ctx) {
    var gs = utilises(ctx);
    var plats = (ctx.recettes || []).filter(function (r) { return !r.sousRecette; });
    function coutCarte(ings) { var c = { ingredients: ings, recettes: ctx.recettes }; return plats.reduce(function (s, r) { return s + CM.cout(r, c); }, 0); }
    var actuel = coutCarte(ctx.ingredients);
    return (ctx.fournisseurs || []).map(function (f) {
      var proposes = 0;
      var ings = ctx.ingredients.map(function (g) {
        var os = catalogue(ctx).filter(function (p) { return p.f === f && p.ing === g.id; })
          .map(function (p) { return prixUnitaire(p, g); }).filter(function (x) { return !isNaN(x); }).sort(function (a, b) { return a - b; });
        if (!os.length) return g;
        if (gs.indexOf(g) >= 0) proposes++;
        var c = {}; for (var k in g) c[k] = g[k]; c.prix = os[0]; return c;
      });
      return { fournisseur: fournisseur(ctx, f) || { id: f, nom: f }, proposes: proposes, total: gs.length, coutCarte: coutCarte(ings), actuel: actuel };
    }).sort(function (a, b) { return a.coutCarte - b.coutCarte; });
  }

  // ---------- Import d'une mercuriale ou d'un historique d'achats (CSV) ----------
  // Colonnes attendues, dans cet ordre : référence ; libellé ; quantité du colis ; unité ; prix HT du colis.
  // Séparateur ; , ou tabulation, virgule décimale acceptée, ligne d'en-tête ignorée.

  var UNITES_CSV = { kg: "kg", kilo: "kg", g: "g", gr: "g", l: "L", lt: "L", litre: "L", cl: "cl", ml: "ml",
    p: "pièce", pc: "pièce", pce: "pièce", piece: "pièce", "pièce": "pièce", u: "pièce", unite: "pièce", "unité": "pièce",
    bt: "botte", botte: "botte" };
  var VIDES = ["de", "du", "des", "la", "le", "les", "et", "en", "au", "aux", "a", "l", "d"];

  function sansAccent(s) { return String(s).toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function mots(s) {
    return sansAccent(s).replace(/[^a-z0-9]+/g, " ").trim().split(" ")
      .filter(function (m) { return m.length > 1 && VIDES.indexOf(m) < 0 && !/^\d/.test(m); })
      .map(function (m) { return m.length > 3 ? m.replace(/[sx]$/, "") : m; });
  }
  function nombre(s) { var n = parseFloat(String(s).replace(/\s|€/g, "").replace(",", ".")); return isNaN(n) ? NaN : n; }

  // Ingrédient le plus proche d'un libellé fournisseur, ou null. Score : part des mots de l'ingrédient trouvés dans le libellé.
  function rapprocher(libelle, ingredients) {
    var lm = mots(libelle), best = null;
    ingredients.forEach(function (g) {
      var im = mots(g.nom); if (!im.length) return;
      var ok = im.filter(function (m) { return lm.indexOf(m) >= 0; }).length;
      var score = ok / im.length;
      if (score >= 0.5 && (!best || score > best.score || (score === best.score && ok > best.ok))) best = { ing: g, score: score, ok: ok };
    });
    return best ? { ing: best.ing.id, score: best.score } : null;
  }

  function importer(texte, fournisseurId, ingredients) {
    var lignes = String(texte || "").split(/\r?\n/).filter(function (l) { return l.trim(); });
    var sep = /\t/.test(lignes[0] || "") ? "\t" : /;/.test(lignes[0] || "") ? ";" : ",";
    var produits = [], erreurs = [];
    lignes.forEach(function (l, i) {
      var c = l.split(sep).map(function (x) { return x.trim().replace(/^"|"$/g, ""); });
      var q = nombre(c[2]), u = UNITES_CSV[sansAccent(c[3] || "").replace(/\.$/, "")], prix = nombre(c[4]);
      if (i === 0 && isNaN(prix)) return; // en-tête
      if (c.length < 5 || !c[1] || !(q > 0) || !u || !(prix >= 0)) { erreurs.push({ ligne: i + 1, texte: l }); return; }
      var m = rapprocher(c[1], ingredients || []);
      produits.push({ id: fournisseurId + ":" + (c[0] || "l" + (i + 1)), f: fournisseurId, ref: c[0] || "", nom: c[1],
        ing: m ? m.ing : null, sur: m ? m.score === 1 : false, cond: { q: q, u: u }, prixHT: prix });
    });
    return { produits: produits, erreurs: erreurs };
  }

  // Ajoute des produits au catalogue : un produit de même id remplace l'ancien (nouveau prix)
  function fusionner(cat, produits) {
    var ids = produits.map(function (p) { return p.id; });
    return cat.filter(function (p) { return ids.indexOf(p.id) < 0; }).concat(produits.map(function (p) {
      var c = {}; for (var k in p) if (k !== "sur") c[k] = p[k]; return c;
    }));
  }

  var FO = {
    FOURNISSEURS: FOURNISSEURS, CATALOGUE: CATALOGUE,
    tous: tous, catalogue: catalogue, fournisseur: fournisseur, prixUnitaire: prixUnitaire, offres: offres, offreRetenue: offreRetenue, source: source,
    appliquer: appliquer, utilises: utilises, economies: economies, comparer: comparer,
    rapprocher: rapprocher, importer: importer, fusionner: fusionner
  };
  if (typeof module === "object" && module.exports) module.exports = FO; else root.FO = FO;
})(this);
