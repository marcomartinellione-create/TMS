# -*- coding: utf-8 -*-
"""
genera-alimenti.py — pipeline ufficiale della banca dati alimenti del TMS (dal 2026-11: DUE fonti).

Fonti (cartella ..\\Documentazione\\Alimentazione, FUORI dal repo: materiale di terzi):
  1. Schweizer_Nahrwertdatenbank.xlsx   banca dati svizzera dei valori nutritivi (USAV/BLV),
     foglio "Generische Lebensmittel" (i prodotti di marca restano esclusi, scelta storica).
  2. Table Ciqual 2025_FR_2025_11_03.xlsx   tabella Ciqual 2025 (ANSES, Francia).

Nomi in italiano:
  - Svizzera: gli alimenti già presenti nella banca precedente tengono ESATTAMENTE il nome che
    avevano (abbinati per ID tramite Doc/Banca_dati_svizzera_dei_valori_nutritivi.xlsx e il
    JSON precedente): i piani alimentari salvati dagli utenti usano il nome come chiave.
    Quelli spariti dalla banca nuova restano, coi valori che avevano.
  - Voci nuove e tutta la Ciqual: tradotte e classificate in Doc/alimenti-2026-11/lotto_NN.out.json
    (campi id, it, tipo). I lotti sono parte della pipeline: senza, lo script si ferma.

Ogni alimento ha in più:
  tipo   'S' alimento semplice (come si compra o crudo) | 'R' ricetta (cucinato, condito o composto;
         rientra qui anche il semplice «pollo cotto») — le due macro categorie volute da Marco
  fonte  'CH' | 'FR'

Scrive  src/dati/alimenti-usav.json (leggibile, con metadati)  e  src/dati/02-alimenti-usav.js (blob).
Poi serve `npm run build`.

Valori: numero -> float · 'tr.'/'traces'/'nd' -> 0 · '<X' -> X (limite) · vuoto o '-' -> null.
'zuccheri' = carboidrati disponibili, 'zucch' = di cui zuccheri. Vitamina A: RAE (Svizzera),
equivalenti retinolo (Ciqual). Le voci Ciqual senza energia vengono scartate.

Richiede: pip install openpyxl
"""
import openpyxl, json, re, os, sys, io, glob, hashlib, datetime, warnings
warnings.filterwarnings('ignore')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTI = os.path.join(os.path.dirname(ROOT), 'Documentazione', 'Alimentazione')
XLSX_CH = os.path.join(FONTI, 'Schweizer_Nahrwertdatenbank.xlsx')
XLSX_FR = os.path.join(FONTI, 'Table Ciqual 2025_FR_2025_11_03.xlsx')
XLSX_CH_IT_VECCHIO = os.path.join(ROOT, 'Doc', 'Banca_dati_svizzera_dei_valori_nutritivi.xlsx')
LOTTI = os.path.join(ROOT, 'Doc', 'alimenti-2026-11')
JSON_OUT = os.path.join(ROOT, 'src', 'dati', 'alimenti-usav.json')
JS_OUT = os.path.join(ROOT, 'src', 'dati', '02-alimenti-usav.js')

CHIAVI = ['kcal','proteine','grassi','saturi','monoinsaturi','polinsaturi','zuccheri','zucch','fibre','colesterolo',
          'vitA','vitB1','vitB2','vitB6','vitB12','vitC','vitD','vitE','folati',
          'calcio','ferro','magnesio','potassio','zinco','sodio','iodio','fosforo']

MAPPA_CH = {
  'kcal': 'Energie, Kilokalorien (kcal)', 'proteine': 'Protein (g)', 'grassi': 'Fett, total (g)',
  'saturi': 'Fettsäuren, gesättigt (g)', 'monoinsaturi': 'Fettsäuren, einfach ungesättigt (g)',
  'polinsaturi': 'Fettsäuren, mehrfach ungesättigt (g)', 'zuccheri': 'Kohlenhydrate, verfügbar (g)',
  'zucch': 'Zucker (g)', 'fibre': 'Nahrungsfasern (g)', 'colesterolo': 'Cholesterin (mg)',
  'vitA': 'Vitamin A-Aktivität, RAE (µg)', 'vitB1': 'Vitamin B1 (Thiamin) (mg)', 'vitB2': 'Vitamin B2 (Riboflavin) (mg)',
  'vitB6': 'Vitamin B6 (Pyridoxin) (mg)', 'vitB12': 'Vitamin B12 (Cobalamin) (µg)', 'vitC': 'Vitamin C (Ascorbinsäure) (mg)',
  'vitD': 'Vitamin D (Calciferol) (µg)', 'vitE': 'Vitamin E (α-Tocopherol) (mg)', 'folati': 'Folat (µg)',
  'calcio': 'Calcium (Ca) (mg)', 'ferro': 'Eisen (Fe) (mg)', 'magnesio': 'Magnesium (Mg) (mg)', 'potassio': 'Kalium (K) (mg)',
  'zinco': 'Zink (Zn)  (mg)', 'sodio': 'Natrium (Na) (mg)', 'iodio': 'Jod (I) (µg)', 'fosforo': 'Phosphor (P) (mg)',
}
# Ciqual: l'intestazione (ripulita dagli a capo) deve COMINCIARE così
MAPPA_FR = {
  'kcal': 'Energie, Règlement UE N° 1169 2011 (kcal', 'proteine': 'Protéines, N x facteur de Jones', 'grassi': 'Lipides (g',
  'saturi': 'AG saturés', 'monoinsaturi': 'AG monoinsaturés', 'polinsaturi': 'AG polyinsaturés', 'zuccheri': 'Glucides (g',
  'zucch': 'Sucres (g', 'fibre': 'Fibres alimentaires', 'colesterolo': 'Cholestérol', 'vitA': 'Activité vitaminique A',
  'vitB1': 'Vitamine B1 ', 'vitB2': 'Vitamine B2 ', 'vitB6': 'Vitamine B6 ', 'vitB12': 'Vitamine B12 ', 'vitC': 'Vitamine C ',
  'vitD': 'Vitamine D (µg', 'vitE': 'Vitamine E (mg', 'folati': 'Vitamine B9 ou Folates totaux (µg',
  'calcio': 'Calcium', 'ferro': 'Fer (mg', 'magnesio': 'Magnésium', 'potassio': 'Potassium', 'zinco': 'Zinc',
  'sodio': 'Sodium', 'iodio': 'Iode', 'fosforo': 'Phosphore',
}
GRUPPI_FR = {
  'aides culinaires et ingrédients divers': 'Ingredienti e aiuti di cucina', 'aliments infantiles': 'Alimenti per l’infanzia',
  'eaux et autres boissons': 'Acque e bevande', 'entrées et plats composés': 'Antipasti e piatti pronti',
  'fruits, légumes, légumineuses et oléagineux': 'Frutta, verdura, legumi e frutta a guscio', 'glaces et sorbets': 'Gelati e sorbetti',
  'matières grasses': 'Grassi e oli', 'produits céréaliers': 'Cereali e derivati', 'produits laitiers': 'Latte e derivati',
  'produits sucrés': 'Prodotti dolci', 'viandes, oeufs, poissons': 'Carne, uova, pesce',
}
SOTTOGRUPPI_FR = {
  'aides culinaires': 'Aiuti di cucina', 'algues': 'Alghe', 'condiments': 'Condimenti',
  'denrées destinées à une alimentation particulière': 'Alimenti per diete particolari', 'herbes': 'Erbe aromatiche',
  'ingrédients pour végétariens': 'Ingredienti per vegetariani', 'sauces': 'Salse', 'sels': 'Sali',
  'tartinables végétariens': 'Spalmabili vegetariani', 'épices': 'Spezie',
  'céréales et biscuits infantiles': 'Cereali e biscotti', 'desserts infantiles': 'Dessert',
  'laits et boissons infantiles': 'Latti e bevande', 'petits pots salés et plats infantiles': 'Omogeneizzati e piatti',
  'boisson alcoolisées': 'Bevande alcoliche', 'boissons sans alcool': 'Bevande analcoliche', 'eaux': 'Acque',
  'feuilletées et autres entrées': 'Sfogliati e altri antipasti', 'pizzas, tartes et crêpes salées': 'Pizze, torte e crêpes salate',
  'plats composés': 'Piatti pronti', 'salades composées et crudités': 'Insalate composte e crudité', 'sandwichs': 'Panini',
  'soupes': 'Zuppe', 'fruits': 'Frutta', 'fruits à coque et graines oléagineuses': 'Frutta a guscio e semi oleosi',
  'légumes': 'Verdura', 'légumineuses': 'Legumi', 'pommes de terre et autres tubercules': 'Patate e altri tuberi',
  'desserts glacés': 'Dessert gelati', 'glaces': 'Gelati', 'sorbets': 'Sorbetti',
  'autres matières grasses': 'Altri grassi', 'beurres': 'Burri', 'huiles de poissons': 'Oli di pesce',
  'huiles et graisses végétales': 'Oli e grassi vegetali', 'margarines': 'Margarine',
  'biscuits apéritifs': 'Snack salati', 'farines': 'Farine', 'pains et assimilés': 'Pane e simili',
  'pâtes à tarte': 'Impasti per torte', 'pâtes, riz et céréales': 'Pasta, riso e cereali',
  'crèmes et spécialités à base de crème': 'Panna e specialità alla panna', 'fromages et alternatives végétales': 'Formaggi e alternative vegetali',
  'laits': 'Latte', 'produits laitiers frais et alternatives végétales': 'Latticini freschi e alternative vegetali',
  'barres céréalières': 'Barrette ai cereali', 'biscuits sucrés': 'Biscotti', 'chocolats et produits à base de chocolat': 'Cioccolato e prodotti al cioccolato',
  'confiseries non chocolatées': 'Dolciumi senza cioccolato', 'confitures et assimilés': 'Confetture e simili',
  'céréales de petit-déjeuner': 'Cereali per la colazione', 'gâteaux et pâtisseries': 'Torte e pasticceria',
  'sucres, miels et assimilés': 'Zuccheri, mieli e simili', 'viennoiseries': 'Prodotti da forno dolci',
  'autres produits à base de viande': 'Altri prodotti a base di carne', 'charcuteries et alternatives végétales': 'Salumi e alternative vegetali',
  'mollusques et crustacés crus': 'Molluschi e crostacei crudi', 'mollusques et crustacés cuits': 'Molluschi e crostacei cotti',
  'oeufs': 'Uova', 'poissons crus': 'Pesci crudi', 'poissons cuits': 'Pesci cotti',
  'produits à base de poissons et produits de la mer': 'Prodotti a base di pesce', 'viandes crues': 'Carni crude', 'viandes cuites': 'Carni cotte',
}

def pulisci(s): return ' '.join(str(s).split()) if s is not None else ''

def num(v):
    if v is None: return None
    s = str(v).strip().replace("'", '').replace(' ', '').replace(' ', '')
    if s in ('', '-'): return None
    if s.lower() in ('tr.', 'nd', 'traces', 'tr'): return 0.0
    if s.startswith('<'): s = s[1:]
    try: return float(s.replace(',', '.'))
    except ValueError: return None

def leggi_lotti():
    out = {}
    for f in sorted(glob.glob(os.path.join(LOTTI, 'lotto_*.out.json'))):
        ing = json.load(io.open(f.replace('.out.json', '.json'), encoding='utf-8'))
        usc = json.load(io.open(f, encoding='utf-8'))
        assert len(ing) == len(usc), 'lotto disallineato: ' + f
        for a, b in zip(ing, usc):
            assert a['id'] == b['id'], 'id diverso in ' + f
            assert b['tipo'] in ('S', 'R') and b['it'].strip(), 'voce non valida ' + b['id']
            if 'src' in b: assert b['src'] == a['nome'], 'traduzione non riferita al nome giusto: ' + b['id']
            if a['lingua'] == 'it': assert b['it'] == a['nome'], 'nome italiano alterato: ' + b['id']
            out[b['id']] = (b['it'].strip().replace('"', "'"), b['tipo'])
    return out

RE_COTTO = re.compile(r'\b(cott[oaie]|bollit[oaie]|arrost[oaie]|frit[oaie]|al vapore|stufat[oaie]|grigliat[oaie]|in umido|al forno|preparat[oaie]|tostat[oaie]|saltat[oaie])\b', re.I)

def main():
    for p in (XLSX_CH, XLSX_FR, XLSX_CH_IT_VECCHIO, JSON_OUT):
        assert os.path.exists(p), 'manca: ' + p
    lotti = leggi_lotti()
    assert len(lotti) > 4000, 'lotti incompleti: %d voci' % len(lotti)

    # ── nomi storici: riga del vecchio foglio italiano  ↔  voce del JSON precedente (stesso ordine)
    vecchio_json = json.load(io.open(JSON_OUT, encoding='utf-8'))['alimenti']
    vecchi = [a for a in vecchio_json if a.get('fonte', 'CH') == 'CH']
    righe_it = [r for r in openpyxl.load_workbook(XLSX_CH_IT_VECCHIO, read_only=True, data_only=True)['Alimenti generici'].iter_rows(min_row=4, values_only=True) if r and r[3] is not None]
    storico = {}   # ID -> voce precedente
    if len(righe_it) == len([a for a in vecchi if not a.get('_nuovo')]):
        for r, a in zip(righe_it, [a for a in vecchi if not a.get('_nuovo')]): storico[str(r[0])] = a
    else:
        # il JSON è già stato rigenerato con questa pipeline: gli ID storici sono nel campo 'id'
        storico = {a['id'][2:]: a for a in vecchi if str(a.get('id', '')).startswith('CH')}
    assert len(storico) >= 1180, 'abbinamento coi nomi storici fallito (%d)' % len(storico)

    alimenti, visti = [], set()

    # ── 1) Svizzera
    nomi_storici = {a['nome'] for a in storico.values()}
    ws = openpyxl.load_workbook(XLSX_CH, read_only=True, data_only=True)['Generische Lebensmittel']
    rows = list(ws.iter_rows(min_row=3, values_only=True))
    hdr = [pulisci(c) if c is not None else '' for c in rows[0]]
    hdr = [str(c).strip() if c is not None else '' for c in rows[0]]
    col = {h: i for i, h in enumerate(hdr) if h and h not in ('Herleitung des Wertes', 'Quelle')}
    for h in MAPPA_CH.values(): assert h in col, 'colonna svizzera mancante: ' + h
    for r in rows[1:]:
        if not r or r[col['ID']] is None: continue
        i = str(r[col['ID']]); cid = 'CH' + i
        assert cid in lotti, 'voce svizzera senza classificazione: ' + cid
        it, tipo = lotti[cid]
        st = storico.get(i)
        nome = st['nome'] if st else it
        if not st and nome in nomi_storici: nome = it + ' (nuova voce)'   # una voce nuova non ruba il nome a una storica
        categoria = st['categoria'] if st else None
        alimenti.append({'id': cid, 'nome': nome, 'categoria': categoria, 'densita': num(r[col['Dichte']]),
                         'tipo': tipo, 'fonte': 'CH', 'per100': {k: num(r[col[h]]) for k, h in MAPPA_CH.items()}})
        visti.add(i)
    # voci storiche non più presenti nella banca nuova: restano (sono chiavi di piani salvati)
    for i, st in storico.items():
        if i in visti: continue
        alimenti.append({'id': 'CH' + i, 'nome': st['nome'], 'categoria': st.get('categoria'), 'densita': st.get('densita'),
                         'tipo': 'R' if RE_COTTO.search(st['nome']) else 'S', 'fonte': 'CH', 'per100': {k: st['per100'].get(k) for k in CHIAVI}})
    # categoria delle voci svizzere nuove: quella della voce storica più vicina per categoria tedesca non c'è → generica
    for a in alimenti:
        if a['categoria'] is None: a['categoria'] = 'Varie/Nuove voci'
    n_ch = len(alimenti)
    nomi = {}
    for a in alimenti: nomi[a['nome']] = nomi.get(a['nome'], 0) + 1
    assert all(c == 1 for c in nomi.values()), 'nomi svizzeri duplicati: %s' % [n for n, c in nomi.items() if c > 1][:5]

    # ── 2) Ciqual
    ws = openpyxl.load_workbook(XLSX_FR, read_only=True, data_only=True).worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    hdr = [pulisci(c) for c in rows[0]]
    colf = {}
    for k, pref in MAPPA_FR.items():
        c = [i for i, h in enumerate(hdr) if h.startswith(pref)]
        assert c, 'colonna Ciqual mancante: ' + pref
        colf[k] = c[0]
    scartati = 0
    for r in rows[1:]:
        if not r or r[6] is None: continue
        cid = 'FR' + pulisci(r[6])
        assert cid in lotti, 'voce Ciqual senza traduzione: ' + cid
        it, tipo = lotti[cid]
        p = {k: num(r[i]) for k, i in colf.items()}
        if p['kcal'] is None: scartati += 1; continue
        g, sg = pulisci(r[3]), pulisci(r[4])
        cat = GRUPPI_FR.get(g, 'Varie')
        if sg and sg != '-': cat += '/' + SOTTOGRUPPI_FR.get(sg, sg.capitalize())
        nome = it
        if nome in nomi:                      # il nome è già di un alimento svizzero (o di un'altra voce Ciqual)
            nome = it + ' (Ciqual)'; k = 2
            while nome in nomi: nome = it + ' (Ciqual %d)' % k; k += 1
        nomi[nome] = 1
        alimenti.append({'id': cid, 'nome': nome, 'categoria': cat, 'densita': None, 'tipo': tipo, 'fonte': 'FR', 'per100': p})

    def tofloat(o):
        if isinstance(o, dict): return {k: tofloat(v) for k, v in o.items()}
        if isinstance(o, (int, float)) and not isinstance(o, bool): return float(o)
        return o
    alimenti = [tofloat(a) for a in alimenti]
    n_s = sum(1 for a in alimenti if a['tipo'] == 'S')
    print('alimenti: %d (Svizzera %d, Ciqual %d; scartati senza energia %d) — semplici %d, ricette %d'
          % (len(alimenti), n_ch, len(alimenti) - n_ch, scartati, n_s, len(alimenti) - n_s))
    # i nomi storici devono esserci TUTTI, identici
    mancanti = [a['nome'] for a in vecchi if a['nome'] not in nomi]
    assert not mancanti, 'nomi storici persi: %s' % mancanti[:5]

    # il blob dell'app non porta l'id (serve solo alla pipeline)
    blob = json.dumps([{k: v for k, v in a.items() if k != 'id'} for a in alimenti], ensure_ascii=False, separators=(',', ':'))
    blob = blob.replace('</', '<\\/')
    dedicato = {
        '_fonte': 'Banca dati svizzera dei valori nutritivi (USAV), alimenti generici + Tabella Ciqual 2025 (ANSES, Francia). File sorgente fuori dal repo.',
        '_generato': datetime.date.today().isoformat() + ' da tools/genera-alimenti.py',
        '_note': "valori per 100 g; 'zuccheri' = carboidrati disponibili, 'zucch' = di cui zuccheri; tracce -> 0, '<X' -> X; tipo S = alimento semplice, R = ricetta; fonte CH/FR; i nomi Ciqual sono traduzioni non ufficiali",
        'alimenti': alimenti,
    }
    with open(JSON_OUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(dedicato, f, ensure_ascii=False, indent=0); f.write('\n')
    nuovo = 'const FOOD = /*__FOOD_JSON__*/' + blob + ';\n'
    with open(JS_OUT, 'w', encoding='utf-8', newline='') as f: f.write(nuovo)
    print('scritti src/dati/alimenti-usav.json e src/dati/02-alimenti-usav.js (%d KB, md5 %s) -> ora `npm run build` + `npm test`'
          % (len(nuovo) // 1024, hashlib.md5(blob.encode('utf-8')).hexdigest()[:8]))

if __name__ == '__main__':
    main()
