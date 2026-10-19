# Carte Claire — maquette

Maquette cliquable d'une appli pour restaurateurs : une fiche recette saisie une fois donne le tableau des 14 allergènes, une carte client en 4 langues filtrable par allergie, et le coût matière de chaque plat.

- **Accueil :** https://mask2fer.github.io/carte-claire/
- **Carte client** (ce que voit le client en scannant le QR code) : https://mask2fer.github.io/carte-claire/carte.html
- **Espace restaurateur** (recettes, allergènes, marges ; code de démonstration 1234) : https://mask2fer.github.io/carte-claire/pro.html

La carte client ne reçoit que les plats, leurs prix de vente et leurs allergènes : aucun ingrédient, coût ou marge.

- Données d'exemple ; les prix des ingrédients sont fictifs.
- L'import photo, le scan de code-barres et la lecture de facture sont simulés.
- Le code d'accès est une démonstration, pas une vraie protection : la vraie version aura des comptes avec mot de passe.
- Chaque visiteur garde ses saisies dans son propre navigateur : rien n'est envoyé ni partagé.

## Calcul du coût matière

Le calcul est dans `cout.js`, séparé de la page pour pouvoir le tester : rendement de chaque ingrédient (épluchage, parage), préparations de base utilisées dans les plats (sous-recettes), TVA propre à chaque plat (5,5 %, 10 % ou 20 %) et conversions d'unités (g, kg, ml, cl, L, pièce, botte). Les quantités des recettes sont nettes.

Tests : `npm test` (Node 18 ou plus, aucune dépendance à installer).

## Prix par fournisseur

Onglet **Fournisseurs** de l'espace restaurateur, calcul dans `fournisseurs.js` (testé avec `npm test`). Le restaurateur coche ses fournisseurs (Metro, Promocash, Transgourmet, EpiSaveurs, un primeur, ou un fournisseur qu'il ajoute). Chaque produit d'un catalogue est relié à un ingrédient et vendu par colis ; son prix est ramené à l'unité de l'ingrédient (€/kg, €/L, €/pièce). Chaque ingrédient prend l'offre retenue, la moins chère par défaut, et le coût matière des plats suit. L'onglet compare le coût de la carte chez chaque fournisseur et signale les ingrédients moins chers ailleurs.

- Les catalogues fournis sont des exemples aux prix fictifs : les grossistes ne publient pas leurs prix professionnels en libre accès (ils dépendent de la carte client et des conditions de chacun).
- Les vrais prix arrivent par l'import de la mercuriale ou de l'historique d'achats en CSV (référence ; libellé ; quantité du colis ; unité ; prix HT). Chaque libellé est rapproché d'un ingrédient, à confirmer avant import.
- Un prix saisi à la main ou lu sur une facture n'est jamais écrasé par un fournisseur.
