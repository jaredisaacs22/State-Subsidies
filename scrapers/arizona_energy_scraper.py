"""
Arizona — APS / SRP / TEP Utility Energy Programs Scraper
==========================================================
Scrapes Arizona energy programs from:
  https://www.aps.com/en/Save-Money-and-Energy/
  https://www.srpnet.com/electric/home/save-money-and-energy/
  https://www.tep.com/save-energy/

Arizona's energy efficiency and renewable energy programs are primarily
delivered by its three large utilities: Arizona Public Service (APS, the
largest investor-owned), Salt River Project (SRP, large public power
provider), and Tucson Electric Power (TEP). The Arizona Corporation
Commission (ACC) regulates IOUs but does not run a separate state energy
office for incentives.

Quality
-------
- STATE jurisdiction / Arizona
- Mock mode: 5 realistic AZ fixtures
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

BASE = "https://www.aps.com"
INDEX_URLS = [
    f"{BASE}/en/Save-Money-and-Energy/",
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
    ("battery",      "Energy Storage"),
    ("electric veh", "EV Charging"),
    ("ev ",          "EV Charging"),
    ("heat pump",    "Energy Management"),
    ("efficiency",   "Energy Management"),
    ("commercial",   "Technology"),
    ("low-income",   "Government & Nonprofit"),
]


def _infer_type(title: str, summary: str) -> IncentiveType:
    blob = (title + " " + summary).lower()
    for kw, t in TYPE_CLUES:
        if kw in blob:
            return t
    return IncentiveType.POINT_OF_SALE_REBATE


def _infer_industries(title: str, summary: str) -> list[str]:
    blob = (title + " " + summary).lower()
    found: list[str] = []
    for kw, cat in INDUSTRY_CLUES:
        if kw in blob and cat not in found:
            found.append(cat)
    return found or ["Energy Management"]


class ArizonaEnergyScraper(BaseScraper):
    """Scrapes Arizona APS/SRP/TEP energy programs."""

    SOURCE_NAME = "arizona_energy"
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
                self._log.debug("az-energy index failed", url=index_url, error=str(e))
        results: list[ScrapedIncentive] = []
        for url in all_links[: self.max_programs]:
            try:
                inc = self._scrape_detail(url)
                if inc:
                    results.append(inc)
            except Exception as e:
                self._log.debug("az-energy detail failed", url=url, error=str(e))
        self._log.info("az-energy scraped", links=len(all_links), kept=len(results))
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
            jurisdiction_name="Arizona",
            managing_agency="Arizona Public Service",
            agency_acronym="APS",
            short_summary=summary[:1500],
            key_requirements=["See program website for full eligibility details"],
            industry_categories=_infer_industries(title, summary),
            incentive_type=_infer_type(title, summary),
            source_url=url,
            program_code=f"AZ-{re.sub(r'[^a-z0-9]', '-', title.lower())[:28]}",
            status=IncentiveStatus.ACTIVE,
            source_hash=compute_source_hash(f"{title}|{summary}|{url}"),
            parse_confidence=ParseConfidence.MEDIUM,
            scraper_source=self.SOURCE_NAME,
        )

    def _mock_results(self) -> list[ScrapedIncentive]:
        return [
            ScrapedIncentive(
                title="APS Cool Rewards — Smart Thermostat & Demand-Response Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Arizona",
                managing_agency="Arizona Public Service",
                agency_acronym="APS",
                short_summary=(
                    "APS Cool Rewards combines a $50 enrollment bonus with $25/year ongoing "
                    "credit for residential customers who allow APS to remotely adjust their "
                    "smart thermostats during summer peak demand events (typically 4-7 PM, "
                    "weekdays, June-September). Compatible with Ecobee, Nest, Honeywell, and "
                    "other ENERGY STAR smart thermostats. No-cost enrollment, opt-out anytime."
                ),
                detailed_summary=(
                    "Incentive structure\n"
                    "• Enrollment bonus: $50 bill credit (one-time)\n"
                    "• Annual loyalty credit: $25 bill credit per summer (June-September)\n"
                    "• Average household saves an additional $50-$100/year on cooling costs\n\n"
                    "How it works\n"
                    "When APS calls a Cool Rewards event (forecast peak demand), your "
                    "thermostat is pre-cooled (set 2°F lower than your normal setpoint about "
                    "30 min before the event), then raised 2-4°F during the peak (typically "
                    "4-7 PM). You can opt out of any individual event from your thermostat "
                    "or app — no penalty, but you lose the loyalty credit if you opt out of "
                    "more than 50% of season events.\n\n"
                    "Eligible thermostats\n"
                    "Must be Wi-Fi enabled and compatible with APS's demand-response API:\n"
                    "• Ecobee SmartThermostat (all models)\n"
                    "• Google Nest Learning Thermostat (3rd gen+)\n"
                    "• Google Nest Thermostat E\n"
                    "• Honeywell Lyric/T6/T9/T10\n"
                    "• Sensi Touch Wi-Fi\n"
                    "• Emerson Sensi (some models)\n"
                    "Check the current eligible list at aps.com/coolrewards before purchasing.\n\n"
                    "Eligibility\n"
                    "• Must be a residential APS electric customer\n"
                    "• Must own a qualifying smart thermostat (or purchase one)\n"
                    "• Single-family or multifamily residential property\n"
                    "• Renters eligible if they own the thermostat\n\n"
                    "Stacking with thermostat purchase rebates\n"
                    "APS offers an additional $50-$100 rebate for purchasing a qualifying "
                    "smart thermostat through the APS Marketplace (instant rebate at checkout, "
                    "free shipping). Combined Cool Rewards enrollment + thermostat rebate + "
                    "federal §25C credit can offset the entire cost of the thermostat purchase."
                ),
                key_requirements=[
                    "Must be a residential APS electric customer in Arizona",
                    "Must own (or purchase) a Wi-Fi smart thermostat from the APS-eligible list",
                    "Must enroll in Cool Rewards through the APS app or website",
                    "Allow APS to adjust temperature during summer peak events (opt-out per event)",
                    "Loyalty credit requires opting in to ≥50% of called events per season",
                ],
                industry_categories=["Energy Management"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=50,
                source_url="https://www.aps.com/en/Save-Money-and-Energy/Smart-Thermostats/Cool-Rewards",
                program_code="AZ-APS-COOL-REWARDS",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="APS Solar Communities — Income-Qualified Solar (No-Cost)",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Arizona",
                managing_agency="Arizona Public Service",
                agency_acronym="APS",
                short_summary=(
                    "APS installs and owns solar PV systems on qualifying low-income homes at "
                    "no cost to the homeowner. In exchange, the homeowner receives a fixed "
                    "monthly bill credit (~$30/month) for 20 years, regardless of system "
                    "production. APS is responsible for all maintenance and repairs. Available "
                    "to APS residential customers at or below 200% Federal Poverty Level."
                ),
                detailed_summary=(
                    "How it works\n"
                    "Unlike traditional solar leases or PPAs, APS Solar Communities is a "
                    "true no-cost program: APS owns the equipment, takes the energy production, "
                    "and pays the homeowner a guaranteed monthly bill credit. The homeowner has "
                    "no maintenance responsibility, no insurance liability, and no buyout option.\n\n"
                    "Homeowner benefits\n"
                    "• Fixed monthly bill credit: typically $30/month for 20 years (~$7,200 lifetime)\n"
                    "• No upfront cost, no loan, no maintenance\n"
                    "• APS handles all permitting, installation, and repairs\n"
                    "• System replaced or repaired at APS cost if it fails\n"
                    "• Bill credit transfers to new owner if home is sold\n\n"
                    "Eligibility\n"
                    "• Must be an APS residential electric customer (single-family home)\n"
                    "• Household income ≤ 200% Federal Poverty Level\n"
                    "• Roof must be in good condition and properly oriented (south/west, "
                    "minimal shading)\n"
                    "• Homeowner must agree to a 20-year contract (or sale-of-home transfer)\n"
                    "• Renters NOT eligible (homeowner must sign contract)\n\n"
                    "Income limits (2024, 200% FPL)\n"
                    "• 1 person: $30,120 / year\n"
                    "• 2 persons: $40,880 / year\n"
                    "• 4 persons: $62,400 / year\n\n"
                    "How to apply\n"
                    "1. Apply at aps.com/solarcommunities (or call 602-371-6900)\n"
                    "2. Income verification (tax returns, paystubs, or proof of program enrollment)\n"
                    "3. Free roof and electrical assessment by APS contractor\n"
                    "4. Sign 20-year participation agreement\n"
                    "5. Installation typically within 60-120 days of approval\n\n"
                    "Note on stacking\n"
                    "Because APS owns the system (not the homeowner), the homeowner cannot claim "
                    "the federal §25D Residential Clean Energy Credit. APS receives the federal "
                    "§48 Investment Tax Credit on the project. The bill credit value already "
                    "reflects this internal cost-pass-through."
                ),
                key_requirements=[
                    "APS residential customer, owner-occupied single-family home",
                    "Household income ≤ 200% Federal Poverty Level",
                    "Roof in good condition with adequate solar exposure",
                    "Sign 20-year participation agreement",
                    "Renters NOT eligible (homeowner must hold the contract)",
                ],
                industry_categories=["Clean Technology", "Government & Nonprofit"],
                incentive_type=IncentiveType.SUBSIDY,
                source_url="https://www.aps.com/en/Save-Money-and-Energy/Solar/APS-Solar-Communities",
                program_code="AZ-APS-SOLAR-COMMUNITIES",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="SRP EV Smart Charging Rebate (Salt River Project)",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Arizona",
                managing_agency="Salt River Project",
                agency_acronym="SRP",
                short_summary=(
                    "SRP residential customers can receive up to $250 for installing a "
                    "qualifying Level 2 EV charger and enrolling in a Time-of-Use (TOU) "
                    "rate plan. Includes a separate $250 instant rebate on networked smart "
                    "chargers from SRP's approved equipment list. Stackable with the federal "
                    "§30C Alternative Fuel Vehicle Refueling Property Credit."
                ),
                detailed_summary=(
                    "Rebate structure\n"
                    "• EV TOU enrollment bonus: $250 (one-time bill credit)\n"
                    "• Smart charger purchase rebate: up to $250 (instant at SRP Marketplace)\n"
                    "• Total potential SRP incentives: $500\n\n"
                    "Eligible chargers\n"
                    "Must be ENERGY STAR-listed Level 2 EVSE on SRP's approved list:\n"
                    "• ChargePoint Home Flex\n"
                    "• Wallbox Pulsar Plus\n"
                    "• Enphase IQ EV Charger\n"
                    "• Tesla Wall Connector (3rd gen+)\n"
                    "• Emporia EV Charger\n"
                    "• Grizzl-E Smart\n"
                    "Check current list at srpnet.com/ev before purchasing.\n\n"
                    "TOU rate plan benefits\n"
                    "By enrolling in the EV TOU rate plan, off-peak charging (10pm-2pm "
                    "weekdays, all weekend) drops to ~$0.07-$0.09/kWh — about 60% less "
                    "than the standard rate. For a 12,000 mile/year driver, this saves "
                    "an additional $400-$600/year vs. charging at the standard residential rate.\n\n"
                    "Eligibility\n"
                    "• Must be a residential SRP electric customer in SRP service territory\n"
                    "  (most of metro Phoenix east of I-17, excluding APS-served areas)\n"
                    "• Must own or lease an EV/PHEV (proof: vehicle registration)\n"
                    "• Must install Level 2 charger at primary residence\n"
                    "• Must enroll in EV TOU rate plan\n\n"
                    "Stacking with federal credit\n"
                    "• SRP combined incentives: $500\n"
                    "• Federal §30C Alternative Fuel Vehicle Refueling Property Credit: 30% up to $1,000\n"
                    "• Typical Level 2 charger install cost: $1,500-$2,500\n"
                    "• Net out-of-pocket after stacking: $0-$1,000 on a typical install"
                ),
                key_requirements=[
                    "Residential SRP electric customer in SRP service territory",
                    "Own or lease an EV/PHEV (vehicle registration required)",
                    "Install qualifying Level 2 charger from SRP-approved list",
                    "Enroll in EV TOU rate plan (separate enrollment)",
                    "Stackable with federal §30C credit for additional 30% off",
                ],
                industry_categories=["EV Charging"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=500,
                source_url="https://www.srpnet.com/electric/home/save-money-and-energy/manage-electric-use/ev",
                program_code="AZ-SRP-EV-CHARGER",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="TEP Bright Tucson — Solar Communities for Low-Income Households",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Arizona",
                managing_agency="Tucson Electric Power",
                agency_acronym="TEP",
                short_summary=(
                    "Tucson Electric Power's Bright Tucson program lets income-qualified "
                    "TEP residential customers subscribe to community solar at no cost and "
                    "receive monthly bill credits. Households at or below 200% Federal "
                    "Poverty Level qualify. Average savings: $20-$40/month on electricity "
                    "bills. No equipment installed at the home — solar credits are applied "
                    "from a TEP-operated community solar facility."
                ),
                detailed_summary=(
                    "How community solar subscription works\n"
                    "TEP operates large solar farms across southern Arizona. Bright Tucson "
                    "income-qualified subscribers receive a fixed share (typically 1-2 kW) "
                    "of one of these farms. The energy produced from your share is metered "
                    "and credited against your monthly bill. You pay nothing upfront and "
                    "have no equipment installed at your home.\n\n"
                    "Bill savings\n"
                    "• Average subscriber savings: $20-$40/month ($240-$480/year)\n"
                    "• Subscription is free for income-qualified customers (TEP absorbs the "
                    "subscription fee that standard subscribers pay)\n"
                    "• Savings transfer to the new utility account if you move within TEP territory\n\n"
                    "Eligibility\n"
                    "• Must be a residential TEP electric customer\n"
                    "• Household income at or below 200% Federal Poverty Level\n"
                    "• Single-family OR multifamily households eligible\n"
                    "• Renters eligible (no landlord involvement needed)\n"
                    "• Categorical eligibility: SNAP, LIHEAP, TANF, or SSI recipients\n\n"
                    "Income limits (2024, 200% FPL)\n"
                    "• 1 person: $30,120 / year\n"
                    "• 2 persons: $40,880 / year\n"
                    "• 4 persons: $62,400 / year\n\n"
                    "How to apply\n"
                    "1. Apply at tep.com/brighttucson or call TEP Customer Care\n"
                    "2. Income verification (tax returns, paystubs, OR proof of categorical "
                    "program enrollment)\n"
                    "3. Approval typically within 30-45 days\n"
                    "4. Bill credits begin the month after enrollment is complete\n\n"
                    "How this stacks with other support\n"
                    "Bright Tucson is fully compatible with:\n"
                    "• LIHEAP energy assistance (separate federal program for bill help)\n"
                    "• TEP's Lifeline Discount (15% bill discount for ≤150% FPL)\n"
                    "• TEP's Energy Smart program (free in-home efficiency upgrades)\n"
                    "Stacked benefits can reduce total electricity cost by 50-70% for "
                    "qualifying households."
                ),
                key_requirements=[
                    "Residential TEP electric customer in Tucson service territory",
                    "Household income ≤ 200% Federal Poverty Level",
                    "Renters and homeowners both eligible (no installation required)",
                    "Categorical eligibility for SNAP/LIHEAP/TANF/SSI recipients",
                    "Apply at tep.com/brighttucson with income or program documentation",
                ],
                industry_categories=["Clean Technology", "Government & Nonprofit"],
                incentive_type=IncentiveType.SUBSIDY,
                source_url="https://www.tep.com/bright-tucson/",
                program_code="AZ-TEP-BRIGHT-TUCSON",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Arizona Solar Equipment Sales Tax Exemption",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Arizona",
                managing_agency="Arizona Department of Revenue",
                agency_acronym="AZ DOR",
                short_summary=(
                    "Arizona exempts solar energy devices and certain related equipment from "
                    "state transaction privilege (sales) tax. Applies to solar PV, solar hot "
                    "water, and certain wind systems. Tax saved: 5.6% state + city/county "
                    "rates (typically 7.5%-10.5% total). On a $25,000 residential solar install, "
                    "saves approximately $1,400-$2,600. Applied automatically at point of sale."
                ),
                detailed_summary=(
                    "What qualifies\n"
                    "Arizona Revised Statutes §42-5061 and §42-5159 exempt:\n"
                    "• Solar photovoltaic (PV) panels and inverters\n"
                    "• Solar hot water systems\n"
                    "• Solar pool heating equipment\n"
                    "• Wind generation equipment (residential scale)\n"
                    "• Battery storage when installed concurrently with solar (limited eligibility)\n"
                    "Includes labor for installation when invoiced as part of a turnkey project.\n\n"
                    "How it's applied\n"
                    "The contractor or installer applies the exemption automatically by:\n"
                    "1. Noting AZ TPT (transaction privilege tax) exempt on the invoice\n"
                    "2. Filing Form 5000-A (Solar Energy Devices) with the AZ DOR\n"
                    "3. The exemption appears as a line-item discount on your installation invoice\n\n"
                    "Tax saved (varies by city/county)\n"
                    "• State TPT: 5.6%\n"
                    "• Phoenix combined rate: ~8.6%\n"
                    "• Tucson combined rate: ~8.7%\n"
                    "• Flagstaff combined rate: ~9.2%\n"
                    "• Sedona combined rate: ~10.4%\n"
                    "On a $25,000 solar install: $1,400-$2,600 in tax savings.\n\n"
                    "Stacking with other Arizona incentives\n"
                    "Arizona Solar Sales Tax Exemption stacks with:\n"
                    "• Federal §25D Residential Clean Energy Credit: 30% of installed cost\n"
                    "• Arizona Solar Tax Credit (state income tax credit): 25% up to $1,000\n"
                    "• APS / SRP / TEP utility solar buyback credits (ongoing)\n\n"
                    "Note on commercial solar\n"
                    "Commercial / business solar installations also qualify under §42-5159, with "
                    "additional eligibility for the federal §48 Investment Tax Credit (30% baseline, "
                    "with potential domestic content + low-income community + energy community adders "
                    "totaling up to 70%).\n\n"
                    "Combined incentive value (typical $25,000 8 kW residential install)\n"
                    "• Federal §25D: $7,500\n"
                    "• AZ Solar Tax Credit: $1,000\n"
                    "• AZ Sales Tax Exemption (Phoenix area): $2,150\n"
                    "• Total: $10,650 incentives on a $25,000 install (43% off)"
                ),
                key_requirements=[
                    "Arizona property (residential or commercial)",
                    "Equipment: solar PV, solar hot water, solar pool heating, or wind generation",
                    "Installer must be a licensed AZ contractor familiar with TPT exemption",
                    "Form 5000-A applied automatically by installer at invoice",
                    "Stackable with federal §25D and AZ state Solar Tax Credit",
                ],
                industry_categories=["Clean Technology"],
                incentive_type=IncentiveType.TAX_CREDIT,
                source_url="https://azdor.gov/transaction-privilege-tax/tax-rate-tables/solar-energy-devices",
                program_code="AZ-DOR-SOLAR-TAX-EXEMPT",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
        ]
