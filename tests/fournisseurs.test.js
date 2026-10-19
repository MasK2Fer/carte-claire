// Tests des prix par fournisseur : node --test
"use strict";
var test = require("node:test");
var assert = require("node:assert/strict");
var FO = require("../fournisseurs.js");

function proche(a, b) { assert.ok(Math.abs(a - b) < 1e-9, a + " ≠ " + b); }
function P(f, ref, ing, q, u, prixHT) { return { id: f + ":" + ref, f: f, ref: ref, nom: ref, ing: ing, cond: { q: q, u: u }, prixHT: prixHT }; }

function contexte() {
  return {
    exemples: false,
    fournisseurs: ["metro", "promocash"],
    ingredients: [
      { id: "beurre", nom: "Beurre doux", unite: "kg", prix: 10, al: ["lait"] },
      { id: "oeuf", nom: "Œuf", unite: "pièce", prix: 0.3, al: ["oeufs"], poidsPiece: 0.05 },
      { id: "citron", nom: "Citron", unite: "pièce", prix: 0.4, al: [], poidsPiece: 0.125 },
      { id: "creme", nom: "Crème liquide 35 %", unite: "L", prix: 5, al: ["lait"], densite: 1 },
      { id: "champignon", nom: "Champignons de Paris", unite: "kg", prix: 4.5, al: [] }
    ],
    recettes: [
      { id: "r1", nom: "Plat", prix: 11, lignes: [{ ing: "beurre", q: 100, u: "g" }, { ing: "oeuf", q: 2, u: "pièce" }] }
    ],
    catalogue: [
      P("metro", "B1", "beurre", 1, "kg", 9.2),
      P("promocash", "B2", "beurre", 2, "kg", 19.3),
      P("transgourmet", "B3", "beurre", 1, "kg", 5), // fournisseur non retenu
      P("metro", "O1", "oeuf", 30, "pièce", 7.5),
      P("promocash", "O2", "oeuf", 30, "pièce", 8.4),
      P("metro", "C1", "citron", 5, "kg", 12), // vendu au kilo, utilisé à la pièce
      P("metro", "K1", "creme", 1, "kg", 4) // kg vers L grâce à la densité
    ]
  };
}

test("prix unitaire : colis ramené à l'unité de l'ingrédient", function () {
  var c = contexte();
  proche(FO.prixUnitaire(c.catalogue[1], c.ingredients[0]), 9.65);
  proche(FO.prixUnitaire(c.catalogue[3], c.ingredients[1]), 0.25);
  // 5 kg de citrons à 125 g pièce = 40 citrons pour 12 €
  proche(FO.prixUnitaire(c.catalogue[5], c.ingredients[2]), 0.3);
  proche(FO.prixUnitaire(c.catalogue[6], c.ingredients[3]), 4);
  assert.ok(isNaN(FO.prixUnitaire(P("x", "1", "champignon", 1, "pièce", 3), c.ingredients[4])));
});

test("offres : seulement chez les fournisseurs retenus, de la moins chère à la plus chère", function () {
  var c = contexte();
  var os = FO.offres(c, "beurre");
  assert.deepEqual(os.map(function (o) { return o.produit.ref; }), ["B1", "B2"]);
  c.fournisseurs = ["promocash"];
  assert.deepEqual(FO.offres(c, "beurre").map(function (o) { return o.produit.ref; }), ["B2"]);
  assert.deepEqual(FO.offres(c, "citron"), []);
});

test("appliquer : prend l'offre choisie, sinon la moins chère, et respecte les prix saisis à la main", function () {
  var c = contexte();
  c.ingredients[1].offre = "promocash:O2";
  c.ingredients[3].prixManuel = true;
  var n = FO.appliquer(c);
  proche(c.ingredients[0].prix, 9.2);
  assert.equal(c.ingredients[0].offre, "metro:B1");
  assert.match(c.ingredients[0].src, /^Metro · réf\. B1/);
  proche(c.ingredients[1].prix, 0.28);
  proche(c.ingredients[2].prix, 0.3);
  proche(c.ingredients[3].prix, 5);
  proche(c.ingredients[4].prix, 4.5);
  assert.equal(n, 3);
  assert.equal(FO.appliquer(c), 0);

  // Le fournisseur de l'offre choisie n'est plus retenu : on passe à la moins chère restante
  c.fournisseurs = ["metro"];
  FO.appliquer(c);
  proche(c.ingredients[1].prix, 0.25);
  // Plus aucune offre : le dernier prix reste, sans source
  c.fournisseurs = [];
  FO.appliquer(c);
  proche(c.ingredients[0].prix, 9.2);
  assert.equal(c.ingredients[0].src, undefined);
});

test("économies : ingrédients moins chers ailleurs", function () {
  var c = contexte();
  c.ingredients[1].offre = "promocash:O2";
  FO.appliquer(c);
  var e = FO.economies(c);
  assert.equal(e.length, 1);
  assert.equal(e[0].ing.id, "oeuf");
  proche(e[0].ecart, 0.03);
});

test("comparer : couverture et coût de la carte chez chaque fournisseur", function () {
  var c = contexte();
  var r = FO.comparer(c);
  assert.equal(r[0].fournisseur.id, "metro");
  assert.equal(r[0].proposes, 2);
  assert.equal(r[0].total, 2);
  // 100 g de beurre à 9,20 €/kg + 2 œufs à 0,25 €
  proche(r[0].coutCarte, 0.92 + 0.5);
  proche(r[1].coutCarte, 0.965 + 0.56);
  proche(r[0].actuel, 1 + 0.6);
});

test("rapprocher : libellé fournisseur vers ingrédient", function () {
  var ings = contexte().ingredients;
  assert.equal(FO.rapprocher("CHAMPIGNON PARIS BLANC CAISSE 3KG", ings).ing, "champignon");
  assert.equal(FO.rapprocher("Beurre doux 82% MG plaque 1 kg", ings).ing, "beurre");
  assert.equal(FO.rapprocher("Oeufs frais calibre M x30", ings).ing, "oeuf");
  assert.equal(FO.rapprocher("Lessive 5 L", ings), null);
});

test("importer : mercuriale CSV avec en-tête, virgule décimale et lignes invalides", function () {
  var csv = "Référence;Libellé;Quantité;Unité;Prix HT\n" +
    "123;Beurre doux plaque;1;KG;9,10\n" +
    "456;Œufs plein air plateau;30;PC;8,40\n" +
    "789;Produit sans prix;1;kg;\n" +
    "999;Vaisselle jetable;100;U;12";
  var r = FO.importer(csv, "metro", contexte().ingredients);
  assert.equal(r.produits.length, 3);
  assert.equal(r.erreurs.length, 1);
  assert.equal(r.erreurs[0].ligne, 4);
  assert.deepEqual(r.produits[0].cond, { q: 1, u: "kg" });
  proche(r.produits[0].prixHT, 9.1);
  assert.equal(r.produits[0].ing, "beurre");
  assert.equal(r.produits[1].ing, "oeuf");
  assert.equal(r.produits[1].cond.u, "pièce");
  assert.equal(r.produits[2].ing, null);
  assert.equal(r.produits[0].id, "metro:123");
});

test("fusionner : un produit réimporté remplace l'ancien prix", function () {
  var cat = [P("metro", "123", "beurre", 1, "kg", 9.2)];
  var n = FO.fusionner(cat, [{ id: "metro:123", f: "metro", ref: "123", ing: "beurre", cond: { q: 1, u: "kg" }, prixHT: 9.5, sur: true }]);
  assert.equal(n.length, 1);
  proche(n[0].prixHT, 9.5);
  assert.equal(n[0].sur, undefined);
});

test("catalogue d'exemple : chaque produit se rapporte à une unité convertible", function () {
  var c = { ingredients: [], fournisseurs: FO.FOURNISSEURS.map(function (f) { return f.id; }) };
  FO.CATALOGUE.forEach(function (p) { assert.ok(FO.fournisseur(c, p.f), p.id); assert.ok(p.exemple); });
});
