import re
import unicodedata

CATEGORIES = ("ACCESS", "BUG", "FEATURE", "SECURITY")
PRIORITIES = ("LOW", "MEDIUM", "HIGH", "CRITICAL")
SPANISH_STOP_WORDS = (
    "a", "al", "algo", "algunas", "algunos", "ante", "asi", "aun", "aunque",
    "como", "con", "contra", "cual", "cuando", "de", "del", "desde", "donde",
    "durante", "e", "el", "ella", "ellas", "ellos", "en", "entre", "era",
    "es", "esa", "esas", "ese", "eso", "esos", "esta", "estaba", "estan",
    "estas", "este", "esto", "estos", "fue", "fueron", "ha", "habia", "hace",
    "hacia", "han", "hasta", "hay", "la", "las", "le", "les", "lo", "los",
    "mas", "me", "mi", "mis", "mismo", "muy", "nos", "nuestra", "nuestras",
    "nuestro", "nuestros", "o", "otra", "otras", "otro", "otros", "para",
    "pero", "por", "porque", "que", "se", "sea", "segun", "ser", "si",
    "sido", "sobre", "son", "su", "sus", "tambien", "tan", "te", "tiene",
    "tienen", "tu", "tus", "u", "un", "una", "unas", "uno", "unos", "y", "ya",
)


def normalize_text(text: str) -> str:
    """Normaliza texto en español: quita acentos, pasa a minúsculas y colapsa espacios."""
    if not isinstance(text, str):
        raise TypeError("text debe ser una cadena.")
    without_accents = "".join(
        ch for ch in unicodedata.normalize("NFD", text) if unicodedata.category(ch) != "Mn"
    )
    return re.sub(r"\s+", " ", without_accents.lower()).strip()
