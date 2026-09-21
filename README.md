# Fitness Tracker

Een responsive web-app om je krachttraining bij te houden: push/pull/legs/core-oefeningen loggen (ook via spraak), statistieken bekijken, en per spiergroep zien of je op schema zit.

## Functionaliteit

- **Oefeningenbibliotheek**: ruim 35 push-, pull-, leg- en core-oefeningen, elk gekoppeld aan de spiergroep(en) die ze trainen.
- **Loggen via spraak of tekst**: spreek bijvoorbeeld *"Bankdrukken drie sets van tien herhalingen met vijftig kilo"* in (via de Web Speech API, werkt in Chrome) of typ/vul het formulier handmatig in. De herkende sets/reps/gewicht worden altijd getoond ter controle voordat je opslaat.
- **Score per spiergroep**: voor elke spiergroep wordt het aantal sets deze week en het 30-dagen gemiddelde vergeleken met een richtwaarde (standaard 10-20 sets/week voor grote spiergroepen, 6-14 voor kleinere). Dit is een algemene, bijstelbare vuistregel uit krachttraining-coaching — geen persoonlijk of medisch advies.
- **Tips**: voor spiergroepen die deze week onder de richtwaarde zitten, stelt de app oefeningen voor die je nog niet (of het langst geleden) hebt gedaan.
- **Statistieken**: grafieken van volume per categorie (30 dagen) en sets per spiergroep (deze week), plus je meest gedane oefeningen.
- **Data blijft lokaal**: alles wordt opgeslagen in de browser (`localStorage`), er is geen server/backend nodig.

## Ontwikkelen

```bash
npm install
npm run dev
```

## Bouwen

```bash
npm run build
```

## Toevoegen aan je beginscherm (mobiel)

Open de app in de browser op je telefoon en kies "Toevoegen aan beginscherm" (Chrome/Safari) om hem als app-icoon te gebruiken.
