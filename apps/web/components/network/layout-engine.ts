import { forceSimulation, forceManyBody, forceLink, forceCollide, forceCenter } from "d3-force"
import { type GraphNode, type GraphEdge } from "./graph-data"

export type LayoutMode = "force" | "hierarchical" | "radial"

interface SimNode extends GraphNode {
  x?: number
  y?: number
  vx?: number
  vy?: number
  index?: number
}

interface SimLink {
  source: string | SimNode
  target: string | SimNode
  relationship_type?: string
}

/**
 * Run a fast, deterministic force-directed simulation with strict collision prevention
 */
export function computeForceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width = 2400,
  height = 1600
): Map<string, { x: number; y: number }> {
  const nodeMap = new Map<string, { x: number; y: number }>()
  if (!nodes || nodes.length === 0) return nodeMap

  // Clone nodes for simulation
  const simNodes: SimNode[] = nodes.map((n, idx) => ({
    ...n,
    x: n.x && n.x !== 0 ? n.x : width / 2 + (Math.random() - 0.5) * 400,
    y: n.y && n.y !== 0 ? n.y : height / 2 + (Math.random() - 0.5) * 400,
  }))

  const nodeLookup = new Map<string, SimNode>()
  simNodes.forEach((n) => nodeLookup.set(n.id, n))

  // Clone valid links
  const simLinks: SimLink[] = []
  edges.forEach((e) => {
    const fromId = (e as any).from || (e as any).source
    const toId = (e as any).to || (e as any).target
    if (nodeLookup.has(fromId) && nodeLookup.has(toId)) {
      simLinks.push({
        source: fromId,
        target: toId,
        relationship_type: e.relationship_type,
      })
    }
  })

  // Configure high-repulsion, collision-free d3 simulation
  const simulation = forceSimulation(simNodes)
    .force(
      "charge",
      forceManyBody()
        .strength((d: any) => {
          // Tenders and companies repel more strongly to form distinct hubs
          if (d.type === "tender") return -2200
          if (d.type === "company") return -1800
          return -900
        })
        .distanceMax(1400)
    )
    .force(
      "link",
      forceLink(simLinks)
        .id((d: any) => d.id)
        .distance((link: any) => {
          // Bidders cluster close to their tenders, directors close to companies
          if (link.relationship_type === "PARTICIPATED_IN") return 220
          if (link.relationship_type === "SHARED_DIRECTOR" || link.relationship_type === "SHARED_ADDRESS") return 180
          return 260
        })
        .strength(0.7)
    )
    .force(
      "collision",
      forceCollide().radius((d: any) => {
        // Generous bounding sphere around each card to eliminate overlap
        if (d.type === "tender") return 160
        if (d.type === "company") return 150
        return 120
      }).iterations(3)
    )
    .force("center", forceCenter(width / 2, height / 2).strength(0.05))
    .stop()

  // Run 150 ticks synchronously to settle
  for (let i = 0; i < 150; ++i) {
    simulation.tick()
  }

  simNodes.forEach((n) => {
    nodeMap.set(n.id, { x: Math.round(n.x ?? 0), y: Math.round(n.y ?? 0) })
  })

  return nodeMap
}

/**
 * Compute clean Hierarchical / Tiered procurement layout
 * Tier 0: Authority (Top)
 * Tier 1: Tenders
 * Tier 2: Companies / Competitors
 * Tier 3: Directors & Addresses (Bottom)
 */
export function computeHierarchicalLayout(
  nodes: GraphNode[],
  edges: GraphEdge[]
): Map<string, { x: number; y: number }> {
  const nodeMap = new Map<string, { x: number; y: number }>()
  if (!nodes || nodes.length === 0) return nodeMap

  const tiers: Record<string, GraphNode[]> = {
    authority: [],
    tender: [],
    company: [],
    director: [],
    address: [],
    other: [],
  }

  nodes.forEach((n) => {
    if (tiers[n.type]) {
      tiers[n.type].push(n)
    } else {
      tiers.other.push(n)
    }
  })

  const tierOrder = ["authority", "tender", "company", "director", "address", "other"]
  const ySpacing = 280
  const xSpacing = 320

  let currentY = 100

  tierOrder.forEach((tierName) => {
    const tierNodes = tiers[tierName]
    if (tierNodes.length === 0) return

    const totalWidth = (tierNodes.length - 1) * xSpacing
    const startX = Math.max(100, 1200 - totalWidth / 2)

    tierNodes.forEach((n, idx) => {
      nodeMap.set(n.id, {
        x: startX + idx * xSpacing,
        y: currentY,
      })
    })

    currentY += ySpacing
  })

  return nodeMap
}

/**
 * Compute Radial / Cluster layout centered on primary tenders
 */
export function computeRadialLayout(
  nodes: GraphNode[],
  edges: GraphEdge[]
): Map<string, { x: number; y: number }> {
  const nodeMap = new Map<string, { x: number; y: number }>()
  if (!nodes || nodes.length === 0) return nodeMap

  const tenders = nodes.filter((n) => n.type === "tender")
  const companies = nodes.filter((n) => n.type === "company")
  const secondaries = nodes.filter((n) => n.type !== "tender" && n.type !== "company")

  // Distribute tenders as central cluster hubs
  const hubCenters: Array<{ x: number; y: number }> = []
  const tenderCount = Math.max(1, tenders.length)
  const hubRadius = Math.max(400, tenderCount * 140)

  tenders.forEach((t, i) => {
    const angle = (i / tenderCount) * 2 * Math.PI
    const x = 1200 + hubRadius * Math.cos(angle)
    const y = 800 + hubRadius * Math.sin(angle)
    hubCenters.push({ x, y })
    nodeMap.set(t.id, { x: Math.round(x), y: Math.round(y) })
  })

  // Distribute companies around their closest tender or in an inner ring
  const companyCount = Math.max(1, companies.length)
  const companyRadius = hubRadius + 320
  companies.forEach((c, i) => {
    const angle = (i / companyCount) * 2 * Math.PI
    const x = 1200 + companyRadius * Math.cos(angle)
    const y = 800 + companyRadius * Math.sin(angle)
    nodeMap.set(c.id, { x: Math.round(x), y: Math.round(y) })
  })

  // Distribute secondaries in outer periphery
  const secCount = Math.max(1, secondaries.length)
  const secRadius = companyRadius + 340
  secondaries.forEach((s, i) => {
    const angle = (i / secCount) * 2 * Math.PI
    const x = 1200 + secRadius * Math.cos(angle)
    const y = 800 + secRadius * Math.sin(angle)
    nodeMap.set(s.id, { x: Math.round(x), y: Math.round(y) })
  })

  return nodeMap
}
