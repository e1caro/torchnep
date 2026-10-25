#!/usr/bin/env python3
"""Builds data/body.json, the muscle maps (male and female, front and back) used for exercise pictures.

The outlines come from react-native-body-highlighter by ELABBASSI Hicham (MIT License,
https://github.com/HichamELBSI/react-native-body-highlighter): pass the path of its assets/ folder.
"""
import json
import re
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'data' / 'body.json'
FILES = {('male', 'front'): 'bodyFront.ts', ('male', 'back'): 'bodyBack.ts', ('female', 'front'): 'bodyFemaleFront.ts', ('female', 'back'): 'bodyFemaleBack.ts'}
VIEW = {'male': {'front': '0 0 724 1448', 'back': '724 0 724 1448'}, 'female': {'front': '-50 -40 734 1538', 'back': '756 0 774 1448'}}


def parts(src):
    """[slug, [paths]] for every body part in one asset file."""
    out = []
    for block in re.split(r'\n\s*\{\s*\n\s*slug:', src)[1:]:
        slug = re.match(r'\s*"([\w-]+)"', block).group(1)
        out.append([slug, re.findall(r'"([Mm][^"]+)"', block)])
    return out


def main():
    assets = Path(sys.argv[1])
    data = {'view': VIEW, 'credit': 'Muscle maps: react-native-body-highlighter by ELABBASSI Hicham, MIT License'}
    for (g, side), f in FILES.items():
        data.setdefault(g, {})[side] = parts((assets / f).read_text())
    OUT.write_text(json.dumps(data, separators=(',', ':')))
    print('wrote', OUT, OUT.stat().st_size, 'bytes')


if __name__ == '__main__':
    main()
