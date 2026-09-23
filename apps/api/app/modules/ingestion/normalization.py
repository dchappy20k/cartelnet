import re
import hashlib
from typing import Optional, Tuple, Any

LEGAL_SUFFIXES = [
    r"\bpvt\.?\s*ltd\.?\b",
    r"\bprivate\s+limited\b",
    r"\bltd\.?\b",
    r"\blimited\b",
    r"\bllc\b",
    r"\binc\.?\b",
    r"\bincorporated\b",
    r"\bcorp\.?\b",
    r"\bcorporation\b",
    r"\bgmbh\b",
    r"\bs\.?a\.?\b",
    r"\bgroup\b",
]

HONORIFICS = [
    r"^mr\.?\s+",
    r"^mrs\.?\s+",
    r"^ms\.?\s+",
    r"^dr\.?\s+",
    r"^prof\.?\s+",
    r"^eng\.?\s+",
]

ADDRESS_ABBREVIATIONS = {
    r"\bstreet\b": "st",
    r"\broad\b": "rd",
    r"\bavenue\b": "ave",
    r"\bboulevard\b": "blvd",
    r"\bdrive\b": "dr",
    r"\bfloor\b": "fl",
    r"\bsuite\b": "ste",
    r"\bparkway\b": "pkwy",
}


def normalize_company_name(name: str) -> str:
    """Standardizes corporate legal names to enable entity resolution."""
    if not name:
        return ""
    
    clean = name.strip().lower()
    
    # Remove punctuation
    clean = re.sub(r"[,\.\-\/\\#()']", " ", clean)
    
    # Strip common corporate suffixes
    for suffix in LEGAL_SUFFIXES:
        clean = re.sub(suffix, "", clean, flags=re.IGNORECASE)
    
    # Collapse whitespace
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean


def normalize_director_name(name: str) -> str:
    """Standardizes director and officer names."""
    if not name:
        return ""
    
    clean = name.strip().lower()
    
    # Remove honorifics
    for prefix in HONORIFICS:
        clean = re.sub(prefix, "", clean, flags=re.IGNORECASE)
    
    # Remove punctuation
    clean = re.sub(r"[,\.\-\/\\#()']", " ", clean)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean


def normalize_address(address: str) -> Tuple[str, str]:
    """Standardizes address text and generates a SHA-256 cluster hash."""
    if not address:
        return "", ""
    
    clean = address.strip().lower()
    clean = re.sub(r"[,\.\-\/\\#()']", " ", clean)
    
    for full, abbr in ADDRESS_ABBREVIATIONS.items():
        clean = re.sub(full, abbr, clean, flags=re.IGNORECASE)
    
    clean = re.sub(r"\s+", " ", clean).strip()
    addr_hash = hashlib.sha256(clean.encode("utf-8")).hexdigest()[:16]
    return clean, addr_hash


def parse_amount(val: Any) -> float:
    """Robustly parses currency strings or floats (e.g. '$48.2M', '48,200,000')."""
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    
    s = str(val).strip().upper()
    s = re.sub(r"[\$€£, ]", "", s)
    
    if s.endswith("M"):
        return float(s[:-1]) * 1_000_000
    if s.endswith("K"):
        return float(s[:-1]) * 1_000
    if s.endswith("B"):
        return float(s[:-1]) * 1_000_000_000
    
    try:
        return float(s)
    except ValueError:
        return 0.0


def parse_date(val: Any) -> Optional[str]:
    """Parses date into ISO YYYY-MM-DD string format."""
    if not val:
        return None
    s = str(val).strip()
    
    # Match YYYY-MM-DD
    match = re.search(r"(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})", s)
    if match:
        year, month, day = match.groups()
        return f"{year}-{int(month):02d}-{int(day):02d}"
    
    return s
