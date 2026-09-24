export type NodeType =
  | "tender"
  | "company"
  | "director"
  | "address"
  | "bid"
  | "subcontractor"
  | "authority"
  | "organization"
  | "document"
  | "investigation"

export interface ProvenanceMetadata {
  source_name: string
  source_record_id: string
  source_url?: string | null
  retrieved_at?: string | null
  confidence: number
  transformation_history?: string[]
  notes?: string | null
}

export type GraphNode = {
  id: string
  label: string
  type: NodeType
  x?: number
  y?: number
  companyId?: string
  risk?: "low" | "medium" | "high" | "critical"
  risk_level?: "low" | "medium" | "high" | "critical"
  risk_score?: number
  degree?: number
  properties?: Record<string, any>
  provenance?: ProvenanceMetadata
}

export type GraphEdge = {
  id?: string
  from: string
  to: string
  label?: string
  relationship_type?: string
  weight?: number
  properties?: Record<string, any>
  provenance?: ProvenanceMetadata
}

export const nodeStyles: Record<NodeType, { color: string; label: string; r: number; bg: string; border: string }> = {
  tender: { color: "#22d3ee", label: "Tender", r: 22, bg: "rgba(34, 211, 238, 0.15)", border: "rgba(34, 211, 238, 0.6)" },
  company: { color: "#a855f7", label: "Company", r: 20, bg: "rgba(168, 85, 247, 0.15)", border: "rgba(168, 85, 247, 0.6)" },
  director: { color: "#f97316", label: "Director", r: 15, bg: "rgba(249, 115, 22, 0.15)", border: "rgba(249, 115, 22, 0.6)" },
  address: { color: "#10b981", label: "Address", r: 14, bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.6)" },
  bid: { color: "#94a3b8", label: "Bid", r: 12, bg: "rgba(148, 163, 184, 0.15)", border: "rgba(148, 163, 184, 0.6)" },
  subcontractor: { color: "#f43f5e", label: "Subcontractor", r: 14, bg: "rgba(244, 63, 94, 0.15)", border: "rgba(244, 63, 94, 0.6)" },
  authority: { color: "#3b82f6", label: "Procurement Authority", r: 20, bg: "rgba(59, 130, 246, 0.15)", border: "rgba(59, 130, 246, 0.6)" },
  organization: { color: "#6366f1", label: "Organization", r: 18, bg: "rgba(99, 102, 241, 0.15)", border: "rgba(99, 102, 241, 0.6)" },
  document: { color: "#eab308", label: "Document", r: 14, bg: "rgba(234, 179, 8, 0.15)", border: "rgba(234, 179, 8, 0.6)" },
  investigation: { color: "#ec4899", label: "Investigation", r: 16, bg: "rgba(236, 72, 153, 0.15)", border: "rgba(236, 72, 153, 0.6)" },
}

export const graphNodes: GraphNode[] = [
  { id: "t1", label: "Highway Resurfacing", type: "tender", x: 400, y: 250, risk: "critical" },
  { id: "c1", label: "Meridian Civil Works", type: "company", x: 220, y: 150, companyId: "CO-META", risk: "high" },
  { id: "c2", label: "Apex Infrastructure", type: "company", x: 580, y: 150, companyId: "CO-APEX", risk: "high" },
  { id: "c3", label: "Northgate Contracting", type: "company", x: 400, y: 430, companyId: "CO-NORTH", risk: "medium" },
  { id: "d1", label: "J. Vantor", type: "director", x: 400, y: 70 },
  { id: "a1", label: "44 Kingsway", type: "address", x: 130, y: 300 },
  { id: "b1", label: "Bid $46.2M", type: "bid", x: 150, y: 60 },
  { id: "b2", label: "Bid $46.9M", type: "bid", x: 650, y: 60 },
  { id: "b3", label: "Bid $47.4M", type: "bid", x: 520, y: 470 },
  { id: "s1", label: "Delta Haulage", type: "subcontractor", x: 700, y: 330 },
]

export const graphEdges: GraphEdge[] = [
  { from: "c1", to: "t1", label: "bid" },
  { from: "c2", to: "t1", label: "bid" },
  { from: "c3", to: "t1", label: "bid" },
  { from: "d1", to: "c1", label: "director" },
  { from: "d1", to: "c2", label: "director" },
  { from: "a1", to: "c1", label: "registered at" },
  { from: "a1", to: "c2", label: "registered at" },
  { from: "b1", to: "c1" },
  { from: "b2", to: "c2" },
  { from: "b3", to: "c3" },
  { from: "s1", to: "c2", label: "subcontractor" },
]
