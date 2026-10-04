"""Recompõe os snapshots originais divididos para transferência ao GitHub."""
from pathlib import Path
import hashlib
import os
ROOT = Path(__file__).resolve().parents[1]
EXPECTED = {"data-snapshots/imas-capacity-original.csv.gz":{"size":17076913,"sha":"71d4dd78aa152631487087df27c71126b4692f0a"},"data-snapshots/imas-effort-original.csv.gz":{"size":19192602,"sha":"8257653a979346eb352c0baee24122d110c83d37"}}
for rel, expected in EXPECTED.items():
    target = ROOT / rel
    parts = sorted(target.parent.glob(target.name + ".part*"))
    if not parts:
        raise SystemExit(f"Partes ausentes: {rel}")
    temp = target.with_name(target.name + ".tmp")
    try:
        with temp.open("wb") as output:
            for part in parts:
                with part.open("rb") as source:
                    while chunk := source.read(1024 * 1024):
                        output.write(chunk)
        data = temp.read_bytes()
        sha = hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()
        if len(data) != expected["size"] or sha != expected["sha"]:
            raise SystemExit(f"Falha de integridade: {rel}")
        os.replace(temp, target)
        print(f"OK {rel}: {len(data)} bytes, SHA {sha}")
    finally:
        temp.unlink(missing_ok=True)
