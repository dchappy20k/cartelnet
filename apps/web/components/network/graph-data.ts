export type NodeType = "tender" | "company" | "director" | "address" | "bid" | "subcontractor"

export type GraphNode = {
  id: string
  label: string
  type: NodeType
  x: number
  y: number
  companyId?: string
  risk?: "low" | "medium" | "high" | "critical"
}

export type GraphEdge = { from: string; to: string; label?: string }

export const nodeStyles: Record<NodeType, { color: string; label: string; r: number }> = {
  tender: { color: "#22d3ee", label: "Tender", r: 22 },
  company: { color: "#8b7cf6", label: "Company", r: 20 },
  director: { color: "#fb923c", label: "Director", r: 15 },
  address: { color: "#34d399", label: "Address", r: 14 },
  bid: { color: "#64748b", label: "Bid", r: 12 },
  subcontractor: { color: "#f43f5e", label: "Subcontractor", r: 14 },
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
