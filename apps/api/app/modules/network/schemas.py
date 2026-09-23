from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, ConfigDict

NodeType = Literal["tender", "company", "director", "address", "bid", "subcontractor"]
RiskBand = Literal["low", "medium", "high", "critical"]


class GraphNode(BaseModel):
    id: str
    label: str
    type: NodeType
    x: float = 400.0
    y: float = 250.0
    companyId: Optional[str] = None
    risk: Optional[RiskBand] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    source: str = Field(alias="from")
    target: str = Field(alias="to")
    label: Optional[str] = None
    relationship_type: Optional[str] = "relates_to"
    weight: Optional[float] = 1.0


class GraphSummary(BaseModel):
    total_nodes: int
    total_edges: int
    entity_counts: Dict[str, int]
    risk_summary: Dict[str, int]


class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    summary: GraphSummary


class ClusterEntity(BaseModel):
    id: str
    legal_name: str
    tax_id: Optional[str] = None
    role_in_cluster: str


class CollusionCluster(BaseModel):
    cluster_id: str
    cluster_type: str  # SHARED_DIRECTORS, SHARED_ADDRESS, FREQUENT_CO_BIDDERS
    title: str
    description: str
    risk_level: RiskBand
    companies: List[ClusterEntity]
    shared_attributes: Dict[str, Any]
    tenders_involved: List[str]


class ClusterListResponse(BaseModel):
    total_clusters: int
    clusters: List[CollusionCluster]


class DirectorSummary(BaseModel):
    id: str
    full_name: str
    role: str
    appointed_date: Optional[str] = None


class CoBidderSummary(BaseModel):
    company_id: str
    company_name: str
    joint_tenders_count: int
    shared_directors_count: int
    shared_address: bool


class CompanyDossierResponse(BaseModel):
    id: str
    legal_name: str
    normalized_name: str
    tax_id: Optional[str] = None
    status: str
    address: Optional[str] = None
    total_bids: int
    won_tenders: int
    win_rate: float
    total_bid_value: float
    directors: List[DirectorSummary]
    co_bidders: List[CoBidderSummary]
    risk_signals: List[Dict[str, Any]]
