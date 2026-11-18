# -*- coding: utf-8 -*-
"""
genera-profilo-template.py — crea/rigenera il profilo dimostrativo «Atleta Template»
in TMS_Dati/template/ e lo registra in TMS_Dati/profili.json.

Atleta INVENTATO da zero (dal 18/11/2026): niente viene letto dai dati di Marco o dei clienti.
Serve a far vedere ogni analisi del TMS accesa e con numeri verosimili e coerenti fra loro:
  - 14 mesi di storia fino a FINE, con cinque Training Set (ognuno col suo tipo di allenamento)
    e cambi scheda veri: «Progresso reale» salta quelli netti e continua dove gli esercizi restano;
  - fasi alimentari Bulk / Cut / Mantenimento con piani completi a 5 pasti (banca alimenti del
    TMS), sei periodi registrati di cui l'ultimo IN CORSO;
  - peso e composizione che rispondono al bilancio calorico del piano (con un po' di rumore),
    misure ogni settimana, pesate quotidiane della bilancia nelle ultime 8 settimane;
  - Session-RPE e durata per seduta legati al blocco, scarichi, pause; tre test del massimale;
    cardio su tutto l'anno; foto segnaposto una volta al mese (le immagini le disegna
    tools/genera-foto-demo.js, da lanciare DOPO questo script).

Deterministico: stesso FINE, stesso risultato. Per «rinfrescare» il dimostrativo (che col
passare dei mesi invecchia: filtri «ultime 4 settimane» vuoti, semaforo rosso) basta spostare
FINE in avanti: tutta la storia si sposta con lui.

Dopo: electron\\node_modules\\.bin\\electron.cmd tools\\genera-foto-demo.js
      node tools/genera-seed-incorporato.js   (dati incorporati nell'HTML)
      npm run build && npm test               (aggiorna i test che contano il template)
"""
import json, os, math, random
from datetime import date, timedelta

# ════════════════ DA REGOLARE ════════════════
FINE = 202646          # ultima settimana salvata nello Storico (codice ISO AAAASS)
SEME = 20261118        # seme del generatore casuale: cambia i dettagli, non la struttura
# ═════════════════════════════════════════════

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TD = os.path.join(ROOT, 'TMS_Dati')
rng = random.Random(SEME)

def load(p): return json.load(open(p, encoding='utf-8'))
def save(p, obj):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)

CATALOGO = {e['nome']: e for e in load(os.path.join(TD, 'esercizi.json'))}
CIBI = {a['nome']: a['per100'] for a in load(os.path.join(ROOT, 'src', 'dati', 'alimenti-usav.json'))['alimenti']}

# ── calendario: settimane ISO ─────────────────────────────────────────────
def lun(code): return date.fromisocalendar(code // 100, code % 100, 1)
def codice(d): y, w, _ = d.isocalendar(); return y * 100 + w
def gauss(s): return rng.gauss(0, s)

# la storia, in ordine: (blocco, settimane, fase alimentare). None = nessun periodo registrato
SEQ = [
    ('A',     15, 'bulk'),   # Ipertrofia A
    ('pausa',  1, 'bulk'),   # una settimana ferma (feste): si mangia di più, niente pesi
    ('F',     13, 'cut'),    # Forza, test dei massimali a fine blocco
    ('PL',    13, 'mant'),   # Powerlifting, picco e test a fine blocco
    ('C',      6, 'cut'),    # Casa · manubri (cambio scheda netto)
    ('vac',    2, None),     # vacanza: niente pesi, niente misure, piano non registrato
    ('B',     12, 'bulk'),   # Ipertrofia B — periodo IN CORSO
]
N_SETT = sum(s[1] for s in SEQ)
INIZIO = codice(lun(FINE) - timedelta(weeks=N_SETT - 1))
SETT = []   # [{code, blocco, k (1-based nel blocco), fase, run (indice del tratto in SEQ)}]
_cnt = {}
for run, (bl, n, fase) in enumerate(SEQ):
    for i in range(n):
        _cnt[bl] = _cnt.get(bl, 0) + 1
        SETT.append({'code': codice(lun(INIZIO) + timedelta(weeks=len(SETT))), 'blocco': bl,
                     'k': _cnt[bl], 'fase': fase, 'run': run})
assert SETT[-1]['code'] == FINE

# ── i Training Set ────────────────────────────────────────────────────────
# esercizio: (nome, serie, (rip min, rip max), RIR obiettivo, recupero, attrezzo, nota)
#  attrezzo: bil (2,5 kg) · man (2 kg per manubrio) · cavo (2,5) · mac (5) · corpo (zavorra, 2,5)
def E(nome, serie, rip, rir, rest, att, nota=''):
    return {'nome': nome, 'serie': serie, 'rip': rip if isinstance(rip, tuple) else (rip, rip),
            'rir': rir, 'rest': rest, 'att': att, 'nota': nota}

PANCA, SQUAT, STACCO = 'Panca piana con bilanciere - presa media', 'Squat con bilanciere', 'Stacco da terra con bilanciere'
BLOCCHI = {
  # Ipertrofia A: volume moderato (Ipertrofia B, un anno dopo, ha una serie in più quasi ovunque)
  'A': {'nome': 'Ipertrofia A', 'tipo': 'ipertrofia', 'modo': 'doppia', 'scarico': [5, 10, 15], 'test': {1: [PANCA, SQUAT, STACCO]},
        'giorni': [
    [E(PANCA, 3, (6, 10), 2, '2:00', 'bil', 'fermo al petto'), E('Distensioni su panca inclinata con manubri', 3, (8, 12), 2, '1:30', 'man'),
     E('Croci ai cavi (cable crossover)', 2, (12, 15), 2, '1:00', 'cavo'), E('Alzate laterali', 3, (12, 15), 2, '1:00', 'man'),
     E('Pushdown per tricipiti con corda', 2, (10, 15), 2, '1:00', 'cavo'), E('French press', 2, (8, 12), 2, '1:30', 'bil')],
    [E('Trazioni alla sbarra (pull-up)', 3, (6, 10), 2, '2:00', 'corpo'), E('Rematore con bilanciere busto in avanti', 3, (6, 10), 2, '2:00', 'bil'),
     E('Lat pulldown presa larga', 2, (8, 12), 2, '1:30', 'cavo'), E('Rematore seduto ai cavi', 2, (10, 12), 2, '1:30', 'cavo'),
     E('Face pull', 2, (12, 15), 2, '1:00', 'cavo'), E('Curl con bilanciere EZ', 2, (8, 12), 2, '1:00', 'bil')],
    [E(SQUAT, 3, (6, 10), 2, '2:30', 'bil'), E('Stacco rumeno', 2, (8, 10), 2, '2:00', 'bil', 'tempo 3-0-1'),
     E('Pressa per gambe', 3, (10, 15), 2, '1:30', 'mac'), E('Leg curl da seduto', 2, (10, 15), 2, '1:00', 'mac'),
     E('Calf in piedi alla macchina', 3, (10, 15), 2, '1:00', 'mac')],
    [E('Military press in piedi', 3, (6, 10), 2, '2:00', 'bil'), E('Distensioni su panca piana con manubri', 3, (8, 12), 2, '1:30', 'man'),
     E('Rematore a un braccio con manubrio', 3, (8, 12), 2, '1:30', 'man'), E('Hammer curl', 2, (10, 12), 2, '1:00', 'man')],
    [E(STACCO, 3, (5, 8), 2, '2:30', 'bil'), E('Hip thrust con bilanciere', 3, (8, 12), 2, '1:30', 'bil'),
     E('Leg extension', 2, (12, 15), 2, '1:00', 'mac'), E('Crunch ai cavi', 2, (12, 15), 2, '1:00', 'cavo')],
  ]},
  'F': {'nome': 'Forza', 'tipo': 'forza', 'modo': 'fisse', 'scarico': [6, 11], 'test': {13: [SQUAT, PANCA, STACCO]},
        'giorni': [
    [E(SQUAT, 5, 5, 2, '3:00', 'bil'), E('Stacco rumeno', 3, 6, 2, '2:30', 'bil'),
     E('Pressa per gambe', 3, 8, 2, '2:00', 'mac'), E('Crunch ai cavi', 3, 12, 2, '1:00', 'cavo')],
    [E(PANCA, 5, 5, 2, '3:00', 'bil', 'fermo al petto'), E('Rematore con bilanciere busto in avanti', 4, 6, 2, '2:30', 'bil'),
     E('Trazioni alla sbarra (pull-up)', 4, 5, 2, '2:30', 'corpo'), E('Face pull', 3, 12, 2, '1:00', 'cavo')],
    [E(STACCO, 5, 3, 2, '3:00', 'bil'), E('Front squat con bilanciere', 3, 5, 2, '2:30', 'bil'),
     E('Hip thrust con bilanciere', 3, 8, 2, '2:00', 'bil'), E('Crunch con peso', 3, 12, 2, '1:00', 'man')],
    [E('Military press in piedi', 5, 5, 2, '2:30', 'bil'), E('Panca piana presa stretta con bilanciere', 4, 6, 2, '2:30', 'bil'),
     E('Dip alle parallele', 3, 6, 2, '2:00', 'corpo'), E('Rematore seduto ai cavi', 3, 8, 2, '1:30', 'cavo'),
     E('Curl con bilanciere EZ', 3, 8, 2, '1:00', 'bil')],
  ]},
  'PL': {'nome': 'Powerlifting', 'tipo': 'powerlifting', 'modo': 'fisse', 'scarico': [5, 9], 'test': {13: [SQUAT, PANCA, STACCO]},
         # onda delle alzate principali: settimana del blocco -> (serie, rip, RIR); lo stacco fa due serie in meno
         'onda': {1: (5, 5, 2), 2: (5, 5, 2), 3: (5, 4, 2), 4: (5, 4, 1), 6: (5, 3, 2), 7: (5, 3, 1), 8: (4, 3, 1),
                  10: (4, 2, 2), 11: (3, 2, 1), 12: (2, 1, 2), 13: (3, 3, 3)},
         'principali': [SQUAT, PANCA, STACCO],
         'giorni': [
    [E(SQUAT, 5, 5, 2, '3:00', 'bil'), E(PANCA, 5, 5, 2, '3:00', 'bil', 'fermo al petto'),
     E('Leg curl da seduto', 3, 10, 2, '1:30', 'mac')],
    [E(STACCO, 4, 4, 2, '3:00', 'bil'), E('Panca piana presa stretta con bilanciere', 4, 6, 2, '2:30', 'bil'),
     E('Rematore con bilanciere busto in avanti', 4, 6, 2, '2:00', 'bil')],
    [E('Box squat', 3, 6, 3, '2:30', 'bil', 'tecnica, velocità'), E('Panca piana presa larga con bilanciere', 4, 6, 3, '2:30', 'bil'),
     E('Trazioni alla sbarra (pull-up)', 4, 6, 2, '2:00', 'corpo')],
    [E('Good morning', 3, 8, 2, '2:00', 'bil'), E('Military press in piedi', 3, 6, 2, '2:00', 'bil'),
     E('Dip alle parallele', 3, 8, 2, '1:30', 'corpo'), E('Crunch ai cavi', 3, 12, 2, '1:00', 'cavo')],
  ]},
  # a casa: manubri regolabili fino a 32 kg, pochi esercizi e più serie
  'C': {'nome': 'Casa · manubri', 'tipo': 'generale', 'modo': 'doppia', 'scarico': [], 'test': {}, 'max_man': 32,
        'giorni': [
    [E('Goblet squat', 4, (10, 15), 2, '1:30', 'man'), E('Distensioni su panca piana con manubri', 4, (8, 12), 2, '1:30', 'man'),
     E('Rematore a un braccio con manubrio', 4, (8, 12), 2, '1:30', 'man'), E('Alzate laterali', 3, (12, 15), 2, '1:00', 'man'),
     E('Curl alternato con manubri', 3, (10, 12), 2, '1:00', 'man')],
    [E('Split squat bulgaro con manubri', 4, (8, 12), 2, '1:30', 'man'), E('Trazioni alla sbarra (pull-up)', 3, (6, 10), 2, '2:00', 'corpo', 'sbarra di casa'),
     E('Arnold Press con Manubri', 4, (8, 12), 2, '1:30', 'man'), E('Stacco a gambe tese con manubri', 4, (10, 12), 2, '1:30', 'man')],
    [E('Calf in piedi con manubri', 4, (12, 15), 2, '1:00', 'man'), E('Distensioni su panca inclinata con manubri', 4, (8, 12), 2, '1:30', 'man'),
     E('Hammer curl', 3, (10, 12), 2, '1:00', 'man')],
  ]},
  'B': {'nome': 'Ipertrofia B', 'tipo': 'ipertrofia', 'modo': 'doppia', 'scarico': [6], 'test': {},
        # stalli voluti, per far vedere il segnale «In stallo»: da quella settimana del blocco
        'stallo': {'Alzate laterali': 5, 'French press': 6},
        'giorni': [
    [E(PANCA, 4, (6, 10), 2, '2:00', 'bil'), E('Rematore con bilanciere busto in avanti', 4, (6, 10), 2, '2:00', 'bil'),
     E('Military press in piedi', 3, (8, 10), 2, '2:00', 'bil'), E('Lat pulldown presa larga', 3, (8, 12), 2, '1:30', 'cavo'),
     E('Curl con bilanciere EZ', 3, (8, 12), 2, '1:00', 'bil')],
    [E(SQUAT, 4, (6, 10), 2, '2:30', 'bil'), E('Stacco rumeno', 3, (8, 10), 2, '2:00', 'bil', 'tempo 3-0-1'),
     E('Leg extension', 3, (12, 15), 2, '1:00', 'mac'), E('Leg curl da seduto', 3, (10, 15), 2, '1:00', 'mac'),
     E('Calf in piedi alla macchina', 4, (10, 15), 2, '1:00', 'mac')],
    [E('Distensioni su panca inclinata con manubri', 4, (8, 12), 2, '1:30', 'man'), E('Dip alle parallele', 3, (8, 12), 2, '1:30', 'corpo'),
     E('Croci ai cavi (cable crossover)', 3, (12, 15), 2, '1:00', 'cavo'), E('Alzate laterali', 4, (12, 15), 2, '1:00', 'man'),
     E('French press', 3, (8, 12), 2, '1:30', 'bil')],
    [E('Trazioni alla sbarra (pull-up)', 4, (6, 10), 2, '2:00', 'corpo'), E('Rematore seduto ai cavi', 3, (10, 12), 2, '1:30', 'cavo'),
     E('Face pull', 3, (12, 15), 2, '1:00', 'cavo'), E('Hammer curl', 3, (10, 12), 2, '1:00', 'man')],
    [E(STACCO, 4, (5, 8), 2, '2:30', 'bil'), E('Pressa per gambe', 3, (10, 15), 2, '1:30', 'mac'),
     E('Hip thrust con bilanciere', 3, (8, 12), 2, '1:30', 'bil'), E('Split squat bulgaro con manubri', 4, (8, 12), 2, '1:30', 'man'),
     E('Crunch ai cavi', 3, (12, 15), 2, '1:00', 'cavo')],
  ]},
}
ORDINE_SET = ['A', 'F', 'PL', 'C', 'B']
RISC_GIORNO = {'A': 8, 'F': 10, 'PL': 10, 'B': 8}   # minuti di cyclette prima di ogni seduta (palestra)

# massimale stimato di partenza (kg di carico; per trazioni/dip/leg raise il carico TOTALE
# corpo + zavorra). Atleta intermedio di circa 74 kg.
RM0 = {PANCA: 88, SQUAT: 118, STACCO: 145, 'Military press in piedi': 56, 'Rematore con bilanciere busto in avanti': 84,
       'Stacco rumeno': 112, 'Front squat con bilanciere': 96, 'Hip thrust con bilanciere': 135, 'Pressa per gambe': 230,
       'Leg curl da seduto': 72, 'Leg extension': 80, 'Calf in piedi alla macchina': 125, 'Lat pulldown presa larga': 82,
       'Rematore seduto ai cavi': 84, 'Face pull': 36, 'Curl con bilanciere EZ': 44, 'Pushdown per tricipiti con corda': 34,
       'Pushdown per tricipiti': 40, 'French press': 38, 'Croci ai cavi (cable crossover)': 32, 'Alzate laterali': 15,
       'Alzate laterali da seduto ai cavi': 13, 'Distensioni su panca inclinata con manubri': 33,
       'Distensioni su panca piana con manubri': 37, 'Rematore a un braccio con manubrio': 42, 'Hammer curl': 21,
       'Curl alternato con manubri': 19, 'Affondi con manubri': 30, 'Goblet squat': 44, 'Split squat bulgaro con manubri': 28,
       'Arnold Press con Manubri': 24, 'Stacco a gambe tese con manubri': 38, 'Shrug': 125, 'Crunch ai cavi': 62,
       'Good morning': 82, 'Panca piana presa stretta con bilanciere': 80, 'Box squat': 112,
       'Panca piana presa larga con bilanciere': 84, 'Calf in piedi con manubri': 48,
       'Trazioni alla sbarra (pull-up)': 96, 'Dip alle parallele': 108, 'Leg raise da appeso': 40, 'Crunch con peso': 42}
QUOTA = {'Trazioni alla sbarra (pull-up)': 1.0, 'Dip alle parallele': 1.0, 'Leg raise da appeso': 0.40}
INC = {'bil': 2.5, 'man': 2.0, 'cavo': 2.5, 'mac': 5.0, 'corpo': 2.5}

tutti = {e['nome'] for b in BLOCCHI.values() for g in b['giorni'] for e in g}
mancano = sorted(n for n in tutti | {'Cyclette'} if n not in CATALOGO)
assert not mancano, 'esercizi non a catalogo: ' + str(mancano)
assert not (tutti - set(RM0)), 'manca il massimale di partenza: ' + str(sorted(tutti - set(RM0)))

# ── alimentazione: piani completi a 5 pasti (nomi della banca alimenti) ───────
def P(pasto, righe): return [{'pasto': pasto, 'alimento': a, 'grammi': g} for a, g in righe]
PIANI = {
  'bulk': P('Colazione', [('Latte parzialmente scremato, UHT', 300), ('Fiocchi di avena', 100), ('Banana, cruda', 120), ('Miele (miele di fiori)', 15)])
        + P('Spuntino', [('Yogurt, naturale', 250), ('Mandorle', 20), ('Mirtillo, crudo', 100)])
        + P('Pranzo', [('Pasta, secca', 110), ('Pollo, petto senza pelle, crudo', 160), ("Olio d'oliva", 15), ('Zucchina, cruda', 200), ('Parmigiano', 10)])
        + P('Merenda', [('Pane integrale di grano', 80), ('Bresaola', 60), ('Whey Protein PBN', 30), ('Mela, cruda', 150)])
        + P('Cena', [('Riso integrale, secco', 70), ("Salmone d'allevamento, crudo", 140), ("Olio d'oliva", 10), ('Broccoli, crudi', 200)]),
  'bulk25': P('Colazione', [('Latte parzialmente scremato, UHT', 300), ('Fiocchi di avena', 90), ('Banana, cruda', 120), ('Miele (miele di fiori)', 15)])
        + P('Spuntino', [('Yogurt, naturale', 250), ('Mandorle', 15), ('Mirtillo, crudo', 100)])
        + P('Pranzo', [('Pasta, secca', 110), ('Pollo, petto senza pelle, crudo', 160), ("Olio d'oliva", 15), ('Zucchina, cruda', 200), ('Parmigiano', 10)])
        + P('Merenda', [('Pane integrale di grano', 70), ('Bresaola', 60), ('Whey Protein PBN', 30), ('Mela, cruda', 150)])
        + P('Cena', [('Riso integrale, secco', 75), ("Salmone d'allevamento, crudo", 130), ("Olio d'oliva", 10), ('Broccoli, crudi', 200)]),
  'mant': P('Colazione', [('Latte parzialmente scremato, UHT', 250), ('Fiocchi di avena', 100), ('Banana, cruda', 100)])
        + P('Spuntino', [('Yogurt, naturale', 200), ('Noci', 25), ('Kiwi, crudo', 100)])
        + P('Pranzo', [('Pasta integrale, secca', 110), ('Tacchino, petto, scaloppina o sminuzzato, crudo', 160), ("Olio d'oliva", 12), ('Verdura (media), cotta', 200)])
        + P('Merenda', [('Galletta di riso integrale', 30), ('Whey Protein PBN', 30), ('Mela, cruda', 150)])
        + P('Cena', [('Patata, con buccia, cotta al forno (senza aggiunta di grassi o sale)', 250), ('Merluzzo bianco, crudo', 200), ("Olio d'oliva", 12), ('Pane integrale di grano', 70), ('Pomodoro, crudo', 150)]),
  'cut': P('Colazione', [('Latte parzialmente scremato, UHT', 250), ('Fiocchi di avena', 70), ('Fragola, cruda', 150)])
        + P('Spuntino', [('Yogurt, naturale magro', 200), ('Whey Protein PBN', 25)])
        + P('Pranzo', [('Riso integrale, secco', 100), ('Pollo, petto senza pelle, crudo', 180), ("Olio d'oliva", 12), ('Verdura (media), cotta', 250)])
        + P('Merenda', [('Mela, cruda', 150), ('Mandorle', 25)])
        + P('Cena', [('Tonno, in salamoia, sgocciolato', 150), ('Patata, con buccia, cotta al forno (senza aggiunta di grassi o sale)', 250), ("Olio d'oliva", 12), ('Lattuga (media), crude', 100), ('Pane integrale di grano', 80)]),
  'cut26': P('Colazione', [('Latte parzialmente scremato, UHT', 250), ('Fiocchi di avena', 70), ('Fragola, cruda', 150)])
        + P('Spuntino', [('Yogurt, naturale magro', 200), ('Whey Protein PBN', 25)])
        + P('Pranzo', [('Riso integrale, secco', 100), ('Pollo, petto senza pelle, crudo', 180), ("Olio d'oliva", 10), ('Verdura (media), cotta', 250)])
        + P('Merenda', [('Mela, cruda', 150), ('Mandorle', 20)])
        + P('Cena', [('Tonno, in salamoia, sgocciolato', 150), ('Patata, con buccia, cotta al forno (senza aggiunta di grassi o sale)', 250), ("Olio d'oliva", 10), ('Lattuga (media), crude', 100), ('Pane integrale di grano', 80)]),
}
sconosciuti = sorted({r['alimento'] for p in PIANI.values() for r in p if r['alimento'] not in CIBI})
assert not sconosciuti, 'alimenti non in banca dati: ' + str(sconosciuti)
def tot(piano, k): return sum((CIBI[r['alimento']].get(k) or 0) * r['grammi'] / 100.0 for r in piano)
KCAL = {k: tot(p, 'kcal') for k, p in PIANI.items()}
FINESTRE = {'bulk': (2950, 3100), 'bulk25': (2850, 2980), 'mant': (2620, 2780), 'cut': (2220, 2380), 'cut26': (2180, 2320)}
for k, (lo, hi) in FINESTRE.items():
    pr = tot(PIANI[k], 'proteine')
    print('dieta %-6s: %4.0f kcal · %3.0f g proteine · %3.0f g carboidrati · %3.0f g grassi' % (
        k, KCAL[k], pr, tot(PIANI[k], 'zuccheri'), tot(PIANI[k], 'grassi')))
    assert lo <= KCAL[k] <= hi, '%s fuori finestra: %.0f kcal (attese %d-%d)' % (k, KCAL[k], lo, hi)
    assert pr >= 135, '%s: proteine troppo basse (%.0f g)' % (k, pr)

# periodi: tratti di SEQ con la stessa fase; quale piano fotografano
PIANO_DEL_TRATTO = {0: 'bulk25', 1: 'bulk25', 2: 'cut26', 3: 'mant', 4: 'cut', 6: 'bulk'}

# ── corpo: peso e composizione che seguono il bilancio calorico ─────────────
ALT, PAL, NASCITA = 178, 1.55, date(1998, 3, 12)
def eta_al(d): return d.year - NASCITA.year - ((d.month, d.day) < (NASCITA.month, NASCITA.day))
def basale(magra): return 370 + 21.6 * magra          # Katch-McArdle

grasso, magra = 74.0 * 0.150, 74.0 * 0.850
corpo_sett = []   # stato VERO a inizio settimana: peso, frazione di grasso, magra
prev_fase, sett_in_fase = None, 0
for s in SETT:
    corpo_sett.append({'peso': grasso + magra, 'mg': grasso / (grasso + magra), 'magra': magra})
    fase, bl = s['fase'], s['blocco']
    sett_in_fase = sett_in_fase + 1 if fase == prev_fase else 1
    kcal = KCAL[PIANO_DEL_TRATTO[s['run']]] if fase else 2950            # in vacanza si mangia fuori
    kcal += gauss(70) + (650 if bl == 'pausa' else 0)                       # aderenza, feste
    adatt = 1 - min(0.03, 0.004 * max(0, sett_in_fase - 3)) if fase == 'cut' else 1.0
    tdee = basale(magra) * PAL * adatt
    dw = (kcal - tdee) * 7 / 7700.0
    allena = bl not in ('pausa', 'vac')
    if dw > 0: dm, dg = (0.45 if allena else 0.15) * dw, (0.55 if allena else 0.85) * dw
    else:      dm, dg = 0.2 * dw, 0.8 * dw
    if fase == 'mant' and allena: dm, dg = dm + 0.04, dg - 0.04            # ricomposizione
    if not allena: dm -= 0.12                                               # glicogeno e acqua
    magra += dm; grasso += dg
    if sett_in_fase == 1 and fase == 'cut': magra -= 0.35                   # acqua al primo taglio
    if sett_in_fase == 1 and fase == 'bulk' and s['run'] > 0: magra += 0.3
    prev_fase = fase
corpo_sett.append({'peso': grasso + magra, 'mg': grasso / (grasso + magra), 'magra': magra})   # dopo FINE
IDX = {s['code']: i for i, s in enumerate(SETT)}

def r2(x, d=2): return round(x + 0.0, d)
INIZIO_PESATE = SETT[-8]['code']          # ultime 8 settimane: pesate quotidiane della bilancia
storico_io, pesate = [], []
OSSA0 = 3.2
for i, s in enumerate(SETT):
    if s['blocco'] == 'vac': continue      # in vacanza niente bilancia
    c = corpo_sett[i]
    d0 = lun(s['code'])
    if s['code'] < INIZIO_PESATE:
        peso = r2(c['peso'] + gauss(0.25), 1)
        mg = round(c['mg'] + gauss(0.004), 3)
        ossa = round(OSSA0 + 0.012 * (c['magra'] - 62.9) + gauss(0.04), 1)
        mm = r2(peso * (1 - mg), 2)
        bas = round(basale(mm))
        storico_io.append({'scheda': s['code'], 'eta': eta_al(d0), 'livello': PAL, 'peso': peso,
            'metabolismo': r2(bas * PAL, 1), 'bmi': r2(peso / (ALT / 100) ** 2), 'massa_grassa': mg, 'massa_magra': mm,
            'massa_muscolare': r2(mm - ossa, 1), 'massa_ossea': ossa, 'metab_basale': bas,
            'grasso_viscerale': max(3, round(4 + (mg * 100 - 14) * 0.5)), 'acqua': r2((1 - mg) * 73.3 + gauss(0.3), 1)})
        continue
    # settimana con le pesate: ogni mattina (quasi), qualche sera senza maniglie
    nx = corpo_sett[i + 1]
    for g in range(7):
        if rng.random() < 0.18: continue
        frac = g / 7.0
        vero = c['peso'] + (nx['peso'] - c['peso']) * frac
        mgv = c['mg'] + (nx['mg'] - c['mg']) * frac
        d = d0 + timedelta(days=g)
        peso = r2(vero + gauss(0.3) + (0.25 if g in (5, 6) else 0), 2)
        gr = r2(mgv * 100 + gauss(0.5), 1)
        mm = peso * (1 - gr / 100)
        ossa = r2(OSSA0 + 0.012 * (mm - 62.9) + gauss(0.03), 2)
        ora = '07:%02d:%02d' % (rng.randint(2, 48), rng.randint(0, 59))
        imp = [r2(21.5 + gauss(0.6), 1), r2(312 + gauss(5), 1), r2(306 + gauss(5), 1), r2(248 + gauss(4), 1), r2(251 + gauss(4), 1)]
        imp += [r2(v * 0.89, 1) for v in imp]
        pesate.append({'id': 'demo-%s-%s' % (d.isoformat(), ora[:5].replace(':', '')), 'data': d.isoformat(), 'ora': ora,
            'peso': peso, 'grasso': gr, 'acqua': r2((100 - gr) * 0.733 + gauss(0.2), 1), 'muscolo': r2(mm - ossa, 2),
            'ossa': ossa, 'proteine': r2((100 - gr) * 0.2, 1), 'visc': max(3, round(4 + (gr - 14) * 0.5)),
            'bmr': round(basale(mm)), 'eta_met': max(18, round(eta_al(d) - 3 + (gr - 15) * 0.8)),
            'bmi': r2(peso / (ALT / 100) ** 2, 1), 'bpm': rng.randint(56, 68), 'imp': imp})
        if rng.random() < 0.15:   # di sera, solo peso (senza tenere le maniglie)
            pesate.append({'id': 'demo-%s-21%02d' % (d.isoformat(), rng.randint(0, 59)), 'data': d.isoformat(),
                           'ora': '21:%02d:00' % rng.randint(0, 59), 'peso': r2(peso + 0.6 + gauss(0.2), 2)})
    # la riga dello Storico misure, come la scrive l'app dalle pesate (rigaDaPesate, 09c-pesate.js)
    della = [p for p in pesate if codice(date.fromisoformat(p['data'])) == s['code']]
    per_giorno = {}
    for p in sorted(della, key=lambda p: p['data'] + ' ' + p['ora']): per_giorno.setdefault(p['data'], []).append(p)
    contate = [next((p for p in l if 'grasso' in p), l[0]) for _, l in sorted(per_giorno.items())]
    M = lambda k: sum(p[k] for p in contate if k in p) / max(1, sum(1 for p in contate if k in p))
    peso, gr = M('peso'), M('grasso')
    mg = round(gr / 100, 4)
    bas = round(M('bmr'))
    storico_io.append({'scheda': s['code'], 'eta': eta_al(d0), 'livello': PAL, 'peso': r2(peso), 'metabolismo': bas * PAL,
        'bmi': r2(peso / (ALT / 100) ** 2), 'massa_grassa': mg, 'massa_magra': r2(peso * (1 - mg)),
        'massa_muscolare': r2(M('muscolo')), 'massa_ossea': r2(M('ossa')), 'metab_basale': bas,
        'grasso_viscerale': r2(M('visc'), 1), 'acqua': r2(M('acqua'), 1), 'n_pesate': len(contate)})

peso_sett = {r['scheda']: r['peso'] for r in storico_io}
def peso_corpo(code):     # come pesoCorpoScheda: la misura della settimana o la più vicina prima
    prima = [c for c in peso_sett if c <= code]
    return peso_sett[max(prima)] if prima else peso_sett[min(peso_sett)]

# ── allenamento: progressione, scarichi, test ───────────────────────────────
CRESCITA = {'bulk': 0.004, 'mant': 0.002, 'cut': 0.0}
forza_g = 1.0                     # forza «di fondo» dell'atleta
spec = {n: 1.0 for n in RM0}      # adattamento specifico: sale se l'esercizio si allena (in fretta all'inizio), cala se no
serie_prat = {n: 0 for n in RM0}  # settimane di fila in cui l'esercizio è in scheda
stato = {}                        # (blocco, giorno, esercizio) -> carico della doppia progressione
storico, storico_rpe, storico_risc = [], [], []
ultime_righe = {}                 # blocco -> righe di scheda dell'ultima settimana piena

def giu(x, inc): return math.floor(x / inc + 1e-9) * inc
def rip_cedimento(rm, carico): return 30 * (rm / carico - 1)      # Epley al contrario

def seduta_di(B, gi, nome):
    # come sedutaMap dell'app: la prima, seconda… volta che l'esercizio compare nella settimana
    return [g for g, giorno in enumerate(B['giorni']) if any(e['nome'] == nome for e in giorno)].index(gi) + 1
def riga(s, gi, ex, serie, rip, zav, rir, test=False):
    return {'scheda': s['code'], 'esercizio': ex['nome'], 'seduta': seduta_di(BLOCCHI[s['blocco']], gi, ex['nome']), 'test': test,
            'macro': CATALOGO[ex['nome']].get('macro') or CATALOGO[ex['nome']].get('gruppo') or '',
            'serie': serie, 'rip': rip, 'peso': zav, 'rest': ex['rest'], 'rir': rir,
            'set': BLOCCHI[s['blocco']]['nome']}

# l'ultima settimana piena di ogni blocco (prima di scarico o test) si spinge: un RIR in meno
ULTIMA_PIENA = {bl: max(s['k'] for s in SETT if s['blocco'] == bl and s['k'] not in B_['scarico'] and s['k'] not in B_['test'])
               for bl, B_ in BLOCCHI.items()}
for s in SETT:
    bl, k, fase = s['blocco'], s['k'], s['fase']
    if bl in ('pausa', 'vac'):
        forza_g *= 0.996 if bl == 'pausa' else 0.993
        for n in spec: spec[n] = max(0.95, spec[n] * 0.996)
        continue
    B = BLOCCHI[bl]
    scarico, tests = k in B['scarico'], B['test'].get(k, [])
    praticati = {e['nome'] for g in B['giorni'] for e in g}
    corpo = peso_corpo(s['code'])
    scheda_sett = []
    testati = set()
    primo_giorno = {}
    for gi, giorno in enumerate(B['giorni']):
        for ex in giorno: primo_giorno.setdefault(ex['nome'], gi)
    for gi, giorno in enumerate(B['giorni']):
        for ex in giorno:
            n = ex['nome']; att = ex['att']; inc = INC[att]; q = QUOTA.get(n, 0.0)
            rm = RM0[n] * forza_g * spec[n]
            if n in B.get('stallo', {}) and k >= B['stallo'][n]:
                rm *= 0.90                                        # stallo: la serie migliore resta indietro
            buona = k == ULTIMA_PIENA[bl] and n not in B.get('stallo', {})
            rm_g = rm * (1 + gauss(0.012))                         # forma del giorno
            rir_t = ex['rir'] - (1 if buona else 0)
            base = corpo * q
            def zav(car): return max(0.0, giu(car - base, inc)) if q else giu(car, inc)
            if n in tests and n not in testati:                    # test del massimale: una singola
                testati.add(n)
                z = zav(rm_g * 1.01)
                storico.append(riga(s, gi, ex, 1, 1, z, 0, test=True))
            if B['modo'] == 'fisse' or (bl == 'PL' and n in B.get('principali', [])):
                serie, rip, rirt = ex['serie'], ex['rip'][0], rir_t
                if bl == 'PL' and n in B['principali']:
                    serie, rip, rirt = B['onda'].get(k, (serie, rip, rirt))
                    if buona: rirt -= 1
                    if n == STACCO: serie = max(2, serie - 2)
                if scarico: serie, rirt = max(2, serie - 2), rirt + 3
                if n in tests and gi == primo_giorno.get(n): serie, rirt = max(2, serie - 2), rirt + 1
                car = rm_g / (1 + (rip + rirt) / 30)
                z = zav(car + inc / 2)      # il carico più vicino: RIR vicino all'obiettivo
                cf = rip_cedimento(rm_g, z + base)
                if cf < rip: rip = max(1, int(cf)); rir = 0
                else: rir = min(4, max(0, round(cf - rip)))
            else:   # doppia progressione: stesso carico finché le ripetizioni arrivano in cima
                lo, hi = ex['rip']; chiave = (bl, gi, n)
                if chiave not in stato:
                    stato[chiave] = zav(rm / (1 + (lo + 1 + ex['rir']) / 30))
                if bl == 'C' and att == 'man': stato[chiave] = min(stato[chiave], B['max_man'])
                z = stato[chiave]
                cf = rip_cedimento(rm_g, z + base)
                rip = int(cf - rir_t)
                if bl == 'C' and att == 'man' and z + inc > B['max_man']: hi += 6   # manubri al massimo: più ripetizioni
                if buona: hi += 2                  # settimana spinta: qualche ripetizione in più, carico fermo
                for _ in range(3):                 # altrimenti si sale di carico finché le ripetizioni rientrano
                    if not (rip > hi and not scarico): break
                    nuovo = z + inc
                    if bl == 'C' and att == 'man' and nuovo > B['max_man']: break
                    stato[chiave] = z = nuovo; cf = rip_cedimento(rm_g, z + base); rip = int(cf - rir_t)
                rip = max(lo - 1, min(hi, rip)); serie = ex['serie']
                if scarico:
                    z = zav((z + base) * 0.85) if q else giu(z * 0.85, inc); serie = max(2, serie - 1); rip = lo
                    cf = rip_cedimento(rm_g, z + base)
                rip = max(1, min(rip, int(cf)))
                rir = min(4, max(0, round(cf - rip)))
            r = riga(s, gi, ex, serie, rip, z, rir)
            storico.append(r)
            scheda_sett.append({'giorno': 'Giorno %d' % (gi + 1), 'esercizio': n, 'note': ex['nota'], 'serie': serie,
                                'rip': rip, 'peso': z, 'rest': ex['rest'], 'rir': ex['rir'],
                                'macro': r['macro']})
    if not scarico and not tests and k != ULTIMA_PIENA[bl]: ultime_righe[bl] = scheda_sett   # la scheda: una settimana «normale»
    # session-RPE e durata di ogni seduta
    for gi, giorno in enumerate(B['giorni']):
        base_min = {'A': 75, 'F': 85, 'PL': 95, 'C': 50, 'B': 75}[bl] + 4 * (len(giorno) - 5)
        rpe = {'A': 7, 'F': 8, 'PL': 8, 'C': 6, 'B': 7}[bl] + (1 if gi in (2, 4) and bl in ('A', 'B') else 0)
        if bl == 'PL' and k in (11, 12): rpe, base_min = rpe + 1, base_min - 15
        if fase == 'cut' and rng.random() < 0.5: rpe += 1
        if scarico: rpe, base_min = rpe - 3, base_min * 0.75
        if B['test'].get(k) and any(e['nome'] in B['test'][k] for e in giorno): rpe = 9
        rpe = max(3, min(10, rpe + rng.choice([-1, 0, 0, 0, 1])))
        storico_rpe.append({'scheda': s['code'], 'giorno': 'Giorno %d' % (gi + 1), 'rpe': rpe,
                            'min': int(round(base_min + gauss(6))), 'set': B['nome']})
        if bl in RISC_GIORNO:
            storico_risc.append({'scheda': s['code'], 'giorno': 'Giorno %d' % (gi + 1), 'esercizio': 'Cyclette',
                                 'min': RISC_GIORNO[bl], 'set': B['nome']})
    # adattamenti per la settimana dopo
    if not scarico: forza_g *= 1 + CRESCITA[fase]
    for n in spec:
        if n in praticati:
            spec[n] = min(1.10, spec[n] * (1 + 0.002 + 0.010 * math.exp(-serie_prat[n] / 5))); serie_prat[n] += 1
        else:
            spec[n] = max(0.95, spec[n] * 0.998); serie_prat[n] = 0

# ── controlli: gli stessi calcoli dell'app (02-calcoli.js, 08-progressi.js) ─────────
def carico_eff(r): return r['peso'] + peso_corpo(r['scheda']) * QUOTA.get(r['esercizio'], 0)
def s_tl(r):
    w = carico_eff(r); eff = r['rip'] + (r['rir'] or 0)
    return r['serie'] * r['rip'] * w * (1 / (1 + eff / 30)) * CATALOGO[r['esercizio']]['fattore']
def s_rm(r): return carico_eff(r) * (1 + (r['rip'] + (r['rir'] or 0)) / 30)
def stalli(righe):
    out = []
    for n in sorted({r['esercizio'] for r in righe}):
        per = {}
        for r in righe:
            if r['esercizio'] == n and not r['test'] and carico_eff(r) > 0: per[r['scheda']] = per.get(r['scheda'], 0) + s_tl(r)
        sch = sorted(per)
        if len(sch) < 4: continue
        mx = max(per.values()); ult = max(i for i, c in enumerate(sch) if per[c] >= mx - 1e-6)
        if len(sch) - 1 - ult >= 3: out.append((n, len(sch) - 1 - ult))
    return out
def salti(righe):
    per = {}
    for r in righe:
        if r['test']: continue
        x = per.setdefault(r['scheda'], {}).setdefault(r['esercizio'], {'tl': 0, 'serie': 0, 'rm': 0})
        x['tl'] += s_tl(r); x['serie'] += r['serie']; x['rm'] = max(x['rm'], s_rm(r))
    sch = sorted(per); out = []
    for a, b in zip(sch, sch[1:]):
        A, Bm = per[a], per[b]
        com = [e for e in Bm if e in A]
        cop = min(sum(A[e]['tl'] for e in com) / sum(v['tl'] for v in A.values()),
                  sum(Bm[e]['tl'] for e in com) / sum(v['tl'] for v in Bm.values()))
        if len(com) < 3 or cop < 0.5: out.append(b)
    return out
# Il segnale «In stallo» dell'app guarda il TL di ogni esercizio su TUTTA la storia: il dente di sega
# della doppia progressione (sale il carico, scendono le ripetizioni) lo farebbe scattare anche per
# esercizi che crescono. Dove l'ultima settimana piena di un esercizio resta poco sotto il suo massimo
# si spinge un po' di più (una ripetizione in più, un RIR in meno): restano solo gli stalli voluti.
voluti = set(BLOCCHI['B']['stallo']); spinte = 0
for giro in range(3):
    st = [x for x in stalli(storico) if x[0] not in voluti]
    if not st: break
    for n, _ in st:
        piene = sorted({r['scheda'] for r in storico if r['esercizio'] == n and not r['test']
                        and not (SETT[IDX[r['scheda']]]['k'] in BLOCCHI[SETT[IDX[r['scheda']]]['blocco']]['scarico'])})
        for r in storico:
            if r['esercizio'] == n and r['scheda'] == piene[-1] and not r['test']:
                r['rip'] += 1; r['rir'] = max(0, (r['rir'] or 0) - 1); spinte += 1
st = stalli(storico)
print('in stallo (tutto il percorso):', st, '· righe spinte di una ripetizione:', spinte)
assert sorted(n for n, _ in st) == sorted(BLOCCHI['B']['stallo']), 'stalli non voluti: ' + str(st)
sl = salti(storico)
print('cambi scheda saltati da «Progresso reale»:', sl)
ini = {bl: next(s['code'] for s in SETT if s['blocco'] == bl) for bl in ('C', 'B')}
assert ini['C'] in sl and ini['B'] in sl, 'manca un cambio scheda netto: ' + str(sl)
assert len(sl) <= 3, 'troppi salti: ' + str(sl)

# ── cardio su tutto l'anno ───────────────────────────────────────────────
cardio = []
corse = 0
for i, s in enumerate(SETT):
    d0, fase, bl = lun(s['code']), s['fase'], s['blocco']
    n_corse = 1 if (fase in ('cut', 'mant') or bl == 'vac' or i % 2 == 0) else 0
    if bl == 'pausa': n_corse = 0
    if n_corse:
        corse += 1
        km = min(11.0, 5.0 + 0.15 * corse) * rng.uniform(0.75, 1.2); km = round(max(4.0, km) * 2) / 2
        passo = max(4.9, 6.1 - 0.022 * corse + gauss(0.08))
        cardio.append({'data': (d0 + timedelta(days=6)).isoformat(), 'tipo': 'Corsa', 'durata': int(round(km * passo)),
                       'rpe': 6 if km < 9 else 7, 'distanza': km, 'quota': int(round(rng.uniform(40, 180) / 10) * 10),
                       'fcMedia': int(round(158 - 0.25 * corse + gauss(2))), 'note': ''})
    if fase == 'cut' and bl != 'pausa':
        cardio.append({'data': (d0 + timedelta(days=5)).isoformat(), 'tipo': 'HIIT', 'durata': rng.choice([20, 22, 24, 25, 26]),
                       'rpe': rng.choice([8, 9, 9]), 'distanza': '', 'quota': '', 'fcMedia': rng.randint(164, 173), 'note': 'intervalli'})
    if (fase == 'mant' or bl == 'vac') and i % 2 == 1:
        km = round(rng.uniform(32, 58)); vel = rng.uniform(24, 28.5)
        cardio.append({'data': (d0 + timedelta(days=5)).isoformat(), 'tipo': 'Bici', 'durata': int(round(km / vel * 60)),
                       'rpe': rng.choice([5, 6, 6]), 'distanza': float(km), 'quota': int(round(km * rng.uniform(6, 11) / 10) * 10),
                       'fcMedia': rng.randint(134, 144), 'note': ''})

# ── foto segnaposto: il primo lunedì di ogni mese (non in vacanza) ─────────────
foto, mesi = [], set()
for s in SETT:
    d = lun(s['code'])
    if s['blocco'] == 'vac' or (d.year, d.month) in mesi: continue
    mesi.add((d.year, d.month))
    for tag in ('anteriore', 'laterale', 'posteriore'):
        foto.append({'file': 'demo-%s-%s.jpg' % (d.isoformat(), tag), 'data': d.isoformat(), 'tag': tag})

# ── scheda.json: cinque Training Set, attivo l'ultimo ──────────────────────────
def risc(bl):
    if bl not in RISC_GIORNO: return {}
    return {'settimanale': [{'giorno': 'Giorno %d' % (gi + 1), 'esercizio': 'Cyclette', 'serie': '', 'rip': '',
                             'min': RISC_GIORNO[bl], 'note': ''} for gi in range(len(BLOCCHI[bl]['giorni']))]}
def set_di(bl):
    return {'settimanale': ultime_righe[bl], 'mensile': [], 'riscaldamento': risc(bl), 'tipoAllenamento': BLOCCHI[bl]['tipo']}
attivo = 'B'
scheda = {'settimanale': ultime_righe[attivo], 'mensile': [], 'rpe': {'settimanale': {}}, 'riscaldamento': risc(attivo),
          'tipoAllenamento': BLOCCHI[attivo]['tipo'], 'setAttivo': BLOCCHI[attivo]['nome'],
          'setsSalvati': {BLOCCHI[bl]['nome']: set_di(bl) for bl in ORDINE_SET if bl != attivo},
          'setsOrdine': [BLOCCHI[bl]['nome'] for bl in ORDINE_SET]}

# ── alimentazione.json: tre piani + sei periodi, l'ultimo in corso ────────────────
alim = {'bulk': PIANI['bulk'], 'mant': PIANI['mant'], 'cut': PIANI['cut'], 'periodi': []}
tratti = {}
for s in SETT:
    if s['fase']: tratti.setdefault(s['run'], []).append(s['code'])
for run in sorted(set(PIANO_DEL_TRATTO) & set(tratti)):
    codes = tratti[run]
    # i tratti consecutivi della stessa fase (Ipertrofia A + pausa) sono UN periodo
    if alim['periodi'] and alim['periodi'][-1]['_run'] == run - 1 and alim['periodi'][-1]['fase'] == SEQ[run][2]:
        alim['periodi'][-1]['al'] = (lun(codes[-1]) + timedelta(days=6)).isoformat(); alim['periodi'][-1]['_run'] = run; continue
    alim['periodi'].append({'id': 'tpl-%d' % (len(alim['periodi']) + 1), 'fase': SEQ[run][2], 'dal': lun(codes[0]).isoformat(),
                            'al': (lun(codes[-1]) + timedelta(days=6)).isoformat(), '_run': run,
                            'righe': [{'alimento': r['alimento'], 'grammi': r['grammi']} for r in PIANI[PIANO_DEL_TRATTO[run]]]})
alim['periodi'][-1]['al'] = ''      # in corso: arriva fino a oggi
for p in alim['periodi']: del p['_run']

# ── corpo.json ──────────────────────────────────────────────────────────
ult_io = storico_io[-1]
ult_p = [p for p in pesate if 'grasso' in p][-1]
dati_utente = {
    'nome': 'Atleta', 'cognome': 'Template', 'sesso': 'M', 'nascita': NASCITA.isoformat(), 'eta': eta_al(lun(FINE)),
    'livello_attivita': PAL, 'altezza': ALT, 'peso': ult_p['peso'], 'massa_grassa': round(ult_p['grasso'] / 100, 4),
    'massa_muscolare': ult_p['muscolo'], 'massa_ossea': ult_p['ossa'], 'metab_basale': ult_p['bmr'],
    'grasso_viscerale': ult_p['visc'], 'acqua': ult_p['acqua'],
    'esperienza': 'intermedio', 'useRir': True, 'useRpe': True, 'e1rm': 'epley', 'faseAlim': 'bulk',
    'report': {'profilo': True, 'foto': True, 'riepilogo': True, 'scheda': True, 'andamento': True, 'progressione': True,
               'record': True, 'cardio': True, 'alimentazione': True, 'analisi': True, 'note': True,
               'fotoPrima': foto[0]['file'], 'fotoDopo': [f for f in foto if f['tag'] == foto[0]['tag']][-1]['file'],
               'obiettivo': 'Massa pulita fino a febbraio: +2,5 kg di peso con il grasso sotto il 17%, squat oltre i 150 kg',
               'nota': 'Ripartenza dopo l\'estate molto buona: carichi già sopra il blocco di un anno fa. Alzate laterali e French press ferme da qualche settimana: al prossimo blocco si cambiano.'},
}
corpo_json = {'dati_utente': dati_utente, 'storico_io': storico_io, 'storico_rpe': storico_rpe, 'storico_risc': storico_risc,
              'cardio': cardio, 'foto': foto, 'pesate': pesate, 'pesate_scartate': []}

save(os.path.join(TD, 'template', 'scheda.json'), scheda)
save(os.path.join(TD, 'template', 'storico.json'), storico)
save(os.path.join(TD, 'template', 'corpo.json'), corpo_json)
save(os.path.join(TD, 'template', 'alimentazione.json'), alim)

prof = load(os.path.join(TD, 'profili.json'))
if not any(p['slug'] == 'template' for p in prof['list']):
    prof['list'].append({'slug': 'template', 'nome': 'Atleta Template', 'creato': '2026-06-10'})
    save(os.path.join(TD, 'profili.json'), prof)

print('OK profilo template: settimane %d → %d (%d) | %d righe storico | %d sedute RPE | %d misure (%d da pesate) | %d pesate | %d cardio | %d periodi | %d foto' % (
    INIZIO, FINE, N_SETT, len(storico), len(storico_rpe), len(storico_io), sum(1 for r in storico_io if r.get('n_pesate')),
    len(pesate), len(cardio), len(alim['periodi']), len(foto)))
for p in alim['periodi']: print('  periodo %-4s %s → %s  %4.0f kcal' % (p['fase'], p['dal'], p['al'] or 'in corso', sum((CIBI[r['alimento']].get('kcal') or 0) * r['grammi'] / 100 for r in p['righe'])))
print('  peso: %.1f → %.1f kg · test 1RM: %s' % (storico_io[0]['peso'], storico_io[-1]['peso'],
      ', '.join('%s %s kg (%d)' % (r['esercizio'].split(' ')[0], r['peso'], r['scheda']) for r in storico if r['test'])))
print('Ora: electron\\node_modules\\.bin\\electron.cmd tools\\genera-foto-demo.js  →  node tools/genera-seed-incorporato.js  →  npm run build')
