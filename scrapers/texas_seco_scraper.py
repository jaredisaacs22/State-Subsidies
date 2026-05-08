"""
Texas State Energy Conservation Office (SECO) Scraper
======================================================
Scrapes the Texas State Energy Conservation Office program directory at:
  https://comptroller.texas.gov/programs/seco/

SECO is part of the Texas Comptroller's office and administers federal
formula funding (DOE State Energy Program, Weatherization Assistance,
EECBG) plus state programs like LoanSTAR (revolving loan fund), the
SmarTexas program (rebates), and oil overcharge funds. Texas is the
largest state in the country by energy consumption, making SECO one
of the highest-volume state energy offices.

Quality
-------
- STATE jurisdiction / Texas
- Mock mode: 5 realistic SECO fixtures (LoanSTAR, schools, ag, EV, solar)
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

BASE = "https://comptroller.texas.gov"
INDEX_URLS = [
    f"{BASE}/programs/seco/",
    f"{BASE}/programs/seco/funding/",
]

TYPE_CLUES: list[tuple[str, IncentiveType]] = [
    ("loanstar",    IncentiveType.LOAN),
    ("loan",        IncentiveType.LOAN),
    ("rebate",      IncentiveType.POINT_OF_SALE_REBATE),
    ("incentive",   IncentiveType.POINT_OF_SALE_REBATE),
    ("grant",       IncentiveType.GRANT),
    ("financing",   IncentiveType.LOAN),
    ("tax credit",  IncentiveType.TAX_CREDIT),
]

INDUSTRY_CLUES: list[tuple[str, str]] = [
    ("solar",       "Clean Technology"),
    ("renewable",   "Clean Technology"),
    ("wind",        "Clean Technology"),
    ("storage",     "Energy Storage"),
    ("electric veh","EV Charging"),
    ("ev ",         "EV Charging"),
    ("heat pump",   "Energy Management"),
    ("efficiency",  "Energy Management"),
    ("weatheriz",   "Energy Management"),
    ("hvac",        "Energy Management"),
    ("school",      "Government & Nonprofit"),
    ("agriculture", "Agriculture"),
    ("commercial",  "Technology"),
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


class TexasSECOScraper(BaseScraper):
    """Scrapes Texas SECO program listings."""

    SOURCE_NAME = "texas_seco"
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
                    if (href.startswith("/") or href.startswith(BASE)) and "/seco/" in href and len(href) > 3:
                        full = href if href.startswith("http") else f"{BASE}{href}"
                        if full not in all_links and full not in INDEX_URLS:
                            all_links.append(full)
            except Exception as e:
                self._log.debug("seco index failed", url=index_url, error=str(e))

        results: list[ScrapedIncentive] = []
        for url in all_links[: self.max_programs]:
            try:
                inc = self._scrape_detail(url)
                if inc:
                    results.append(inc)
            except Exception as e:
                self._log.debug("seco detail failed", url=url, error=str(e))

        self._log.info("seco scraped", links=len(all_links), kept=len(results))
        return results

    def _scrape_detail(self, url: str) -> Optional[ScrapedIncentive]:
        html = self.fetch(url)
        soup = self.parse(html)

        title = self.extract_text(soup, "h1") or self.extract_text(soup, "h2")
        if len(title) < 5:
            return None

        summary = ""
        for sel in [".main-content", "main", "#main", "article"]:
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
            jurisdiction_name="Texas",
            managing_agency="Texas State Energy Conservation Office",
            agency_acronym="SECO",
            short_summary=summary[:1500],
            key_requirements=["See program website for full eligibility details"],
            industry_categories=_infer_industries(title, summary),
            incentive_type=_infer_type(title, summary),
            source_url=url,
            program_code=f"SECO-{re.sub(r'[^a-z0-9]', '-', title.lower())[:28]}",
            status=IncentiveStatus.ACTIVE,
            source_hash=compute_source_hash(f"{title}|{summary}|{url}"),
            parse_confidence=ParseConfidence.MEDIUM,
            scraper_source=self.SOURCE_NAME,
        )

    def _mock_results(self) -> list[ScrapedIncentive]:
        return [
            ScrapedIncentive(
                title="Texas LoanSTAR Revolving Loan Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Texas",
                managing_agency="Texas State Energy Conservation Office",
                agency_acronym="SECO",
                short_summary=(
                    "LoanSTAR (Loans to Save Taxes And Resources) is the longest-running "
                    "state-managed energy retrofit revolving loan program in the U.S., "
                    "providing low-interest loans to Texas state agencies, public schools, "
                    "colleges, and local governments for energy and water cost-saving "
                    "projects. Loans are repaid from documented utility savings within "
                    "10 years. Over $600 million has been loaned since 1988."
                ),
                detailed_summary=(
                    "How LoanSTAR works\n"
                    "LoanSTAR is structured as a revolving loan fund: as projects repay their "
                    "loans (from utility cost savings), the dollars become available to fund "
                    "new projects. The fund recycles capital indefinitely without requiring "
                    "ongoing legislative appropriations. Since launch in 1988, the program "
                    "has financed over $600 million in projects with an average payback "
                    "period under 4 years.\n\n"
                    "Eligible borrowers\n"
                    "• State agencies\n"
                    "• Public school districts (K-12)\n"
                    "• Public colleges and universities\n"
                    "• Counties, cities, and special-purpose districts\n"
                    "• Hospital districts and other political subdivisions\n"
                    "Private entities and 501(c)(3) nonprofits are NOT eligible.\n\n"
                    "Loan terms\n"
                    "• Interest rate: typically 2.0-3.0% (well below market)\n"
                    "• Maximum term: 10 years (must amortize within projected savings)\n"
                    "• Minimum loan: $50,000\n"
                    "• Maximum loan: $5,000,000 per project (larger amounts case-by-case)\n"
                    "• No fees or origination costs\n\n"
                    "Eligible projects\n"
                    "• Lighting upgrades (LED retrofits, occupancy sensors, daylighting controls)\n"
                    "• HVAC system replacement and optimization\n"
                    "• Building envelope improvements (insulation, windows, weatherstripping)\n"
                    "• Boiler and chiller replacement\n"
                    "• Building automation and controls\n"
                    "• Water conservation (low-flow fixtures, irrigation upgrades)\n"
                    "• On-site renewable energy (solar PV, solar thermal)\n"
                    "• Energy management software and metering\n\n"
                    "Application process\n"
                    "1. Free preliminary energy audit by a SECO-approved engineer\n"
                    "2. Detailed engineering analysis with savings estimates and payback\n"
                    "3. Loan application reviewed by SECO and Comptroller's office\n"
                    "4. Loan approved; project bid and constructed by borrower's procurement process\n"
                    "5. Repayment from documented utility savings (M&V required for projects > $500K)"
                ),
                key_requirements=[
                    "Must be a Texas public entity (state agency, school district, college, county, city)",
                    "Project must achieve documented utility cost savings",
                    "Loan must amortize within 10 years from projected savings",
                    "Minimum loan: $50,000; maximum: $5 million per project",
                    "M&V (Measurement & Verification) required for projects over $500,000",
                ],
                industry_categories=["Energy Management", "Government & Nonprofit"],
                incentive_type=IncentiveType.LOAN,
                funding_amount=5000000,
                source_url="https://comptroller.texas.gov/programs/seco/funding/loanstar/",
                program_code="SECO-LOANSTAR",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Texas SECO — Schools/Local Governments Energy Efficiency Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Texas",
                managing_agency="Texas State Energy Conservation Office",
                agency_acronym="SECO",
                short_summary=(
                    "Provides technical assistance, energy audits, and limited grant funding "
                    "to Texas school districts and local governments for energy efficiency "
                    "projects. Free Level 2 ASHRAE energy audits for facilities >100,000 sq ft. "
                    "Engineering studies and project scoping support available. Supplements "
                    "LoanSTAR loans with grant funding from federal State Energy Program (SEP) "
                    "formula awards."
                ),
                detailed_summary=(
                    "What's offered\n"
                    "• Free Level 2 ASHRAE energy audits for facilities >100,000 sq ft\n"
                    "• Walk-through assessments for smaller facilities (<100K sq ft)\n"
                    "• Engineering scoping support for major retrofit projects\n"
                    "• Technical training and capacity-building for facility managers\n"
                    "• Limited grant funding (typically $25K-$200K) to bridge LoanSTAR gaps\n\n"
                    "Eligible recipients\n"
                    "• Texas independent school districts (ISDs)\n"
                    "• Charter schools (limited eligibility)\n"
                    "• Counties, cities, and incorporated municipalities\n"
                    "• Special districts (water, hospital, utility)\n"
                    "• Junior colleges and community college districts\n\n"
                    "Priority sectors\n"
                    "Funding priority is given to:\n"
                    "1. Rural and small-population school districts (high need, limited engineering capacity)\n"
                    "2. Districts/governments with documented high energy intensity (kWh/sq ft above state average)\n"
                    "3. Projects that combine LoanSTAR financing with grant funds for non-financeable measures (e.g., commissioning, training)\n"
                    "4. Projects with strong educational/training component (e.g., student-facing energy programs)\n\n"
                    "How to apply\n"
                    "Contact SECO directly via the Schools/Local Government program manager. "
                    "There is no fixed application cycle for technical assistance — services are "
                    "delivered on a rolling basis. Grant components are typically tied to "
                    "annual SEP funding cycles announced each spring."
                ),
                key_requirements=[
                    "Texas public school district, local government, or special district",
                    "Facility energy use must demonstrate baseline above SECO threshold",
                    "Must commit to project implementation if recommendations identify cost-effective measures",
                    "Grant funding requires match or LoanSTAR pairing (program-dependent)",
                    "Larger awards prioritize rural/high-need entities",
                ],
                industry_categories=["Energy Management", "Government & Nonprofit"],
                incentive_type=IncentiveType.GRANT,
                funding_amount=200000,
                source_url="https://comptroller.texas.gov/programs/seco/programs/schools-local-gov/",
                program_code="SECO-SCHOOLS-LOCAL",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Texas SECO — Texas Agricultural Energy Audit Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Texas",
                managing_agency="Texas State Energy Conservation Office",
                agency_acronym="SECO",
                short_summary=(
                    "Free agricultural energy audits and technical assistance for Texas "
                    "farms, ranches, and food processing facilities. SECO partners with "
                    "Texas A&M AgriLife Extension to deliver pump efficiency tests, "
                    "irrigation audits, and process improvement assessments. Audit findings "
                    "can support USDA REAP grant applications, providing the required "
                    "energy assessment documentation."
                ),
                detailed_summary=(
                    "Services offered\n"
                    "• Free irrigation pump efficiency tests (typically a $400-800 value)\n"
                    "• Whole-farm energy audits for operations with annual energy spend >$25,000\n"
                    "• Process improvement assessments for food processors and dairy operations\n"
                    "• Technical writing support for federal grant applications (REAP, EQIP, "
                    "Section 9007)\n"
                    "• Equipment specification review for major capital purchases\n\n"
                    "Connection to USDA REAP grants\n"
                    "The federal USDA Rural Energy for America Program (REAP) requires an "
                    "energy assessment as part of a complete application. SECO's audit "
                    "deliverable is structured to satisfy the REAP energy assessment "
                    "requirement, saving applicants $1,500-$3,000 they would otherwise "
                    "spend on a private consultant.\n\n"
                    "Common audit findings\n"
                    "• Irrigation pumping: VFD installation, pump replacement, system rebalancing — typical 15-30% energy savings\n"
                    "• Dairy operations: variable-speed milk pumps, plate coolers, refrigeration heat recovery — typical 20-40% savings\n"
                    "• Cotton/grain dryers: combustion tuning, recirculation upgrades, controls — typical 10-25% savings\n"
                    "• Greenhouses: energy curtains, LED grow lights, boiler optimization — typical 15-35% savings\n"
                    "• On-site solar PV opportunities for offset of high-load operations\n\n"
                    "How to request an audit\n"
                    "Contact your local Texas A&M AgriLife Extension county agent or apply "
                    "directly via SECO's agriculture program page. Wait time typically 30-90 "
                    "days depending on regional demand."
                ),
                key_requirements=[
                    "Must be a Texas-based agricultural producer or food processor",
                    "Operation should have annual energy spend > $25,000 (lower thresholds for irrigation-only audits)",
                    "Must allow site visit and equipment access for audit team",
                    "Audit findings can be used to support USDA REAP applications",
                    "Free service — no cost to participating producers",
                ],
                industry_categories=["Agriculture", "Energy Management"],
                incentive_type=IncentiveType.GRANT,
                source_url="https://comptroller.texas.gov/programs/seco/programs/agriculture/",
                program_code="SECO-AG-AUDIT",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Texas Light-Duty Motor Vehicle Purchase or Lease Incentive (TxVEMP)",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Texas",
                managing_agency="Texas Commission on Environmental Quality",
                agency_acronym="TCEQ",
                short_summary=(
                    "Provides $2,500 rebates to Texas residents for the purchase or lease of "
                    "a new qualifying alternative fuel vehicle. Eligible vehicles include "
                    "battery electric, hydrogen fuel cell, plug-in hybrid, and natural gas "
                    "vehicles. Funded through Volkswagen settlement and Texas Emissions "
                    "Reduction Plan (TERP). 1,000+ rebates issued per program cycle, available "
                    "first-come, first-served while funds last."
                ),
                detailed_summary=(
                    "Eligible vehicles\n"
                    "• Battery electric vehicles (BEVs)\n"
                    "• Hydrogen fuel cell vehicles (FCEVs)\n"
                    "• Plug-in hybrid electric vehicles (PHEVs)\n"
                    "• Compressed natural gas (CNG) vehicles\n"
                    "• Liquefied petroleum gas (propane) vehicles\n"
                    "Vehicle must be new (not used). Lease term must be at least 36 months.\n\n"
                    "Rebate amounts\n"
                    "• $2,500 for BEV/FCEV/PHEV\n"
                    "• $2,500 for CNG/propane vehicles\n"
                    "Limited to one rebate per individual or household per program cycle.\n\n"
                    "Eligibility\n"
                    "• Vehicle must be purchased from a licensed Texas dealer\n"
                    "• Vehicle must be titled and registered in Texas\n"
                    "• Vehicle must be primarily operated in Texas\n"
                    "• No income limit\n"
                    "• MSRP cap is generally $45,000 for sedans, higher for trucks/SUVs (varies by program cycle)\n\n"
                    "Stacking with federal credits\n"
                    "Fully stackable with the federal §30D Clean Vehicle Tax Credit (up to $7,500). "
                    "Combined with Texas TxVEMP rebate, total potential incentive is $10,000 on "
                    "a qualifying new BEV.\n\n"
                    "Application timing\n"
                    "Apply within 30 days of vehicle purchase via TCEQ's online portal. "
                    "Rebates are first-come, first-served — once the program's annual budget "
                    "($8-15 million typical) is exhausted, applications are queued for the "
                    "next funding cycle. Texas typically opens 1-2 new cycles per year."
                ),
                key_requirements=[
                    "Must be a Texas resident at time of purchase or lease",
                    "Vehicle must be new BEV, FCEV, PHEV, CNG, or propane vehicle",
                    "Vehicle must be purchased/leased from a licensed Texas dealer",
                    "Vehicle must be titled, registered, and primarily operated in Texas",
                    "Application submitted within 30 days of purchase via TCEQ portal",
                ],
                industry_categories=["EV Charging", "Clean Technology"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=2500,
                source_url="https://www.tceq.texas.gov/airquality/terp/ld_purchase.html",
                program_code="TCEQ-TXVEMP",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Texas Solar Property Tax Exemption",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Texas",
                managing_agency="Texas Comptroller of Public Accounts",
                agency_acronym="TX Comptroller",
                short_summary=(
                    "Texas property owners who install solar PV, solar water heating, wind, "
                    "or other renewable energy systems are entitled to a 100% property tax "
                    "exemption on the value added by the system. The exemption applies to "
                    "both residential and commercial properties and is granted automatically "
                    "if the property's taxing authority recognizes it. Saves homeowners "
                    "$1,500-$3,000+ over the life of a typical solar system."
                ),
                detailed_summary=(
                    "How the exemption works\n"
                    "Texas Tax Code §11.27 grants a 100% exemption from ad valorem (property) "
                    "tax on the appraised value of:\n"
                    "• Solar photovoltaic (PV) systems\n"
                    "• Solar thermal/water heating systems\n"
                    "• Wind-powered energy devices\n"
                    "• Anaerobic digesters\n"
                    "• Geothermal energy systems\n"
                    "The exemption applies in perpetuity for the life of the system. Without "
                    "this exemption, a $30,000 solar installation would typically add ~$30,000 "
                    "to the property's appraised value, increasing annual property taxes by "
                    "$600-900 (depending on local tax rates).\n\n"
                    "How to claim\n"
                    "1. After installation, file Form 50-123 (Application for Exemption of "
                    "Solar or Wind-Powered Energy Devices) with your county appraisal district\n"
                    "2. Filing deadline: April 30 of the tax year (extends through the next "
                    "May 1 if installation occurred late in the prior year)\n"
                    "3. Once approved, the exemption renews automatically each year unless "
                    "the system is removed or the property is sold\n"
                    "4. New owners must re-apply within 30 days of taking title\n\n"
                    "Combined value with other Texas incentives\n"
                    "• Federal §25D Residential Clean Energy Credit: 30% of system cost\n"
                    "• Texas Property Tax Exemption (this program): saves ~$600-900/year for "
                    "20-25 years = $12,000-$22,500 lifetime savings on a $30,000 system\n"
                    "• Local utility rebates (varies — Austin Energy, CPS Energy, Oncor, etc. "
                    "offer additional $1,000-$2,500 rebates)\n\n"
                    "Note for commercial owners\n"
                    "The exemption is particularly valuable for commercial and industrial "
                    "solar installations where system value can reach $1M+. Combined with "
                    "MACRS depreciation, federal §48 Investment Tax Credit, and potential "
                    "USDA REAP grants, total incentive value can exceed 60-70% of project cost."
                ),
                key_requirements=[
                    "Must own Texas residential or commercial property with installed renewable system",
                    "Eligible technologies: solar PV, solar thermal, wind, geothermal, anaerobic digesters",
                    "File Texas Comptroller Form 50-123 with county appraisal district",
                    "Filing deadline: April 30 (or May 1 if installed late in prior tax year)",
                    "Exemption renews automatically until system is removed or property sold",
                ],
                industry_categories=["Clean Technology", "Real Estate"],
                incentive_type=IncentiveType.TAX_CREDIT,
                source_url="https://comptroller.texas.gov/taxes/property-tax/exemptions/solar-wind.php",
                program_code="TX-SOLAR-PROP-TAX-EXEMPT",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
        ]
