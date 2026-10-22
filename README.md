# Carte Claire — maquette

Maquette cliquable d'une appli pour restaurateurs : une fiche recette saisie une fois donne le tableau des 14 allergènes, une carte client en 4 langues filtrable par allergie, et le coût matière de chaque plat.

- **Accueil :** https://mask2fer.github.io/carte-claire/
- **Carte client** (ce que voit le client en scannant le QR code) : https://mask2fer.github.io/carte-claire/carte.html
- **Espace restaurateur** (recettes, allergènes, marges ; code de démonstration 1234) : https://mask2fer.github.io/carte-claire/pro.html

La carte client ne reçoit que les plats, leurs prix de vente et leurs allergènes : aucun ingrédient, coût ou marge.

- Données d'exemple ; les prix des ingrédients sont fictifs.
- L'import photo, le scan de code-barres et la lecture de facture sont simulés.
- Le code d'accès est une démonstration, pas une vraie protection.
- Chaque visiteur garde ses saisies dans son propre navigateur : rien n'est envoyé ni partagé.

## Version en ligne

Une fois `config.js` rempli, l'espace restaurateur passe en comptes e-mail et mot de passe, les données sont enregistrées en ligne (Supabase), et chaque restaurant a sa carte publique à l'adresse `carte.html?r=<code>`, celle du QR code. Mise en place : [supabase/README.md](supabase/README.md).
