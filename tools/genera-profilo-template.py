# -*- coding: utf-8 -*-
"""
genera-profilo-template.py — crea/rigenera il profilo dimostrativo "Atleta Template"
nel seed (TMS_Dati/template/) e lo registra in TMS_Dati/profili.json.

Atleta fittizio derivato dai dati di Wander: stessa struttura e stessi esercizi
(nomi del catalogo), carichi ~90% arrotondati al mezzo kg, antropometria diversa
(M, 1998, 178 cm, ~74,5 kg) e — richiesta esplicita di Marco (2026-06-10) —
storico_rpe POPOLATO: durata (min) e intensita (sRPE) per ogni seduta di tutte le
settimane, con due settimane di scarico; alimenta Training Load, monotonia e ACWR.

Deterministico: stessa esecuzione, stesso risultato. Dopo l'esecuzione non serve
alcun build (i dati del seed non passano dagli artefatti HTML), ma l'installer va
ricostruito per includerli (npm run release).
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TD = os.path.join(ROOT, 'TMS_Dati')

def load(p): return json.load(open(p, encoding='utf-8'))
def save(p, obj):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)

usav = {a['nome'] for a in load(os.path.join(ROOT, 'src', 'dati', 'alimenti-usav.json'))['alimenti']}

w_scheda = load(os.path.join(TD, 'wander', 'scheda.json'))
w_storico = load(os.path.join(TD, 'wander', 'storico.json'))
w_corpo = load(os.path.join(TD, 'wander', 'corpo.json'))

def peso_t(p):  # carichi ~90%, arrotondati al mezzo kg
    return round(round(p * 0.9 * 2) / 2, 1) if isinstance(p, (int, float)) else p

def pulisci_nota(n):  # via le note personali di setup (altezze panca/rack "H .. S ..")
    return '' if isinstance(n, str) and n.strip().startswith('H ') else n

# scheda: stessa struttura, carichi scalati
t_scheda = {'settimanale': [], 'mensile': [], 'rpe': {'settimanale': {}}}
for r in w_scheda['settimanale']:
    e = dict(r); e['peso'] = peso_t(e.get('peso')); e['note'] = pulisci_nota(e.get('note'))
    t_scheda['settimanale'].append(e)

# storico: stessa progressione, carichi scalati
t_storico = []
for r in w_storico:
    e = dict(r); e['peso'] = peso_t(e.get('peso'))
    t_storico.append(e)
settimane = sorted({r['scheda'] for r in t_storico})

# corpo: atleta 178 cm, trend simile a quello reale
H2 = 1.78 * 1.78
t_io = []
for r in w_corpo['storico_io']:
    peso = round(r['peso'] + 7.2, 1)
    mg = round(r['massa_grassa'] + 0.012, 3)
    t_io.append({
        'scheda': r['scheda'], 'eta': 27, 'livello': 1.55, 'peso': peso,
        'metabolismo': round(r['metabolismo'] + 110, 1),
        'bmi': round(peso / H2, 2),
        'massa_grassa': mg,
        'massa_magra': round(peso * (1 - mg), 2),
        'massa_muscolare': round(r['massa_muscolare'] + 3.9, 1),
        'massa_ossea': round(r['massa_ossea'] + 0.2, 1),
        'metab_basale': r['metab_basale'] + 130,
        'grasso_viscerale': round(r['grasso_viscerale'] + 1, 1),
    })

# storico_rpe: durata + intensita per OGNI seduta di tutte le settimane
giorni = [('Lunedì', 85, 8), ('Martedì', 75, 7), ('Mercoledì', 90, 8), ('Venerdì', 80, 7), ('Sabato', 70, 6)]
t_rpe = []
for i, sett in enumerate(settimane):
    scarico = sett in (202552, 202601)  # settimane di scarico (feste)
    for gi, (g, minuti, rpe) in enumerate(giorni):
        wig = ((i * 7 + gi * 3) % 11) - 5  # variazione deterministica, max 5 min
        t_rpe.append({
            'scheda': sett, 'giorno': g,
            'rpe': max(5, rpe - (2 if scarico else 0)),
            'min': max(40, minuti + wig - (15 if scarico else 0)),
        })

# cardio: sedute dimostrative per mostrare i grafici per-sport (v1.0.78).
#  - Corsa: progressione chiara (passo che cala 6:10->5:10 /km, distanza che cresce, FC media giu)
#  - Bici: velocita in aumento · HIIT: sedute brevi ad alta intensita (senza distanza)
# passo/velocita derivati da durata/distanza; D+ = dislivello positivo.
def _corsa(data, km, minuti, fc, dpos, rpe):
    return {'data': data, 'tipo': 'Corsa', 'durata': minuti, 'rpe': rpe, 'distanza': km,
            'quota': dpos, 'fcMedia': fc, 'note': ''}
def _bici(data, km, minuti, fc, dpos, rpe):
    return {'data': data, 'tipo': 'Bici', 'durata': minuti, 'rpe': rpe, 'distanza': km,
            'quota': dpos, 'fcMedia': fc, 'note': ''}
def _hiit(data, minuti, fc, rpe):
    return {'data': data, 'tipo': 'HIIT', 'durata': minuti, 'rpe': rpe, 'distanza': '',
            'quota': '', 'fcMedia': fc, 'note': 'intervalli'}
t_cardio = [
    _corsa('2026-04-06',  6.0, 37, 156,  70, 6),
    _corsa('2026-04-13',  7.0, 42, 155,  90, 6),
    _corsa('2026-04-20',  8.0, 47, 153, 110, 7),
    _corsa('2026-04-27',  8.5, 49, 152,  95, 6),
    _corsa('2026-05-04',  9.0, 51, 151, 130, 7),
    _corsa('2026-05-11', 10.0, 55, 150, 120, 7),
    _corsa('2026-05-18', 10.5, 56, 149, 150, 7),
    _corsa('2026-05-25', 11.0, 58, 148, 140, 7),
    _corsa('2026-06-03',  8.0, 41, 149,  80, 6),
    _corsa('2026-06-11', 12.0, 62, 147, 170, 7),
    _bici('2026-04-09', 32.0, 75, 138, 210, 5),
    _bici('2026-04-23', 40.0, 88, 140, 320, 6),
    _bici('2026-05-07', 45.0, 95, 139, 280, 6),
    _bici('2026-05-21', 52.0, 102, 141, 360, 6),
    _hiit('2026-04-16', 25, 168, 9),
    _hiit('2026-04-30', 28, 171, 9),
    _hiit('2026-05-14', 26, 169, 9),
]

t_corpo = {
    'dati_utente': {
        'nome': 'Atleta', 'cognome': 'Template', 'sesso': 'M', 'eta': 28,
        'livello_attivita': 1.55, 'altezza': 178, 'peso': 74.5,
        'massa_grassa': 0.158, 'massa_muscolare': 56.8, 'massa_ossea': 4.1,
        'metab_basale': 1720, 'grasso_viscerale': 3,
        'report': {'profilo': True, 'riepilogo': True, 'scheda': True, 'andamento': True,
                   'progressione': True, 'record': True, 'alimentazione': True, 'note': True,
                   'obiettivo': 'Ricomposizione: piu forza sui fondamentali, -2% massa grassa', 'nota': ''},
        'nascita': '1998-03-12', 'useRir': True, 'e1rm': 'epley', 'faseAlim': 'mant', 'useRpe': True,
    },
    'storico_io': t_io,
    'storico_rpe': t_rpe,
    'cardio': t_cardio,
}

# alimentazione: tre giornate REALISTICHE per un atleta ~74.5 kg / TDEE ~2600 kcal
# (bulk ~2900 · mantenimento ~2500 · cut ~2000; proteine ~2 g/kg), solo nomi USAV verificati
t_alim = {
  'bulk': [
    {'pasto': 'Colazione', 'alimento': 'Latte intero, UHT', 'grammi': 300},
    {'pasto': 'Colazione', 'alimento': 'Fiocchi di avena', 'grammi': 100},
    {'pasto': 'Colazione', 'alimento': 'Banana, cruda', 'grammi': 120},
    {'pasto': 'Colazione', 'alimento': 'Marmellata', 'grammi': 25},
    {'pasto': 'Spuntino', 'alimento': 'Quark, natuale, semigrasso', 'grammi': 150},
    {'pasto': 'Spuntino', 'alimento': 'Mela, cruda', 'grammi': 150},
    {'pasto': 'Spuntino', 'alimento': 'Mandorle', 'grammi': 30},
    {'pasto': 'Pranzo', 'alimento': 'Riso raffinato, secco', 'grammi': 130},
    {'pasto': 'Pranzo', 'alimento': 'Pollo, petto senza pelle, crudo', 'grammi': 180},
    {'pasto': 'Pranzo', 'alimento': "Olio d'oliva", 'grammi': 15},
    {'pasto': 'Pranzo', 'alimento': 'Pomodoro, crudo', 'grammi': 150},
    {'pasto': 'Cena', 'alimento': "Salmone d'allevamento, crudo", 'grammi': 150},
    {'pasto': 'Cena', 'alimento': 'Patata, con buccia, cotta al forno (senza aggiunta di grassi o sale)', 'grammi': 250},
    {'pasto': 'Cena', 'alimento': 'Pane integrale di grano', 'grammi': 80},
    {'pasto': 'Cena', 'alimento': "Olio d'oliva", 'grammi': 10},
  ],
  'mant': [
    {'pasto': 'Colazione', 'alimento': 'Latte intero, UHT', 'grammi': 250},
    {'pasto': 'Colazione', 'alimento': 'Fiocchi di avena', 'grammi': 90},
    {'pasto': 'Colazione', 'alimento': 'Banana, cruda', 'grammi': 100},
    {'pasto': 'Spuntino', 'alimento': 'Quark, natuale, semigrasso', 'grammi': 200},
    {'pasto': 'Spuntino', 'alimento': 'Mela, cruda', 'grammi': 150},
    {'pasto': 'Spuntino', 'alimento': 'Noci', 'grammi': 30},
    {'pasto': 'Pranzo', 'alimento': 'Riso integrale, secco', 'grammi': 120},
    {'pasto': 'Pranzo', 'alimento': 'Pollo, petto senza pelle, crudo', 'grammi': 170},
    {'pasto': 'Pranzo', 'alimento': "Olio d'oliva", 'grammi': 10},
    {'pasto': 'Pranzo', 'alimento': 'Verdura (media), cotta', 'grammi': 200},
    {'pasto': 'Cena', 'alimento': 'Uovo di gallina, intero, cotto, sodo', 'grammi': 110},
    {'pasto': 'Cena', 'alimento': 'Tonno, in salamoia, sgocciolato', 'grammi': 120},
    {'pasto': 'Cena', 'alimento': 'Pane integrale di grano', 'grammi': 70},
    {'pasto': 'Cena', 'alimento': "Olio d'oliva", 'grammi': 10},
    {'pasto': 'Cena', 'alimento': 'Pomodoro, crudo', 'grammi': 150},
  ],
  'cut': [
    {'pasto': 'Colazione', 'alimento': 'Quark, natuale, semigrasso', 'grammi': 250},
    {'pasto': 'Colazione', 'alimento': 'Fiocchi di avena', 'grammi': 50},
    {'pasto': 'Colazione', 'alimento': 'Mela, cruda', 'grammi': 150},
    {'pasto': 'Spuntino', 'alimento': 'Uovo di gallina, intero, cotto, sodo', 'grammi': 110},
    {'pasto': 'Spuntino', 'alimento': 'Pomodoro, crudo', 'grammi': 100},
    {'pasto': 'Pranzo', 'alimento': 'Pollo, petto senza pelle, crudo', 'grammi': 180},
    {'pasto': 'Pranzo', 'alimento': 'Riso integrale, secco', 'grammi': 70},
    {'pasto': 'Pranzo', 'alimento': 'Verdura (media), cotta', 'grammi': 250},
    {'pasto': 'Pranzo', 'alimento': "Olio d'oliva", 'grammi': 8},
    {'pasto': 'Cena', 'alimento': 'Tonno, in salamoia, sgocciolato', 'grammi': 150},
    {'pasto': 'Cena', 'alimento': 'Patata, con buccia, cotta al forno (senza aggiunta di grassi o sale)', 'grammi': 200},
    {'pasto': 'Cena', 'alimento': 'Pane integrale di grano', 'grammi': 50},
    {'pasto': 'Cena', 'alimento': 'Verdura (media), cotta', 'grammi': 150},
    {'pasto': 'Cena', 'alimento': "Olio d'oliva", 'grammi': 7},
  ],
}
sconosciuti = [r['alimento'] for fase in ['bulk','mant','cut'] for r in t_alim[fase] if r['alimento'] not in usav]
assert not sconosciuti, 'alimenti non in banca dati: ' + str(sconosciuti)

# verifica finestre caloriche e proteiche (kcal e proteine/giorno calcolate dalla banca dati)
nutri = {a['nome']: a['per100'] for a in load(os.path.join(ROOT, 'src', 'dati', 'alimenti-usav.json'))['alimenti']}
def tot(fase, k):
    return sum((nutri[r['alimento']][k] or 0) * r['grammi'] / 100.0 for r in t_alim[fase])
FINESTRE = {'bulk': (2750, 3100), 'mant': (2350, 2700), 'cut': (1800, 2150)}
for fase, (lo, hi) in FINESTRE.items():
    kc, pr = tot(fase, 'kcal'), tot(fase, 'proteine')
    print('dieta %-4s: %4.0f kcal · %3.0f g proteine' % (fase, kc, pr))
    assert lo <= kc <= hi, '%s fuori finestra: %.0f kcal (attese %d-%d)' % (fase, kc, lo, hi)
    assert pr >= 120, '%s: proteine troppo basse (%.0f g)' % (fase, pr)

# periodi alimentari datati (per il tab Analisi, v1.0.68): bulk -> cut -> mant,
# allineati alle settimane dello storico (lunedì ISO della prima, domenica dell'ultima)
from datetime import date, timedelta
def lun(code): return date.fromisocalendar(code // 100, code % 100, 1)
def dom(code): return lun(code) + timedelta(days=6)
def snap(fase): return [{'alimento': r['alimento'], 'grammi': r['grammi']} for r in t_alim[fase]]
t_alim['periodi'] = [
    {'id': 'tpl-bulk', 'fase': 'bulk', 'dal': lun(202545).isoformat(), 'al': dom(202602).isoformat(), 'righe': snap('bulk')},
    {'id': 'tpl-cut',  'fase': 'cut',  'dal': lun(202603).isoformat(), 'al': dom(202610).isoformat(), 'righe': snap('cut')},
    {'id': 'tpl-mant', 'fase': 'mant', 'dal': lun(202611).isoformat(), 'al': dom(202619).isoformat(), 'righe': snap('mant')},
]

save(os.path.join(TD, 'template', 'scheda.json'), t_scheda)
save(os.path.join(TD, 'template', 'storico.json'), t_storico)
save(os.path.join(TD, 'template', 'corpo.json'), t_corpo)
save(os.path.join(TD, 'template', 'alimentazione.json'), t_alim)

prof = load(os.path.join(TD, 'profili.json'))
if not any(p['slug'] == 'template' for p in prof['list']):
    prof['list'].append({'slug': 'template', 'nome': 'Atleta Template', 'creato': '2026-06-10'})
save(os.path.join(TD, 'profili.json'), prof)

print('OK profilo template:', len(t_scheda['settimanale']), 'righe scheda |',
      len(t_storico), 'righe storico |', len(t_io), 'misure corpo |', len(t_rpe), 'sedute RPE (durata+intensita) |',
      len(t_cardio), 'sedute cardio |', len(t_alim['periodi']), 'periodi alimentari')
print('settimane:', settimane[0], '->', settimane[-1], '| profili:', [p['slug'] for p in prof['list']], '| attivo:', prof['active'])
