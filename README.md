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
