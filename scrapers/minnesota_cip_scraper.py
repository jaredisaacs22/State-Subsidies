"""
Minnesota Conservation Improvement Program (CIP) + DOC Scraper
===============================================================
Scrapes Minnesota energy programs from:
  https://mn.gov/commerce/energy/
  https://www.xcelenergy.com/programs/residential
  https://www.centerpointenergy.com/en-us/save-money-and-energy/

MN's Conservation Improvement Program (CIP) is a statutory framework that
requires investor-owned utilities (Xcel Energy, Minnesota Power, CenterPoint,
Otter Tail Power) to deliver utility-funded efficiency programs. The
Department of Commerce (DOC) administers state grants and federal pass-throughs.

Quality
-------
- STATE jurisdiction / Minnesota
- Mock mode: 5 realistic MN fixtures
"""

from __future__ import annotations

import re
from typing import Optional

from .base_scraper import BaseScraper
from .fingerprint import compute_source_hash
from .models import (
    IncentiveStatus,
    IncentiveType,
    JurisdictionLevel,
    ParseConfidence,
    ScrapedIncentive,
)

BASE = "https://mn.gov"
INDEX_URLS = [
    f"{BASE}/commerce/energy/funding-opportunities/",
    f"{BASE}/commerce/energy/business/",
]

TYPE_CLUES: list[tuple[str, IncentiveType]] = [
    ("rebate",     IncentiveType.POINT_OF_SALE_REBATE),
    ("incentive",  IncentiveType.POINT_OF_SALE_REBATE),
    ("grant",      IncentiveType.GRANT),
    ("loan",       IncentiveType.LOAN),
    ("financing",  IncentiveType.LOAN),
    ("tax credit", IncentiveType.TAX_CREDIT),
]

INDUSTRY_CLUES: list[tuple[str, str]] = [
    ("solar",        "Clean Technology"),
    ("storage",      "Energy Storage"),
    ("electric veh", "EV Charging"),
    ("ev ",          "EV Charging"),
    ("heat pump",    "Energy Management"),
    ("efficiency",   "Energy Management"),
    ("agriculture",  "Agriculture"),
    ("manufacturing","Manufacturing"),
    ("low-income",   "Government & Nonprofit"),
]


def _infer_type(title: str, summary: str) -> IncentiveType:
    blob = (title + " " + summary).lower()
    for kw, t in TYPE_CLUES:
        if kw in blob:
            return t
    return IncentiveType.GRANT


def _infer_industries(title: str, summary: str) -> list[str]:
    blob = (title + " " + summary).lower()
    found: list[str] = []
    for kw, cat in INDUSTRY_CLUES:
        if kw in blob and cat not in found:
            found.append(cat)
    return found or ["Energy Management"]


class MinnesotaCIPScraper(BaseScraper):
    """Scrapes Minnesota Department of Commerce + CIP utility programs."""

    SOURCE_NAME = "minnesota_cip"
    BASE_URL = BASE

    def __init__(self, mock: bool = False, max_programs: int = 50):
        super().__init__()
        self.mock = mock
        self.max_programs = max_programs

    def scrape(self) -> list[ScrapedIncentive]:
        if self.mock:
            return self._mock_results()
        return self._scrape_live()

    def _scrape_live(self) -> list[ScrapedIncentive]:
        all_links: list[str] = []
        for index_url in INDEX_URLS:
            try:
                html = self.fetch(index_url)
                soup = self.parse(html)
                for a in soup.select("a[href]"):
                    href = str(a.get("href", ""))
                    if (href.startswith("/") or href.startswith(BASE)) and len(href) > 3:
                        full = href if href.startswith("http") else f"{BASE}{href}"
                        if full not in all_links and BASE in full and full not in INDEX_URLS:
                            all_links.append(full)
            except Exception as e:
                self._log.debug("mn-cip index failed", url=index_url, error=str(e))
        results: list[ScrapedIncentive] = []
        for url in all_links[: self.max_programs]:
            try:
                inc = self._scrape_detail(url)
                if inc:
                    results.append(inc)
            except Exception as e:
                self._log.debug("mn-cip detail failed", url=url, error=str(e))
        self._log.info("mn-cip scraped", links=len(all_links), kept=len(results))
        return results

    def _scrape_detail(self, url: str) -> Optional[ScrapedIncentive]:
        html = self.fetch(url)
        soup = self.parse(html)
        title = self.extract_text(soup, "h1") or self.extract_text(soup, "h2")
        if len(title) < 5:
            return None
        summary = ""
        for sel in ["main", ".main-content", "article", "#content"]:
            el = soup.select_one(sel)
            if el:
                paras = [p.get_text(strip=True) for p in el.select("p") if len(p.get_text(strip=True)) > 30]
                summary = " ".join(paras[:3])
                if len(summary) >= 40:
                    break
        if len(summary) < 20:
            return None
        return ScrapedIncentive(
            title=title,
            jurisdiction_level=JurisdictionLevel.STATE,
            jurisdiction_name="Minnesota",
            managing_agency="Minnesota Department of Commerce",
            agency_acronym="MN DOC",
            short_summary=summary[:1500],
            key_requirements=["See program website for full eligibility details"],
            industry_categories=_infer_industries(title, summary),
            incentive_type=_infer_type(title, summary),
            source_url=url,
            program_code=f"MN-{re.sub(r'[^a-z0-9]', '-', title.lower())[:28]}",
            status=IncentiveStatus.ACTIVE,
            source_hash=compute_source_hash(f"{title}|{summary}|{url}"),
            parse_confidence=ParseConfidence.MEDIUM,
            scraper_source=self.SOURCE_NAME,
        )

    def _mock_results(self) -> list[ScrapedIncentive]:
        return [
            ScrapedIncentive(
                title="Xcel Energy Cold-Climate Heat Pump Rebate (Minnesota)",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Minnesota",
                managing_agency="Xcel Energy (Minnesota CIP)",
                agency_acronym="Xcel MN",
                short_summary=(
                    "Rebates of up to $1,750 for Minnesota Xcel Energy customers installing "
                    "qualifying cold-climate air-source heat pumps. Among the largest "
                    "utility heat pump incentives in the upper Midwest, designed for MN's "
                    "harsh winter climate. Income-qualified rebates can reach $5,000. "
                    "Stackable with the federal §25C Energy Efficient Home Improvement Credit."
                ),
                detailed_summary=(
                    "Standard rebate amounts\n"
                    "• Cold-climate ducted ASHP (HSPF2 ≥ 8.5, COP at 5°F ≥ 1.75): $1,750\n"
                    "• Cold-climate ductless mini-split: $700-$1,400 depending on tonnage\n"
                    "• Variable-speed (inverter-driven) bonus: +$250\n\n"
                    "Income-qualified rebates (≤200% Federal Poverty Level)\n"
                    "• Cold-climate ducted ASHP: $5,000 (or 100% of cost, whichever less)\n"
                    "• Cold-climate ductless: $3,000\n"
                    "• Free install through Xcel Income-Qualified Weatherization (separate program)\n\n"
                    "Equipment requirements\n"
                    "All qualifying systems must:\n"
                    "• Appear on the NEEP Cold-Climate Air-Source Heat Pump Specification list\n"
                    "• HSPF2 ≥ 8.5 (Region IV — Minnesota)\n"
                    "• Capacity at 5°F ≥ 70% of nameplate\n"
                    "• COP at 5°F ≥ 1.75\n"
                    "• Be installed by an Xcel Trade Partner (find at xcelenergy.com)\n\n"
                    "Application timing\n"
                    "Submit within 60 days of installation. Rebate processed in 4-8 weeks. "
                    "Online instant-rebate option available through Xcel Energy's Marketplace.\n\n"
                    "Stacking opportunities (typical $14,000 ducted heat pump install)\n"
                    "• Xcel Energy MN rebate (standard): $1,750\n"
                    "• Federal §25C Energy Efficient Home Improvement Credit: 30% up to $2,000\n"
                    "• Federal HEEHRA (income-qualified, post-launch in MN): up to $8,000\n"
                    "• MN Department of Commerce Heat Pump Tax Credit (pending legislation): TBD\n"
                    "Total potential incentives: $3,750 (standard income) to $10,000+ (income-qualified)"
                ),
                key_requirements=[
                    "Must be a residential Xcel Energy electric customer in Minnesota",
                    "Equipment must be NEEP-listed cold-climate ASHP (HSPF2 ≥ 8.5)",
                    "Must use an Xcel Trade Partner contractor",
                    "Apply within 60 days of installation",
                    "Income-qualified rebates (≤200% FPL) up to $5,000 — separate application",
                ],
                industry_categories=["Energy Management"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=5000,
                source_url="https://www.xcelenergy.com/programs/residential/heating_and_cooling/heat_pump_rebates_mn",
                program_code="MN-XCEL-CCHP",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Minnesota Solar Rewards (Xcel Energy)",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Minnesota",
                managing_agency="Xcel Energy (Minnesota CIP)",
                agency_acronym="Xcel MN",
                short_summary=(
                    "Production-based incentive paid quarterly for residential solar PV "
                    "installed by Xcel Energy customers in Minnesota. Pays $0.07 per kWh "
                    "produced for the first 10 years of system operation. Eligible systems "
                    "must be 1-40 kW DC. Stackable with the federal §25D Residential Clean "
                    "Energy Credit. Lifetime value typically $5,000-$15,000 per system."
                ),
                detailed_summary=(
                    "Incentive structure\n"
                    "• Production-based: $0.07 per kWh of metered output\n"
                    "• Term: 10 years from system commissioning\n"
                    "• Paid quarterly (March, June, September, December)\n"
                    "• Payment direct to system owner via ACH or check\n\n"
                    "Lifetime value examples\n"
                    "• 5 kW DC system → ~6,500 kWh/yr → $455/yr → $4,550 over 10 years\n"
                    "• 10 kW DC system → ~13,000 kWh/yr → $910/yr → $9,100 over 10 years\n"
                    "• 20 kW DC system → ~26,000 kWh/yr → $1,820/yr → $18,200 over 10 years\n\n"
                    "Eligibility\n"
                    "• Must be a residential or small commercial Xcel Energy MN customer\n"
                    "• System size: 1-40 kW DC (residential typically 4-12 kW)\n"
                    "• System must be grid-connected (interconnection agreement signed)\n"
                    "• System must use new equipment (not used or refurbished)\n"
                    "• Must be installed by an Xcel-approved Solar Installer\n"
                    "• Inverter must have a UL 1741 certification + production meter\n\n"
                    "Application + funding\n"
                    "• Apply at xcelenergy.com/programs/residential/solar_rewards\n"
                    "• Application before installation (pre-approval)\n"
                    "• Annual program budget allocates capacity by service territory\n"
                    "• Currently oversubscribed — wait list typical, monitor for new cycles\n\n"
                    "Stacking with federal credits (typical $20,000 8 kW install)\n"
                    "• Federal §25D Residential Clean Energy Credit: 30% = $6,000\n"
                    "• MN Solar Rewards (10-yr production payments): ~$7,300 over 10 years\n"
                    "• MN net metering credits (ongoing, no expiration): $400-$800/yr\n"
                    "• Total NPV vs. doing nothing: $13,000-$15,000 first 10 years"
                ),
                key_requirements=[
                    "Must be a residential or small commercial Xcel Energy MN customer",
                    "System size: 1-40 kW DC, grid-connected, new equipment only",
                    "Must use an Xcel-approved Solar Installer",
                    "Pre-approval required before installation begins",
                    "Production-based payment of $0.07/kWh for 10 years",
                ],
                industry_categories=["Clean Technology"],
                incentive_type=IncentiveType.SUBSIDY,
                source_url="https://www.xcelenergy.com/programs/residential/solar_rewards",
                program_code="MN-XCEL-SOLAR-REWARDS",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Minnesota Electric Vehicle Rebate Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Minnesota",
                managing_agency="Minnesota Department of Commerce",
                agency_acronym="MN DOC",
                short_summary=(
                    "Provides rebates of up to $2,500 to Minnesota residents purchasing or "
                    "leasing new and used electric vehicles. Income-qualified buyers (≤300% "
                    "Federal Poverty Level) receive an additional $1,000 bonus. Funded by "
                    "Minnesota state appropriations beginning 2024. Applications submitted "
                    "post-purchase to MN DOC. Stackable with federal §30D and §25E credits."
                ),
                detailed_summary=(
                    "Rebate amounts\n"
                    "Standard income:\n"
                    "• New BEV/PHEV: $2,500\n"
                    "• Used BEV/PHEV: $600 (used vehicle must be ≥2 model years old)\n\n"
                    "Income-qualified bonus (≤300% Federal Poverty Level):\n"
                    "• Additional $1,000 on new EV (total $3,500)\n"
                    "• Additional $400 on used EV (total $1,000)\n\n"
                    "MSRP / price caps\n"
                    "• New BEV/PHEV: MSRP ≤ $55,000\n"
                    "• Used BEV/PHEV: sale price ≤ $25,000\n\n"
                    "Eligibility\n"
                    "• Minnesota resident at time of purchase or lease\n"
                    "• Vehicle titled, registered, and primarily operated in Minnesota\n"
                    "• Vehicle purchased from a licensed Minnesota dealer\n"
                    "• Lease term ≥ 36 months (for lease eligibility)\n\n"
                    "Application process\n"
                    "1. Purchase or lease qualifying EV from a Minnesota dealer\n"
                    "2. Submit application to MN DOC within 90 days of purchase\n"
                    "3. Required: bill of sale, vehicle registration, income docs (if claiming bonus)\n"
                    "4. Rebate processed in 8-12 weeks; paid by check or ACH\n\n"
                    "Stacking with federal credits (typical $40K new BEV, income-qualified)\n"
                    "• Minnesota state EV rebate: $3,500 (standard $2,500 + IQ bonus $1,000)\n"
                    "• Federal §30D Clean Vehicle Credit: $7,500 (via dealer point-of-sale transfer)\n"
                    "• Local utility EV charger rebate (Xcel/Connexus/etc.): $300-$500\n"
                    "• Federal §30C charger credit (for home install): up to $1,000\n"
                    "Total potential incentives: $11,300-$12,500 on a $40,000 BEV"
                ),
                key_requirements=[
                    "Minnesota resident at time of purchase or lease",
                    "New BEV/PHEV: MSRP ≤ $55K; used BEV/PHEV: ≤$25K, ≥2 model years old",
                    "Vehicle titled, registered, and primarily operated in Minnesota",
                    "Purchased from a licensed Minnesota dealer (lease ≥36 months)",
                    "Income-qualified (≤300% FPL): $1,000 bonus stackable",
                ],
                industry_categories=["EV Charging", "Clean Technology"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=3500,
                source_url="https://mn.gov/commerce/energy/transportation/ev-rebates/",
                program_code="MN-DOC-EV-REBATE",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Minnesota Solar on Public Buildings Grant Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Minnesota",
                managing_agency="Minnesota Department of Commerce",
                agency_acronym="MN DOC",
                short_summary=(
                    "Competitive grants of up to $250,000 per project for Minnesota local "
                    "governments, schools, tribal governments, and 501(c)(3) nonprofits to "
                    "install solar PV on public buildings. Cost-share up to 70% with "
                    "priority for environmental justice areas, Tribal lands, and rural "
                    "communities. Stackable with federal §48 Direct Pay ITC for tax-exempts."
                ),
                detailed_summary=(
                    "Award structure\n"
                    "• Per-project cap: $250,000 (typical award $80K-$200K)\n"
                    "• Cost-share: up to 70% of eligible project costs (higher for EJ areas)\n"
                    "• Annual program budget: $5M-$8M depending on appropriation\n"
                    "• Cycles: 1-2 RFPs per year\n\n"
                    "Eligible applicants\n"
                    "• Minnesota cities, counties, townships\n"
                    "• School districts (K-12) and charter schools\n"
                    "• Higher education (community colleges, MnSCU, U of MN)\n"
                    "• Tribal governments\n"
                    "• 501(c)(3) nonprofits with Minnesota service area\n"
                    "• Public hospitals and healthcare facilities\n\n"
                    "Eligible projects\n"
                    "• Rooftop solar PV (most common)\n"
                    "• Ground-mount solar on owned land\n"
                    "• Solar canopy / parking-lot solar\n"
                    "• Battery storage paired with solar (limited availability)\n\n"
                    "Priority scoring\n"
                    "1. Located in Environmental Justice areas (per MPCA EJ mapping)\n"
                    "2. Tribal lands and reservations\n"
                    "3. Rural communities (population < 10,000)\n"
                    "4. Schools serving high-poverty student populations\n"
                    "5. Apprenticeship program use (registered apprenticeship preferred)\n"
                    "6. Cost-effectiveness ($/kW awarded)\n\n"
                    "Stacking strategy (typical $200K rooftop solar on a small school)\n"
                    "• MN Solar on Public Buildings grant: $140,000 (70%)\n"
                    "• Federal §48 Direct Pay ITC (IRA elective payment): 30% = $60K\n"
                    "• Federal §48 domestic content adder: +10% = $20K\n"
                    "• Federal §48 low-income community adder (if eligible): +20% = $40K\n"
                    "• Federal §48 energy community adder (if eligible): +10% = $20K\n"
                    "School covers $0-$20K out of pocket on a $200K project."
                ),
                key_requirements=[
                    "Minnesota local government, school, tribal government, or 501(c)(3) nonprofit",
                    "Project: solar PV on public buildings (rooftop, ground-mount, or canopy)",
                    "Cost-share: up to 70% of eligible costs, max $250K per project",
                    "Application during open RFP (1-2 cycles per year)",
                    "Federal §48 Direct Pay ITC stacking required to maximize coverage",
                ],
                industry_categories=["Clean Technology", "Government & Nonprofit"],
                incentive_type=IncentiveType.GRANT,
                funding_amount=250000,
                source_url="https://mn.gov/commerce/energy/funding-opportunities/solar-on-public-buildings/",
                program_code="MN-DOC-SOLAR-PUBLIC",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Minnesota Pre-Weatherization Program (Income-Qualified)",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Minnesota",
                managing_agency="Minnesota Department of Commerce",
                agency_acronym="MN DOC",
                short_summary=(
                    "Free home repairs that enable subsequent federal Weatherization "
                    "Assistance Program (WAP) installations to proceed. Covers roof "
                    "repairs, electrical fixes, mold remediation, asbestos abatement, "
                    "and other health/safety issues that would otherwise disqualify a "
                    "home from weatherization. Up to $15,000 per home. Households at or "
                    "below 60% State Median Income eligible."
                ),
                detailed_summary=(
                    "Why pre-weatherization matters\n"
                    "Federal WAP funds CAN'T be used for non-energy repairs (roofs, electrical, "
                    "mold, structural). But many low-income homes need these fixes BEFORE WAP "
                    "improvements can be safely installed. The MN Pre-Weatherization Program "
                    "fills this gap with up to $15,000 of state-funded health/safety repairs.\n\n"
                    "Eligibility\n"
                    "• Minnesota household at or below 60% State Median Income\n"
                    "• Home must be approved for WAP (or in WAP queue)\n"
                    "• Renters eligible with landlord written approval\n"
                    "• Household typically working with a Community Action Agency (CAA)\n\n"
                    "Income limits (60% MN SMI, 2024)\n"
                    "• 1 person: $32,265 / year\n"
                    "• 2 persons: $42,193 / year\n"
                    "• 4 persons: $62,049 / year\n\n"
                    "Eligible repairs (up to $15,000 per home)\n"
                    "• Roof repair or replacement (when leaks would damage new insulation)\n"
                    "• Electrical service upgrade (when needed for heat pump installation)\n"
                    "• Mold remediation\n"
                    "• Asbestos abatement (for areas being weatherized)\n"
                    "• Lead paint encapsulation in pre-1978 homes\n"
                    "• Structural repairs to enable insulation installation\n"
                    "• Foundation crack/sealing repairs\n"
                    "• Plumbing repairs to prevent water damage to new improvements\n"
                    "• Pest exclusion (rodents, termites) when needed\n\n"
                    "How to apply\n"
                    "Apply through your Community Action Agency (CAA) at the same time you "
                    "apply for WAP. The CAA energy auditor evaluates whether pre-weatherization "
                    "repairs are needed, then submits a combined application package.\n\n"
                    "Combined value with WAP (typical income-qualified household)\n"
                    "• Pre-Weatherization (state): $5,000-$15,000 in repairs\n"
                    "• Federal WAP weatherization: $7,500-$11,000 in upgrades (per main MN WAP)\n"
                    "• Total per-home investment: $12,500-$26,000\n"
                    "Typical energy bill savings of 25-40% post-completion."
                ),
                key_requirements=[
                    "Minnesota household at or below 60% State Median Income",
                    "Home must be approved for federal WAP (or in WAP queue)",
                    "Apply through your local Community Action Agency",
                    "Renters eligible with landlord written approval",
                    "Up to $15,000 in state-funded health/safety repairs that enable WAP",
                ],
                industry_categories=["Energy Management", "Government & Nonprofit"],
                incentive_type=IncentiveType.GRANT,
                funding_amount=15000,
                source_url="https://mn.gov/commerce/energy/consumer-help/help-with-bills/pre-weatherization/",
                program_code="MN-DOC-PRE-WAP",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
        ]
