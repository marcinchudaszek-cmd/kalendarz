"""Generuje wektorowe ikony adaptacyjne Kalendarza dla każdego dnia tygodnia.

Użycie (z katalogu projektu, potrzebny pakiet fonttools):
    python narzedzia/ikony-dni.py LiberationSans-Bold.ttf android/app/src/main/res <katalog na podgląd svg>

Font: Liberation Sans Bold (licencja SIL OFL), np. z pdfjs-dist/standard_fonts.
"""
import os
import sys

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

FONT, RES, PREVIEW = sys.argv[1], sys.argv[2], sys.argv[3]

# Klucz aliasu (Javy) -> napis na ikonie. Kolejność jak Calendar.DAY_OF_WEEK - 1 (niedziela = 0).
DNI = [("nd", "ND"), ("pn", "PN"), ("wt", "WT"), ("sr", "ŚR"), ("cz", "CZ"), ("pt", "PT"), ("so", "SO")]

BIALY = "#FFFFFFFF"
ZOLTY = "#FFFACC15"
KRESKA = 3.4

# Kartka kalendarza w siatce 108 dp (strefa bezpieczna: koło o promieniu 33 wokół środka).
KX0, KX1, KY0, KY1, KR = 32.0, 76.0, 40.0, 75.0, 6.0
SEPARATOR = 49.5
KOLKA = (44.0, 64.0)
KOLKA_Y0, KOLKA_Y1 = 34.5, 43.5
CAP = 14.0           # wysokość wielkiej litery w dp
SRODEK_TEKSTU = 63.3  # środek wysokości wielkich liter
ODSTEP = 0.9          # dodatkowy odstęp między literami w dp

font = TTFont(FONT)
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
os2 = font["OS/2"]
cap_units = getattr(os2, "sCapHeight", 0) or 1409
hmtx = font["hmtx"]


def tekst_path(napis: str) -> tuple[str, tuple[float, float, float, float]]:
    """Zwraca ścieżkę napisu wyśrodkowanego w części kartki pod separatorem."""
    s = CAP / cap_units
    names = [cmap[ord(c)] for c in napis]
    szer = sum(hmtx[n][0] for n in names) * s + ODSTEP * (len(names) - 1)
    # Prawdziwe granice obrysu, żeby wyśrodkować bez wpływu bocznych marginesów glifów.
    x = 0.0
    lewy, prawy = None, None
    for n in names:
        bp = BoundsPen(glyphs)
        glyphs[n].draw(bp)
        if bp.bounds:
            x0, _, x1, _ = bp.bounds
            lewy = x + x0 * s if lewy is None else lewy
            prawy = x + x1 * s
        x += hmtx[n][0] * s + ODSTEP
    start = (KX0 + KX1) / 2 - (lewy + prawy) / 2
    baseline = SRODEK_TEKSTU + CAP / 2

    pen = SVGPathPen(glyphs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
    bounds = BoundsPen(glyphs)
    x = start
    for n in names:
        # Oś Y fontu rośnie w górę, w drawable w dół.
        t = (s, 0, 0, -s, x, baseline)
        glyphs[n].draw(TransformPen(pen, t))
        glyphs[n].draw(TransformPen(bounds, t))
        x += hmtx[n][0] * s + ODSTEP
    return pen.getCommands(), bounds.bounds


def kartka_paths() -> list[str]:
    r = KR
    rama = (
        f"M{KX0 + r},{KY0}H{KX1 - r}A{r},{r} 0,0 1,{KX1},{KY0 + r}V{KY1 - r}"
        f"A{r},{r} 0,0 1,{KX1 - r},{KY1}H{KX0 + r}A{r},{r} 0,0 1,{KX0},{KY1 - r}"
        f"V{KY0 + r}A{r},{r} 0,0 1,{KX0 + r},{KY0}Z"
    )
    kolka = "".join(f"M{x},{KOLKA_Y0}V{KOLKA_Y1}" for x in KOLKA)
    separator = f"M{KX0},{SEPARATOR}H{KX1}"
    return [rama, kolka, separator]


def vector(paths: list[tuple[str, str, bool]]) -> str:
    """paths: (pathData, kolor, czy_kreska)."""
    out = [
        '<?xml version="1.0" encoding="utf-8"?>',
        "<!-- Wygenerowane skryptem ikony dni tygodnia — nie edytuj ręcznie. -->",
        '<vector xmlns:android="http://schemas.android.com/apk/res/android"',
        '    android:width="108dp"',
        '    android:height="108dp"',
        '    android:viewportWidth="108"',
        '    android:viewportHeight="108">',
    ]
    for d, kolor, kreska in paths:
        if kreska:
            out.append(
                f'    <path android:pathData="{d}" android:strokeColor="{kolor}" '
                f'android:strokeWidth="{KRESKA}" android:strokeLineCap="round" android:strokeLineJoin="round" '
                'android:fillColor="#00000000" />'
            )
        else:
            out.append(f'    <path android:pathData="{d}" android:fillColor="{kolor}" />')
    out.append("</vector>")
    return "\n".join(out) + "\n"


def zapisz(sciezka: str, tresc: str) -> None:
    os.makedirs(os.path.dirname(sciezka), exist_ok=True)
    with open(sciezka, "w", encoding="utf-8", newline="\n") as f:
        f.write(tresc)


os.makedirs(PREVIEW, exist_ok=True)
podglad = []
for klucz, napis in DNI:
    tekst, (bx0, by0, bx1, by1) = tekst_path(napis)
    # Litery muszą zmieścić się w kartce pod separatorem, z luzem na grubość kreski.
    assert by0 > SEPARATOR + KRESKA / 2 + 0.8, (napis, by0)
    assert by1 < KY1 - KRESKA / 2 - 0.8, (napis, by1)
    assert bx0 > KX0 + 3 and bx1 < KX1 - 3, (napis, bx0, bx1)

    kreski = [(p, BIALY, True) for p in kartka_paths()]
    zapisz(f"{RES}/drawable/ic_launcher_foreground_{klucz}.xml", vector(kreski + [(tekst, ZOLTY, False)]))
    # Monochromatyczna: system zabarwia całość jednym kolorem z motywu.
    zapisz(f"{RES}/drawable/ic_launcher_monochrome_{klucz}.xml", vector(kreski + [(tekst, BIALY, False)]))
    zapisz(
        f"{RES}/mipmap-anydpi-v26/ic_launcher_{klucz}.xml",
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
        '    <background android:drawable="@drawable/ic_launcher_background"/>\n'
        f'    <foreground android:drawable="@drawable/ic_launcher_foreground_{klucz}"/>\n'
        f'    <monochrome android:drawable="@drawable/ic_launcher_monochrome_{klucz}"/>\n'
        "</adaptive-icon>\n",
    )
    # Android 7 nie zna ikon adaptacyjnych — tam warstwy po prostu leżą na sobie.
    zapisz(
        f"{RES}/mipmap/ic_launcher_{klucz}.xml",
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<layer-list xmlns:android="http://schemas.android.com/apk/res/android">\n'
        '    <item android:drawable="@drawable/ic_launcher_background"/>\n'
        f'    <item android:drawable="@drawable/ic_launcher_foreground_{klucz}"/>\n'
        "</layer-list>\n",
    )

    rama, kolka, sep = kartka_paths()
    podglad.append((napis, tekst, rama, kolka, sep))

# Podgląd: kolorowe w masce koła + monochromatyczne (jak w motywie Material You).
W = 120
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W * 7} {W * 2}" width="{W * 7}" height="{W * 2}">',
       '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2563EB"/><stop offset="1" stop-color="#1E40AF"/></linearGradient>',
       '<clipPath id="c"><circle cx="54" cy="54" r="36"/></clipPath></defs>']
for i, (napis, tekst, rama, kolka, sep) in enumerate(podglad):
    for wiersz, (tlo, kreska, litery) in enumerate([("url(#g)", "#fff", "#FACC15"), ("#D3E3FD", "#0B57D0", "#0B57D0")]):
        svg.append(f'<g transform="translate({i * W + 6},{wiersz * W + 6})"><g clip-path="url(#c)">')
        svg.append(f'<rect width="108" height="108" fill="{tlo}"/>')
        for d in (rama, kolka, sep):
            svg.append(f'<path d="{d}" fill="none" stroke="{kreska}" stroke-width="{KRESKA}" stroke-linecap="round" stroke-linejoin="round"/>')
        svg.append(f'<path d="{tekst}" fill="{litery}"/></g></g>')
svg.append("</svg>")
zapisz(f"{PREVIEW}/podglad-ikon.svg", "\n".join(svg))
print("ok")
