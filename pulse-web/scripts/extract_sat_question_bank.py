from __future__ import annotations

import json
import re
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[2]
QUESTIONS_ROOT = ROOT / "Questions"
OUTPUT_PATH = ROOT / "pulse-web" / "src" / "data" / "sat-official-snippets.json"


SECTION_MAP = {
    "English": "reading_writing",
    "Math": "math",
}

DIFFICULTY_MAP = {
    "Easy": "easy",
    "Medium": "medium",
    "Hard": "hard",
}


def normalize_line(line: str) -> str:
    return " ".join(line.replace("\u00a0", " ").split())


def parse_page(text: str) -> dict | None:
    if "ID:" not in text:
        return None

    lines = [normalize_line(line) for line in text.splitlines() if normalize_line(line)]
    try:
        id_index = next(i for i, line in enumerate(lines) if line.startswith("ID:"))
    except StopIteration:
        return None

    source_id = lines[id_index].split("ID:", 1)[1].strip()
    body_lines = lines[id_index + 1 :]

    prompt_lines: list[str] = []
    choices: list[dict[str, str]] = []

    current_label = None
    current_chunks: list[str] = []
    for line in body_lines:
        option_match = re.match(r"^([ABCD])\.\s*(.*)$", line)
        if option_match:
            if current_label:
                choices.append(
                    {
                        "label": current_label,
                        "text": " ".join(current_chunks).strip(),
                    }
                )
            current_label = option_match.group(1)
            current_chunks = [option_match.group(2).strip()]
            continue

        if current_label:
            if line.startswith("ID:"):
                break
            current_chunks.append(line)
        else:
            prompt_lines.append(line)

    if current_label:
        choices.append({"label": current_label, "text": " ".join(current_chunks).strip()})

    prompt = " ".join(prompt_lines).replace("about:srcdoc", "").strip()
    prompt = re.sub(r"^\d+/\d+/\d+,\s+\d+:\d+.*?Page \d+ of \d+", "", prompt).strip()

    return {
        "sourceId": source_id,
        "prompt": prompt,
        "choices": [choice for choice in choices if choice["text"]],
        "usableAsPractice": len([choice for choice in choices if choice["text"]]) == 4,
        "rawChoiceCount": len(choices),
    }


def main() -> None:
    records: list[dict] = []
    for pdf_path in QUESTIONS_ROOT.rglob("*.pdf"):
        rel = pdf_path.relative_to(QUESTIONS_ROOT)
        parts = rel.parts
        if len(parts) < 4:
            continue

        section = SECTION_MAP.get(parts[0])
        if not section:
            continue

        domain = parts[1]
        difficulty = DIFFICULTY_MAP.get(parts[2], parts[2].lower())
        reader = PdfReader(str(pdf_path))

        for page_number, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            parsed = parse_page(text)
            if not parsed or not parsed["prompt"]:
                continue

            records.append(
                {
                    "section": section,
                    "domain": domain,
                    "difficulty": difficulty,
                    "sourcePdf": str(rel).replace("\\", "/"),
                    "pageNumber": page_number,
                    **parsed,
                }
            )

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(records, indent=2), encoding="utf-8")
    print(f"Wrote {len(records)} SAT question snippets to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
