"""
Scraper de bourses d'études pour :
  - SaharaBold       (https://www.saharabold.com)
  - FundMyDegree Africa (https://fundmydegree.co)
  - Scholar Africa   (https://scholar.africa)

Résultat : scholarships.json + un fichier JSON par plateforme
"""

import json
import time
import re
import logging
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import Optional

import requests
from bs4 import BeautifulSoup

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Modèle de données ──────────────────────────────────────────────────────────
@dataclass
class Scholarship:
    titre:       str
    description: Optional[str]
    deadline:    Optional[str]
    pays:        Optional[str]
    niveau:      Optional[str]
    lien:        str
    source:      str          # plateforme d'origine

# ── Session HTTP partagée ──────────────────────────────────────────────────────
SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
})

def get(url: str, **kwargs) -> requests.Response:
    """GET avec retry x3 et délai poli."""
    for attempt in range(1, 4):
        try:
            r = SESSION.get(url, timeout=20, **kwargs)
            r.raise_for_status()
            time.sleep(1.2)          # être respectueux du serveur
            return r
        except requests.RequestException as e:
            log.warning(f"  Tentative {attempt}/3 échouée pour {url} → {e}")
            time.sleep(3 * attempt)
    raise RuntimeError(f"Impossible d'atteindre {url} après 3 tentatives")


def soup(url: str, **kwargs) -> BeautifulSoup:
    return BeautifulSoup(get(url, **kwargs).text, "html.parser")


# ══════════════════════════════════════════════════════════════════════════════
# 1. SAHARA BOLD
# ══════════════════════════════════════════════════════════════════════════════
BASE_SB = "https://www.saharabold.com"

def _sb_detail(url: str) -> dict:
    """Extrait deadline / pays / niveau depuis la page détail SaharaBold."""
    info = {"deadline": None, "pays": None, "niveau": None}
    try:
        s = soup(url)
        text = s.get_text(" ", strip=True)

        # deadline – cherche patterns comme "Deadline: 30 June 2025"
        for pat in [
            r"[Dd]eadline[:\s]+([A-Za-z0-9 ,]+\d{4})",
            r"[Cc]losing [Dd]ate[:\s]+([A-Za-z0-9 ,]+\d{4})",
            r"[Aa]pply by[:\s]+([A-Za-z0-9 ,]+\d{4})",
        ]:
            m = re.search(pat, text)
            if m:
                info["deadline"] = m.group(1).strip()
                break

        # pays
        for pat in [
            r"[Cc]ountry[:\s]+([A-Za-z ,&]+?)(?:\s{2,}|\||\n)",
            r"[Hh]ost [Cc]ountry[:\s]+([A-Za-z ,&]+?)(?:\s{2,}|\||\n)",
            r"[Ll]ocation[:\s]+([A-Za-z ,&]+?)(?:\s{2,}|\||\n)",
        ]:
            m = re.search(pat, text)
            if m:
                info["pays"] = m.group(1).strip()
                break

        # niveau
        for pat in [
            r"[Ll]evel[:\s]+([A-Za-z' ,/]+?)(?:\s{2,}|\||\n)",
            r"[Dd]egree[:\s]+([A-Za-z' ,/]+?)(?:\s{2,}|\||\n)",
        ]:
            m = re.search(pat, text)
            if m:
                info["niveau"] = m.group(1).strip()
                break
        # description
        og = s.find("meta", property="og:description") or s.find("meta", attrs={"name":"description"})
        if og and og.get("content"):
            info["description"] = og.get("content").strip()
        else:
            # fallback: take paragraphs
            p = s.find("p")
            if p: info["description"] = p.get_text(strip=True)[:300]

    except Exception as e:
        log.debug(f"    SaharaBold detail error: {e}")
    return info


def scrape_saharabold() -> list[Scholarship]:
    results: list[Scholarship] = []
    log.info("── SaharaBold ────────────────────────────────")

    # Essaie différentes URL candidates pour la liste des bourses
    list_urls = [
        f"{BASE_SB}/scholarships/",
        f"{BASE_SB}/scholarships",
        f"{BASE_SB}/opportunities/",
        f"{BASE_SB}/bursaries/",
        f"{BASE_SB}/",
    ]

    page_html = None
    for lu in list_urls:
        try:
            r = get(lu)
            if len(r.text) > 5000:
                page_html = r.text
                log.info(f"  Liste trouvée sur {lu}")
                break
        except Exception:
            pass

    if not page_html:
        log.warning("  SaharaBold : aucune page liste trouvée.")
        return results

    s = BeautifulSoup(page_html, "html.parser")
    # Cherche toutes les cartes / liens d'articles
    cards = s.select("article, .scholarship-card, .post, .entry-summary, .jet-listing-grid__item")
    if not cards:
        # fallback : prend tous les <a> avec /scholarship dans href
        cards = [a for a in s.find_all("a", href=True) if "scholar" in a["href"].lower()]

    log.info(f"  {len(cards)} cartes/liens détectés")

    seen = set()
    for card in cards[:40]:           # limite à 40 pour ne pas saturer
        # lien
        a = card if card.name == "a" else card.find("a", href=True)
        if not a:
            continue
        href = a["href"]
        if not href.startswith("http"):
            href = BASE_SB.rstrip("/") + "/" + href.lstrip("/")
        if href in seen:
            continue
        seen.add(href)

        # titre
        titre = (
            card.find(["h1","h2","h3","h4"]) or
            card.find(class_=re.compile(r"title|heading", re.I))
        )
        titre_text = titre.get_text(strip=True) if titre else a.get_text(strip=True)
        if not titre_text or len(titre_text) < 5:
            continue

        log.info(f"  → {titre_text[:60]}")
        detail = _sb_detail(href)

        results.append(Scholarship(
            titre=titre_text,
            description=detail.get("description"),
            deadline=detail["deadline"],
            pays=detail["pays"],
            niveau=detail["niveau"],
            lien=href,
            source="SaharaBold",
        ))

    log.info(f"  Total SaharaBold : {len(results)} bourses")
    return results


# ══════════════════════════════════════════════════════════════════════════════
# 2. FUNDMYDEGREE AFRICA
# ══════════════════════════════════════════════════════════════════════════════
BASE_FMD = "https://fundmydegree.co"

def _fmd_pages(base_list_url: str) -> list[str]:
    """Collecte toutes les URLs de pagination FundMyDegree."""
    urls = [base_list_url]
    try:
        s = soup(base_list_url)
        # cherche liens de pagination
        pag = s.select("a.page-numbers, .pagination a, nav.pagination a")
        for p in pag:
            href = p.get("href", "")
            if href and href not in urls:
                urls.append(href)
    except Exception as e:
        log.debug(f"  FMD pagination error: {e}")
    return urls


def _fmd_detail(url: str) -> dict:
    info = {"deadline": None, "pays": None, "niveau": None, "description": None}
    try:
        s = soup(url)
        text = s.get_text(" ", strip=True)

        for pat in [
            r"[Dd]eadline[:\s]+([A-Za-z0-9 ,]+\d{4})",
            r"[Cc]losing[:\s]+([A-Za-z0-9 ,]+\d{4})",
            r"[Aa]pplication [Dd]ue[:\s]+([A-Za-z0-9 ,]+\d{4})",
        ]:
            m = re.search(pat, text)
            if m:
                info["deadline"] = m.group(1).strip()
                break

        for pat in [
            r"[Cc]ountry[:\s]+([A-Za-z ,&]+?)(?:\.|,|\s{2,}|\n)",
            r"[Ll]ocation[:\s]+([A-Za-z ,&]+?)(?:\.|,|\s{2,}|\n)",
        ]:
            m = re.search(pat, text)
            if m:
                info["pays"] = m.group(1).strip()
                break

        # Meta-tags OpenGraph peuvent aider
        og = s.find("meta", property="og:description") or s.find("meta", attrs={"name":"description"})
        if og:
            desc = og.get("content","")
            info["description"] = desc.strip()
            if not info["deadline"]:
                m = re.search(r"\b(\d{1,2}[/ ][A-Za-z]+[/ ]\d{4}|[A-Za-z]+ \d{1,2},? \d{4})\b", desc)
                if m:
                    info["deadline"] = m.group(1)

        for pat in [
            r"(Bachelor|Master|PhD|Postdoc|Undergraduate|Graduate|MBA|Diploma|Certificate)[s\']?",
        ]:
            m = re.search(pat, text, re.I)
            if m:
                info["niveau"] = m.group(1)
                break
    except Exception as e:
        log.debug(f"    FMD detail error: {e}")
    return info


def scrape_fundmydegree() -> list[Scholarship]:
    results: list[Scholarship] = []
    log.info("── FundMyDegree Africa ───────────────────────")

    list_candidates = [
        f"{BASE_FMD}/scholarships/",
        f"{BASE_FMD}/scholarships",
        f"{BASE_FMD}/opportunities/",
        f"{BASE_FMD}/",
    ]

    page_html = None
    list_url_used = None
    for lu in list_candidates:
        try:
            r = get(lu)
            if len(r.text) > 5000:
                page_html = r.text
                list_url_used = lu
                log.info(f"  Liste trouvée sur {lu}")
                break
        except Exception:
            pass

    if not page_html:
        log.warning("  FundMyDegree : aucune page liste trouvée.")
        return results

    # Collecte toutes les pages
    all_pages = _fmd_pages(list_url_used)
    log.info(f"  {len(all_pages)} page(s) de liste")

    seen = set()
    for page_url in all_pages[:5]:    # max 5 pages
        try:
            s = soup(page_url)
        except Exception as e:
            log.warning(f"  Erreur page {page_url}: {e}")
            continue

        cards = s.select("article, .scholarship, .listing-item, .post-item, .card")
        if not cards:
            cards = [a for a in s.find_all("a", href=True)
                     if any(k in a["href"].lower() for k in ["scholar","opportunit","burs","grant"])]

        for card in cards[:30]:
            a = card if card.name == "a" else card.find("a", href=True)
            if not a:
                continue
            href = a["href"]
            if not href.startswith("http"):
                href = BASE_FMD.rstrip("/") + "/" + href.lstrip("/")
            if href in seen or href == list_url_used:
                continue
            seen.add(href)

            titre = card.find(["h1","h2","h3","h4"])
            titre_text = titre.get_text(strip=True) if titre else a.get_text(strip=True)
            if not titre_text or len(titre_text) < 5:
                continue

            log.info(f"  → {titre_text[:60]}")
            detail = _fmd_detail(href)

            results.append(Scholarship(
                titre=titre_text,
                description=detail.get("description"),
                deadline=detail["deadline"],
                pays=detail["pays"],
                niveau=detail["niveau"],
                lien=href,
                source="FundMyDegree Africa",
            ))

    log.info(f"  Total FundMyDegree : {len(results)} bourses")
    return results


# ══════════════════════════════════════════════════════════════════════════════
# 3. SCHOLAR AFRICA
# ══════════════════════════════════════════════════════════════════════════════
BASE_SA = "https://scholar.africa"

def _sa_detail(url: str) -> dict:
    info = {"deadline": None, "pays": None, "niveau": None, "description": None}
    try:
        s = soup(url)
        text = s.get_text(" ", strip=True)

        for sel in [".deadline", ".date", "[class*='deadline']", "[class*='date']"]:
            el = s.select_one(sel)
            if el:
                info["deadline"] = el.get_text(strip=True)
                break

        if not info["deadline"]:
            for pat in [
                r"[Dd]eadline[:\s]+([A-Za-z0-9 ,]+\d{4})",
                r"[Cc]losing[:\s]+([A-Za-z0-9 ,]+\d{4})",
                r"[Aa]pply before[:\s]+([A-Za-z0-9 ,]+\d{4})",
            ]:
                m = re.search(pat, text)
                if m:
                    info["deadline"] = m.group(1).strip()
                    break

        for sel in [".country", ".location", "[class*='country']"]:
            el = s.select_one(sel)
            if el:
                info["pays"] = el.get_text(strip=True)
                break

        if not info["pays"]:
            for pat in [
                r"[Cc]ountry[:\s]+([A-Za-z ,&]+?)(?:\.|,|\s{2,}|\n)",
                r"[Hh]ost [Cc]ountry[:\s]+([A-Za-z ,&]+?)(?:\.|,|\s{2,}|\n)",
            ]:
                m = re.search(pat, text)
                if m:
                    info["pays"] = m.group(1).strip()
                    break

        for sel in [".level", ".degree", "[class*='level']"]:
            el = s.select_one(sel)
            if el:
                info["niveau"] = el.get_text(strip=True)
                break

        if not info["niveau"]:
            m = re.search(
                r"(Bachelor|Master|PhD|Postdoc|Undergraduate|Graduate|MBA|Diploma|Certificate)[s\']?",
                text, re.I
            )
            if m:
                info["niveau"] = m.group(1)

        # description
        og = s.find("meta", property="og:description") or s.find("meta", attrs={"name":"description"})
        if og and og.get("content"):
            info["description"] = og.get("content").strip()
        else:
            p = s.find("p")
            if p: info["description"] = p.get_text(strip=True)[:300]

    except Exception as e:
        log.debug(f"    Scholar Africa detail error: {e}")
    return info


def scrape_scholarafrica() -> list[Scholarship]:
    results: list[Scholarship] = []
    log.info("── Scholar Africa ────────────────────────────")

    list_candidates = [
        f"{BASE_SA}/scholarships/",
        f"{BASE_SA}/scholarships",
        f"{BASE_SA}/opportunities/",
        f"{BASE_SA}/",
    ]

    pages_to_scrape: list[str] = []
    for lu in list_candidates:
        try:
            r = get(lu)
            if len(r.text) > 5000:
                pages_to_scrape.append(lu)
                log.info(f"  Liste trouvée sur {lu}")
                # Cherche pages supplémentaires
                s = BeautifulSoup(r.text, "html.parser")
                for a in s.select("a.page-numbers, .pagination a, nav a"):
                    href = a.get("href","")
                    if href and href not in pages_to_scrape:
                        pages_to_scrape.append(href)
                break
        except Exception:
            pass

    if not pages_to_scrape:
        log.warning("  Scholar Africa : aucune page liste trouvée.")
        return results

    seen = set()
    for page_url in pages_to_scrape[:5]:
        try:
            s = soup(page_url)
        except Exception as e:
            log.warning(f"  Erreur {page_url}: {e}")
            continue

        cards = s.select(
            "article, .scholarship-item, .post, .listing, "
            ".card, .jet-listing-grid__item, [class*='scholarship']"
        )
        if not cards:
            cards = [a for a in s.find_all("a", href=True)
                     if any(k in a["href"].lower() for k in ["scholar","opportunit","burs","grant","fellowship"])]

        for card in cards[:30]:
            a = card if card.name == "a" else card.find("a", href=True)
            if not a:
                continue
            href = a["href"]
            if not href.startswith("http"):
                href = BASE_SA.rstrip("/") + "/" + href.lstrip("/")
            if href in seen or href in pages_to_scrape:
                continue
            seen.add(href)

            titre = card.find(["h1","h2","h3","h4"])
            titre_text = titre.get_text(strip=True) if titre else a.get_text(strip=True)
            if not titre_text or len(titre_text) < 5:
                continue

            log.info(f"  → {titre_text[:60]}")
            detail = _sa_detail(href)

            results.append(Scholarship(
                titre=titre_text,
                description=detail.get("description"),
                deadline=detail["deadline"],
                pays=detail["pays"],
                niveau=detail["niveau"],
                lien=href,
                source="Scholar Africa",
            ))

    log.info(f"  Total Scholar Africa : {len(results)} bourses")
    return results


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════
def save_json(data: list[dict], filename: str) -> None:
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    log.info(f"  💾 Sauvegardé : {filename} ({len(data)} entrées)")


def main():
    start = datetime.now()
    log.info("═" * 55)
    log.info("  SCRAPER BOURSES D'ÉTUDES AFRICA")
    log.info("═" * 55)

    all_results: list[Scholarship] = []

    scrapers = [
        ("saharabold",     scrape_saharabold),
        ("fundmydegree",   scrape_fundmydegree),
        ("scholarafrica",  scrape_scholarafrica),
    ]

    for name, fn in scrapers:
        try:
            results = fn()
            all_results.extend(results)
            save_json([asdict(r) for r in results], f"{name}_bourses.json")
        except Exception as e:
            log.error(f"Erreur lors du scraping de {name}: {e}")

    # Fichier consolidé
    save_json([asdict(r) for r in all_results], "scholarships.json")

    elapsed = (datetime.now() - start).seconds
    log.info("═" * 55)
    log.info(f"  ✅ {len(all_results)} bourses scrapées en {elapsed}s")
    log.info("  Fichiers générés :")
    log.info("    - scholarships.json        (toutes plateformes)")
    log.info("    - saharabold_bourses.json")
    log.info("    - fundmydegree_bourses.json")
    log.info("    - scholarafrica_bourses.json")
    log.info("═" * 55)


if __name__ == "__main__":
    main()
