import { graphNodes, graphEdges, type GraphNode, type GraphEdge } from "@/components/network/graph-data"
import { companies, type Company } from "@/lib/data"

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

/**
 * Fetch the global entity network graph
 */
export async function getGlobalGraph(): Promise<ApiGraphResponse> {
  try {
    const res = await fetch(`${API_BASE}/network/graph`, { cache: "no-store" })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    // Fallback to local graph
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
    // Fallback mapping from static companies dictionary
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
