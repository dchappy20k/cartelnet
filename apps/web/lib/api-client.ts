import { graphNodes, graphEdges, type GraphNode, type GraphEdge } from "@/components/network/graph-data"
import { companies, investigations as mockInvestigations, type Company, type Investigation as MockInvestigation } from "@/lib/data"

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

export interface ApiGraphResponse {
  nodes: GraphNode[]
  edges: GraphEdge[]
  summary: {
    total_nodes: number
    total_edges: number
    entity_counts: Record<string, number>
    risk_summary: Record<string, number>
  }
}

export interface ApiCluster {
  cluster_id: string
  cluster_type: string
  title: string
  description: string
  risk_level: string
  companies: Array<{ id: string; legal_name: string; tax_id?: string; role_in_cluster: string }>
  shared_attributes: Record<string, any>
  tenders_involved: string[]
}

export interface ApiCompanyDossier {
  id: string
  legal_name: string
  normalized_name: string
  tax_id?: string
  status: string
  address?: string
  total_bids: number
  won_tenders: number
  win_rate: number
  total_bid_value: number
  directors: Array<{ id: string; full_name: string; role: string; appointed_date?: string }>
  co_bidders: Array<{
    company_id: string
    company_name: string
    joint_tenders_count: number
    shared_directors_count: number
    shared_address: boolean
  }>
  risk_signals: Array<{
    id: string
    detector_code: string
    title: string
    severity: string
    confidence: number
    score_contribution: number
    description: string
  }>
}

export interface ApiInvestigation {
  id: string
  case_ref: string
  title: string
  priority: "Low" | "Medium" | "High" | "Critical"
  status: "Open" | "Under Review" | "Escalated" | "Closed"
  investigator: string
  tender_id?: string
  tender_ref?: string
  entities_count: number
  signals_count: number
  created_at: string
  updated_at: string
  notes: Array<{
    id: string
    author_name: string
    content: string
    created_at: string
  }>
}

export interface ApiInvestigationDetail extends ApiInvestigation {
  tender_title?: string
  tender_authority?: string
  tender_value?: number
  tender_risk_score?: number
  bidders: Array<{
    bid_id: string
    company_id: string
    company_name: string
    amount: number
    status: string
  }>
  signals: Array<{
    id: string
    detector_code: string
    title: string
    severity: string
    confidence: number
    score_contribution: number
    description: string
    explanation: string
    evidence?: Array<{
      id: string
      source_type: string
      summary: string
      data_payload?: any
    }>
  }>
}

export interface ApiReportResponse {
  report_id: string
  report_title: string
  generated_at: string
  report_type: string
  format: string
  target_id: string
  risk_score?: number
  risk_level?: string
  executive_summary: string
  evidence_log: any[]
  entities_involved: any[]
  rendered_content?: string
}

/**
 * Fetch the global entity network graph
 */
export async function getGlobalGraph(): Promise<ApiGraphResponse> {
  try {
    const res = await fetch(`${API_BASE}/network/graph`, { cache: "no-store" })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    return {
      nodes: graphNodes,
      edges: graphEdges,
      summary: {
        total_nodes: graphNodes.length,
        total_edges: graphEdges.length,
        entity_counts: { tender: 1, company: 3, director: 1, address: 1, bid: 3, subcontractor: 1 },
        risk_summary: { low: 4, medium: 2, high: 3, critical: 1 },
      },
    }
  }
}

/**
 * Fetch ego-graph for a specific tender
 */
export async function getTenderGraph(tenderId: string): Promise<ApiGraphResponse> {
  try {
    const res = await fetch(`${API_BASE}/network/tenders/${encodeURIComponent(tenderId)}/graph`, { cache: "no-store" })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    return getGlobalGraph()
  }
}

/**
 * Fetch detected collusion clusters
 */
export async function getCollusionClusters(): Promise<ApiCluster[]> {
  try {
    const res = await fetch(`${API_BASE}/network/clusters`, { cache: "no-store" })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return data.clusters || []
  } catch (err) {
    return []
  }
}

/**
 * Fetch entity dossier for a company
 */
export async function getCompanyDossier(companyId: string): Promise<ApiCompanyDossier | null> {
  try {
    const res = await fetch(`${API_BASE}/network/companies/${encodeURIComponent(companyId)}/dossier`, { cache: "no-store" })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    const fallback = companies[companyId]
    if (!fallback) return null
    return {
      id: fallback.id,
      legal_name: fallback.name,
      normalized_name: fallback.name.toLowerCase(),
      status: fallback.status,
      address: fallback.registered,
      total_bids: fallback.tenders,
      won_tenders: fallback.wins,
      win_rate: fallback.tenders > 0 ? Math.round((fallback.wins / fallback.tenders) * 100) : 0,
      total_bid_value: 48000000,
      directors: [{ id: "d1", full_name: "Arthur Vance", role: "Executive Director" }],
      co_bidders: [],
      risk_signals: [{
        id: "sig-1",
        detector_code: "PRICE_CLUSTERING",
        title: "Narrow Bid Spread",
        severity: fallback.risk,
        confidence: 0.95,
        score_contribution: 25,
        description: "Bids within 1.07% CV spread.",
      }],
    }
  }
}

/**
 * Fetch all investigation cases
 */
export async function listInvestigations(filters?: { status?: string; priority?: string }): Promise<ApiInvestigation[]> {
  try {
    const params = new URLSearchParams()
    if (filters?.status) params.set("status", filters.status)
    if (filters?.priority) params.set("priority", filters.priority)

    const res = await fetch(`${API_BASE}/investigations/?${params.toString()}`, { cache: "no-store" })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return data
  } catch (err) {
    // Fallback to mock investigations
    return mockInvestigations.map((inv) => ({
      id: inv.id,
      case_ref: inv.id,
      title: inv.title,
      priority: inv.priority as any,
      status: inv.status as any,
      investigator: inv.investigator,
      entities_count: inv.entities,
      signals_count: inv.signals,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: [],
    }))
  }
}

/**
 * Create a new investigation case
 */
export async function createInvestigation(payload: {
  title: string
  tender_id?: string
  priority?: string
  investigator?: string
  initial_note?: string
}): Promise<ApiInvestigation> {
  const res = await fetch(`${API_BASE}/investigations/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

/**
 * Fetch 360-degree investigation details
 */
export async function getInvestigationDetail(identifier: string): Promise<ApiInvestigationDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/investigations/${encodeURIComponent(identifier)}`, { cache: "no-store" })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    const mock = mockInvestigations.find((i) => i.id === identifier)
    if (!mock) return null
    return {
      id: mock.id,
      case_ref: mock.id,
      title: mock.title,
      priority: mock.priority as any,
      status: mock.status as any,
      investigator: mock.investigator,
      entities_count: mock.entities,
      signals_count: mock.signals,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: [
        {
          id: "n-1",
          author_name: mock.investigator,
          content: "Case initiated from automated procurement risk screen.",
          created_at: new Date().toISOString(),
        },
      ],
      bidders: [],
      signals: [],
    }
  }
}

/**
 * Add note to investigation
 */
export async function addInvestigationNote(identifier: string, content: string, authorName = "Investigator"): Promise<any> {
  const res = await fetch(`${API_BASE}/investigations/${encodeURIComponent(identifier)}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, author_name: authorName }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

/**
 * Update investigation status or priority
 */
export async function updateInvestigation(identifier: string, payload: {
  status?: string
  priority?: string
  investigator?: string
  note?: string
}): Promise<ApiInvestigation> {
  const res = await fetch(`${API_BASE}/investigations/${encodeURIComponent(identifier)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

/**
 * Generate audit report
 */
export async function generateReport(payload: {
  report_type: "TENDER_RISK_AUDIT" | "INVESTIGATION_CASE_DOSSIER"
  target_id: string
  format?: "HTML" | "MARKDOWN" | "JSON"
  auditor_name?: string
}): Promise<ApiReportResponse> {
  const res = await fetch(`${API_BASE}/reports/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

/**
 * Seed benchmark procurement dataset
 */
export async function seedDemoData(): Promise<any> {
  const res = await fetch(`${API_BASE}/ingestion/demo-seed`, { method: "POST" })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

/**
 * Run risk screening across all tenders
 */
export async function screenAllTenders(): Promise<any> {
  const res = await fetch(`${API_BASE}/risk/screen-all`, { method: "POST" })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

/**
 * List tenders with optional filtering
 */
export async function listTenders(params?: { search?: string; status?: string; risk_level?: string }): Promise<any[]> {
  try {
    const q = new URLSearchParams()
    if (params?.search) q.set("search", params.search)
    if (params?.status) q.set("status", params.status)
    if (params?.risk_level) q.set("risk_level", params.risk_level)
    const res = await fetch(`${API_BASE}/tenders/?${q.toString()}`, { cache: "no-store" })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    return []
  }
}

/**
 * Fetch complete Tender 360 dossier
 */
export async function getTender360(tenderId: string): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}/tenders/${encodeURIComponent(tenderId)}`, { cache: "no-store" })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    return null
  }
}
