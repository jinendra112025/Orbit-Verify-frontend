import { jsPDF } from "jspdf";

export const generatePdfReport = (caseDetail) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const margin = 40;
  const headerH = 64;
  const usableW = pageW - margin * 2;
  const lineH = 16;
  const sectionGap = 18;

  let y = headerH + 10;

  const ensurePage = (need = 40) => {
    if (y + need > pageH - 80) {
      doc.addPage();
      y = margin;
      drawHeader();
      y += 10;
    }
  };

  const drawHeader = () => {
    // top dark header bar
    doc.setFillColor(30, 60, 90);
    doc.rect(0, 0, pageW, headerH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("Background Verification Report", margin, 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const ts = new Date().toLocaleString();
    doc.text(`Generated: ${ts}`, pageW - margin, 36, { align: "right" });
    doc.setTextColor(0, 0, 0);
  };

  const safe = (fn, fallback = "") => {
    try {
      const v = fn();
      return typeof v === "undefined" ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }; // small label-value writer (two-column line)

  const writeKV = (label, value, opts = {}) => {
    const leftX = margin;
    const labelW = 120;
    const rightX = margin + labelW + 8;
    const avail = pageW - rightX - margin;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${label}:`, leftX, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const txt =
      value == null || (typeof value === "string" && value.trim() === "")
        ? "—"
        : typeof value === "string"
        ? value
        : JSON.stringify(value);
    const lines = doc.splitTextToSize(txt, avail);
    ensurePage(lines.length * (lineH - 2) + 10);
    doc.text(lines, rightX, y);
    y += Math.max(lineH, lines.length * (lineH - 0.9));
  }; // documents list writer (indented)

  const writeDocs = (docs = [], label = "Documents") => {
    if (!docs || docs.length === 0) return;
    ensurePage(lineH + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(label + ":", margin, y);
    y += lineH - 6;
    docs.forEach((d) => {
      ensurePage(lineH + 6);
      const title =
        d?.originalFilename || d?.filename || (d && d._id) || "Document";
      const url = d?.storageUrl || d?.url || null;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      try {
        if (url) {
          doc.setTextColor(10, 90, 180);
          doc.textWithLink(title, margin + 12, y, { url });
          doc.setTextColor(0, 0, 0);
        } else {
          doc.text(title, margin + 12, y);
        }
      } catch (e) {
        // some environments may not support textWithLink
        doc.setTextColor(10, 90, 180);
        doc.text(title, margin + 12, y);
        doc.setTextColor(0, 0, 0);
      }
      y += lineH - 4;
    });
    y += 6;
  }; // helper to gather uploads matching a regex on fieldKey

  const docsFromUploads = (re) => {
    const ups = caseDetail?.uploads || [];
    const out = [];
    ups.forEach((u) => {
      const fk = (u.fieldKey || "").toString();
      if (re.test(fk)) {
        const docObj = u.documentId || u.document || null;
        if (docObj) out.push(docObj);
      }
    });
    return out;
  }; // severity map (simple)

  const severityForStatus = (status) => {
    if (!status) return "N/A";
    const s = status.toLowerCase();
    if (s.includes("clear")) return "Clear";
    if (s.includes("discrep")) return "Discrepant";
    if (s.includes("insuff") || s.includes("amber"))
      return "Amber/Insufficiency";
    if (s.includes("pending")) return "Pending";
    return status;
  }; // Start

  drawHeader(); // Candidate card

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Candidate Information", margin, y);
  y += 8;
  doc.setDrawColor(220);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageW - margin, y);
  y += 10; // Card box

  const cardTop = y;
  const cardH = 80;
  doc.setFillColor(245, 247, 250);
  doc.rect(margin, cardTop, usableW, cardH, "F"); // Candidate name (left), and client (right)

  const leftX = margin + 12;
  const rightX = margin + usableW * 0.6;
  const name = safe(
    () =>
      caseDetail.candidateInfo.candidateName || caseDetail.candidateInfo.name,
    "Candidate"
  );
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(name, leftX, cardTop + 22); // left-labeled fields: Email, Phone, Designation (required)

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Email:", leftX, cardTop + 42);
  doc.setFont("helvetica", "normal");
  doc.text(
    safe(() => caseDetail.candidateInfo.email, "—"),
    leftX + 68,
    cardTop + 42
  );

  doc.setFont("helvetica", "bold");
  doc.text("Phone:", leftX, cardTop + 58);
  doc.setFont("helvetica", "normal");
  doc.text(
    safe(() => caseDetail.candidateInfo.contactNumber, "—"),
    leftX + 68,
    cardTop + 58
  );

  doc.setFont("helvetica", "bold");
  doc.text("Designation:", leftX, cardTop + 74);
  doc.setFont("helvetica", "normal");
  doc.text(
    safe(() => caseDetail.candidateInfo.designation, "—"),
    leftX + 68,
    cardTop + 74
  ); // Right column: client

  doc.setFont("helvetica", "bold");
  doc.text("Client:", rightX, cardTop + 42);
  doc.setFont("helvetica", "normal");
  doc.text(
    safe(
      () => caseDetail.clientOrganization.name,
      caseDetail.clientOrganization || "N/A"
    ),
    rightX + 42,
    cardTop + 42
  );

  y = cardTop + cardH + 14; // EXECUTIVE SUMMARY (first page table)

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Executive Summary", margin, y);
  y += 10;
  doc.setDrawColor(200);
  doc.line(margin, y, pageW - margin, y);
  y += 12; // Build summary rows from caseDetail.checks (only present checks)

  const checks = Array.isArray(caseDetail?.checks) ? caseDetail.checks : [];
  const summaryRows = checks.map((ch, i) => ({
    idx: i + 1,
    name: ch.checkType || "Unnamed Check",
    verifiedByAt: ch.verifiedBy
      ? `${ch.verifiedBy}${ch.verifiedAt ? " / " + ch.verifiedAt : ""}`
      : ch.verifiedAt || "N/A",
    status: ch.status || "Pending",
    severity: severityForStatus(ch.status || ""),
    annexure: ch.annexure || "", // optional
    checkObj: ch,
  })); // Table column widths (fit within usableW)

  const colWidths = {
    sNo: 36,
    name: usableW * 0.36,
    verifiedByAt: usableW * 0.24,
    status: usableW * 0.12,
    severity: usableW * 0.12,
    annex: usableW * 0.06,
  }; // table header
  const thY = y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  let x = margin;
  doc.text("S No.", x + 4, y);
  x += colWidths.sNo;
  doc.text("Check Name", x + 4, y);
  x += colWidths.name;
  doc.text("Verified By/At", x + 4, y);
  x += colWidths.verifiedByAt;
  doc.text("Status", x + 4, y);
  x += colWidths.status;
  doc.text("Severity", x + 4, y);
  x += colWidths.severity;
  doc.text("Annex", x + 4, y);
  y += lineH;
  doc.setDrawColor(200);
  doc.line(margin, y - 8, pageW - margin, y - 8); // rows

  const rowYPositions = [];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  summaryRows.forEach((r, i) => {
    rowYPositions.push(y);
    ensurePage(24);
    x = margin;
    doc.text(String(r.idx), x + 4, y);
    x += colWidths.sNo;
    const nameLines = doc.splitTextToSize(r.name, colWidths.name - 8);
    doc.text(nameLines, x + 4, y);
    x += colWidths.name;
    const vLines = doc.splitTextToSize(
      r.verifiedByAt || "—",
      colWidths.verifiedByAt - 8
    );
    doc.text(vLines, x + 4, y);
    x += colWidths.verifiedByAt;
    doc.text(String(r.status || "—"), x + 4, y);
    x += colWidths.status;
    doc.text(String(r.severity || "—"), x + 4, y);
    x += colWidths.severity;
    doc.text(String(r.annex || ""), x + 4, y); // increase y by the tallest column's line count
    const maxLines = Math.max(nameLines.length, vLines.length, 1);
    y += Math.max(lineH, maxLines * (lineH - 2));
  }); // Leave some margin at bottom of summary page

  y = Math.max(y + 6, pageH - 260); // Now create pages per check. // We'll track page numbers so the summary can show pages if desired.

  const pageIndexForCheck = {}; // checkIndex -> pageNumber

  checks.forEach((check, idx) => {
    // start each check on a new page
    doc.addPage();
    const pageNum = doc.internal.getNumberOfPages();
    pageIndexForCheck[idx] = pageNum;
    y = margin;
    drawHeader();
    y += 8; // Check title

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`${idx + 1}. ${check.checkType || "Check"}`, margin, y);
    y += 18; // Candidate-stated details section (table-like)

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Candidate Submitted Data", margin, y);
    y += 10;
    doc.setDrawColor(220);
    doc.line(margin, y, pageW - margin, y);
    y += 10; // Use many of the same heuristics as your front-end renderCandidateSubmission:

    const ct = (check.checkType || "").toLowerCase(); // EMPLOYMENT (current / previous)

    if (ct.includes("employment")) {
      const employment = safe(() => caseDetail.employment, {}) || {};
      const current = employment.current || {};
      const prevRaw = employment.previous || [];
      const previous = Array.isArray(prevRaw)
        ? prevRaw
        : prevRaw
        ? [prevRaw]
        : [];

      const hasCurrent =
        current &&
        (current.organization || current.designation || current.tenure);
      const hasPrevious =
        previous &&
        previous.length &&
        previous.some(
          (p) => p && (p.organization || p.designation || p.tenure)
        );

      if (hasCurrent) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Current Employment", margin + 6, y);
        y += 12;
        if (current.organization) writeKV("Organization", current.organization);
        if (current.designation) writeKV("Designation", current.designation);
        if (current.tenure) writeKV("Tenure", current.tenure);
        y += 6;
      }

      if (hasPrevious) {
        previous.forEach((p, pi) => {
          if (!p || !(p.organization || p.designation || p.tenure)) return;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.text(
            previous.length > 1
              ? `Previous Employment ${pi + 1}`
              : "Previous Employment",
            margin + 6,
            y
          );
          y += 12;
          if (p.organization) writeKV("Organization", p.organization);
          if (p.designation) writeKV("Designation", p.designation);
          if (p.tenure) writeKV("Tenure", p.tenure);
          y += 6;
        });
      } // Documents candidate uploaded (employment)

      const empDocs = docsFromUploads(
        /employment|employment_current|employment_previous/i
      );
      writeDocs(empDocs, "Employment Uploaded Documents");
    } // EDUCATION

    if (ct.includes("education")) {
      if (Array.isArray(caseDetail.education) && caseDetail.education.length) {
        caseDetail.education.forEach((e, iE) => {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.text(`Education Entry ${iE + 1}`, margin + 6, y);
          y += 12;
          if (e.university) writeKV("University", e.university);
          if (e.degree) writeKV("Degree", e.degree);
          if (e.year) writeKV("Year", e.year);
          if (e.documentId) writeDocs([e.documentId], "Education Document");
          y += 6;
        });
      }
      const edocs = docsFromUploads(/education/i);
      writeDocs(edocs, "Uploaded Documents");
    } // ADDRESS

    if (ct.includes("address") && caseDetail.addressVerification) {
      const av = caseDetail.addressVerification || {};
      const cur = av.current || {};
      const perm = av.permanent || {};
      if (cur && (cur.line1 || cur.city || cur.state || cur.pincode)) {
        doc.setFont("helvetica", "bold");
        doc.text("Current Address", margin + 6, y);
        y += 12;
        if (cur.line1) writeKV("Line 1", cur.line1);
        if (cur.city) writeKV("City", cur.city);
        if (cur.state) writeKV("State", cur.state);
        if (cur.pincode) writeKV("Pincode", cur.pincode);
        y += 6;
      }
      if (perm && (perm.line1 || perm.city || perm.state || perm.pincode)) {
        doc.setFont("helvetica", "bold");
        doc.text("Permanent / Previous Address", margin + 6, y);
        y += 12;
        if (perm.line1) writeKV("Line 1", perm.line1);
        if (perm.city) writeKV("City", perm.city);
        if (perm.state) writeKV("State", perm.state);
        if (perm.pincode) writeKV("Pincode", perm.pincode);
        y += 6;
      }
      const adocs = docsFromUploads(
        /address|address_current|address_permanent/i
      );
      writeDocs(adocs, "Uploaded Documents");
    } // NATIONAL ID

    if (ct.includes("national") && caseDetail.nationalId) {
      const n = caseDetail.nationalId || {};
      if (n.aadhaar && (n.aadhaar.number || n.aadhaar))
        writeKV("Aadhaar", n.aadhaar.number || n.aadhaar);
      if (n.pan && (n.pan.number || n.pan))
        writeKV("PAN", n.pan.number || n.pan);
      if (n.passport && (n.passport.number || n.passport))
        writeKV("Passport", n.passport.number || n.passport);
      if (n.voter && (n.voter.number || n.voter))
        writeKV("Voter ID", n.voter.number || n.voter);
      if (n.drivingLicence && (n.drivingLicence.number || n.drivingLicence))
        writeKV("Driving Licence", n.drivingLicence.number || n.drivingLicence);
      const nDocs = docsFromUploads(
        /national_id|aadhaar|pan|passport|voter|dl|driving/i
      );
      writeDocs(nDocs, "Uploaded Documents");
    } // CREDIT

    if (ct.includes("credit") && caseDetail.creditCheck) {
      const c = caseDetail.creditCheck || {};
      if (c.address) writeKV("Address", c.address);
      if (c.aadhaar) writeKV("Aadhaar", c.aadhaar);
      if (c.pan) writeKV("PAN", c.pan);
      const ccDocs = docsFromUploads(/credit|credit_check|credit_history/i);
      writeDocs(ccDocs, "Uploaded Documents");
    } // UAN

    if (ct.includes("uan") && caseDetail.uan) {
      const u = caseDetail.uan || {};
      if (u.uan || u.uanNumber) writeKV("UAN", u.uan || u.uanNumber);
      if (u.aadhaar) writeKV("Aadhaar", u.aadhaar);
      const uDocs = docsFromUploads(/uan|epf|uan_proof/i);
      writeDocs(uDocs, "Uploaded Documents");
    } // Generic fallback for other checks: if there is check.params or check.params._self show JSON

    if (
      !ct.includes("employment") &&
      !ct.includes("education") &&
      !ct.includes("address") &&
      !ct.includes("national") &&
      !ct.includes("credit") &&
      !ct.includes("uan")
    ) {
      const params = check.params || {};
      if (params && Object.keys(params).length) {
        writeKV("Request Parameters", JSON.stringify(params));
      } // Show uploads guessed by checkType
      const guessed = docsFromUploads(
        new RegExp((check.checkType || "").replace(/\s+/g, "_"), "i")
      );
      writeDocs(guessed, "Uploaded Documents");
    } // Admin Verified Data (exclude detail1/2/3)

    y += 6;
    ensurePage(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Admin Verified Data", margin, y);
    y += 10;
    doc.setDrawColor(220);
    doc.line(margin, y, pageW - margin, y);
    y += 10;

    if (check.status) writeKV("Status", check.status);
    if (check.comments) writeKV("Comments", check.comments);

    if (check.verifiedData && typeof check.verifiedData === "object") {
      const detailKeys = ["detail1", "detail2", "detail3"].map((k) =>
        k.toString().toLowerCase()
      );
      const detailLines = []; // First pass: handle special detail keys (collect values) and prepare other entries

      Object.entries(check.verifiedData).forEach(([k, v]) => {
        if (v == null || v === "") return; // skip empty
        const keyLower = k.toString().toLowerCase();

        if (detailKeys.includes(keyLower)) {
          // push raw text value (stringify objects)
          if (typeof v === "object") detailLines.push(JSON.stringify(v));
          else detailLines.push(String(v));
          return;
        } // normal labelled rendering for other keys

        const label = k
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        writeKV(label, typeof v === "object" ? JSON.stringify(v) : String(v));
      }); // After other fields, render the detail lines (if any) as plain indented text (no label)

      if (detailLines.length) {
        // small spacer before detail lines
        y += 4;
        detailLines.forEach((line) => {
          ensurePage(lineH + 6); // indent to the value column used by writeKV: left margin + label width + gap
          const leftX = margin;
          const labelW = 120;
          const valueX = margin + labelW + 8;
          const avail = pageW - valueX - margin;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          const lines = doc.splitTextToSize(line, avail);
          doc.text(lines, valueX, y);
          y += Math.max(lineH, lines.length * (lineH - 2));
        });
        y += 4;
      }
    } // Verified documents: try check.verifiedFiles (ids) -> map to caseDetail.documents; else uploads with verified_ prefix

    const verifiedIds = (check.verifiedFiles || []).map(String);
    const matchedDocs = (caseDetail.documents || []).filter((d) =>
      verifiedIds.includes(String(d._id))
    );
    if (matchedDocs && matchedDocs.length) {
      writeDocs(matchedDocs, "Verified Documents (admin)");
    } else {
      const fk = `verified_${(check.checkType || "")
        .toString()
        .toLowerCase()
        .replace(/\s+/g, "_")}`;
      const fromUploads = (caseDetail.uploads || [])
        .filter((u) => (u.fieldKey || "") === fk)
        .map((u) => u.documentId || u.document)
        .filter(Boolean);
      if (fromUploads.length)
        writeDocs(fromUploads, "Verified Documents (admin)");
    } // small gap at bottom

    y += 12;
  }); // Now update summary page with page numbers.

  try {
    doc.setPage(1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    summaryRows.forEach((r, i) => {
      const pn = pageIndexForCheck[i] || "-";
      const px = pageW - margin; // position at the right edge of the content area
      const py = rowYPositions[i]; // Use the stored Y position for correct vertical alignment
      if (py) {
        // Ensure the y position was captured before drawing
        doc.text(`Pg ${pn}`, px, py, { align: "right" });
      }
    });
  } catch (e) {
    // ignore; the summary page attempt is best-effort and not critical
    console.warn("Could not annotate summary with page numbers:", e);
  } // Footer: page numbers & branding

  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("Orbit Verify", margin, pageH - 28);
    doc.text(`Page ${p} of ${pageCount}`, pageW / 2, pageH - 28, {
      align: "center",
    });
    doc.setTextColor(0, 0, 0);
  }

  const safeName = (
    caseDetail?.candidateInfo?.candidateName || "report"
  ).replace(/[^\w\-\._ ]/g, "_");
  doc.save(`${safeName}_Verification_Report.pdf`);
};
