"""
Inflation Reduction Act (IRA) Consumer Tax Credits Scraper
===========================================================
The IRA (Pub. L. 117-169, signed Aug 2022) created several major consumer-
facing federal tax credits and rebate programs. These are among the most
searched government incentives in the US, but the IRS does not expose a
structured API. We ship them as high-confidence static fixtures.

Programs covered
----------------
1. Clean Vehicle Tax Credit (§30D) — up to $7,500 for new EVs
2. Used Clean Vehicle Tax Credit (§25E) — up to $4,000 for used EVs
3. Alternative Fuel Vehicle Refueling Property Credit (§30C) — EV chargers
4. Residential Clean Energy Credit (§25D) — 30% for solar/storage/geothermal
5. Energy Efficient Home Improvement Credit (§25C) — heat pumps, windows, etc.
6. High-Efficiency Electric Home Rebate Act (HEEHRA) — up to $14,000
7. Home Efficiency Rebates (HOMES) — up to $8,000

Source: IRS.gov, Energy.gov, and the enrolled text of Pub. L. 117-169.

Maintenance
-----------
These fixtures reflect the law as enacted. IRS may issue guidance that
changes income thresholds or MSRP caps; update _PROGRAMS on each major
guidance release. The source_url for each links to the IRS or Energy.gov
page that tracks official guidance.

This scraper always runs in "static" mode — there is no live scrape.
"""

from __future__ import annotations

from .fingerprint import compute_source_hash
from .models import (
    IncentiveStatus,
    IncentiveType,
    JurisdictionLevel,
    ParseConfidence,
    ScrapedIncentive,
)

SOURCE = "ira_consumer_credits"

_PROGRAMS: list[dict] = [
    {
        "title": "Clean Vehicle Tax Credit — New EV (IRA §30D)",
        "summary": (
            "A federal tax credit of up to $7,500 for purchasing a qualifying new "
            "battery electric, fuel cell, or plug-in hybrid vehicle. The credit is "
            "split into two $3,750 components, each tied to North American assembly "
            "and battery critical-mineral sourcing requirements. Beginning in 2024, "
            "buyers may transfer the credit to the dealer as an upfront discount "
            "(point-of-sale). MSRP caps apply: $80,000 for vans, SUVs, and trucks; "
            "$55,000 for all other vehicles. Income limits apply."
        ),
        "detailed_summary": (
            "How the §30D credit is structured\n"
            "The Clean Vehicle Credit is composed of two equal $3,750 components, each with separate sourcing requirements:\n"
            "• Critical Minerals: A percentage of battery critical minerals must be extracted, processed, or recycled in the U.S. or a free-trade-agreement country. The threshold rises annually (40% in 2024, 50% in 2025, 60% in 2026, eventually 80%).\n"
            "• Battery Components: A percentage of battery components must be manufactured or assembled in North America (60% in 2024-2025, rising to 100% by 2029).\n\n"
            "MSRP caps and final assembly\n"
            "Vans, SUVs, and pickup trucks are capped at $80,000; sedans and all other vehicles at $55,000. Final assembly must occur in North America. The IRS publishes an updated list of qualifying vehicles at fueleconomy.gov.\n\n"
            "Income limits (Modified Adjusted Gross Income)\n"
            "$300,000 for joint filers / $225,000 for head of household / $150,000 for single filers. Buyers may use either the current year's MAGI or the prior year's, whichever is lower.\n\n"
            "Point-of-sale transfer (effective 2024)\n"
            "Buyers may transfer the credit to a registered dealer for an immediate cash discount at purchase. The dealer is reimbursed by the IRS within 72 hours, effectively converting the tax credit to a cash rebate even for buyers with limited tax liability.\n\n"
            "Excluded vehicles\n"
            "Vehicles with battery components from Foreign Entities of Concern (FEOC) — companies controlled by China, Russia, Iran, or North Korea — are excluded starting 2024 for battery components and 2025 for critical minerals."
        ),
        "reqs": [
            "Vehicle must be a new qualifying EV assembled in North America",
            "MSRP cap: $80,000 (trucks/vans/SUVs) or $55,000 (all others)",
            "Income limits: $300,000 MFJ / $225,000 HOH / $150,000 single (MAGI)",
            "Purchaser may transfer credit to the dealer as a point-of-sale discount",
            "Buyer may not have already claimed this credit for another vehicle that year",
        ],
        "type": IncentiveType.TAX_CREDIT,
        "amount": 7500,
        "categories": ["EV Charging", "Clean Technology"],
        "url": "https://www.irs.gov/credits-deductions/credits-for-new-clean-vehicles-purchased-in-2023-or-after",
        "code": "IRA-30D",
    },
    {
        "title": "Used Clean Vehicle Tax Credit (IRA §25E)",
        "summary": (
            "A federal tax credit of up to $4,000 (or 30% of sale price, whichever "
            "is less) for purchasing a used qualifying battery electric, fuel cell, "
            "or plug-in hybrid vehicle from a licensed dealer. The vehicle must be "
            "at least 2 model years old and priced at $25,000 or less. Lower income "
            "limits than the new vehicle credit. Beginning in 2024, buyers may "
            "transfer the credit to the dealer for an immediate discount at purchase."
        ),
        "reqs": [
            "Vehicle must be at least 2 model years old and priced at $25,000 or less",
            "Must be purchased from a licensed dealer (not private party)",
            "Income limits: $150,000 MFJ / $112,500 HOH / $75,000 single (MAGI)",
            "Buyer must not have claimed this credit in the prior 3 years",
            "Credit is 30% of sale price up to $4,000 maximum",
        ],
        "type": IncentiveType.TAX_CREDIT,
        "amount": 4000,
        "categories": ["EV Charging", "Clean Technology"],
        "url": "https://www.irs.gov/credits-deductions/used-clean-vehicle-credit",
        "code": "IRA-25E",
    },
    {
        "title": "Residential Clean Energy Credit — Solar, Storage, Geothermal (IRA §25D)",
        "summary": (
            "A 30% federal tax credit on the cost of qualifying residential clean "
            "energy equipment. Covers solar photovoltaic panels, solar hot water "
            "heaters, battery storage (≥3 kWh), small wind turbines, geothermal "
            "heat pumps, and fuel cells. No annual dollar cap — the credit is 30% "
            "of total installed cost. Unused credit carries forward to future tax "
            "years. Applies to primary and secondary residences. Step-down begins "
            "in 2033 (26%) and 2034 (22%)."
        ),
        "detailed_summary": (
            "What qualifies\n"
            "• Solar electric (PV) panels — including labor and ancillary equipment (inverters, mounting, wiring)\n"
            "• Solar water heaters — must be certified by the Solar Rating Certification Corporation (SRCC) or comparable; at least half of the home's water heating must come from solar\n"
            "• Battery storage technology — minimum 3 kWh capacity (added by IRA in 2023)\n"
            "• Small wind turbines\n"
            "• Geothermal heat pumps — must meet ENERGY STAR requirements at time of installation\n"
            "• Fuel cells — limited to $500 per 0.5 kW of capacity, primary residence only\n\n"
            "Phase-down schedule\n"
            "• 2022-2032: 30% of cost\n"
            "• 2033: 26%\n"
            "• 2034: 22%\n"
            "• 2035: credit expires (unless extended by Congress)\n\n"
            "Cost basis\n"
            "Includes equipment, labor for on-site preparation/assembly/installation, piping/wiring, sales tax, and permitting fees. Does NOT include roof repair or structural work unless the structural work is necessary to install the system.\n\n"
            "Carryforward\n"
            "If the credit exceeds your federal tax liability for the year, the unused portion carries forward to future years until 2034. The credit is non-refundable (cannot generate a refund beyond taxes owed).\n\n"
            "Stacking\n"
            "Compatible with state rebates (state rebate may reduce the federal credit basis if treated as a purchase price reduction by the state). Not compatible with the §25C Energy Efficient Home Improvement Credit for the same equipment."
        ),
        "reqs": [
            "Equipment must be installed in a qualifying U.S. residence (primary or secondary)",
            "Solar, storage (≥3 kWh capacity), wind, geothermal heat pump, or fuel cell",
            "No income limit applies",
            "Credit is 30% of total installed cost including labor",
            "Unused credit carries forward to future tax years",
        ],
        "type": IncentiveType.TAX_CREDIT,
        "amount": None,  # 30% of cost — no fixed ceiling
        "categories": ["Clean Technology", "Energy Storage"],
        "url": "https://www.irs.gov/credits-deductions/residential-clean-energy-credit",
        "code": "IRA-25D",
    },
    {
        "title": "Energy Efficient Home Improvement Credit — Heat Pumps, Windows & More (IRA §25C)",
        "summary": (
            "A federal tax credit of up to $3,200 per year for energy efficiency "
            "home improvements. Covers heat pumps ($2,000 sub-limit), heat pump "
            "water heaters ($2,000 sub-limit), and a $1,200 annual sub-limit for "
            "insulation, windows, doors, and energy audits. Credits reset each tax "
            "year — homeowners can claim $3,200/yr for multiple improvements across "
            "years. No income limit. Must be on the primary residence."
        ),
        "reqs": [
            "Must be installed on a primary residence in the United States",
            "Heat pumps and water heaters: up to $2,000 credit (30% of cost)",
            "Insulation, windows, doors, audits: up to $1,200 per year (30% of cost)",
            "Equipment must meet applicable ENERGY STAR or efficiency standards",
            "No income limit applies; credit is non-refundable",
        ],
        "type": IncentiveType.TAX_CREDIT,
        "amount": 3200,
        "categories": ["Energy Management"],
        "url": "https://www.irs.gov/credits-deductions/energy-efficient-home-improvement-credit",
        "code": "IRA-25C",
    },
    {
        "title": "EV Charger Tax Credit — Home and Commercial (IRA §30C)",
        "summary": (
            "A 30% federal tax credit (up to $1,000 for homes, up to $100,000 for "
            "businesses) for installing qualifying EV charging equipment. Available "
            "for Level 2 home chargers, bidirectional chargers, and commercial EVSE. "
            "Starting in 2023, the commercial credit applies only to equipment in "
            "low-income or non-urban census tracts. Home installations have no "
            "geographic restriction."
        ),
        "reqs": [
            "Equipment must be qualified alternative fuel vehicle refueling property",
            "Home credit: up to $1,000 (30% of cost); no geographic restriction",
            "Business credit: up to $100,000 per item (30% of cost); geographic restriction applies",
            "Commercial chargers must be in a low-income or non-urban census tract (post-2022)",
            "Equipment must meet applicable UL or SAE standards",
        ],
        "type": IncentiveType.TAX_CREDIT,
        "amount": 100000,
        "categories": ["EV Charging"],
        "url": "https://www.irs.gov/credits-deductions/alternative-fuel-vehicle-refueling-property-credit",
        "code": "IRA-30C",
    },
    {
        "title": "High-Efficiency Electric Home Rebates (HEEHRA) — Up to $14,000",
        "summary": (
            "Federal rebates (administered through state energy offices) for "
            "low-to-moderate income households to electrify their homes. Point-of-sale "
            "rebates cover heat pumps ($8,000), heat pump water heaters ($1,750), "
            "electric stoves/clothes dryers ($840 each), electric panel upgrades ($4,000), "
            "insulation/air sealing ($1,600), and wiring ($2,500). Households up to 80% "
            "AMI receive 100% coverage; 80–150% AMI receive 50%. Total cap: $14,000."
        ),
        "reqs": [
            "Household income must be at or below 150% of Area Median Income (AMI)",
            "Must be applied through a participating state energy office or retailer",
            "Equipment must meet ENERGY STAR or other program efficiency standards",
            "Low-income households (≤80% AMI) receive 100% rebate; 80-150% AMI receive 50%",
            "Available only after your state launches its HEEHRA program",
        ],
        "type": IncentiveType.POINT_OF_SALE_REBATE,
        "amount": 14000,
        "categories": ["Energy Management", "Clean Technology"],
        "url": "https://www.energy.gov/scep/home-efficiency-rebates",
        "code": "IRA-HEEHRA",
    },
    {
        "title": "Home Efficiency Rebates (HOMES) — Whole-Home Energy Savings",
        "summary": (
            "Federally funded rebates (administered by states) for whole-home energy "
            "efficiency improvements that achieve measurable energy savings. Rebates "
            "are based on modeled or measured energy savings: 20-35% savings = up to "
            "$2,000; 35%+ savings = up to $4,000. Low-income households receive up to "
            "double ($4,000 to $8,000) and higher rebate percentages. Covers insulation, "
            "air sealing, HVAC, and other whole-home upgrades."
        ),
        "reqs": [
            "Home must be located in a state that has launched its HOMES program",
            "Project must achieve at least 20% modeled or measured energy savings",
            "Higher rebates (up to 2x) for households at or below 80% AMI",
            "Must use an approved contractor or auditor depending on state program rules",
            "Rebates based on savings tier: 20-35% savings tier vs. 35%+ savings tier",
        ],
        "type": IncentiveType.POINT_OF_SALE_REBATE,
        "amount": 8000,
        "categories": ["Energy Management"],
        "url": "https://www.energy.gov/scep/home-efficiency-rebates",
        "code": "IRA-HOMES",
    },
]


class IRACreditsScraper:
    """
    Static scraper for Inflation Reduction Act consumer tax credits.
    Always returns the curated fixture list — no live HTTP request needed.
    """

    SOURCE_NAME = SOURCE

    def __init__(self, mock: bool = False):
        # mock flag is accepted for API compatibility but ignored —
        # this scraper is always "static"
        pass

    def scrape(self) -> list[ScrapedIncentive]:
        results: list[ScrapedIncentive] = []
        for p in _PROGRAMS:
            summary = p["summary"]
            title = p["title"]
            results.append(
                ScrapedIncentive(
                    title=title,
                    jurisdiction_level=JurisdictionLevel.FEDERAL,
                    jurisdiction_name="United States",
                    managing_agency="U.S. Internal Revenue Service",
                    agency_acronym="IRS",
                    short_summary=summary,
                    detailed_summary=p.get("detailed_summary"),
                    key_requirements=p["reqs"],
                    industry_categories=p["categories"],
                    incentive_type=p["type"],
                    funding_amount=p.get("amount"),
                    source_url=p["url"],
                    program_code=p["code"],
                    status=IncentiveStatus.ACTIVE,
                    source_hash=compute_source_hash(f"{title}|{summary}|{p['url']}"),
                    parse_confidence=ParseConfidence.HIGH,
                    scraper_source=SOURCE,
                )
            )
        return results
