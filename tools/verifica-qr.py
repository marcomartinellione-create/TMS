# -*- coding: utf-8 -*-
"""verifica-qr.py — controlla il codificatore QR del TMS (src/app/15d-qr.js) contro la libreria Python qrcode.
Per alcuni testi (versioni 1, 2 e 3) e per tutte le 8 maschere scrive le matrici di riferimento in
tests/qr-riferimento.json: tests/test-app.js le confronta col codificatore della pagina.
Uso: python tools/verifica-qr.py        (richiede: pip install qrcode)"""
import json, os, qrcode
from qrcode.util import QRData, MODE_ALPHA_NUM
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TESTI = ['TMS:K7QM', 'TMS:K7QM-3XRP-A9TB-4WZC-HN5D', 'TMS:K7QM-3XRP-A9TB-4WZC-HN5D-ABCD-EFGH-1234']
out = {}
for testo in TESTI:
    for m in range(8):
        qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=0, mask_pattern=m)
        qr.add_data(QRData(testo, mode=MODE_ALPHA_NUM)); qr.make(fit=True)
        out[testo + '|' + str(m)] = {'versione': qr.version, 'righe': [''.join('1' if x else '0' for x in r) for r in qr.get_matrix()]}
with open(os.path.join(ROOT, 'tests', 'qr-riferimento.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, indent=0)
print('scritte', len(out), 'matrici di riferimento in tests/qr-riferimento.json')
