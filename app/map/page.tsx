import type { Metadata } from "next";
import MapClient from "./MapClient";

export const metadata: Metadata = {
  title: "Government Incentives by State — Interactive Map",
  description:
    "Explore grants, tax credits, loans, and rebates available in every U.S. state. " +
    "Click any state to see active programs, funding amounts, and application deadlines.",
  alternates: { canonical: "https://statesubsidies.com/map" },
  openGraph: {
    title: "Government Incentives by State — Interactive Map | StateSubsidies",
    description: "Browse 500+ programs across all 50 states. Click to explore.",
    url: "https://statesubsidies.com/map",
    type: "website",
  },
};

export default function MapPage() {
  return <MapClient />;
}
