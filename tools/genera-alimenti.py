# -*- coding: utf-8 -*-
"""
genera-alimenti.py — pipeline ufficiale della banca dati alimenti del TMS.

Estrae i 1190 alimenti generici da
  Doc/Banca_dati_svizzera_dei_valori_nutritivi.xlsx   (banca dati svizzera USAV, foglio
  "Alimenti generici"; il foglio "Prodotti di marca" è escluso, come da scelta storica)
e scrive:
  1. src/dati/alimenti-usav.json      JSON dedicato e leggibile (con metadati di provenienza)
  2. src/dati/02-alimenti-usav.js     blob compatto usato dall'app (marker /*__FOOD_JSON__*/)

Dopo l'esecuzione serve `npm run build` per propagare agli artefatti HTML.

Regole di conversione dei valori (identiche all'estrazione storica, verificate
riproducendo byte per byte il blob v1.0.59):
  numero        -> float          'tr.' (tracce) -> 0.0        'nd' -> 0.0
  '<X'          -> X (limite)     vuoto          -> null
  vitamina A    = colonna RAE (equivalenti attività retinolo)
  'zuccheri'    = colonna "Glucidi, disponibili (g)"  (nell'app la chiave significa CARBOIDRATI)
  'zucch'       = colonna "Zuccheri (g)"              (di cui zuccheri)

Disambiguazione nomi duplicati: l'ULTIMA occorrenza di ogni nome duplicato mantiene il
nome originale (è quella che "vince" nell'app e corrisponde ai piani salvati dagli utenti);
ogni occorrenza precedente viene rinominata in "nome (Sinonimi)" dove Sinonimi è il
contenuto della colonna "Sinonimi" del foglio, oppure in "nome (variante N)" se mancante.

Richiede: pip install openpyxl
"""
import openpyxl, json, re, os, sys, hashlib, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX = os.path.join(ROOT, 'Doc', 'Banca_dati_svizzera_dei_valori_nutritivi.xlsx')
JSON_OUT = os.path.join(ROOT, 'src', 'dati', 'alimenti-usav.json')
JS_OUT = os.path.join(ROOT, 'src', 'dati', '02-alimenti-usav.js')

MAPPA = {
  'kcal': 'Energia, calorie (kcal)',
  'proteine': 'Proteine (g)',
  'grassi': 'Lipidi, totali (g)',
  'saturi': 'Acidi grassi, saturi (g)',
  'monoinsaturi': 'Acidi grassi, monoinsaturi (g)',
  'polinsaturi': 'Acidi grassi, polinsaturi (g)',
  'zuccheri': 'Glucidi, disponibili (g)',      # = carboidrati disponibili
  'zucch': 'Zuccheri (g)',                      # = di cui zuccheri
  'fibre': 'Fibra alimentare (g)',
  'colesterolo': 'Colesterolo (mg)',
  'vitA': 'Attività di vitamina A, RAE (µg)',
  'vitB1': 'Vitamina B1 (tiamina) (mg)',
  'vitB2': 'Vitamina B2 (riboflavina) (mg)',
  'vitB6': 'Vitamina B6 (piridossina) (mg)',
  'vitB12': 'Vitamina B12 (cobalamina) (µg)',
  'vitC': 'Vitamina C (acido ascorbico) (mg)',
  'vitD': 'Vitamina D (calciferolo) (µg)',
  'vitE': 'Vitamina E (α-tocoferolo) (mg)',
  'folati': 'Folati (µg)',
  'calcio': 'Calcio (Ca) (mg)',
  'ferro': 'Ferro (Fe) (mg)',
  'magnesio': 'Magnesio (Mg) (mg)',
  'potassio': 'Potassio (K) (mg)',
  'zinco': 'Zinco (Zn)  (mg)',
  'sodio': 'Sodio (Na) (mg)',
  'iodio': 'Iodio (I) (µg)',
  'fosforo': 'Fosforo (P) (mg)',
}

def num(v):
    if v is None: return None
    s = str(v).strip().replace("'", '')
    if s == '': return None
    if s in ('tr.', 'nd'): return 0.0
    if s.startswith('<'): return float(s[1:])
    return float(s)

def main():
    wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
    ws = wb['Alimenti generici']
    rows = list(ws.iter_rows(min_row=3, values_only=True))
    hdr = [str(c).strip() if c is not None else '' for c in rows[0]]
    col = {h: i for i, h in enumerate(hdr) if h and h not in ('Deduzione del valore', 'Fonte')}
    for h in MAPPA.values():
        assert h in col, 'colonna mancante nel foglio: ' + h

    # Verifica che la colonna Sinonimi esista nel foglio
    assert 'Sinonimi' in col, 'colonna Sinonimi mancante nel foglio'

    alimenti, nomi = [], {}
    for r in rows[1:]:
        if r[col['Nome']] is None: continue
        nome = str(r[col['Nome']]).strip()
        sinonimi_raw = r[col['Sinonimi']]
        sinonimi = str(sinonimi_raw).strip() if sinonimi_raw is not None else ''
        nomi[nome] = nomi.get(nome, 0) + 1
        alimenti.append({
            'nome': nome,
            '_sinonimi': sinonimi,  # campo temporaneo, rimosso dopo disambiguazione
            'categoria': str(r[col['Categoria']]).strip() if r[col['Categoria']] is not None else None,
            'densita': num(r[col['Densità']]),
            'per100': {k: num(r[col[h]]) for k, h in MAPPA.items()},
        })

    assert len(alimenti) >= 1000, 'estrazione sospetta: solo %d alimenti' % len(alimenti)

    # Disambiguazione nomi duplicati:
    # l'ultima occorrenza di ogni gruppo mantiene il nome originale;
    # le occorrenze precedenti vengono rinominate "nome (Sinonimi)" o "nome (variante N)".
    dup_nomi = {n for n, c in nomi.items() if c > 1}
    if dup_nomi:
        # Indici delle occorrenze per ogni nome duplicato (in ordine di apparizione)
        dup_indices = {n: [] for n in dup_nomi}
        for i, a in enumerate(alimenti):
            if a['nome'] in dup_nomi:
                dup_indices[a['nome']].append(i)
        # Rinomina tutte le occorrenze tranne l'ultima
        for nome_dup, indices in dup_indices.items():
            variante_counter = 0
            for pos, idx in enumerate(indices[:-1]):  # tutte tranne l'ultima
                sin = alimenti[idx]['_sinonimi']
                if sin:
                    nuovo_nome = nome_dup + ' (' + sin + ')'
                else:
                    variante_counter += 1
                    nuovo_nome = nome_dup + ' (variante %d)' % variante_counter
                alimenti[idx]['nome'] = nuovo_nome

    # Rimuovi campo temporaneo _sinonimi
    for a in alimenti:
        del a['_sinonimi']

    # Avvisa solo se restano ancora nomi duplicati dopo la disambiguazione
    nomi_finali = {}
    for a in alimenti:
        nomi_finali[a['nome']] = nomi_finali.get(a['nome'], 0) + 1
    dup_residui = [n for n, c in nomi_finali.items() if c > 1]
    if dup_residui:
        print('ATTENZIONE nomi ancora duplicati dopo disambiguazione:', dup_residui)

    # tutti i numeri come float, così il blob serializza es. 182.0 (formato storico)
    def tofloat(o):
        if isinstance(o, dict): return {k: tofloat(v) for k, v in o.items()}
        if isinstance(o, (int, float)) and not isinstance(o, bool): return float(o)
        return o
    alimenti = [tofloat(a) for a in alimenti]

    blob = json.dumps(alimenti, ensure_ascii=False, separators=(',', ':'))

    # 1) JSON dedicato con metadati di provenienza
    dedicato = {
        '_fonte': 'Banca dati svizzera dei valori nutritivi (USAV) — Doc/Banca_dati_svizzera_dei_valori_nutritivi.xlsx, foglio "Alimenti generici"',
        '_generato': datetime.date.today().isoformat() + ' da tools/genera-alimenti.py',
        '_note': "valori per 100 g; 'zuccheri' = carboidrati disponibili, 'zucch' = di cui zuccheri; tr./nd -> 0, '<X' -> X; vit. A = RAE; nomi duplicati disambiguati aggiungendo il sinonimo tra parentesi (es. 'Zwieback (Fette biscottate integrali)'); l'ultima occorrenza mantiene il nome originale per compatibilità con i piani salvati",
        'alimenti': alimenti,
    }
    with open(JSON_OUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(dedicato, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print('scritto src/dati/alimenti-usav.json (%d alimenti)' % len(alimenti))

    # 2) blob nel sorgente (marker conservato)
    nuovo = 'const FOOD = /*__FOOD_JSON__*/' + blob + ';\n'
    vecchio = open(JS_OUT, encoding='utf-8').read() if os.path.exists(JS_OUT) else ''
    if nuovo == vecchio:
        print('src/dati/02-alimenti-usav.js INVARIATO (md5 blob %s)' % hashlib.md5(blob.encode('utf-8')).hexdigest()[:8])
    else:
        with open(JS_OUT, 'w', encoding='utf-8', newline='') as f:
            f.write(nuovo)
        print('src/dati/02-alimenti-usav.js AGGIORNATO -> ora serve `npm run build` + `npm test`')

if __name__ == '__main__':
    main()
