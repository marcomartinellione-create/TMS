# -*- coding: utf-8 -*-
"""
genera-qr.py — genera il QR del canale YouTube Tutorial e lo inserisce nel sorgente.

Uso:
    python tools/genera-qr.py https://www.youtube.com/@IlTuoCanale

Scrive in src/app/01-costanti.js i valori di YT_URL e QR_YT_SRC (QR in data URI
base64, nero su bianco come gli altri QR dell'app). Poi servono `npm run build`
e `npm test` come per ogni modifica al sorgente.

Richiede: pip install qrcode pillow
"""
import sys, os, re, io, base64

import qrcode

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COSTANTI = os.path.join(ROOT, 'src', 'app', '01-costanti.js')

def main():
    if len(sys.argv) != 2 or not sys.argv[1].startswith('http'):
        print('Uso: python tools/genera-qr.py <url del canale YouTube>'); sys.exit(1)
    url = sys.argv[1].strip()

    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color='black', back_color='white').convert('RGB')
    buf = io.BytesIO(); img.save(buf, format='PNG')
    data_uri = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode('ascii')

    t = open(COSTANTI, encoding='utf-8').read()
    nuovo_t, n1 = re.subn(r"const YT_URL='[^']*';", "const YT_URL='" + url + "';", t, count=1)
    assert n1 == 1, 'costante YT_URL non trovata'
    nuovo_t, n2 = re.subn(r"const QR_YT_SRC='[^']*';", "const QR_YT_SRC='" + data_uri + "';", nuovo_t, count=1)
    assert n2 == 1, 'costante QR_YT_SRC non trovata'
    open(COSTANTI, 'w', encoding='utf-8', newline='').write(nuovo_t)

    print('OK: YT_URL =', url)
    print('OK: QR_YT_SRC aggiornato (%d KB, %dx%d px)' % (len(data_uri) // 1024, img.size[0], img.size[1]))
    print('Ora: npm run build && npm test (e bump versione per la release).')

if __name__ == '__main__':
    main()
