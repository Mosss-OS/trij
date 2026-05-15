import jsPDF from "jspdf";
import type { Patient, Assessment } from "@/types/trij";

export function generateReferralPdf(patient: Patient, a: Assessment) {
  const doc = new jsPDF({ unit: "pt", format: "a5" });
  const W = doc.internal.pageSize.getWidth();
  let y = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("TRIJ — REFERRAL SLIP", W / 2, y, { align: "center" });
  y += 10;
  doc.setDrawColor(180);
  doc.line(40, y, W - 40, y);
  y += 24;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Patient", 40, y);
  doc.setFont("helvetica", "normal");
  doc.text(patient.identifier, 110, y);
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.text("Age / Sex", 40, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${patient.ageYears ?? "?"} / ${patient.sex ?? "?"}`, 110, y);
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.text("Date", 40, y);
  doc.setFont("helvetica", "normal");
  doc.text(new Date(a.createdAt).toLocaleString(), 110, y);
  y += 24;

  doc.setFont("helvetica", "bold");
  doc.text("Assessment", 40, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  const cond = `${a.condition ?? "—"}  (${Math.round(a.confidence ?? 0)}%)`;
  doc.text(cond, 40, y);
  y += 14;
  doc.text(`Urgency: ${a.urgency?.toUpperCase() ?? "—"}`, 40, y);
  y += 20;

  if (a.recommendation) {
    doc.setFont("helvetica", "bold");
    doc.text("Recommendation", 40, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(a.recommendation, W - 80);
    doc.text(lines, 40, y);
    y += lines.length * 12 + 10;
  }

  if (a.possibleConditions?.length) {
    doc.setFont("helvetica", "bold");
    doc.text("Differential", 40, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    a.possibleConditions.slice(0, 4).forEach((c) => {
      doc.text(`• ${c.name} (${Math.round(c.probability)}%)`, 40, y);
      y += 12;
    });
  }

  y = doc.internal.pageSize.getHeight() - 60;
  doc.setDrawColor(180);
  doc.line(40, y, W - 40, y);
  y += 14;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("Generated on-device by Trij. AI-assisted; not a clinical diagnosis.", W / 2, y, {
    align: "center",
  });

  doc.save(`referral-${patient.identifier}-${Date.now()}.pdf`);
}
