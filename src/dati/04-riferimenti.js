
/* DOC = stato persistito */
let DOC = {
  scheda:        SEED.scheda        || {settimanale:[],mensile:[]},
  storico:       SEED.storico       || [],
  storico_io:    SEED.storico_io    || [],
  storico_rpe:   SEED.storico_rpe   || [],
  dati_utente:   SEED.dati_utente   || {},
  alimentazione: SEED.alimentazione || {bulk:[],mant:[],cut:[]},
  esercizi:      [],
};

