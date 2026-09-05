#!/usr/bin/env python3
"""Convert DCS translation jobs into Sanskrit Voyager book JSON files.

Input (a ``jobs_codex``-style folder produced by the translation pipeline):

    <jobs>/manifest.json                 book queue, per-book status, source TSV paths
    <jobs>/segments/DCS__<id>.json       {"0": "sanskrit line", "1": ...}
    <jobs>/translations/DCS__<id>.json   {"0": "english line", "1": ...}
    <jobs>/segment_sources/DCS__<id>.json {"0": {"segment_id": "101_382866", "segment_number": "382866", ...}}

Chapter / verse structure is not stored in the job files, so it is joined back
from the corpus ``segments`` TSV referenced by the manifest (columns
``segment_id``, ``chapter`` = "3.0", ``section`` = "verse:line").

Output: one ``sa_<title>_DCS.json`` per book in the existing ``BookText``
format rendered by ``ClickableSimpleBooks`` (see docs/book-tags-guide.md):

    div[type=chapter]  >  head "Chapter N"  +  lg[id=DCS_N.V]  >  l (text, translated_text, segment_number)

Each ``l`` keeps the corpus-wide ``segment_number`` so search-result
highlighting and scroll-to-segment keep working.  ``titles.json`` is updated
with the new file names.

Usage:
    python3 scripts/convert_dcs_books.py                 # convert every finalized book
    python3 scripts/convert_dcs_books.py --only 101 1    # just DCS__101 and DCS__1
    python3 scripts/convert_dcs_books.py --include-partial   # also books still in progress
    python3 scripts/convert_dcs_books.py --dry-run       # report, write nothing
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import unicodedata
from collections import Counter, OrderedDict

DEFAULT_JOBS = "/Users/jack/translationProject/resources/jobs_codex"
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_OUT = os.path.join(REPO_ROOT, "public", "resources", "books")

DCS_URL = "http://www.sanskrit-linguistics.org/dcs/"
PUBLISHER = "Digital Corpus of Sanskrit (DCS)"
# DCS data are released under CC BY-NC-SA 4.0 (per Oliver Hellwig's terms), matching the GRETIL files.
LICENSE = {
    "text": "Distributed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.",
    "target": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
}

csv.field_size_limit(sys.maxsize)


# --------------------------------------------------------------------------- #
# naming helpers
# --------------------------------------------------------------------------- #
def strip_diacritics(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if not unicodedata.combining(c))


def slugify_title(title: str) -> str:
    """'Comm. on the Kāvyālaṃkāravṛtti' -> 'comm-on-the-kāvyālaṃkāravṛtti' (diacritics kept)."""
    t = unicodedata.normalize("NFC", title.strip().lower())
    t = re.sub(r"[\s_]+", "-", t)
    t = re.sub(r"[^\w\-]", "", t)
    t = re.sub(r"-{2,}", "-", t).strip("-")
    return t


def to_route_slug(file_title: str) -> str:
    """Mirror of src/utils/bookSlug.ts::toSlug (used to detect URL collisions)."""
    t = re.sub(r"^sa_", "", file_title)
    t = re.sub(r"^ta_", "", t)
    return strip_diacritics(t).lower()


# --------------------------------------------------------------------------- #
# corpus loading
# --------------------------------------------------------------------------- #
def load_dcs_metadata(path: str) -> dict[str, dict]:
    meta = {}
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f, delimiter="\t"):
            if row.get("collection") == "DCS":
                meta[row["text_id"]] = row
    return meta


def parse_chapter(raw: str) -> int | None:
    try:
        return int(float(raw))
    except (TypeError, ValueError):
        return None


def parse_section(raw: str) -> tuple[int | None, int | None]:
    m = re.match(r"^\s*(-?\d+)\s*:\s*(-?\d+)\s*$", raw or "")
    return (int(m.group(1)), int(m.group(2))) if m else (None, None)


def load_structure(path: str, wanted_text_ids: set[str]) -> dict[str, tuple]:
    """segment_id -> (chapter, verse, line) for the wanted DCS texts."""
    structure = {}
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f, delimiter="\t"):
            if row["text_id"] in wanted_text_ids:
                verse, line = parse_section(row.get("section", ""))
                structure[row["segment_id"]] = (parse_chapter(row.get("chapter", "")), verse, line)
    return structure


# --------------------------------------------------------------------------- #
# conversion
# --------------------------------------------------------------------------- #
def clean_translation(text: str, stats: Counter) -> str:
    t = (text or "").strip()
    if not t:
        return ""
    if t.count("<s>") != t.count("</s>"):
        stats["unbalanced_s_tags_stripped"] += 1
        t = re.sub(r"</?s>", "", t)
    return t


def build_body(segments: dict, translations: dict, sources: dict, structure: dict, stats: Counter) -> list:
    n = len(segments)
    lines = []
    for i in range(n):
        key = str(i)
        src = sources.get(key) or {}
        seg_id = src.get("segment_id")
        chapter, verse, line = structure.get(seg_id, (None, None, None))
        if seg_id not in structure:
            stats["segments_without_structure"] += 1
        # A few segment_sources entries carry a stray "(" (e.g. "(385517"); keep the digits.
        seg_number = re.sub(r"\D", "", str(src.get("segment_number") or ""))
        try:
            seg_number = int(seg_number)
        except (TypeError, ValueError):
            seg_number = None
            stats["segments_without_number"] += 1
        translation = clean_translation(translations.get(key, ""), stats)
        if translation:
            stats["translated"] += 1
        lines.append((chapter, verse, line, segments[key], translation, seg_number))

    chapters_in_order: list = []
    for chapter, *_ in lines:
        if chapter not in chapters_in_order:
            chapters_in_order.append(chapter)
    multi_chapter = len(chapters_in_order) > 1

    body = []
    current_div = None
    current_div_chapter = object()  # sentinel so the first line always opens a div
    current_lg = None
    current_lg_key = object()

    for chapter, verse, line, text, translation, seg_number in lines:
        if chapter != current_div_chapter:
            attributes = {}
            children = []
            if multi_chapter:
                attributes = {"type": "chapter", "n": str(chapter) if chapter is not None else ""}
                if chapter is None:
                    head = "Unassigned lines"
                elif chapter < 0:
                    head = "Unnumbered section"
                else:
                    head = f"Chapter {chapter}"
                children.append({"tag": "head", "attributes": {}, "text": head})
            current_div = {"tag": "div", "attributes": attributes, "children": children}
            body.append(current_div)
            current_div_chapter = chapter
            current_lg_key = object()

        lg_key = (chapter, verse)
        if lg_key != current_lg_key:
            if verse is None:
                ref = None
            elif multi_chapter and chapter is not None:
                ref = f"{chapter}.{verse}"
            else:
                ref = str(verse)
            attributes = {"id": f"DCS_{ref}", "label": f"DCS {ref}"} if ref else {}
            current_lg = {"tag": "lg", "attributes": attributes, "children": []}
            current_div["children"].append(current_lg)
            current_lg_key = lg_key

        element = {"tag": "l", "attributes": {}, "text": text}
        if translation:
            element["translated_text"] = translation
        if seg_number is not None:
            element["segment_number"] = seg_number
        current_lg["children"].append(element)

    return body


def build_book(text_id: str, title: str, body: list, file_stem: str) -> dict:
    file_title = re.sub(r"^sa_", "", file_stem)
    return {
        "file_title": file_title,
        "file_title_normal": strip_diacritics(file_title),
        "metadata": {
            "original_title": title,
            "publisher": PUBLISHER,
            "license": LICENSE,
            "source": f"{PUBLISHER}, text ID {text_id}. {DCS_URL} "
            "Segmentation follows the DCS line/pāda boundaries; chapter and verse labels are taken from the DCS references.",
            "text_id": text_id,
            "collection": "DCS",
        },
        "body": body,
    }


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #
def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--jobs", default=DEFAULT_JOBS, help="jobs folder containing manifest.json")
    ap.add_argument("--out", default=DEFAULT_OUT, help="books output folder (public/resources/books)")
    ap.add_argument("--only", nargs="*", default=None, help="DCS text ids to convert (e.g. 101 1)")
    ap.add_argument("--include-partial", action="store_true", help="also convert books not marked finalized")
    ap.add_argument("--dry-run", action="store_true", help="do not write anything")
    ap.add_argument("--indent", type=int, default=1, help="JSON indent for book files")
    args = ap.parse_args()

    manifest = json.load(open(os.path.join(args.jobs, "manifest.json"), encoding="utf-8"))
    meta = load_dcs_metadata(manifest["metadata_tsv"])

    books = []
    skipped_partial = []
    for filename, info in manifest["books"].items():
        m = re.match(r"^DCS__(\d+)\.json$", filename)
        if not m:
            continue
        text_id = m.group(1)
        if args.only is not None and text_id not in set(args.only):
            continue
        if info.get("status") != "finalized" and not args.include_partial:
            skipped_partial.append((filename, info.get("status"), info.get("segment_count")))
            continue
        if text_id not in meta:
            print(f"!! {filename}: no DCS metadata row, skipped", file=sys.stderr)
            continue
        books.append((text_id, filename, info))

    print(f"Loading chapter/verse structure for {len(books)} books from {manifest['segments_tsv']} ...")
    structure = load_structure(manifest["segments_tsv"], {tid for tid, _, _ in books})
    print(f"  {len(structure)} segment references loaded")

    titles_path = os.path.join(args.out, "titles.json")
    existing_titles = json.load(open(titles_path, encoding="utf-8")) if os.path.exists(titles_path) else []
    existing_slugs = {to_route_slug(t): t for t in existing_titles}

    new_titles = []
    planned_stems = {}
    totals = Counter()
    for text_id, filename, info in sorted(books, key=lambda b: int(b[0])):
        title = meta[text_id]["title"].strip()
        stem = f"sa_{slugify_title(title)}_DCS"
        if stem in planned_stems:
            print(f"!! {filename}: file name {stem} already produced by DCS__{planned_stems[stem]}; skipped", file=sys.stderr)
            continue
        route_slug = to_route_slug(stem)
        if route_slug in existing_slugs and existing_slugs[route_slug] != stem:
            print(f"!! {filename}: route slug '{route_slug}' collides with existing '{existing_slugs[route_slug]}'; skipped", file=sys.stderr)
            continue
        planned_stems[stem] = text_id

        seg_dir = os.path.join(args.jobs, "segments", filename)
        tr_path = os.path.join(args.jobs, "translations", filename)
        src_path = os.path.join(args.jobs, "segment_sources", filename)
        segments = json.load(open(seg_dir, encoding="utf-8"))
        translations = json.load(open(tr_path, encoding="utf-8")) if os.path.exists(tr_path) else {}
        sources = json.load(open(src_path, encoding="utf-8")) if os.path.exists(src_path) else {}

        stats = Counter()
        body = build_body(segments, translations, sources, structure, stats)
        book = build_book(text_id, title, body, stem)

        n = len(segments)
        totals["books"] += 1
        totals["segments"] += n
        totals["translated"] += stats["translated"]
        for k in ("segments_without_structure", "segments_without_number", "unbalanced_s_tags_stripped"):
            totals[k] += stats[k]
        warn = ""
        if stats["translated"] < n:
            warn += f"  ({n - stats['translated']} untranslated)"
        if stats["segments_without_structure"]:
            warn += f"  ({stats['segments_without_structure']} lines without chapter/verse)"
        print(f"  DCS__{text_id:<4} {title[:48]:<48} {n:>7} lines -> {stem}.json{warn}")

        if stem not in existing_titles:
            new_titles.append(stem)
        if not args.dry_run:
            out_path = os.path.join(args.out, unicodedata.normalize("NFC", stem) + ".json")
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(book, f, ensure_ascii=False, indent=args.indent)
                f.write("\n")

    if new_titles and not args.dry_run:
        merged = list(OrderedDict.fromkeys(existing_titles + sorted(new_titles)))
        with open(titles_path, "w", encoding="utf-8") as f:
            json.dump(merged, f, ensure_ascii=False, indent=2)
            f.write("\n")

    print()
    print(f"Converted {totals['books']} books, {totals['segments']} lines, {totals['translated']} with a translation.")
    if totals["unbalanced_s_tags_stripped"]:
        print(f"Stripped unbalanced <s> tags from {totals['unbalanced_s_tags_stripped']} translations.")
    if totals["segments_without_structure"] or totals["segments_without_number"]:
        print(f"Lines without chapter/verse: {totals['segments_without_structure']}; without segment number: {totals['segments_without_number']}.")
    print(f"titles.json: {len(new_titles)} new entries{' (not written, dry run)' if args.dry_run else ''}.")
    for filename, status, count in skipped_partial:
        print(f"Skipped {filename} (status '{status}', {count} lines); pass --include-partial to convert it anyway.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
