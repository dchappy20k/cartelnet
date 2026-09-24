import io
from datetime import datetime
from typing import List, Dict, Any, Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas for dynamic 'Page X of Y' numbering and running header/footer."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Running header on later pages
        if self._pageNumber > 1:
            self.drawString(36, 810, "CartelNet — Public Procurement Risk Intelligence Dossier")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(36, 804, 559, 804)

        # Running footer on every page
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(36, 30, 559, 30)

        self.drawString(36, 20, "CartelNet Decision Support • Public Disclosure Document • Strictly for Human Integrity Review")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(559, 20, page_str)
        self.restoreState()


def get_styles():
    base = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        "DocTitle",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
    )
    
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#64748b"),
    )
    
    h2_style = ParagraphStyle(
        "Heading2Custom",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=12,
        spaceAfter=6,
    )
    
    body_style = ParagraphStyle(
        "BodyCustom",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
    )
    
    summary_box_style = ParagraphStyle(
        "SummaryBox",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13.5,
        textColor=colors.HexColor("#1e293b"),
    )
    
    cell_style = ParagraphStyle(
        "CellCustom",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#1e293b"),
    )
    
    cell_bold_style = ParagraphStyle(
        "CellBoldCustom",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#1e293b"),
    )

    disclaimer_style = ParagraphStyle(
        "DisclaimerCustom",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=11,
        textColor=colors.HexColor("#475569"),
    )

    return {
        "title": title_style,
        "subtitle": subtitle_style,
        "h2": h2_style,
        "body": body_style,
        "summary": summary_box_style,
        "cell": cell_style,
        "cell_bold": cell_bold_style,
        "disclaimer": disclaimer_style,
    }


def build_tender_risk_pdf(
    report_id: str,
    tender: Any,
    summary: str,
    entities: List[Dict[str, Any]],
    signals: List[Dict[str, Any]],
    auditor: str,
    now: datetime,
) -> bytes:
    """Generate high-fidelity institutional PDF for a screened tender."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=40,
        bottomMargin=40,
    )
    styles = get_styles()
    story = []

    # 1. Header with CartelNet Branding and Meta
    header_data = [
        [
            Paragraph("<b>CARTELNET PROCUREMENT INTELLIGENCE</b><br/><font color='#64748b' size='8'>Anti-Collusion Audit & Decision Support System</font>", styles["body"]),
            Paragraph(f"<font color='#64748b' size='8'><b>REPORT REF:</b> {report_id}<br/><b>DATE:</b> {now.strftime('%Y-%m-%d %H:%M UTC')}<br/><b>STATUS:</b> PUBLIC AUDIT COPY</font>", styles["body"]),
        ]
    ]
    t_header = Table(header_data, colWidths=[330, 193])
    t_header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(t_header)
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceBefore=6, spaceAfter=14))

    # 2. Document Title and Subject Card
    risk_level = getattr(tender, "risk_level", "UNKNOWN").upper()
    risk_score = getattr(tender, "risk_score", 0)
    
    badge_bg = "#dc2626" if risk_level in ["CRITICAL", "HIGH"] else ("#d97706" if risk_level == "MEDIUM" else "#059669")
    
    subject_title = f"{tender.title} ({tender.tender_ref})"
    story.append(Paragraph(subject_title, styles["title"]))
    story.append(Spacer(1, 4))
    
    meta_text = (
        f"<b>Procuring Authority:</b> {tender.authority} &nbsp;|&nbsp; "
        f"<b>Estimated Value:</b> ${tender.estimated_value:,.2f} &nbsp;|&nbsp; "
        f"<b>Auditor/System:</b> {auditor}"
    )
    story.append(Paragraph(meta_text, styles["subtitle"]))
    story.append(Spacer(1, 10))

    # Risk Score Summary Bar
    score_table_data = [
        [
            Paragraph(f"<b>COMPOSITE RISK RATING</b><br/><font size='14'><b>{risk_score}/100</b></font>", styles["body"]),
            Paragraph(f"<font color='white'><b>&nbsp;{risk_level} SEVERITY&nbsp;</b></font>", ParagraphStyle("Badge", parent=styles["cell_bold"], fontSize=10, textColor=colors.white)),
            Paragraph(f"<b>Total Bids Screened:</b> {len(entities)}<br/><b>Signals Detected:</b> {len(signals)}", styles["cell"]),
        ]
    ]
    t_score = Table(score_table_data, colWidths=[160, 140, 223])
    t_score.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BACKGROUND", (1, 0), (1, 0), colors.HexColor(badge_bg)),
        ("ALIGN", (1, 0), (1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(t_score)
    story.append(Spacer(1, 12))

    # 3. Executive Summary
    story.append(Paragraph("Executive Summary & Audit Rationale", styles["h2"]))
    summary_data = [[Paragraph(summary, styles["summary"])]]
    t_summary = Table(summary_data, colWidths=[523])
    t_summary.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#f0fdf4" if risk_level == "LOW" else "#eff6ff")),
        ("BOX", (0, 0), (0, 0), 1, colors.HexColor("#bfdbfe")),
        ("LINELEFT", (0, 0), (0, 0), 3, colors.HexColor("#0284c7")),
        ("TOPPADDING", (0, 0), (0, 0), 8),
        ("BOTTOMPADDING", (0, 0), (0, 0), 8),
        ("LEFTPADDING", (0, 0), (0, 0), 10),
        ("RIGHTPADDING", (0, 0), (0, 0), 10),
    ]))
    story.append(t_summary)
    story.append(Spacer(1, 12))

    # 4. Submitted Bids & Entity Registry
    story.append(Paragraph(f"Submitted Bids & Entity Registry ({len(entities)} Bidders)", styles["h2"]))
    bid_rows = [
        [
            Paragraph("<b>Company / Bidder</b>", styles["cell_bold"]),
            Paragraph("<b>Submitted Amount</b>", styles["cell_bold"]),
            Paragraph("<b>Status</b>", styles["cell_bold"]),
            Paragraph("<b>Registered Address</b>", styles["cell_bold"]),
        ]
    ]
    for e in entities:
        bid_rows.append([
            Paragraph(e.get("company_name", "Unknown"), styles["cell_bold"]),
            Paragraph(f"${e.get('bid_amount', 0):,.2f}", styles["cell"]),
            Paragraph(str(e.get("bid_status", "SUBMITTED")), styles["cell"]),
            Paragraph(e.get("registered_address", "N/A"), styles["cell"]),
        ])

    t_bids = Table(bid_rows, colWidths=[150, 95, 75, 203])
    t_bids_style = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]
    # Header cells text color white
    for col_idx in range(4):
        bid_rows[0][col_idx].style.textColor = colors.white

    # Alternating row colors
    for r_idx in range(1, len(bid_rows)):
        if r_idx % 2 == 0:
            t_bids_style.append(("BACKGROUND", (0, r_idx), (-1, r_idx), colors.HexColor("#f8fafc")))

    t_bids.setStyle(TableStyle(t_bids_style))
    story.append(t_bids)
    story.append(Spacer(1, 14))

    # 5. Detected Risk Signals & Evidence Log
    story.append(Paragraph(f"Detected Risk Signals & Evidence Log ({len(signals)} Signals)", styles["h2"]))
    if not signals:
        story.append(Paragraph("<i>No suspicious coordination or collusion signals were detected for this tender.</i>", styles["body"]))
    else:
        for idx, s in enumerate(signals, start=1):
            sev = s.get("severity", "medium").upper()
            sev_color = "#dc2626" if sev in ["CRITICAL", "HIGH"] else ("#d97706" if sev == "MEDIUM" else "#059669")
            
            sig_card = [
                [
                    Paragraph(f"<b>Signal #{idx}: {s.get('title')}</b>", styles["cell_bold"]),
                    Paragraph(f"<font color='{sev_color}'><b>{sev}</b> (+{s.get('score_contribution', 0)} pts)</font>", ParagraphStyle("RightSev", parent=styles["cell_bold"], alignment=2)),
                ],
                [
                    Paragraph(f"<b>Detector:</b> <font color='#0284c7'>{s.get('detector_code')}</font><br/><b>Finding:</b> {s.get('description')}<br/><b>Explanation:</b> {s.get('explanation')}", styles["cell"]),
                    "",
                ]
            ]
            t_sig = Table(sig_card, colWidths=[380, 143])
            t_sig.setStyle(TableStyle([
                ("SPAN", (0, 1), (1, 1)),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#ffffff")),
                ("LINELEFT", (0, 0), (0, -1), 3, colors.HexColor(sev_color)),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]))
            story.append(KeepTogether([t_sig, Spacer(1, 6)]))

    story.append(Spacer(1, 10))

    # 6. Non-negotiable Legal & Regulatory Safety Notice
    notice_text = (
        "<b>LEGAL & REGULATORY NOTICE:</b> This intelligence dossier is generated by CartelNet as an automated "
        "decision-support and risk-screening tool. All scores, detected patterns, and network linkages highlight "
        "statistical and relational anomalies intended for human integrity review and audit prioritization. "
        "This document does not constitute proof of unlawful conduct, criminal conspiracy, or a legal determination of guilt."
    )
    t_notice = Table([[Paragraph(notice_text, styles["disclaimer"])]], colWidths=[523])
    t_notice.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (0, 0), 1, colors.HexColor("#cbd5e1")),
        ("TOPPADDING", (0, 0), (0, 0), 8),
        ("BOTTOMPADDING", (0, 0), (0, 0), 8),
        ("LEFTPADDING", (0, 0), (0, 0), 10),
        ("RIGHTPADDING", (0, 0), (0, 0), 10),
    ]))
    story.append(KeepTogether([t_notice]))

    # Build PDF with dynamic footer
    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer.getvalue()


def build_investigation_pdf(
    report_id: str,
    inv: Any,
    tender: Optional[Any],
    summary: str,
    notes: List[Dict[str, Any]],
    auditor: str,
    now: datetime,
) -> bytes:
    """Generate institutional PDF for an investigation case dossier."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=40,
        bottomMargin=40,
    )
    styles = get_styles()
    story = []

    # 1. Header
    header_data = [
        [
            Paragraph("<b>CARTELNET INVESTIGATION DOSSIER</b><br/><font color='#64748b' size='8'>Case Management & Institutional Evidence Log</font>", styles["body"]),
            Paragraph(f"<font color='#64748b' size='8'><b>CASE REF:</b> {inv.case_ref}<br/><b>EXPORTED:</b> {now.strftime('%Y-%m-%d %H:%M UTC')}<br/><b>CLASSIFICATION:</b> OFFICIAL AUDIT</font>", styles["body"]),
        ]
    ]
    t_header = Table(header_data, colWidths=[330, 193])
    t_header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(t_header)
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#6366f1"), spaceBefore=6, spaceAfter=14))

    # 2. Case Title & Metadata
    story.append(Paragraph(inv.title, styles["title"]))
    story.append(Spacer(1, 4))
    
    meta_text = (
        f"<b>Status:</b> {inv.status.upper()} &nbsp;|&nbsp; "
        f"<b>Priority:</b> {inv.priority.upper()} &nbsp;|&nbsp; "
        f"<b>Lead Investigator:</b> {inv.investigator or auditor}"
    )
    story.append(Paragraph(meta_text, styles["subtitle"]))
    story.append(Spacer(1, 10))

    if tender:
        tender_box = [
            [
                Paragraph(f"<b>Linked Tender:</b> {tender.title} ({tender.tender_ref})", styles["cell_bold"]),
                Paragraph(f"<b>Estimated Value:</b> ${tender.estimated_value:,.2f}", styles["cell"]),
            ],
            [
                Paragraph(f"<b>Authority:</b> {tender.authority}", styles["cell"]),
                Paragraph(f"<b>Risk Score:</b> {tender.risk_score}/100 ({tender.risk_level.upper()})", styles["cell"]),
            ]
        ]
        t_tender = Table(tender_box, colWidths=[320, 203])
        t_tender.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(t_tender)
        story.append(Spacer(1, 12))

    # 3. Case Findings Summary
    story.append(Paragraph("Investigation Case Summary", styles["h2"]))
    summary_data = [[Paragraph(summary, styles["summary"])]]
    t_summary = Table(summary_data, colWidths=[523])
    t_summary.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#f5f3ff")),
        ("BOX", (0, 0), (0, 0), 1, colors.HexColor("#ddd6fe")),
        ("LINELEFT", (0, 0), (0, 0), 3, colors.HexColor("#6366f1")),
        ("TOPPADDING", (0, 0), (0, 0), 8),
        ("BOTTOMPADDING", (0, 0), (0, 0), 8),
        ("LEFTPADDING", (0, 0), (0, 0), 10),
        ("RIGHTPADDING", (0, 0), (0, 0), 10),
    ]))
    story.append(t_summary)
    story.append(Spacer(1, 12))

    # 4. Investigator Notes Timeline
    story.append(Paragraph(f"Chronological Investigator Audit Log ({len(notes)} Entries)", styles["h2"]))
    if not notes:
        story.append(Paragraph("<i>No audit notes logged yet for this case.</i>", styles["body"]))
    else:
        for idx, n in enumerate(notes, start=1):
            created_str = n.get("created_at", "")
            if isinstance(created_str, str) and len(created_str) >= 16:
                created_str = created_str[:16].replace("T", " ")
            note_card = [
                [
                    Paragraph(f"<b>Entry #{idx}: {n.get('author', 'Investigator')}</b>", styles["cell_bold"]),
                    Paragraph(f"<font color='#64748b'>{created_str}</font>", ParagraphStyle("RightTime", parent=styles["cell"], alignment=2)),
                ],
                [
                    Paragraph(n.get("content", ""), styles["cell"]),
                    "",
                ]
            ]
            t_note = Table(note_card, colWidths=[380, 143])
            t_note.setStyle(TableStyle([
                ("SPAN", (0, 1), (1, 1)),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#ffffff")),
                ("LINELEFT", (0, 0), (0, -1), 3, colors.HexColor("#6366f1")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]))
            story.append(KeepTogether([t_note, Spacer(1, 6)]))

    story.append(Spacer(1, 10))

    # 5. Non-negotiable Legal Notice
    notice_text = (
        "<b>LEGAL & REGULATORY NOTICE:</b> This investigation dossier is maintained for official case tracking "
        "and investigative due diligence. All entries, risk scores, and evidence associations are confidential "
        "and do not constitute a formal administrative charge or judicial finding."
    )
    t_notice = Table([[Paragraph(notice_text, styles["disclaimer"])]], colWidths=[523])
    t_notice.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (0, 0), 1, colors.HexColor("#cbd5e1")),
        ("TOPPADDING", (0, 0), (0, 0), 8),
        ("BOTTOMPADDING", (0, 0), (0, 0), 8),
        ("LEFTPADDING", (0, 0), (0, 0), 10),
        ("RIGHTPADDING", (0, 0), (0, 0), 10),
    ]))
    story.append(KeepTogether([t_notice]))

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer.getvalue()
