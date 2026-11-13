# -*- coding: utf-8 -*-
"""Riferimenti della ragnatela «distribuzione fra i gruppi» — importazione RIPETIBILE.

Legge SOLO originali e file di lavoro, non scrive mai negli originali:
  - il pacchetto Codex v0.7 (ZIP intatto in Documentazione\\...\\01 Originali): corpus di
    evidenza, catalogo depot.fitness (CC BY 4.0), mappa esercizio-muscoli smyrdev (MIT);
  - le schede pubblicate già scaricate in Doc/meta-analisi (StrengthLog, Muscle & Strength);
  - il catalogo TMS (TMS_Dati/esercizi.json) e i nomi inglesi (tools/esercizi-en.json);
  - tools/riferimenti/protocolli-studi.json (trascrizione TMS dei protocolli di studio);
  - tools/riferimenti/mappa-esterna-convalida.csv (stato di convalida della mappa esterna:
    le righe «convalidata», «corretta» o «rifiutata» scritte a mano si conservano).

Scrive:
  - src/dati/05-riferimenti-distribuzione.js   (RIF_DISTR, incorporato nell'HTML dalla build)
  - tools/riferimenti/mappa-esterna-convalida.csv (aggiornata, righe manuali intatte)
  - Doc/riferimenti-distribuzione/*              (tabelle di controllo, fuori da git)

Le RACCOLTE non si mescolano: «schede» = schede pubblicate (un elemento = una settimana di
allenamento), «studi» = protocolli di studio con l'elenco completo degli esercizi (un elemento
= un protocollo, cioè uno o più bracci con le stesse proporzioni). Per ogni elemento si
salvano le serie DIRETTE e INDIRETTE per gruppo, con due conteggi: il catalogo TMS (muscoli
primari/secondari) e la mappa esterna (1,0/0,5 per profilo di movimento). Le quote % e le
fasce si calcolano nell'app con i pesi scelti: niente valori derivati incisi nei dati.

Uso:   python tools/genera-riferimenti.py [--zip PERCORSO] [--verifica]
       (--verifica: rigenera in memoria e confronta col file in src/dati, senza scrivere)
"""
import argparse, collections, csv, glob, hashlib, html as _html, io, json, os, re, sys, zipfile

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

QUI = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(QUI, '..'))
ZIP_DEF = os.path.abspath(os.path.join(ROOT, '..', 'Documentazione', 'Esercizzi', 'Grafico Distribuzione fra i gruppi',
                                       '01 Originali', 'TMS_dataset_e_approccio_v0.7.zip'))
META = os.path.join(ROOT, 'Doc', 'meta-analisi')
OUT_JS = os.path.join(ROOT, 'src', 'dati', '05-riferimenti-distribuzione.js')
OUT_DOC = os.path.join(ROOT, 'Doc', 'riferimenti-distribuzione')
CONV = os.path.join(QUI, 'riferimenti', 'mappa-esterna-convalida.csv')
PROT = os.path.join(QUI, 'riferimenti', 'protocolli-studi.json')
CATALOGO = os.path.join(ROOT, 'TMS_Dati', 'esercizi.json')
NOMI_EN = os.path.join(QUI, 'esercizi-en.json')

GR = ['Gambe', 'Pettorali', 'Schiena', 'Spalle', 'Braccia', 'Core']   # = GRUPPI_PESI dell'app

# ── conteggio TMS: lo stesso di quoteGruppi (01-costanti.js) ───────────────────
MUSC_TMS = {'quadricipiti': 'Gambe', 'ischiocrurali': 'Gambe', 'glutei': 'Gambe', 'polpacci': 'Gambe',
            'adduttori': 'Gambe', 'abduttori': 'Gambe', 'pettorali': 'Pettorali',
            'gran dorsale': 'Schiena', 'dorsali centrali': 'Schiena', 'trapezi': 'Schiena', 'lombari': 'Schiena',
            'spalle': 'Spalle', 'collo': 'Spalle',
            'bicipiti': 'Braccia', 'tricipiti': 'Braccia', 'avambracci': 'Braccia', 'addominali': 'Core'}
SPI = set(['pettorali', 'tricipiti'])
TRA = set(['gran dorsale', 'dorsali centrali', 'trapezi', 'bicipiti', 'avambracci'])
POST = set(['trapezi', 'dorsali centrali', 'gran dorsale'])

# ── mappa esterna: 22 muscoli smyrdev → 6 gruppi TMS (corrispondenza TMS, dichiarata) ──
MUSC_EST = {'Quads': 'Gambe', 'Hamstrings': 'Gambe', 'Glutes': 'Gambe', 'Calves': 'Gambe', 'Tibialis': 'Gambe',
            'Abductors': 'Gambe', 'Adductors': 'Gambe', 'Chest': 'Pettorali', 'Serratus': 'Pettorali',
            'Lats': 'Schiena', 'Upper Back': 'Schiena', 'Upper Traps': 'Schiena', 'Lower Back': 'Schiena',
            'Front Delts': 'Spalle', 'Side Delts': 'Spalle', 'Rear Delts': 'Spalle', 'Neck': 'Spalle',
            'Biceps': 'Braccia', 'Triceps': 'Braccia', 'Forearms': 'Braccia', 'Abs': 'Core', 'Obliques': 'Core'}
COL_EST = {'abductors': 'Abductors', 'abs': 'Abs', 'adductors': 'Adductors', 'biceps': 'Biceps', 'calves': 'Calves',
           'chest': 'Chest', 'forearms': 'Forearms', 'front_delts': 'Front Delts', 'glutes': 'Glutes',
           'hamstrings': 'Hamstrings', 'lats': 'Lats', 'lower_back': 'Lower Back', 'obliques': 'Obliques',
           'quads': 'Quads', 'rear_delts': 'Rear Delts', 'serratus': 'Serratus', 'side_delts': 'Side Delts',
           'triceps': 'Triceps', 'upper_back': 'Upper Back', 'upper_traps': 'Upper Traps'}

# ── vocabolari dei due assi del profilo ────────────────────────────────────────
LIV_SCHEDA = {'beginner': 'principiante', 'intermediate': 'intermedio', 'advanced': 'avanzato'}
LIV_STUDIO = {'untrained': 'principiante', 'trained': 'intermedio', 'well_trained': 'avanzato'}
TAG_STUDIO = {'hypertrophy': 'ipertrofia', 'strength': 'forza', 'powerlifting': 'powerlifting',
              'muscular_endurance': 'resistenza', 'power': 'potenza', 'general_performance': 'generale',
              'health_or_function': 'generale', 'general_resistance_training': 'generale',
              'concurrent_training': 'generale', 'bodybuilding_or_observed_practice': 'ipertrofia'}
GOAL_MS = {'build muscle': ['ipertrofia'], 'increase strength': ['forza'], 'lose fat': ['generale'],
           'general fitness': ['generale'], 'sports performance': ['generale'], 'increase endurance': ['resistenza']}
GOAL_DEPOT = {'muscle_gain': 'ipertrofia', 'strength': 'forza', 'fat_loss': 'generale', 'general_fitness': 'generale',
              'home_training': 'generale'}


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def leggi_json(path):
    with io.open(path, encoding='utf-8') as f:
        return json.load(f)


# ═════════════════════════ catalogo TMS ═════════════════════════
cat = {}
for e in leggi_json(CATALOGO):
    cat.setdefault(e['nome'], e)
it2en = leggi_json(NOMI_EN)


def di_tms(nome):
    """(gruppi diretti, gruppi indiretti) di UNA serie, come quoteGruppi: un gruppo con un
    muscolo primario è diretto anche se ha pure secondari; senza muscoli ricade sul macro."""
    e = cat[nome]
    d, i = [], []
    for m in e.get('muscoli_primari') or []:
        g = MUSC_TMS.get(m)
        if g and g not in d:
            d.append(g)
    for m in e.get('muscoli_secondari') or []:
        g = MUSC_TMS.get(m)
        if g and g not in d and g not in i:
            i.append(g)
    if not d and not i and e.get('macro') in GR:
        d.append(e['macro'])
    return d, i


def direzione(nome):
    e = cat[nome]
    if not str(e.get('tipo', '')).lower().startswith('multi'):
        return ''
    p = (e.get('muscoli_primari') or [None])[0]
    if p in SPI:
        return 'spinta'
    if p in TRA:
        return 'trazione'
    if p == 'spalle':
        return 'trazione' if set(e.get('muscoli_secondari') or []) & POST else 'spinta'
    return ''


# ═════════════ riconoscimento dei nomi inglesi (stesse regole di analizza.py) ═════════════
STOP = set(['the', 'a', 'with', 'and', 'on', 'to', 'in', 'of', 'machine', 'barbell',
            'dumbbell', 'cable', 'bar', 'ez', 'smith', 'weighted'])
SINON = [(r'\bpull\s*down\b', 'pulldown'), (r'\bpull\s*up\b', 'pullup'), (r'\bchin\s*up\b', 'chinup'),
         (r'\bpush\s*up\b', 'pushup'), (r'\bpush\s*down\b', 'pushdown'), (r'\bsit\s*up\b', 'situp'),
         (r'\bstiff\s*[- ]?\s*leg(ged)?\b', 'stifflegged'), (r'\bback squat\b', 'squat'),
         (r'\bstraight\s*arm\b', 'straightarm'), (r'\bbent\s*over\b', 'bentover'),
         (r'\bhyperextension\b', 'back extension'), (r'\bdb\b', ' '), (r'\bbb\b', ' ')]


def norm(s):
    s = s.lower()
    s = re.sub(r'\(.*?\)', ' ', s)
    s = re.sub(r'[^a-z ]', ' ', s)
    for pat, rep in SINON:
        s = re.sub(pat, rep, s)
    out = []
    for w in s.split():
        if len(w) > 3 and w.endswith('es') and not w.endswith('ses'):
            w = w[:-2]
        elif len(w) > 3 and w.endswith('s') and not w.endswith('ss'):
            w = w[:-1]
        if w and w not in STOP:
            out.append(w)
    return out


idx = {}
for it, en in it2en.items():
    if it in cat:
        idx.setdefault(' '.join(norm(en)), it)
toks = dict((k, set(k.split())) for k in idx)

ALIAS_RAW = {
    'bench press': 'Panca piana con bilanciere - presa media', 'barbell row': 'Rematore con bilanciere busto in avanti',
    'bent over row': 'Rematore con bilanciere busto in avanti', 'incline dumbbell press': 'Distensioni su panca inclinata con manubri',
    'lat pulldown': 'Lat machine avanti presa stretta', 'overhead press': 'Military press in piedi',
    'military press': 'Military press in piedi', 'barbell curl': 'Curl con bilanciere', 'squat': 'Squat con bilanciere',
    'deadlift': 'Stacco da terra con bilanciere', 'leg curl': 'Leg curl da sdraiato', 'lying leg curl': 'Leg curl da sdraiato',
    'seated leg curl': 'Leg curl da seduto', 'standing calf raise': 'Calf in piedi alla macchina',
    'seated calf raise': 'Calf da seduto', 'calf raise': 'Calf in piedi alla macchina', 'leg extension': 'Leg extension',
    'leg press': 'Leg press al multipower', 'pull up': 'Trazioni alla sbarra (pull-up)',
    'chin up': 'Trazioni presa supina (chin-up)', 'bar dip': 'Dip alle parallele', 'dip': 'Dip alle parallele',
    'dips': 'Dip alle parallele', 'dumbbell lateral raise': 'Alzate laterali', 'lateral raise': 'Alzate laterali',
    'dumbbell curl': 'Curl con manubri', 'tricep pushdown': 'Pushdown per tricipiti',
    'triceps pushdown': 'Pushdown per tricipiti', 'triceps pushdown with rope': 'Pushdown per tricipiti',
    'hammer curl': 'Hammer curl', 'romanian deadlift': 'Stacco rumeno',
    'stiff legged deadlift': 'Stacco a gambe tese con bilanciere', 'seated cable row': 'Rematore seduto ai cavi',
    'cable row': 'Rematore seduto ai cavi', 'seated row': 'Rematore seduto ai cavi', 'machine row': 'Rematore seduto ai cavi',
    'dumbbell row': 'Rematore a un braccio con manubrio', 'incline bench press': 'Panca inclinata con bilanciere - presa media',
    'dumbbell chest press': 'Distensioni su panca piana con manubri', 'dumbbell bench press': 'Distensioni su panca piana con manubri',
    'dumbbell chest fly': 'Croci con manubri', 'dumbbell fly': 'Croci con manubri', 'chest fly': 'Croci con manubri',
    'hip thrust': 'Hip thrust con bilanciere', 'front squat': 'Front squat con bilanciere', 'hack squat': 'Hack squat alla macchina',
    'hack squat machine': 'Hack squat alla macchina', 'face pull': 'Face pull',
    'barbell lying triceps extension': 'Skull crusher con bilanciere EZ', 'lying triceps extension': 'Skull crusher con bilanciere EZ',
    'skullcrusher': 'Skull crusher con bilanciere EZ', 'close grip bench press': 'Panca piana presa stretta con bilanciere',
    'push up': 'Piegamenti sulle braccia (push-up)', 'sumo deadlift': 'Stacco sumo',
    'bulgarian split squat': 'Split squat bulgaro con manubri', 'lunge': 'Affondi con manubri', 'walking lunge': 'Affondi con manubri',
    'shrug': 'Scrollate di spalle con manubri', 'crunch': 'Crunch', 'back extension': 'Iperestensioni (estensioni lombari)',
    'preacher curl': 'Curl alla panca Scott', 'concentration curl': 'Curl di concentrazione', 'spider curl': 'Spider curl',
    'seated dumbbell shoulder press': 'Shoulder press a leva', 'dumbbell shoulder press': 'Shoulder press a leva',
    'shoulder press': 'Shoulder press a leva', 'machine shoulder press': 'Shoulder press a leva',
    'pullover': 'Pullover con manubrio a braccia tese', 'reverse fly': 'Croci per deltoidi posteriori ai cavi',
    'rear delt fly': 'Croci per deltoidi posteriori ai cavi', 'reverse dumbbell fly': 'Croci per deltoidi posteriori ai cavi',
    'reverse pec deck': 'Croci per deltoidi posteriori ai cavi', 'cable crossover': 'Croci ai cavi (cable crossover)',
    'standing cable chest fly': 'Croci ai cavi (cable crossover)', 'goblet squat': 'Goblet squat',
    'triceps kickback': 'Kickback per tricipiti con manubri', 'tricep kickback': 'Kickback per tricipiti con manubri',
    'overhead triceps extension': 'Estensione tricipiti a due braccia da seduto busto in avanti',
    'chest press': 'Chest press alla macchina', 'machine chest press': 'Chest press alla macchina',
    'pec deck': 'Pectoral machine (butterfly)', 'donkey calf raise': 'Donkey calf raise',
    'inverted row': 'Rematore a corpo libero alla sbarra', 'sit up': 'Sit-up',
    'hanging leg raise': 'Sollevamento ginocchia/anche alle parallele', 'leg raise': 'Sollevamento ginocchia/anche alle parallele',
    'hanging knee raise': 'Sollevamento ginocchia/anche alle parallele',
    'wrist curl': 'Wrist curl con bilanciere presa supina sopra la panca', 'good morning': 'Good morning con bilanciere',
    'split squat': 'Affondi / Split squat', 'step up': 'Step up con bilanciere', 'glute bridge': 'Glute bridge con bilanciere',
    'nordic ham curl': 'Leg curl prono manuale con partner', 'nordic hamstring eccentric': 'Leg curl prono manuale con partner',
    'incline dumbbell curl': 'Curl su panca inclinata con manubri', 'cable curl': 'Curl in piedi ai cavi',
    'cable lateral raise': 'Alzate laterali da seduto ai cavi', 'front raise': 'Alzate frontali con manubri',
    'upright row': 'Rematore verticale con bilanciere', 'single leg romanian deadlift': 'Stacco rumeno',
    'ab wheel roll out': 'Ab rollout con bilanciere in ginocchio', 'landmine press': 'Military press in piedi',
    'machine leg curl': 'Leg curl da sdraiato', 'cable pull through': 'Pull through ai cavi',
    'decline bench press': 'Panca declinata con bilanciere', 'incline dumbbell bench press': 'Distensioni su panca inclinata con manubri',
    'arnold press': 'Arnold Press con Manubri', 'zercher squat': 'Zercher squat', 'trap bar deadlift': 'Stacco con trap bar',
}
ALIAS = dict((' '.join(norm(k)), v) for k, v in ALIAS_RAW.items() if v in cat)

SKIP = ['carry', 'ball slam', 'jump rope', 'wood chop', 'sled', 'battle rope', 'sprint', 'treadmill', 'bike',
        'rowing machine', 'burpee', 'mountain climber', 'jumping jack', 'stretch', 'foam roll', 'mobility', 'warm',
        'cardio', 'rest', 'drop ', 'amrap', 'kettlebell swing', 'box jump', 'agility', 'conditioning', 'walk',
        'run ', 'plank', 'dead hang', 'hold', 'bear crawl', 'crawl', 'jump', 'throw', 'toss', 'circuit']


def salta(nome):
    n = nome.lower().strip()
    return (not n) or len(n) < 3 or any(k in n for k in SKIP)


def risolvi(nome):
    k = ' '.join(norm(nome))
    if not k:
        return None
    if k in ALIAS:
        return ALIAS[k]
    if k in idx:
        return idx[k]
    tk = set(k.split())
    best, bs = None, 0.0
    for kk, tt in toks.items():
        if tt:
            j = len(tk & tt) / float(len(tk | tt))
            if j > bs:
                bs, best = j, idx[kk]
    return best if bs >= 0.6 else None


# ═════════════════════════ pacchetto Codex (ZIP) ═════════════════════════
def zip_testo(z, nome):
    return z.read(nome).decode('utf-8-sig')


def zip_csv(z, nome):
    return list(csv.DictReader(io.StringIO(zip_testo(z, nome))))


# ═════════ mappa esterna: aggancio catalogo TMS → esercizio smyrdev (PROPOSTA) ═════════
SIN_EST = [(r'\bleverage\b', 'lever'), (r'\bflyes?\b', 'fly'), (r'\bflye\b', 'fly'), (r'\bpush[\s-]*ups?\b', 'pushup'),
           (r'\bpull[\s-]*ups?\b', 'pullup'), (r'\bchin[\s-]*ups?\b', 'chinup'), (r'\bpull[\s-]*downs?\b', 'pulldown'),
           (r'\bpush[\s-]*downs?\b', 'pushdown'), (r'\bsit[\s-]*ups?\b', 'situp'), (r'\bstep[\s-]*ups?\b', 'stepup'),
           (r'\bez[\s-]*bar\b', 'ezbar'), (r'\bez\b', 'ezbar'), (r'\bkettlebells?\b', 'kettlebell'),
           (r'\bdumbbells?\b', 'dumbbell'), (r'\bbarbells?\b', 'barbell'), (r'\bcurls\b', 'curl'),
           (r'\bextensions\b', 'extension'), (r'\braises\b', 'raise'), (r'\brows\b', 'row'), (r'\bsquats\b', 'squat'),
           (r'\blunges\b', 'lunge'), (r'\bpresses\b', 'press'), (r'\bshrugs\b', 'shrug'), (r'\bcrunches\b', 'crunch'),
           (r'\bdeadlifts\b', 'deadlift'), (r'\bhyperextensions?\b', 'hyperextension'), (r'\bsmith machine\b', 'smith'),
           (r'\bmachine\b', 'lever'), (r'\bseated\b', 'sitting'), (r'\bmedium grip\b', ' '), (r'\btwo[\s-]*arm\b', ' ')]
STOP_EST = set(['the', 'a', 'with', 'and', 'on', 'to', 'in', 'of', 'attachment', 'version', 'style', 'grip'])


def tok_est(s):
    s = s.lower().replace('-', ' ')
    s = re.sub(r'[()/,]', ' ', s)
    for pat, rep in SIN_EST:
        s = re.sub(pat, rep, s)
    s = re.sub(r'[^a-z0-9 ]', ' ', s)
    return set(w for w in s.split() if w and w not in STOP_EST)


ATTR_TMS_EST = {'bilanciere': ['barbell', 'olympic barbell', 'ez barbell', 'trap bar'], 'manubri': ['dumbbell'],
                'cavi': ['cable'], 'macchina': ['leverage machine', 'smith machine', 'sled machine'],
                'corpo libero': ['body weight', 'weighted', 'assisted'], 'kettlebell': ['kettlebell'],
                'bande elastiche': ['band', 'resistance band'], 'fitball': ['stability ball'], 'palla medica': ['medicine ball'],
                'bilanciere ez': ['ez barbell']}


def aggancia_esterna(sm_rows):
    """Per ogni esercizio TMS la miglior corrispondenza nella mappa esterna (somiglianza dei nomi
    inglesi, con un piccolo bonus se l'attrezzo coincide). È una PROPOSTA: la convalida sta nel CSV."""
    cand = [(r, tok_est(r['name'])) for r in sm_rows]
    out = {}
    for nome, e in cat.items():
        en = it2en.get(nome) or str(e.get('id', '')).replace('_', ' ')
        t = tok_est(en)
        if not t:
            continue
        attr = ATTR_TMS_EST.get(str(e.get('attrezzatura', '')).lower(), [])
        best, bs = None, 0.0
        for r, tt in cand:
            if not tt:
                continue
            j = len(t & tt) / float(len(t | tt))
            if attr and r['equipment'] in attr:
                j += 0.05
            if j > bs:
                bs, best = j, r
        if best is not None and bs >= 0.5:
            out[nome] = (best, round(min(bs, 1.0), 2))
    return out


def vol_est(r):
    v = {}
    for k, m in COL_EST.items():
        x = (r.get('volume_' + k) or '').strip()
        if x:
            v[m] = float(x)
    return v


def gruppi_est(vol):
    """mappa {muscolo: 1.0|0.5} → (gruppi diretti, gruppi indiretti), con la stessa regola del TMS:
    un gruppo con un muscolo diretto è diretto."""
    d, i = [], []
    for m, q in vol.items():
        g = MUSC_EST.get(m)
        if g and q >= 1 and g not in d:
            d.append(g)
    for m, q in vol.items():
        g = MUSC_EST.get(m)
        if g and 0 < q < 1 and g not in d and g not in i:
            i.append(g)
    return d, i


# ═════════════════════════ accumulo delle serie ═════════════════════════
class Conto(object):
    """Serie dirette e indirette per gruppo, nei due conteggi, più spinta/trazione."""

    def __init__(self, est):
        self.est = est
        self.tD = collections.Counter(); self.tI = collections.Counter()
        self.eD = collections.Counter(); self.eI = collections.Counter()
        self.dir = collections.Counter()
        self.tot = 0.0; self.est_cop = 0.0

    def aggiungi(self, nome, s):
        self.tot += s
        if nome.startswith('@'):           # lavoro diretto senza esercizio a catalogo
            g = nome[1:]
            self.tD[g] += s; self.eD[g] += s; self.est_cop += s
            return
        d, i = di_tms(nome)
        for g in d: self.tD[g] += s
        for g in i: self.tI[g] += s
        dd = direzione(nome)
        if dd: self.dir[dd] += s
        m = self.est.get(nome)
        if m and m.get('g'):
            ed, ei = m['g']
            self.est_cop += s
        else:                               # senza corrispondenza esterna: catalogo TMS
            ed, ei = d, i
        for g in ed: self.eD[g] += s
        for g in ei: self.eI[g] += s

    def per(self):                          # come l'app con i pesi predefiniti 1,0 / 0,5
        return dict((g, self.tD[g] + 0.5 * self.tI[g]) for g in GR)

    def arr(self, c):
        return [round(c[g], 2) for g in GR]


# ═════════════════════════ schede pubblicate ═════════════════════════
CELL = re.compile(r'<t[dh][^>]*>(.*?)</t[dh]>', re.S | re.I)
ROW = re.compile(r'<tr[^>]*>(.*?)</tr>', re.S | re.I)
TAB = re.compile(r'<table.*?</table>', re.S | re.I)


def testo(x):
    x = _html.unescape(re.sub(r'<[^>]+>', '', x)).replace(u'\xa0', ' ').replace(u'\u2019', "'")
    x = re.sub(r'\s*\(.*?\)\s*', ' ', x).split(' or ')[0]
    return re.sub(r'\s+', ' ', x).strip()


def serie(s):
    s = s.replace(u'\u2013', '-').replace(u'\u2014', '-').strip()
    v = [float(x) for x in re.findall(r'\d+', s)[:2]]
    v = [x for x in v if 0 < x <= 12]
    return sum(v) / len(v) if v else 0


def riepilogo_ms(h):
    """campi «Workout Summary» di Muscle & Strength: etichette dell'editore, non misure."""
    i = h.find('Workout Summary')
    if i < 0:
        return {}
    t = _html.unescape(re.sub(r'<[^>]+>', ' | ', h[i:i + 4000]))
    t = re.sub(r'\s+', ' ', t)
    out = {}
    for lab in ['Main Goal', 'Workout Type', 'Training Level', 'Program Duration', 'Days Per Week',
                'Time Per Workout', 'Equipment Required', 'Target Gender']:
        m = re.search(re.escape(lab) + r'\s*(?:\|\s*)+([^|]+)', t)
        if m:
            out[lab] = m.group(1).strip()
    return out


def attrezzatura_ms(s):
    s = (s or '').lower()
    if not s:
        return ''
    if any(k in s for k in ['machine', 'cable', 'barbell', 'ez bar', 'bands', 'kettlebell']):
        return 'palestra'
    if 'dumbbell' in s:
        return 'manubri'
    if 'bodyweight' in s:
        return 'corpo libero'
    return ''


def sesso_ms(s):
    s = (s or '').lower()
    if 'male & female' in s or 'male and female' in s:
        return 'misto'
    if 'female' in s:
        return 'F'
    if 'male' in s:
        return 'M'
    return ''


def etichette_sl(titolo, slug):
    """StrengthLog non ha campi strutturati: livello e obiettivo si leggono dal titolo e
    dall'indirizzo, con regole dichiarate. Se il titolo non lo dice, il livello resta vuoto."""
    t = (titolo + ' ' + slug.replace('-', ' ')).lower()
    liv = ''
    for k, v in [('beginner', 'principiante'), ('intermediate', 'intermedio'), ('advanced', 'avanzato')]:
        if k in t:
            liv = v
            break
    tipi, agon = [], ''
    m = re.search(r'(?:strength|weight) training for ([a-z \-]+?)(?::| &| and |$)', t)
    if 'powerlifting' in t:
        tipi += ['powerlifting', 'forza']
    if any(k in t for k in ['olympic weightlifting', 'clean & jerk', 'clean and jerk', 'snatch']):
        tipi += ['potenza']
    if 'streetlifting' in t:
        tipi += ['forza']
    if m and not tipi:
        tipi += ['forza']
        agon = 'sport: ' + m.group(1).strip()
    if any(k in t for k in ['bodybuilding', 'hypertrophy', 'muscle', 'phul', 'ppl', 'pplul', 'push pull', 'arnold split',
                            'size', 'full body', 'upper/lower', 'upper lower']):
        tipi.append('ipertrofia')
    if any(k in t for k in ['strength & size', 'muscle & strength', 'muscle and strength', 'phul', 'powerbuilding',
                            'beginner strength']):
        tipi.append('forza')
    if 'hybrid' in t:
        tipi.append('generale')
    if not tipi:
        tipi = ['generale']
    out = []
    for x in tipi:
        if x not in out:
            out.append(x)
    attr = 'palestra' if 'machine' in t else ''
    return liv, out, agon, attr


def titolo_pagina(h):
    m = re.search(r'<title>(.*?)</title>', h, re.S | re.I)
    t = _html.unescape(m.group(1)) if m else ''
    t = re.split(r'\s+[\u2013\u2014-]\s+(?:StrengthLog|Muscle & Strength)\s*$', t.strip())[0]
    return re.sub(r'\s+', ' ', t).strip()


def canonical(h):
    m = re.search(r'<link rel="canonical" href="([^"]+)"', h)
    return m.group(1) if m else ''


def criteri(c, cop):
    """stessi filtri della meta-analisi (Doc/meta-analisi/README.md)"""
    per = c.per()
    intera = (cop >= 0.85 and 25 <= c.tot <= 130 and len([g for g in GR if per.get(g, 0) >= 3]) >= 5)
    sp, tr = c.dir.get('spinta', 0), c.dir.get('trazione', 0)
    equil = bool(tr > 0 and 0.7 <= sp / float(tr) <= 1.4)
    return intera, equil


def schede_pubblicate(est):
    voci, scarti = [], []
    for f in sorted(glob.glob(os.path.join(META, 'strengthlog', '*.html')) +
                    glob.glob(os.path.join(META, 'muscleandstrength', '*.html'))):
        lib = 'strengthlog' if os.sep + 'strengthlog' + os.sep in f else 'muscleandstrength'
        h = io.open(f, encoding='utf-8', errors='replace').read()
        c = Conto(est)
        ntab = righe = risolte = 0
        for t in TAB.findall(h):
            rows = [r for r in ([testo(x) for x in CELL.findall(y)] for y in ROW.findall(t)) if r]
            if not rows:
                continue
            head = [x.lower() for x in rows[0]]
            if not head or 'exercise' not in head[0]:
                continue
            si = [i for i, x in enumerate(head) if 'set' in x]
            if not si:
                continue
            si = si[0]
            ntab += 1
            for r in rows[1:]:
                if len(r) <= si or salta(r[0]):
                    continue
                s = serie(r[si])
                if not s:
                    continue
                righe += 1
                n = risolvi(r[0])
                if not n:
                    continue
                risolte += 1
                c.aggiungi(n, s)
        base = os.path.basename(f)
        if not (2 <= ntab <= 7 and c.tot > 0):
            continue                         # non è una settimana di allenamento leggibile
        cop = risolte / float(righe or 1)
        intera, equil = criteri(c, cop)
        tit, url = titolo_pagina(h), canonical(h)
        if lib == 'muscleandstrength':
            rs = riepilogo_ms(h)
            liv_o, goal_o = rs.get('Training Level', ''), rs.get('Main Goal', '')
            liv = LIV_SCHEDA.get(liv_o.lower(), '')
            tipi = GOAL_MS.get(goal_o.lower(), [])
            sesso, attr, agon = sesso_ms(rs.get('Target Gender')), attrezzatura_ms(rs.get('Equipment Required')), ''
            orig = {'livello': liv_o, 'obiettivo': goal_o, 'struttura': rs.get('Workout Type', ''),
                    'attrezzatura': rs.get('Equipment Required', ''), 'destinatari': rs.get('Target Gender', '')}
        else:
            liv, tipi, agon, attr = etichette_sl(tit, base[:-5])
            sesso = ''
            orig = {'titolo': tit}
        voce = {
            'id': lib + ':' + base[:-5], 'raccolta': 'schede', 'fonte': lib, 'titolo': tit, 'url': url,
            'esperienza': liv, 'tipi': tipi, 'sesso': sesso, 'eta': '', 'agonismo': agon, 'attrezzatura': attr,
            'qualita': 'scheda pubblicata', 'equilibrata': equil,
            'serie': round(c.tot, 1), 'copertura': round(cop, 3), 'cop_esterna': round(c.est_cop / c.tot, 3),
            'spinta': round(c.dir.get('spinta', 0), 1), 'trazione': round(c.dir.get('trazione', 0), 1),
            'D': c.arr(c.tD), 'I': c.arr(c.tI), 'eD': c.arr(c.eD), 'eI': c.arr(c.eI),
            'etichette_originali': orig,
            'origine_esperienza': 'livello dichiarato dalla scheda' if liv else '',
        }
        if intera:
            voci.append(voce)
        else:
            motivo = ('esercizi riconosciuti sotto l\'85%' if cop < 0.85 else
                      'serie a settimana fuori da 25-130' if not (25 <= c.tot <= 130) else
                      'meno di 5 gruppi con almeno 3 serie')
            scarti.append(dict(voce, motivo=motivo))
    return voci, scarti


# ═════════════════════════ depot.fitness ═════════════════════════
def depot(z, est):
    progs = dict((r['slug'], r) for r in zip_csv(z, 'depot_programs_2026.10.13.csv'))
    presc = zip_csv(z, 'depot_prescriptions_free_programs_2026.10.13.csv')
    per_prog = collections.OrderedDict()
    for r in presc:
        per_prog.setdefault(r['program_slug'], []).append(r)
    voci, scarti = [], []
    for slug, p in sorted(progs.items()):
        tipi = []
        for gl in (p['goals'] or '').split('|'):
            x = GOAL_DEPOT.get(gl.strip())
            if x and x not in tipi:
                tipi.append(x)
        typ = (p['type'] or '').lower()
        if 'powerlifting' in typ:
            tipi = ['powerlifting'] + [x for x in tipi if x != 'powerlifting']
        eq = (p['equipment'] or '').lower()
        attr = ('palestra' if ('full_gym' in eq or 'barbell' in eq) else 'manubri' if 'dumbbell' in eq
                else 'corpo libero' if ('bodyweight' in eq or 'minimal' in eq) else '')
        base = {
            'id': 'depot:' + slug, 'raccolta': 'schede', 'fonte': 'depot', 'titolo': p['name'], 'url': p['url'],
            'esperienza': LIV_SCHEDA.get((p['level'] or '').lower(), ''), 'tipi': tipi or ['generale'],
            'sesso': '', 'eta': '', 'agonismo': '', 'attrezzatura': attr, 'qualita': 'scheda pubblicata',
            'etichette_originali': {'livello': p['level'], 'obiettivo': p['goals'], 'struttura': p['type'],
                                    'attrezzatura': p['equipment']},
            'origine_esperienza': 'livello dichiarato dalla scheda',
        }
        if slug not in per_prog:
            scarti.append(dict(base, motivo='solo i totali del programma (serie per esercizio non pubblicate)'))
            continue
        c = Conto(est)
        righe = risolte = 0
        for r in per_prog[slug]:
            if salta(r['exercise_name']):
                continue
            try:
                s = float(r['sets'] or 0)
            except ValueError:
                s = 0
            if s <= 0:
                continue
            righe += 1
            n = risolvi(r['exercise_name'])
            if not n:
                continue
            risolte += 1
            c.aggiungi(n, s)
        cop = risolte / float(righe or 1)
        intera, equil = criteri(c, cop)
        voce = dict(base, equilibrata=equil, serie=round(c.tot, 1), copertura=round(cop, 3),
                    cop_esterna=round(c.est_cop / c.tot, 3) if c.tot else 0,
                    spinta=round(c.dir.get('spinta', 0), 1), trazione=round(c.dir.get('trazione', 0), 1),
                    D=c.arr(c.tD), I=c.arr(c.tI), eD=c.arr(c.eD), eI=c.arr(c.eI))
        if intera:
            voci.append(voce)
        else:
            motivo = ('esercizi riconosciuti sotto l\'85%' if cop < 0.85 else
                      'serie a settimana fuori da 25-130' if not (25 <= c.tot <= 130) else
                      'meno di 5 gruppi con almeno 3 serie')
            scarti.append(dict(voce, motivo=motivo))
    return voci, scarti


# ═════════════════════════ protocolli di studio ═════════════════════════
def motivo_studio(r, usati, esclusi_studi):
    rid, rt, src = r['record_id'], r['record_type'], r['extraction_source_id']
    if rid in usati:
        return ''
    for k, v in esclusi_studi.items():
        if rid.startswith(k):
            return v
    if src == 'lyristakis_2026_dataset':
        return 'nessun elenco di esercizi (solo numero, serie per esercizio e test di forza)'
    if rt == 'review_extracted_volume_arm':
        return 'volume di un solo distretto, non di una settimana intera'
    if rt == 'observational_survey_muscle_group':
        return 'serie dirette per muscolo, senza core, glutei e polpacci'
    if rt in ('evidence_synthesis_not_workout', 'review_summary', 'observational_survey_summary', 'community_program'):
        return 'sintesi o indicazione generale, non una scheda'
    if rt == 'review_extracted_trial_arm':
        return 'riassunto di una review: frequenza e serie, senza l\'elenco completo degli esercizi'
    if rt == 'abstract_extracted_trial_arm':
        return 'solo abstract: elenco degli esercizi non disponibile'
    return 'protocollo dei soli arti inferiori, non una settimana intera'


def studi(master, est, prot):
    rec = dict((r['record_id'], r) for r in master['records'])
    stato0 = prot.get('stato_predefinito', 'trascrizione TMS da verificare')
    voci, fonti = [], {}
    usati = set()
    for p in prot['protocolli']:
        rr = [rec[x] for x in p['record_ids']]
        usati.update(p['record_ids'])
        r0 = rr[0]
        c = Conto(est)
        for nome, s in p['esercizi']:
            if not nome.startswith('@') and nome not in cat:
                raise SystemExit('protocolli-studi.json: esercizio non a catalogo: ' + nome)
            c.aggiungi(nome, float(s))
        tags = [x.strip() for x in r0['training_type_tags'].split(';') if x.strip()]
        tipi = []
        for x in tags:
            y = TAG_STUDIO.get(x)
            if y and y not in tipi:
                tipi.append(y)
        exp_o = r0['training_experience']
        exp = LIV_STUDIO.get(exp_o, '')
        origine = 'codice del corpus' if exp else ''
        if not exp and p.get('esperienza'):
            exp, origine = p['esperienza'], 'testo della popolazione (lettura TMS)'
        ctx = prot.get('contesto', {}).get(p['id'], {})
        fonte = 'studio:' + r0['study_id']
        url = r0['primary_source_url'] or r0['extraction_source_url']
        fonti[fonte] = {'id': fonte, 'nome': r0['study_reference'], 'url': url, 'doi': r0['doi'],
                        'licenza': 'articolo scientifico: nell\'app solo numeri derivati e citazione',
                        'tipo': 'studio', 'qualita': r0['source_tier']}
        voci.append({
            'id': 'studio:' + p['id'], 'raccolta': 'studi', 'fonte': fonte, 'titolo': r0['study_reference'], 'url': url,
            'record_ids': p['record_ids'], 'studio': r0['study_id'],
            'esperienza': exp, 'tipi': tipi or ['generale'], 'sesso': ctx.get('sesso', ''), 'eta': ctx.get('eta', ''),
            'agonismo': '' if r0['competitive_status'] == 'not_reported' else r0['competitive_status'],
            'attrezzatura': 'palestra',
            'qualita': 'preprint' if 'preprint' in r0['source_tier'].lower() else 'articolo pubblicato',
            'equilibrata': criteri(c, 1.0)[1],
            'serie': round(c.tot, 1), 'copertura': 1.0, 'cop_esterna': round(c.est_cop / c.tot, 3),
            'spinta': round(c.dir.get('spinta', 0), 1), 'trazione': round(c.dir.get('trazione', 0), 1),
            'D': c.arr(c.tD), 'I': c.arr(c.tI), 'eD': c.arr(c.eD), 'eI': c.arr(c.eI),
            'etichette_originali': {'esperienza': exp_o, 'tipo': r0['training_type_tags'],
                                    'agonismo': r0['competitive_status'], 'popolazione': r0['population']},
            'origine_esperienza': origine, 'esperienza_lettura': p.get('esperienza_lettura', ''),
            'stato': p.get('stato', stato0), 'note': p.get('note', ''),
        })
    esclusi = collections.Counter()
    esclusi_righe = []
    for r in master['records']:
        m = motivo_studio(r, usati, prot.get('esclusi', {}))
        if m:
            esclusi[m] += 1
            esclusi_righe.append({'record_id': r['record_id'], 'studio': r['study_reference'], 'tipo': r['record_type'],
                                  'esperienza': r['training_experience'], 'tipi': r['training_type_tags'], 'motivo': m})
    return voci, fonti, esclusi, esclusi_righe, len(usati)


# ═════════════════════════ convalida della mappa esterna ═════════════════════════
CAMPI_CONV = ['nome_tms', 'nome_inglese_tms', 'id_esterno', 'nome_esterno', 'profilo_esterno', 'punteggio', 'stato', 'nota']
STATI_MANUALI = ('convalidata', 'corretta', 'rifiutata')


def leggi_convalida():
    if not os.path.exists(CONV):
        return {}
    with io.open(CONV, encoding='utf-8-sig', newline='') as f:
        return dict((r['nome_tms'], r) for r in csv.DictReader(f, delimiter=';'))


def mappa_esterna(sm_rows):
    by_id = dict((r['id'], r) for r in sm_rows)
    proposte = aggancia_esterna(sm_rows)
    conv = leggi_convalida()
    righe, mappa = [], {}
    for nome in sorted(cat):
        vecchia = conv.get(nome)
        if vecchia and vecchia.get('stato') in STATI_MANUALI:
            st = vecchia['stato']
            r = by_id.get((vecchia.get('id_esterno') or '').strip())
            riga = dict(vecchia)
            if r:
                riga.update(nome_esterno=r['name'], profilo_esterno=r['volume_profile'])
            sc = vecchia.get('punteggio', '')
        else:
            prop = proposte.get(nome)
            r, sc = (prop if prop else (None, ''))
            st = 'proposta' if r else 'nessuna corrispondenza'
            riga = {'nome_tms': nome, 'nome_inglese_tms': it2en.get(nome, ''), 'id_esterno': r['id'] if r else '',
                    'nome_esterno': r['name'] if r else '', 'profilo_esterno': r['volume_profile'] if r else '',
                    'punteggio': sc, 'stato': st, 'nota': (vecchia or {}).get('nota', '')}
        righe.append(riga)
        if r and st != 'rifiutata':
            v = vol_est(r)
            d, i = gruppi_est(v)
            mappa[nome] = {'e': r['id'], 'n': r['name'], 'p': r['volume_profile'], 's': sc, 'st': st,
                           'v': v, 'g': [d, i] if (d or i) else None}
    return mappa, righe


# ═════════════════════════ scrittura ═════════════════════════
def js_json(x):
    s = json.dumps(x, ensure_ascii=False, separators=(',', ':'), sort_keys=False)
    return s.replace('</', '<\\/').replace(u'\u2028', '\\u2028').replace(u'\u2029', '\\u2029')


def scrivi_csv(path, righe, campi, sep=';'):
    with io.open(path, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=campi, delimiter=sep, extrasaction='ignore')
        w.writeheader()
        for r in righe:
            w.writerow(dict((k, (json.dumps(v, ensure_ascii=False) if isinstance(v, (list, dict)) else v))
                            for k, v in r.items()))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--zip', default=ZIP_DEF)
    ap.add_argument('--verifica', action='store_true')
    a = ap.parse_args()
    if not os.path.exists(a.zip):
        raise SystemExit('ZIP originale non trovato: ' + a.zip)
    if not os.path.isdir(os.path.join(META, 'muscleandstrength')):
        raise SystemExit('Pagine della meta-analisi mancanti in ' + META + ' (vedi Doc/meta-analisi/README.md)')
    z = zipfile.ZipFile(a.zip)
    master = json.loads(zip_testo(z, 'tms_training_dataset_master_v0.7.json'))
    sm_rows = zip_csv(z, 'exercise_muscle_map_v0.7.csv')
    prot = leggi_json(PROT)
    mit = zip_testo(z, 'exercise_muscle_map_LICENSE_MIT.txt').strip()

    est, righe_conv = mappa_esterna(sm_rows)
    v_sch, s_sch = schede_pubblicate(est)
    v_dep, s_dep = depot(z, est)
    v_stu, fonti_stu, esclusi_stu, esclusi_righe, n_usati = studi(master, est, prot)

    voci = sorted(v_sch + v_dep, key=lambda v: v['id']) + sorted(v_stu, key=lambda v: v['id'])
    eq = [v for v in v_sch if v['equilibrata']]
    n_lib = collections.Counter(v['fonte'] for v in v_sch + v_dep)

    fonti = [
        {'id': 'strengthlog', 'nome': 'StrengthLog — programmi di allenamento', 'url': 'https://www.strengthlog.com/training-programs/',
         'licenza': 'pagine pubbliche senza licenza dichiarata: nell\'app solo numeri derivati, con l\'indirizzo della scheda',
         'tipo': 'libreria di schede', 'scaricate': '2026-09-29'},
        {'id': 'muscleandstrength', 'nome': 'Muscle & Strength — workouts', 'url': 'https://www.muscleandstrength.com/workouts',
         'licenza': 'pagine pubbliche senza licenza dichiarata: nell\'app solo numeri derivati, con l\'indirizzo della scheda',
         'tipo': 'libreria di schede', 'scaricate': '2026-09-29'},
        {'id': 'depot', 'nome': 'depot.fitness strength-program dataset (v. 2026.10.13)', 'url': 'https://depot.fitness/data',
         'doi': '10.5281/zenodo.24082645',
         'licenza': 'CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/) — depot.fitness (2026), depot.fitness '
                    'strength-program dataset, versione 2026.10.13. Modifiche del TMS: esercizi ricondotti al catalogo '
                    'e serie ricalcolate per gruppo muscolare',
         'tipo': 'libreria di schede'},
    ] + sorted(fonti_stu.values(), key=lambda f: f['id']) + [
        {'id': 'smyrdev', 'nome': 'Exercises Dataset with Muscle Volume (smyrdev), 1.324 esercizi',
         'url': 'https://github.com/hasaneyldrm/exercises-dataset',
         'licenza': 'MIT — Copyright (c) 2026 smyrdev; Copyright (c) 2026 Hasan Emir Yıldırım (hasaneyldrm/exercises-dataset). '
                    'Testo completo della licenza in RIF_DISTR.mappa_esterna.licenza_testo',
         'tipo': 'mappa muscolare'},
        {'id': 'corpus_tms_v07', 'nome': 'Corpus TMS di evidenza e protocolli v0.7 (raccolto con Codex, 13/11/2026)',
         'url': '', 'licenza': 'raccolta privata di Marco; le fonti primarie sono citate voce per voce',
         'tipo': 'corpus di evidenza'},
    ]

    n_ext = sum(1 for m in est.values() if m['g'])
    rif = {
        'versione': '1',
        'pacchetto': {'nome': os.path.basename(a.zip), 'sha256': sha256(a.zip), 'corpus': master.get('version', '')},
        'pesi_predefiniti': {'diretta': 1.0, 'indiretta': 0.5,
                             'stato': 'provvisori: convenzione delle serie frazionarie (Schoenfeld et al. 2019, Sports 7:177), non ancora convalidata sul catalogo TMS'},
        'raccolte': {
            'schede': {'unita': 'scheda settimanale pubblicata', 'voci': len(v_sch) + len(v_dep),
                       'equilibrate': len(eq) + sum(1 for v in v_dep if v['equilibrata']),
                       'per_fonte': dict(n_lib),
                       'esclusi': {'settimane non intere o poco riconosciute': len(s_sch),
                                   'depot: solo totali del programma': sum(1 for s in s_dep if s['motivo'].startswith('solo i totali')),
                                   'depot: settimana non intera': sum(1 for s in s_dep if not s['motivo'].startswith('solo i totali'))},
                       'origine_esperienza': 'livello dichiarato dalla scheda (beginner/intermediate/advanced), non esperienza misurata'},
            'studi': {'unita': 'protocollo di studio (bracci con le stesse proporzioni)', 'voci': len(v_stu),
                      'record': n_usati, 'record_corpus': master['record_count'],
                      'esclusi': dict(esclusi_stu),
                      'origine_esperienza': 'esperienza dei partecipanti (codice del corpus o testo della popolazione)'},
        },
        'fonti': fonti,
        'voci': voci,
        'mappa_esterna': {'fonte': 'smyrdev', 'stato': 'proposta da convalidare sul catalogo TMS', 'licenza': 'MIT',
                          'licenza_testo': mit,
                          'esercizi_esterni': len(sm_rows), 'con_profilo': sum(1 for r in sm_rows if r['volume_profile']),
                          'agganciati': len(est), 'con_volume': n_ext,
                          'muscoli_gruppi': MUSC_EST, 'esercizi': est},
    }

    testa = ('/* RIF_DISTR — riferimenti della ragnatela «distribuzione fra i gruppi».\n'
             '   GENERATO da tools/genera-riferimenti.py: NON modificare a mano (rigenera, poi npm run build).\n'
             '   Due raccolte che non si mescolano (schede pubblicate / protocolli di studio); per ogni voce\n'
             '   le serie dirette (D) e indirette (I) per gruppo, nell\'ordine di GRUPPI_PESI, col conteggio\n'
             '   del catalogo TMS e con la mappa esterna (eD/eI). Fonti, licenze e stato voce per voce.\n'
             '   Le fasce si calcolano nell\'app (rifCalcola in 01b-riferimenti.js): qui nessun valore derivato. */\n')
    corpo = 'const RIF_DISTR = /*__RIFDISTR_JSON__*/' + js_json(rif) + ';\n'
    nuovo = testa + corpo

    print('Schede pubblicate: %d settimane intere (%d equilibrate) da %s; scartate %d'
          % (len(v_sch) + len(v_dep), rif['raccolte']['schede']['equilibrate'], dict(n_lib), len(s_sch) + len(s_dep)))
    print('Protocolli di studio: %d protocolli da %d record su %d del corpus' % (len(v_stu), n_usati, master['record_count']))
    for k, v in esclusi_stu.most_common():
        print('   esclusi %3d  %s' % (v, k))
    print('Mappa esterna: %d esercizi TMS agganciati (%d con profilo di volume) su %d'
          % (len(est), n_ext, len(cat)))

    if a.verifica:
        vecchio = io.open(OUT_JS, encoding='utf-8').read() if os.path.exists(OUT_JS) else ''
        if vecchio == nuovo:
            print('  OK   src/dati/05-riferimenti-distribuzione.js corrisponde agli originali')
            return 0
        print('  DIFF src/dati/05-riferimenti-distribuzione.js non corrisponde: rigenera')
        return 1

    with io.open(OUT_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write(nuovo)
    print('  scritto src/dati/05-riferimenti-distribuzione.js (%d byte)' % len(nuovo.encode('utf-8')))
    scrivi_csv(CONV, righe_conv, CAMPI_CONV)
    print('  scritto tools/riferimenti/mappa-esterna-convalida.csv (%d righe)' % len(righe_conv))
    with io.open(os.path.join(QUI, 'riferimenti', 'LICENZA-mappa-esterna-MIT.txt'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(mit + '\n')                 # il CSV riporta nomi e id della mappa: la licenza viaggia con lui

    if not os.path.isdir(OUT_DOC):
        os.makedirs(OUT_DOC)
    campi_v = ['id', 'raccolta', 'fonte', 'titolo', 'url', 'esperienza', 'origine_esperienza', 'tipi', 'sesso', 'eta',
               'agonismo', 'attrezzatura', 'qualita', 'equilibrata', 'serie', 'copertura', 'cop_esterna', 'spinta',
               'trazione', 'D', 'I', 'eD', 'eI', 'etichette_originali', 'record_ids', 'stato', 'note', 'motivo']
    scrivi_csv(os.path.join(OUT_DOC, 'voci-usate.csv'), voci, campi_v)
    scrivi_csv(os.path.join(OUT_DOC, 'schede-scartate.csv'), s_sch + s_dep, campi_v)
    scrivi_csv(os.path.join(OUT_DOC, 'record-studi-esclusi.csv'), esclusi_righe,
               ['record_id', 'studio', 'tipo', 'esperienza', 'tipi', 'motivo'])
    print('  scritte le tabelle di controllo in Doc/riferimenti-distribuzione/')
    return 0


if __name__ == '__main__':
    sys.exit(main())
