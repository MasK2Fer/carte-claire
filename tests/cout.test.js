// Tests du calcul du coût matière : node --test
"use strict";
var test = require("node:test");
var assert = require("node:assert/strict");
var CM = require("../cout.js");

function proche(a, b) { assert.ok(Math.abs(a - b) < 1e-9, a + " ≠ " + b); }

var ctx = {
  ingredients: [
    { id: "carotte", unite: "kg", prix: 1.2, al: [], rendement: 0.8 },
    { id: "beurre", unite: "kg", prix: 10, al: ["lait"] },
    { id: "vin", unite: "L", prix: 4, al: ["sulfites"] },
    { id: "huile", unite: "L", prix: 9, al: [], densite: 0.9 },
    { id: "oeuf", unite: "pièce", prix: 0.3, al: ["oeufs"], poidsPiece: 0.05 },
    { id: "basilic", unite: "botte", prix: 1.2, al: [] }
  ],
  recettes: [
    // 0,5 kg de sauce : 400 g de beurre + 200 ml de vin = 4 + 0,8 = 4,80 €, soit 9,60 €/kg
    { id: "sauce", sousRecette: true, production: { q: 0.5, u: "kg" }, traces: ["poissons"],
      lignes: [{ ing: "beurre", q: 400, u: "g" }, { ing: "vin", q: 20, u: "cl" }] },
    { id: "plat", prix: 11, tva: 10, traces: [],
      lignes: [{ ing: "carotte", q: 100, u: "g" }, { rec: "sauce", q: 50, u: "g" }] }
  ]
};

test("conversions dans une même famille", function () {
  proche(CM.convertir(250, "g", "kg"), 0.25);
  proche(CM.convertir(2, "kg", "g"), 2000);
  proche(CM.convertir(33, "cl", "L"), 0.33);
  proche(CM.convertir(1.5, "L", "ml"), 1500);
});

test("conversions impossibles sans information sur l'ingrédient", function () {
  assert.ok(isNaN(CM.convertir(1, "L", "kg")));
  assert.ok(isNaN(CM.convertir(1, "pièce", "g")));
  assert.ok(isNaN(CM.convertir(1, "g", "botte")));
  assert.ok(isNaN(CM.convertir(1, "g", "tasse")));
});

test("conversions avec densité et poids à la pièce", function () {
  var huile = ctx.ingredients[3], oeuf = ctx.ingredients[4];
  proche(CM.convertir(90, "g", "L", huile), 0.1);   // 90 g d'huile à 0,9 kg/L = 10 cl
  proche(CM.convertir(1, "L", "g", huile), 900);
  proche(CM.convertir(2, "pièce", "g", oeuf), 100);
  proche(CM.convertir(150, "g", "pièce", oeuf), 3);
  assert.deepEqual(CM.unitesPour("pièce", oeuf), ["g", "kg", "pièce"]);
  assert.deepEqual(CM.unitesPour("L"), ["ml", "cl", "L"]);
});

test("le rendement augmente le coût de la quantité nette", function () {
  // 100 g nets de carottes à 80 % = 125 g achetés à 1,20 €/kg
  proche(CM.coutLigne({ ing: "carotte", q: 100, u: "g" }, ctx), 0.15);
  // Rendement absent ou hors limites : 100 %
  proche(CM.coutLigne({ ing: "beurre", q: 100, u: "g" }, ctx), 1);
  assert.equal(CM.rendement({ rendement: 0 }), 1);
  assert.equal(CM.rendement({ rendement: 1.5 }), 1);
});

test("ligne sans unité : quantité dans l'unité de l'ingrédient (anciennes données)", function () {
  proche(CM.coutLigne({ ing: "beurre", q: 0.1 }, ctx), 1);
  proche(CM.coutLigne({ ing: "oeuf", q: 2 }, ctx), 0.6);
});

test("ingrédient au poids saisi à la pièce, ou inconnu", function () {
  proche(CM.coutLigne({ ing: "oeuf", q: 100, u: "g" }, ctx), 0.6);
  assert.equal(CM.coutLigne({ ing: "basilic", q: 10, u: "g" }, ctx), 0); // pas de poids à la botte
  assert.equal(CM.coutLigne({ ing: "absent", q: 1, u: "kg" }, ctx), 0);
});

test("sous-recette : coût du lot, coût unitaire et part utilisée", function () {
  var sauce = ctx.recettes[0], plat = ctx.recettes[1];
  proche(CM.cout(sauce, ctx), 4.8);
  proche(CM.coutUnitaire(sauce, ctx), 9.6);
  // 0,15 € de carottes + 50 g de sauce à 9,60 €/kg
  proche(CM.cout(plat, ctx), 0.15 + 0.48);
});

test("sous-recette dans une sous-recette", function () {
  var c = JSON.parse(JSON.stringify(ctx));
  c.recettes.push({ id: "sauce2", sousRecette: true, production: { q: 1, u: "kg" }, lignes: [{ rec: "sauce", q: 0.5, u: "kg" }, { ing: "beurre", q: 500, u: "g" }] });
  proche(CM.cout(c.recettes[2], c), 4.8 + 5);
  proche(CM.coutLigne({ rec: "sauce2", q: 100, u: "g" }, c), 0.98);
});

test("une boucle de sous-recettes ne fait pas planter le calcul", function () {
  var c = { ingredients: ctx.ingredients, recettes: [
    { id: "a", sousRecette: true, production: { q: 1, u: "kg" }, lignes: [{ ing: "beurre", q: 1, u: "kg" }, { rec: "b", q: 1, u: "kg" }] },
    { id: "b", sousRecette: true, production: { q: 1, u: "kg" }, lignes: [{ rec: "a", q: 1, u: "kg" }] }
  ] };
  proche(CM.cout(c.recettes[0], c), 10);
  assert.equal(CM.creeBoucle("a", "b", c), true);
  assert.equal(CM.creeBoucle("plat", "sauce", ctx), false);
  assert.equal(CM.creeBoucle("sauce", "sauce", ctx), true);
});

test("TVA par plat : hors taxes et ratio", function () {
  proche(CM.ht(11, 10), 10);
  proche(CM.ht(10.55, 5.5), 10);
  proche(CM.ht(12, 20), 10);
  assert.equal(CM.tva({ tva: 20 }), 20);
  assert.equal(CM.tva({ tva: 7 }), 10);
  assert.equal(CM.tva({}), 10);
  proche(CM.ratio(ctx.recettes[1], ctx), 0.063); // 0,63 € sur 10 € HT
  var emporter = Object.assign({}, ctx.recettes[1], { prix: 10.55, tva: 5.5 });
  proche(CM.ratio(emporter, ctx), 0.063);
  assert.equal(CM.ratio({ prix: 0, lignes: [] }, ctx), 0);
});

test("prix conseillé : TVA du plat, arrondi au demi-euro supérieur", function () {
  var r = { id: "x", prix: 10, tva: 10, lignes: [{ ing: "beurre", q: 250, u: "g" }] }; // 2,50 €
  assert.equal(CM.prixConseille(r, ctx, 25), 11);   // 10 € HT → 11 € TTC tout rond
  r.tva = 20;
  assert.equal(CM.prixConseille(r, ctx, 25), 12);
  r.tva = 5.5;
  assert.equal(CM.prixConseille(r, ctx, 25), 11);   // 10,55 → 11
});

test("allergènes et traces passent par les sous-recettes", function () {
  var a = CM.allergenes(ctx.recettes[1], ctx);
  assert.deepEqual(a.contient.sort(), ["lait", "sulfites"]);
  assert.deepEqual(a.traces, ["poissons"]);
  var c = JSON.parse(JSON.stringify(ctx));
  c.ingredients.push({ id: "cabillaud", unite: "kg", prix: 20, al: ["poissons"] });
  c.recettes[1].lignes.push({ ing: "cabillaud", q: 150, u: "g" });
  assert.deepEqual(CM.allergenes(c.recettes[1], c).traces, []); // contient du poisson : plus une trace
});

test("migration des anciennes lignes vers g, ml ou l'unité de l'ingrédient", function () {
  var c = { ingredients: ctx.ingredients, recettes: [{ id: "r", lignes: [{ ing: "beurre", q: 0.015 }, { ing: "vin", q: 0.05 }, { ing: "oeuf", q: 1.5 }, { rec: "s", q: 2 }] },
    { id: "s", sousRecette: true, production: { q: 1, u: "L" }, lignes: [] }] };
  var avant = CM.cout(c.recettes[0], c);
  CM.migrer(c);
  assert.deepEqual(c.recettes[0].lignes, [{ ing: "beurre", q: 15, u: "g" }, { ing: "vin", q: 50, u: "ml" }, { ing: "oeuf", q: 1.5, u: "pièce" }, { rec: "s", q: 2, u: "L" }]);
  proche(CM.cout(c.recettes[0], c), avant);
  CM.migrer(c); // sans effet la deuxième fois
  assert.equal(c.recettes[0].lignes[0].q, 15);
});
