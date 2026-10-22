# Sondage restaurateurs

Lien à partager : https://mask2fer.github.io/carte-claire/sondage/

Il s'ouvre dans n'importe quel navigateur, sans compte. Sur téléphone ou tablette, « Ajouter à l'écran d'accueil » lui donne une icône comme une appli.

## Où vont les réponses

- **Par défaut**, chaque réponse reste sur l'appareil qui a servi à répondre. En bas de l'accueil, « Réponses enregistrées sur cet appareil » permet de les compter, de les télécharger en fichier CSV (s'ouvre dans Excel ou Google Sheets) et de les effacer. Pratique pour faire passer le sondage sur ta tablette, même sans réseau.
- **Pour recevoir les réponses des gens qui le remplissent chez eux**, branche un Google Sheet (5 minutes, une seule fois) :
  1. Crée un Google Sheet vide, puis menu **Extensions → Apps Script**.
  2. Remplace le code par celui de `google-sheet.gs`, puis enregistre.
  3. **Déployer → Nouveau déploiement → Application Web** ; « Exécuter en tant que » : moi ; « Qui a accès » : tout le monde. Autorise l'accès demandé.
  4. Copie l'URL qui se termine par `/exec` et colle-la dans `index.html`, à la ligne `const ENDPOINT = "";` (ou envoie-la à Claude).

Une fois branché, chaque réponse arrive comme une ligne du Google Sheet. Si l'appareil est hors ligne, la réponse part toute seule au retour du réseau.
