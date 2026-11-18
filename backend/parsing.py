import io
import re
from pypdf import PdfReader
from docx import Document as DocxDocument


def extract_text(filename: str, data: bytes) -> str:
    name = filename.lower()
    if name.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(data))
        text = "\n".join((p.extract_text() or "") for p in reader.pages)
    elif name.endswith(".docx"):
        doc = DocxDocument(io.BytesIO(data))
        text = "\n".join(p.text for p in doc.paragraphs)
    elif name.endswith((".txt", ".md")):
        text = data.decode("utf-8", errors="ignore")
    else:
        raise ValueError("Unsupported file type. Use PDF, DOCX, TXT or MD.")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if len(text) < 50:
        raise ValueError("No readable text found (scanned PDF? OCR is not supported yet).")
    return text


def chunk_text(text: str, max_chars: int = 12000, overlap: int = 500) -> list[str]:
    """Split on paragraphs into ~max_chars chunks with a small overlap."""
    paras = text.split("\n\n")
    chunks, cur = [], ""
    for p in paras:
        if cur and len(cur) + len(p) > max_chars:
            chunks.append(cur)
            cur = cur[-overlap:] + "\n\n" + p
        else:
            cur = f"{cur}\n\n{p}" if cur else p
        while len(cur) > max_chars * 1.5:  # one giant paragraph
            chunks.append(cur[:max_chars])
            cur = cur[max_chars - overlap:]
    if cur.strip():
        chunks.append(cur)
    return chunks
