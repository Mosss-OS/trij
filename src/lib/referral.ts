import jsPDF from "jspdf";
import QRCode from "qrcode";
import type { Patient, Assessment } from "@/types/trij";

interface ReferralData {
  patientId: string;
  assessmentId: string;
  urgency: string;
  chwContact: string;
  timestamp: string;
}

function getQRData(patient: Patient, a: Assessment): ReferralData {
  return {
    patientId: patient.identifier,
    assessmentId: a.id,
    urgency: a.urgency ?? "unknown",
    chwContact: "",
    timestamp: a.createdAt,
  };
}

function encodeQRPayload(data: ReferralData): string {
  return JSON.stringify(data);
}

export async function generateReferralPdfBlob(patient: Patient, a: Assessment): Promise<Blob> {
  const qrPayload = encodeQRPayload(getQRData(patient, a));
  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    width: 120,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });

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
  if (a.icd10Code) {
    doc.text(`ICD-10: ${a.icd10Code}`, 40, y);
    y += 14;
  }
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

  const qrX = W - 40 - 80;
  const qrY = doc.internal.pageSize.getHeight() - 130;
  doc.addImage(qrDataUrl, "PNG", qrX, qrY, 80, 80);

  y = doc.internal.pageSize.getHeight() - 60;
  doc.setDrawColor(180);
  doc.line(40, y, W - 40, y);
  y += 14;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("Generated on-device by Trij. AI-assisted; not a clinical diagnosis.", W / 2, y, {
    align: "center",
  });

  return doc.output("blob");
}

export async function downloadReferralPdf(patient: Patient, a: Assessment) {
  const blob = await generateReferralPdfBlob(patient, a);
  const url = URL.createObjectURL(blob);
  const aEl = document.createElement("a");
  aEl.href = url;
  aEl.download = `referral-${patient.identifier}-${Date.now()}.pdf`;
  aEl.click();
  URL.revokeObjectURL(url);
}

export async function shareReferralPdf(patient: Patient, a: Assessment) {
  const blob = await generateReferralPdfBlob(patient, a);
  const file = new File([blob], `referral-${patient.identifier}-${Date.now()}.pdf`, {
    type: "application/pdf",
  });
  if (navigator.share && navigator.canShare({ files: [file] })) {
    await navigator.share({
      title: `Referral — ${patient.identifier}`,
      files: [file],
    });
  } else {
    const url = URL.createObjectURL(blob);
    const aEl = document.createElement("a");
    aEl.href = url;
    aEl.download = `referral-${patient.identifier}-${Date.now()}.pdf`;
    aEl.click();
    URL.revokeObjectURL(url);
  }
}

export async function generateReferralPdf(patient: Patient, a: Assessment) {
  await downloadReferralPdf(patient, a);
}
