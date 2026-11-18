
/* DOC = stato persistito */
let DOC = {
  scheda:        SEED.scheda        || {settimanale:[],mensile:[]},
  storico:       SEED.storico       || [],
  storico_io:    SEED.storico_io    || [],
  storico_rpe:   SEED.storico_rpe   || [],
  storico_risc:  SEED.storico_risc  || [],
  cardio:        SEED.cardio        || [],
  pesate:        SEED.pesate        || [],
  dati_utente:   SEED.dati_utente   || {},
  alimentazione: SEED.alimentazione || {bulk:[],mant:[],cut:[]},
  esercizi:      [],
  ricette:       [],   /* ricette personali, condivise tra i profili (TMS_Dati/ricette.json) */
};

