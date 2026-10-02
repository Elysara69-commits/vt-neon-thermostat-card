# Changelog

Toutes les évolutions notables de ce projet sont documentées ici.
Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le projet respecte le [versionnage sémantique](https://semver.org/lang/fr/).

## [1.0.0] - 2026-10-02

### Ajouté
- Première version publique de la carte `vt-neon-thermostat-card`.
- Jauge circulaire néon (arc de 270°) : température actuelle (point blanc), consigne (point sombre).
- Boutons − / + avec envoi différé de la consigne (une seule requête après 600 ms).
- Boutons de mode HVAC (Chauffe / Arrêt, extensibles via `hvac_modes`) et sélecteur de preset.
- Barre de puissance (% du cycle + watts) et bloc « statut pilote » (`input_text`, `sensor`…).
- Badges d'alerte : fenêtre ouverte, délestage, mode sécurité.
- Panneau d'informations (bouton ⓘ) et ouverture du more-info (bouton ⋮ ou titre).
- Trois mises en page : `full`, `compact` et `horizontal`.
- Éditeur visuel intégré à Home Assistant.
- Traductions français / anglais, couleurs `color` et `heat_color` personnalisables.
