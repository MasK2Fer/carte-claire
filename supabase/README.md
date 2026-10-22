# Mettre Carte Claire en ligne avec Supabase

Sans configuration, le site reste la maquette de démonstration (code 1234, données dans le navigateur).
Ces étapes activent les vrais comptes restaurateur et la carte publique derrière le QR code.

1. Créer un compte sur https://supabase.com puis un projet. Choisir une région en Europe (Paris ou Francfort).
2. Dans le projet, ouvrir **SQL Editor**, coller le contenu de [`schema.sql`](schema.sql) et cliquer **Run**.
3. Dans **Authentication > URL Configuration**, mettre l'adresse du site en **Site URL**
   (par exemple `https://mask2fer.github.io/carte-claire/pro.html`), pour que le lien de confirmation
   envoyé par e-mail ramène au bon endroit.
4. Dans **Project Settings > API**, copier l'**URL du projet** et la clé **anon public**, et les coller dans
   [`../config.js`](../config.js).
5. Publier (commit sur `main`) : GitHub Pages sert la nouvelle version.

## Ce qui est stocké, et qui peut le lire

| Table | Contenu | Lecture | Écriture |
| --- | --- | --- | --- |
| `espaces` | Recettes, ingrédients, prix d'achat, objectif de marge | Le restaurateur seulement | Le restaurateur seulement |
| `cartes` | Nom du restaurant, plats, prix de vente, allergènes, variantes | Tout le monde (c'est la carte publique) | Le restaurateur seulement |

La séparation en deux tables garantit que la carte publique ne peut pas exposer un coût ou une marge.
La clé `anon` est publique par conception : ce sont ces règles (Row Level Security) qui protègent les données.

Chaque restaurant reçoit un code de carte tiré au hasard (8 caractères) au premier passage. L'adresse
du QR code est `carte.html?r=<code>` ; elle ne change pas si le restaurant est renommé.
