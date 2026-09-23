import type { RiskLevel } from "@/components/glass/risk-badge"

export type Tender = {
  id: string
  name: string
  authority: string
  value: number
  bidders: number
  risk: RiskLevel
  score: number
  signals: number
  updated: string
  category: string
  status: "Open" | "Awarded" | "Under Review" | "Closed"
}

export const tenders: Tender[] = [
  {
    id: "TND-8842",
    name: "Regional Highway Resurfacing Programme",
    authority: "National Roads Agency",
    value: 48_200_000,
    bidders: 3,
    risk: "critical",
    score: 87,
    signals: 6,
    updated: "12m ago",
    category: "Infrastructure",
    status: "Under Review",
  },
  {
    id: "TND-8817",
    name: "Municipal Water Treatment Upgrade",
    authority: "Metro Water Board",
    value: 22_750_000,
    bidders: 4,
    risk: "high",
    score: 74,
    signals: 4,
    updated: "1h ago",
    category: "Utilities",
    status: "Open",
  },
  {
    id: "TND-8790",
    name: "Public Hospital IT Modernisation",
    authority: "Health Infrastructure Dept.",
    value: 15_400_000,
    bidders: 6,
    risk: "high",
    score: 68,
    signals: 3,
    updated: "3h ago",
    category: "Technology",
    status: "Open",
  },
  {
    id: "TND-8771",
    name: "School District Catering Framework",
    authority: "Education Procurement Office",
    value: 6_900_000,
    bidders: 5,
    risk: "medium",
    score: 52,
    signals: 2,
    updated: "5h ago",
    category: "Services",
    status: "Awarded",
  },
  {
    id: "TND-8755",
    name: "City Rail Signalling Maintenance",
    authority: "Metropolitan Transit Authority",
    value: 31_100_000,
    bidders: 3,
    risk: "critical",
    score: 91,
    signals: 7,
    updated: "6h ago",
    category: "Infrastructure",
    status: "Under Review",
  },
  {
    id: "TND-8740",
    name: "Municipal Waste Collection Contract",
    authority: "City Sanitation Dept.",
    value: 9_200_000,
    bidders: 7,
    risk: "medium",
    score: 44,
    signals: 1,
    updated: "9h ago",
    category: "Services",
    status: "Open",
  },
  {
    id: "TND-8722",
    name: "Government Cloud Hosting Framework",
    authority: "Digital Services Agency",
    value: 27_800_000,
    bidders: 8,
    risk: "low",
    score: 24,
    signals: 0,
    updated: "1d ago",
    category: "Technology",
    status: "Open",
  },
  {
    id: "TND-8701",
    name: "Regional Airport Terminal Extension",
    authority: "Civil Aviation Authority",
    value: 62_500_000,
    bidders: 4,
    risk: "high",
    score: 71,
    signals: 5,
    updated: "1d ago",
    category: "Infrastructure",
    status: "Open",
  },
]

export type Signal = {
  id: string
  code: string
  title: string
  level: RiskLevel
  description: string
  source: string
  records: number
  detected: string
  confidence: number
}

export const signals: Signal[] = [
  {
    id: "SIG-01",
    code: "PRICE_CLUSTERING",
    title: "Price Clustering",
    level: "high",
    description: "Three bids exhibit unusually narrow price separation relative to historical variance.",
    source: "Bid submission records",
    records: 3,
    detected: "2026-09-22",
    confidence: 82,
  },
  {
    id: "SIG-02",
    code: "SHARED_DIRECTORS",
    title: "Shared Directorship",
    level: "critical",
    description: "Two competing bidders share a common director within the last 24 months.",
    source: "Corporate registry",
    records: 2,
    detected: "2026-09-22",
    confidence: 91,
  },
  {
    id: "SIG-03",
    code: "BID_ROTATION",
    title: "Bid Rotation Pattern",
    level: "high",
    description: "Winning bidder alternates across a sequence of related tenders in the same region.",
    source: "Award history",
    records: 8,
    detected: "2026-09-21",
    confidence: 76,
  },
  {
    id: "SIG-04",
    code: "SHARED_ADDRESS",
    title: "Shared Registered Address",
    level: "medium",
    description: "Two bidding entities are registered at the same physical address.",
    source: "Corporate registry",
    records: 2,
    detected: "2026-09-20",
    confidence: 64,
  },
  {
    id: "SIG-05",
    code: "COVER_BIDDING",
    title: "Suspected Cover Bidding",
    level: "high",
    description: "One bid appears intentionally uncompetitive, consistent with cover-bidding behaviour.",
    source: "Bid submission records",
    records: 1,
    detected: "2026-09-20",
    confidence: 69,
  },
  {
    id: "SIG-06",
    code: "LATE_WITHDRAWAL",
    title: "Coordinated Withdrawal",
    level: "medium",
    description: "A qualified bidder withdrew shortly before deadline, reducing effective competition.",
    source: "Tender event log",
    records: 1,
    detected: "2026-09-19",
    confidence: 58,
  },
]

export type Investigation = {
  id: string
  title: string
  priority: "High" | "Medium" | "Low"
  status: "Under Review" | "Open" | "Escalated" | "Closed"
  investigator: string
  entities: number
  signals: number
  opened: string
  tender: string
}

export const investigations: Investigation[] = [
  {
    id: "INV-1024",
    title: "Highway Resurfacing — coordinated bidding review",
    priority: "High",
    status: "Under Review",
    investigator: "A. Okonkwo",
    entities: 6,
    signals: 6,
    opened: "2026-09-18",
    tender: "TND-8842",
  },
  {
    id: "INV-1019",
    title: "Rail signalling — repeated winner analysis",
    priority: "High",
    status: "Escalated",
    investigator: "M. Halvorsen",
    entities: 5,
    signals: 7,
    opened: "2026-09-15",
    tender: "TND-8755",
  },
  {
    id: "INV-1012",
    title: "Water treatment — shared ownership check",
    priority: "Medium",
    status: "Open",
    investigator: "Unassigned",
    entities: 4,
    signals: 4,
    opened: "2026-09-12",
    tender: "TND-8817",
  },
  {
    id: "INV-0998",
    title: "Airport terminal — subcontractor overlap",
    priority: "Medium",
    status: "Open",
    investigator: "R. Devi",
    entities: 7,
    signals: 5,
    opened: "2026-09-09",
    tender: "TND-8701",
  },
  {
    id: "INV-0981",
    title: "Catering framework — closed, no action",
    priority: "Low",
    status: "Closed",
    investigator: "A. Okonkwo",
    entities: 3,
    signals: 2,
    opened: "2026-08-28",
    tender: "TND-8771",
  },
]

export type Company = {
  id: string
  name: string
  registered: string
  incorporated: string
  status: string
  tenders: number
  wins: number
  losses: number
  signals: number
  relationships: number
  risk: RiskLevel
  activity: { label: string; time: string }[]
}

export const companies: Record<string, Company> = {
  "CO-META": {
    id: "CO-META",
    name: "Meridian Civil Works Ltd.",
    registered: "44 Kingsway, Harbor District",
    incorporated: "2009-04-12",
    status: "Active",
    tenders: 14,
    wins: 3,
    losses: 11,
    signals: 4,
    relationships: 8,
    risk: "high",
    activity: [
      { label: "Bid submitted — Highway Resurfacing (TND-8842)", time: "12m ago" },
      { label: "Flagged: shared directorship signal", time: "2h ago" },
      { label: "Bid submitted — Rail Signalling (TND-8755)", time: "6h ago" },
      { label: "Director appointment updated in registry", time: "3d ago" },
    ],
  },
  "CO-APEX": {
    id: "CO-APEX",
    name: "Apex Infrastructure Group",
    registered: "44 Kingsway, Harbor District",
    incorporated: "2011-08-30",
    status: "Active",
    tenders: 11,
    wins: 5,
    losses: 6,
    signals: 3,
    relationships: 6,
    risk: "high",
    activity: [
      { label: "Bid submitted — Highway Resurfacing (TND-8842)", time: "18m ago" },
      { label: "Shared address match detected", time: "1d ago" },
      { label: "Won — Regional Depot Works", time: "2w ago" },
    ],
  },
  "CO-NORTH": {
    id: "CO-NORTH",
    name: "Northgate Contracting",
    registered: "8 Riverside Park",
    incorporated: "2015-01-20",
    status: "Active",
    tenders: 7,
    wins: 1,
    losses: 6,
    signals: 1,
    relationships: 4,
    risk: "medium",
    activity: [
      { label: "Bid submitted — Highway Resurfacing (TND-8842)", time: "40m ago" },
      { label: "Registered as subcontractor", time: "5d ago" },
    ],
  },
}

export type ChartPoint = { month: string; high: number; medium: number; signals: number }

export const riskTrend: ChartPoint[] = [
  { month: "Apr", high: 8, medium: 14, signals: 22 },
  { month: "May", high: 11, medium: 16, signals: 28 },
  { month: "Jun", high: 9, medium: 19, signals: 31 },
  { month: "Jul", high: 14, medium: 17, signals: 37 },
  { month: "Aug", high: 18, medium: 21, signals: 44 },
  { month: "Sep", high: 23, medium: 20, signals: 52 },
]

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value}`
}

export const kpis = [
  { label: "Active Tenders", value: "142", delta: "+8", deltaTone: "up" as const, accent: "accent" as const },
  { label: "High-Risk Tenders", value: "23", delta: "+5", deltaTone: "down" as const, accent: "risk-high" as const },
  { label: "Open Investigations", value: "9", delta: "+2", deltaTone: "neutral" as const, accent: "violet" as const },
  { label: "Signals Detected", value: "52", delta: "+14", deltaTone: "down" as const, accent: "risk-critical" as const },
]
