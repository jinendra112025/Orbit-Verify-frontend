import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Grid,
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  CircularProgress,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  IconButton,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import api from "../../services/api";
import UploadCandidateDocumentsModal from "../../components/UploadCandidateDocumentsModal";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const getStatusColor = (status) => {
  switch (status) {
    case "Clear":
      return "success";
    case "Discrepant":
      return "error";
    case "Amber":
    case "Insufficiency":
      return "warning";
    case "Pending":
      return "default";
    default:
      return "default";
  }
};

const multiSectionChecks = ["employment_verification", "address_verification"];

const normalizeKey = (s = "") =>
  (s || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const humanizeCheckType = (s = "") => {
  if (!s) return "Untitled Check";
  return String(s)
    .replace(/[_\-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const resolveKeyVariants = (raw) => {
  const sRaw = (raw || "").toString();
  const lower = sRaw.toLowerCase();
  const underscored = lower.replace(/\s+/g, "_").replace(/[^\w_]/g, ""); // keep underscore
  const noUnderscore = lower.replace(/[^a-z0-9]/g, ""); // your existing normalizeKey behavior
  const keepUnderscoreNoSpaces = sRaw.toLowerCase().replace(/[^\w_]/g, ""); // preserves existing underscores
  return Array.from(
    new Set([sRaw, lower, underscored, keepUnderscoreNoSpaces, noUnderscore])
  );
};

const uniqDocs = (docs = []) => {
  const seen = new Set();
  const out = [];
  for (const d of docs || []) {
    if (!d) continue;
    const key =
      typeof d === "object" && (d._id || d.id)
        ? String(d._id || d.id)
        : (d && (d.originalFilename || d.filename || d.storageUrl || d.url)) ||
          JSON.stringify(d);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out;
};

const VerificationFields = ({
  checkIndex,
  subSectionKey,
  stagedVerifiedData,
  stagedComments,
  stagedVerifiedUploads,
  handleVerifiedFieldChange,
  handleCommentChange,
  handleStageFiles,
  removeStagedFile,
}) => {
  const getField = (key) =>
    stagedVerifiedData[checkIndex]?.[subSectionKey]?.[key] ?? "";
  const setField = (key, value) =>
    handleVerifiedFieldChange(checkIndex, subSectionKey, key, value);
  const getComment = () => stagedComments[checkIndex]?.[subSectionKey] ?? "";
  const setComment = (value) =>
    handleCommentChange(checkIndex, subSectionKey, value);
  const getFiles = () =>
    stagedVerifiedUploads[checkIndex]?.[subSectionKey] ?? [];

  return (
    <Box>
      <TextField
        label="Observation"
        value={getField("detail1")}
        onChange={(e) => setField("detail1", e.target.value)}
        fullWidth
        margin="dense"
      />
      <TextField
        label="Observation 1"
        value={getField("detail2")}
        onChange={(e) => setField("detail2", e.target.value)}
        fullWidth
        margin="dense"
      />
      <TextField
        label="Observation 2"
        value={getField("detail3")}
        onChange={(e) => setField("detail3", e.target.value)}
        fullWidth
        margin="dense"
      />

      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2">Verified Documents</Typography>
        <List dense>
          {getFiles().map((item, i) => (
            <ListItem key={i}>
              <ListItemText
                primary={item.persisted ? item.doc.originalFilename : item.name}
              />
              <IconButton
                edge="end"
                onClick={() => removeStagedFile(checkIndex, subSectionKey, i)}
              >
                <DeleteIcon />
              </IconButton>
            </ListItem>
          ))}
        </List>
        <Button variant="outlined" component="label" fullWidth>
          Stage Verified Doc
          <input
            type="file"
            hidden
            multiple
            onChange={(e) =>
              handleStageFiles(checkIndex, subSectionKey, e.target.files)
            }
          />
        </Button>
      </Box>

      <TextField
        label="Verification Comments"
        multiline
        rows={3}
        value={getComment()}
        onChange={(e) => setComment(e.target.value)}
        fullWidth
        margin="normal"
      />
    </Box>
  );
};

/**
 * AdminCaseDetailPage (refactored)
 * - Fetches case
 * - Displays one card per check
 * - Allows per-check save and Save All
 */
const AdminCaseDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseDetail, setCaseDetail] = useState(null);
  const [caseChecks, setCaseChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState("");
  const [stagedVerifiedData, setStagedVerifiedData] = useState({});
  const [stagedComments, setStagedComments] = useState({});
  const [stagedVerifiedUploads, setStagedVerifiedUploads] = useState({}); // { checkIndex: [File | {persisted, doc}] }
  const [openUploadModal, setOpenUploadModal] = useState(false);

  // fetch case & prepare initial state
  useEffect(() => {
    const fetchCase = async () => {
      setLoading(true);
      try {
        const resp = await api.get(`/cases/${id}`);
        const data = resp.data || {};
        console.log("FETCHED CASE:", resp.data);
        console.log("checks array:", resp.data.checks);
        console.log("uploads:", resp.data.uploads);
        console.log("documents:", resp.data.documents);

        data.documents = data.documents || [];
        data.uploads = data.uploads || [];
        data.checks = data.checks || [];
        data.education = data.education || [];

        // build map of docs by id
        const docsById = {};
        (data.documents || []).forEach((d) => {
          if (d && (d._id || d.id)) docsById[String(d._id || d.id)] = d;
        });

        // Normalize uploads and dedupe by document id (keep first occurrence for each doc)
        const uploadsNormalized = (() => {
          const arr = (data.uploads || [])
            .map((u) => {
              if (!u) return null;
              let docObj = null;
              if (
                u.documentId &&
                typeof u.documentId === "object" &&
                (u.documentId._id || u.documentId.id)
              ) {
                docObj = u.documentId;
              } else if (
                u.documentId &&
                (typeof u.documentId === "string" ||
                  typeof u.documentId === "number")
              ) {
                docObj = docsById[String(u.documentId)] || null;
              }
              return {
                fieldKey: u.fieldKey || "",
                document: docObj,
                originalDocumentId: u.documentId || null,
              };
            })
            .filter(Boolean);

          // dedupe by compound key: `${fieldKey}::${docId || originalDocumentId || (filename)}`
          const seen = new Set();
          const out = [];
          for (const it of arr) {
            const docId = it.document && (it.document._id || it.document.id);
            const base = String(it.fieldKey || "");
            const keyCandidates = [
              docId ? String(docId) : null,
              it.originalDocumentId ? String(it.originalDocumentId) : null,
              (it.document &&
                (it.document.originalFilename || it.document.filename)) ||
                null,
            ];
            const compKey = `${base}::${
              keyCandidates.find(Boolean) || JSON.stringify(it)
            }`;
            if (seen.has(compKey)) continue;
            seen.add(compKey);
            out.push(it);
          }
          return out;
        })();

        // build stagedVerifiedUploads from uploadsNormalized (look for keys that start with verified_)
        const initialStagedUploads = {};
        (uploadsNormalized || []).forEach((up) => {
          const fk = (up.fieldKey || "").toLowerCase();
          if (!fk.startsWith("verified_")) return;
          // fk is like verified_address_verification or verified_credit_history...
          const key = fk.replace("verified_", "");
          // try to find matching checkIndex by comparing normalized checkType
          let matchedIndex = -1;
          (data.checks || []).forEach((ch, idx) => {
            const ctNorm = normalizeKey(ch.checkType || "");
            if (!ctNorm) return;
            if (
              ctNorm.includes(normalizeKey(key)) ||
              normalizeKey(key).includes(ctNorm)
            ) {
              matchedIndex = idx;
            }
          });
          if (matchedIndex !== -1) {
            initialStagedUploads[matchedIndex] =
              initialStagedUploads[matchedIndex] || [];
            // persisted style entry:
            if (up.document)
              initialStagedUploads[matchedIndex].push({
                persisted: true,
                doc: up.document,
              });
          }
        });

        // staged verifiedData and comments initialization (from case checks)
        const initialVerifiedData = {};
        const initialComments = {};
        (data.checks || []).forEach((check, idx) => {
          // Initialize with nested objects to store sub-section data
          initialVerifiedData[idx] =
            check.verifiedData && typeof check.verifiedData === "object"
              ? check.verifiedData
              : {};
          initialComments[idx] =
            check.comments && typeof check.comments === "object"
              ? check.comments
              : {};
        });

        setCaseDetail({ ...data, uploadsNormalized });
        setCaseChecks(data.checks || []);
        setStagedVerifiedUploads(initialStagedUploads);
        setStagedVerifiedData(initialVerifiedData);
        setStagedComments(initialComments);
      } catch (err) {
        console.error("Failed to fetch case details:", err);
        setMessage("Failed to load case");
      } finally {
        setLoading(false);
      }
    };

    fetchCase();
  }, [id]);

  const structuredCheckData = {
    address_verification: (cd) => cd?.addressVerification,
    credit_history_check: (cd) => cd?.creditCheck,
    education_verification: (cd) => cd?.education,
    employment_verification: (cd) => cd?.employment,
    gap_analysis: (cd) => ({
      explanation: cd?.gapExplanation,
      employment: cd?.employment,
    }),
    global_database: (cd) => cd?.globalDatabase,
    national_id_verification: (cd) => cd?.nationalId,
    uan: (cd) => cd?.uan,
    reference_checks: (cd) => cd?.references,
    social_media_screening: (cd) => cd?.socialProfiles,
    police_verification: (cd) => cd?.policeVerification,
    drug_panel_tests: (cd) => cd?.drugPanel,
    directorship_check: (cd) => cd?.directorship,
    court_record_check: (cd) => cd?.courtRecord,
    other_documents: (cd) => cd?.otherDocuments,
  };

  const uploadsMapping = {
    address_verification: ["address_verification", "address_proof"],
    credit_history_check: [
      "credit_history_check",
      "credit_check",
      "credit_report",
    ],
    directorship_check: ["directorship_check"],
    drug_panel_tests: ["drug_panel_tests"],
    court_record_check: ["court_record_check"],
    education_verification: ["education_verification", "educationdocuments"],
    employment_verification: ["employment_verification", "employment_proof"],
    gap_analysis: ["gap_analysis"],
    global_database: ["global_database"],
    national_id_verification: [
      "national_id_verification",
      "national_id",
      "national_id_proof",
    ],
    other_documents: ["other_documents", "general"],
    police_verification: ["police_verification"],
    reference_checks: ["reference_checks"],
    social_media_screening: ["social_media_screening"],
    uan: ["uan", "uan_proof"],
  };

  const findStructuredKey = (checkType = "") => {
    const n = normalizeKey(checkType || "");
    return (
      Object.keys(structuredCheckData).find((k) => {
        const kn = normalizeKey(k);
        return kn === n || n.includes(kn) || kn.includes(n);
      }) || null
    );
  };

  const findUploadsKeysFor = (checkType = "") => {
    const n = normalizeKey(checkType || "");
    const found = Object.keys(uploadsMapping).find((k) => {
      const kn = normalizeKey(k);
      return kn === n || n.includes(kn) || kn.includes(n);
    });
    return found ? uploadsMapping[found] || [] : [];
  };

  // Helpers ----------------------------------------------------------

  // pick candidate-uploaded docs for a given fieldKey (non-verified uploads)
  const getUploadsForField = (fieldKey) => {
    if (!caseDetail || !fieldKey) return [];

    const fkLower = String(fieldKey).toLowerCase();
    const allUploads = caseDetail.uploadsNormalized || [];

    // 1. Exact Match (Highest Priority)
    const exactMatches = allUploads.filter(
      (u) => String(u.fieldKey).toLowerCase() === fkLower
    );
    if (exactMatches.length > 0) {
      return uniqDocs(exactMatches.map((u) => u.document).filter(Boolean));
    }

    // 2. Starts With Match (Good for keys like 'education_verification__document_0')
    const startsWithMatches = allUploads.filter((u) =>
      String(u.fieldKey).toLowerCase().startsWith(fkLower)
    );
    if (startsWithMatches.length > 0) {
      return uniqDocs(startsWithMatches.map((u) => u.document).filter(Boolean));
    }

    // 3. Fallback to broader 'includes' search (Last resort, less reliable)
    const includesMatches = allUploads.filter((u) =>
      String(u.fieldKey).toLowerCase().includes(fkLower)
    );
    if (includesMatches.length > 0) {
      return uniqDocs(includesMatches.map((u) => u.document).filter(Boolean));
    }

    return [];
  };

  const handleDownloadReport = async () => {
    setIsUpdating(true);
    setMessage(
      "Generating report... This may take a minute for cases with many images."
    );

    try {
      const response = await api.get(`/cases/${id}/report`, {
        responseType: "blob",
        timeout: 120000, // 2 minutes timeout
        onDownloadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setMessage(`Downloading report... ${percentCompleted}%`);
        },
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      let filename = "Verification_Report.pdf";
      const contentDisposition = response.headers["content-disposition"];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
        );
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, "");
        }
      }

      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      setMessage("Report downloaded successfully.");
    } catch (err) {
      console.error("Failed to download report:", err);
      if (err.code === "ECONNABORTED") {
        setMessage(
          "Report generation timed out. Please try again or contact support if the issue persists."
        );
      } else {
        setMessage("Failed to download report. Please try again.");
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // File staging for verified uploads (per-check)
  const handleStageFiles = (checkIndex, subSectionKey, files) => {
    setStagedVerifiedUploads((prev) => {
      const next = { ...prev };
      next[checkIndex] = next[checkIndex] || {};
      next[checkIndex][subSectionKey] = next[checkIndex][subSectionKey] || [];
      next[checkIndex][subSectionKey] = next[checkIndex][subSectionKey].concat(
        Array.from(files)
      );
      return next;
    });
  };

  const removeStagedFile = (checkIndex, subSectionKey, fileIdx) => {
    setStagedVerifiedUploads((prev) => {
      const next = { ...prev };
      if (!next[checkIndex] || !next[checkIndex][subSectionKey]) return prev;
      next[checkIndex][subSectionKey] = next[checkIndex][subSectionKey].filter(
        (_, i) => i !== fileIdx
      );
      return next;
    });
  };

  // handle changing verified fields
  const handleVerifiedFieldChange = (
    checkIndex,
    subSectionKey,
    field,
    value
  ) => {
    setStagedVerifiedData((prev) => ({
      ...prev,
      [checkIndex]: {
        ...(prev[checkIndex] || {}),
        [subSectionKey]: {
          ...((prev[checkIndex] && prev[checkIndex][subSectionKey]) || {}),
          [field]: value,
        },
      },
    }));
  };

  // handle comment changes
  const handleCommentChange = (checkIndex, subSectionKey, value) => {
    setStagedComments((prev) => ({
      ...prev,
      [checkIndex]: {
        ...(prev[checkIndex] || {}),
        [subSectionKey]: value,
      },
    }));
  };

  // handle status change locally
  const handleStatusChange = (checkIndex, newStatus) => {
    setCaseChecks((prev) =>
      prev.map((c, i) => (i === checkIndex ? { ...c, status: newStatus } : c))
    );
  };

  const handleSaveCheck = async (checkIndex) => {
    setIsUpdating(true);
    try {
      const fd = new FormData();
      fd.append("caseId", id);

      // Build updated checks payload
      const checksPayload = caseChecks.map((check, idx) => {
        if (idx === checkIndex) {
          const checkType = check.checkType || "";
          const isMultiSection = multiSectionChecks.includes(checkType);

          // For multi-section checks, comments should be an object
          // For single-section checks, extract the string comment
          let commentsToSave;
          if (isMultiSection) {
            // Keep as nested object: { current: "...", previous: "..." }
            commentsToSave = stagedComments[checkIndex] || {};
          } else {
            // Extract the string comment from _default key
            const commentObj = stagedComments[checkIndex] || {};
            commentsToSave =
              typeof commentObj === "string"
                ? commentObj
                : commentObj._default || commentObj.value || "";
          }

          return {
            ...check,
            status: caseChecks[checkIndex]?.status || "Pending",
            verifiedData: stagedVerifiedData[checkIndex] || {},
            comments: commentsToSave,
          };
        }
        return check;
      });
      fd.append("checks", JSON.stringify(checksPayload));

      // Handle verified file uploads (dedupe by name+size)
      const verifiedFileKeys = [];
      const uploadsForCheck = stagedVerifiedUploads[checkIndex] || {}; // This is an object e.g., { current: [File], previous: [File] }
      const seenFiles = new Set();

      // A single, correct loop structure
      Object.entries(uploadsForCheck).forEach(([subSectionKey, files]) => {
        (files || []).forEach((file) => {
          if (!file || file.persisted) return; // Skip persisted files

          const key = `${file.name || ""}::${file.size || 0}`;
          if (seenFiles.has(key)) return; // Skip duplicates
          seenFiles.add(key);

          fd.append("verifiedFiles", file);
          verifiedFileKeys.push({
            filename: file.name,
            checkIndex: Number(checkIndex), // Ensure it's a number
            checkType: caseChecks[checkIndex]?.checkType || "",
            subSectionKey: subSectionKey,
          });
        });
      });

      fd.append("verifiedFileKeys", JSON.stringify(verifiedFileKeys));

      // API call
      const resp = await api.put(`/cases/${id}`, fd);
      const updated = resp.data || {};
      console.log("API response updated:", updated);
      console.log("updated.checks:", updated.checks);
      console.log("current caseChecks before setCaseChecks:", caseChecks);

      // Merge case detail safely
      setCaseDetail((prev) => ({
        ...prev,
        ...updated,
        uploadsNormalized: prev?.uploadsNormalized || updated.uploadsNormalized,
      }));

      // ---- Preserve display names when merging updated checks ----
      const updatedChecksFromServer = Array.isArray(updated.checks)
        ? updated.checks
        : [];

      setCaseChecks((prevChecks = []) => {
        // 1) Seed map with previous checks (preserve order)
        const prevMap = new Map();
        (prevChecks || []).forEach((c, i) => {
          const raw =
            c._displayName ||
            c.displayName ||
            c.checkType ||
            c._normalized ||
            "";
          const nk = normalizeKey(raw) || `__prev_${i}`; // fallback key
          prevMap.set(nk, { ...c });
        });

        // 2) Merge server-updated checks into map (preserve _displayName from prev where present)
        updatedChecksFromServer.forEach((uc, uidx) => {
          const raw =
            uc._displayName ||
            uc.displayName ||
            uc.checkType ||
            uc._normalized ||
            "";
          const nk = normalizeKey(raw) || `__srv_${uidx}`; // fallback
          const prev = prevMap.get(nk) || {};
          const preservedDisplay =
            prev._displayName ||
            uc._displayName ||
            uc.displayName ||
            humanizeCheckType(uc.checkType);
          prevMap.set(nk, {
            ...prev,
            ...uc,
            _displayName: preservedDisplay,
            _normalized:
              normalizeKey(
                uc.checkType || uc._normalized || preservedDisplay
              ) || `k_${uidx}`,
          });
        });

        // 3) Build ordered result: keep previous order, then append any server-only items in server order
        const result = [];
        const seen = new Set();

        (prevChecks || []).forEach((c, i) => {
          const raw =
            c._displayName ||
            c.displayName ||
            c.checkType ||
            c._normalized ||
            "";
          const nk = normalizeKey(raw) || `__prev_${i}`;
          if (prevMap.has(nk) && !seen.has(nk)) {
            result.push(prevMap.get(nk));
            seen.add(nk);
          }
        });

        // append server-only (new) checks
        updatedChecksFromServer.forEach((uc, uidx) => {
          const raw =
            uc._displayName ||
            uc.displayName ||
            uc.checkType ||
            uc._normalized ||
            "";
          const nk = normalizeKey(raw) || `__srv_${uidx}`;
          if (prevMap.has(nk) && !seen.has(nk)) {
            result.push(prevMap.get(nk));
            seen.add(nk);
          }
        });

        return result;
      });

      // ---- Find the saved check by normalized key (not by index) ----
      const prevCheck = (caseChecks || [])[checkIndex] || {};
      const prevKeyRaw =
        prevCheck._displayName ||
        prevCheck.displayName ||
        prevCheck.checkType ||
        prevCheck._normalized ||
        "";
      const prevNormalizedKey = normalizeKey(prevKeyRaw) || null;

      let savedCheck = null;
      if (prevNormalizedKey) {
        savedCheck =
          (updated.checks || []).find((ch) => {
            const chKeyRaw =
              ch._displayName ||
              ch.displayName ||
              ch.checkType ||
              ch._normalized ||
              "";
            return normalizeKey(chKeyRaw) === prevNormalizedKey;
          }) || null;
      }
      // fallback: if not found, if updated.checks has a single item, use that (common server behavior)
      if (!savedCheck && (updated.checks || []).length === 1) {
        savedCheck = updated.checks[0];
      }

      // ---- Update staged data for saved check using found savedCheck ----
      if (savedCheck) {
        let vd = {};
        if (
          savedCheck.verifiedData &&
          typeof savedCheck.verifiedData === "object"
        ) {
          vd = { ...savedCheck.verifiedData };
        } else if (typeof savedCheck.verifiedData === "string") {
          try {
            vd = JSON.parse(savedCheck.verifiedData);
          } catch {
            vd = { value: savedCheck.verifiedData };
          }
        }

        // set staged verified data and comments by aligning them to the same index as before
        setStagedVerifiedData((prev) => ({ ...prev, [checkIndex]: vd }));
        setStagedComments((prev) => ({
          ...prev,
          [checkIndex]:
            typeof savedCheck.comments === "string" ? savedCheck.comments : "",
        }));
      }

      // ---- Update staged uploads for the saved check (map using server uploads) ----
      const newUploads = {};
      (updated.uploads || []).forEach((u) => {
        const fk = (u.fieldKey || "").toString();
        if (fk.startsWith("verified_")) {
          const checkType = fk.replace("verified_", "");
          const idxFound = (updated.checks || []).findIndex((ch) => {
            const chVariants = resolveKeyVariants(ch.checkType || "");
            return chVariants.some((v) =>
              normalizeKey(v).includes(normalizeKey(checkType))
            );
          });
          if (idxFound >= 0) {
            newUploads[idxFound] = newUploads[idxFound] || [];
            if (u.documentId) {
              let docObj = u.documentId;
              if (typeof docObj === "string" || typeof docObj === "number") {
                docObj = (updated.documents || []).find(
                  (d) => String(d._id || d.id) === String(u.documentId)
                ) || { _id: u.documentId };
              }
              newUploads[idxFound].push({ persisted: true, doc: docObj });
            }
          }
        }
      });

      setStagedVerifiedUploads((prev) => ({
        ...prev,
        [checkIndex]: newUploads[checkIndex] || [],
      }));

      setMessage("Check saved successfully");
    } catch (err) {
      console.error("Failed to save check:", err);
      setMessage("Failed to save check");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveAll = async () => {
    setIsUpdating(true);
    try {
      const fd = new FormData();

      const checksPayload = (caseChecks || []).map((check, idx) => {
        const checkType = check.checkType || "";
        const isMultiSection = multiSectionChecks.includes(checkType);

        let commentsToSave;
        if (isMultiSection) {
          commentsToSave = stagedComments[idx] || {};
        } else {
          const commentObj = stagedComments[idx] || {};
          commentsToSave =
            typeof commentObj === "string"
              ? commentObj
              : commentObj._default || commentObj.value || "";
        }

        return {
          ...check,
          comments: commentsToSave,
          verifiedData: stagedVerifiedData[idx] ?? check.verifiedData ?? {},
        };
      });

      fd.append("checks", JSON.stringify(checksPayload));
      // The separate, conflicting payloads for verifiedData and comments are no longer needed.
      // --- FIX END ---

      // attach all staged verified files and build mapping - dedupe globally by filename+size
      const verifiedFileKeys = [];
      const seenAll = new Set();
      Object.entries(stagedVerifiedUploads).forEach(([idx, items]) => {
        (items || []).forEach((it) => {
          if (!it || it.persisted) return;
          const k = `${it.name || ""}::${it.size || 0}`;
          if (seenAll.has(k)) return;
          seenAll.add(k);

          fd.append("verifiedFiles", it);
          verifiedFileKeys.push({
            filename: it.name,
            checkIndex: Number(idx),
            checkType: caseChecks[Number(idx)]?.checkType || "",
          });
        });
      });
      fd.append("verifiedFileKeys", JSON.stringify(verifiedFileKeys));

      const resp = await api.put(`/cases/${id}`, fd);
      const updated = resp.data;

      // After a successful save all, we can navigate away.
      // The existing logic to update state is fine but often redundant if navigating.
      setMessage("All changes saved successfully");
      navigate("/admin");
    } catch (err) {
      console.error("Save all failed:", err);
      setMessage("Failed to save changes");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUploadSuccess = (updatedCase) => {
    // Update case detail with new data
    setCaseDetail(updatedCase);
    setCaseChecks(updatedCase.checks || []);
    setMessage("Documents uploaded successfully!");

    // Refresh the page data
    window.location.reload(); // Simple refresh, or implement a more elegant state update
  };

  const renderCandidateSubmission = (check) => {
    const rawCheckType = (check && check.checkType) || "";
    const key = normalizeKey(rawCheckType || "");

    // The single source of truth for check-specific data is now `check.params`
    const params = check.params || {};

    // Helper to render a list of documents
    const DocList = ({ docs = [] }) => {
      const arr = uniqDocs(Array.isArray(docs) ? docs : docs ? [docs] : []);
      if (!arr.length) return null;

      return (
        <>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: "block" }}
          >
            Uploaded Documents:
          </Typography>
          <List dense sx={{ mb: 1 }}>
            {arr.map((doc) => {
              if (!doc || !doc._id) return null;
              const url = doc.storageUrl || "#";
              const name = doc.originalFilename || doc._id || "Document";
              return (
                <ListItem
                  key={doc._id}
                  button
                  onClick={async () => {
                    try {
                      const res = await fetch(
                        `https://orbit-verify-server.onrender.com/api/documents/${
                          doc._id
                        }/download?token=${localStorage.getItem("token")}`
                      );
                      const data = await res.json();
                      if (data.url) {
                        window.open(data.url, "_blank"); // open the signed S3 URL
                      } else {
                        alert("Unable to fetch download link");
                      }
                    } catch (err) {
                      alert("Download failed");
                      console.error(err);
                    }
                  }}
                >
                  <ListItemText primary={name} />
                </ListItem>
              );
            })}
          </List>
        </>
      );
    };

    // Find all documents related to this check using the improved logic
    const uploadKeys = findUploadsKeysFor(rawCheckType);
    const uploadsMapped = uniqDocs(
      uploadKeys.flatMap((fk) => getUploadsForField(fk))
    );

    // 2) candidate uploads not in uploads mapping but linked through Document.checkType
    const candidateDocs = uniqDocs(
      (caseDetail.documents || []).filter(
        (d) =>
          d &&
          !d.originalFilename?.startsWith("[VERIFIED]") &&
          normalizeKey(d.checkType) === key
      )
    );

    // Final combined list
    const uploads = uniqDocs([...uploadsMapped, ...candidateDocs]);

    // Helper to check if an object has any meaningful data
    const hasAnyValue = (obj) => {
      if (!obj || typeof obj !== "object") return false;
      return Object.values(obj).some(
        (v) => v !== null && v !== undefined && String(v).trim() !== ""
      );
    };

    // --- EDUCATION (This check uses a separate top-level field `caseDetail.education`) ---
    if (key.includes("education")) {
      // OLD CODE - DELETE THIS:
      // const edu = caseDetail.education || [];

      // NEW CODE - Use check.params.list instead:
      const educationList = params.list || [];

      // Fallback: also check old structure for backward compatibility
      const legacyEdu = caseDetail.education || [];

      // Combine both sources (prefer params.list)
      const allEducation = educationList.length > 0 ? educationList : legacyEdu;

      if (!allEducation.length && !uploads.length) {
        return (
          <Typography color="text.secondary">
            No education details submitted.
          </Typography>
        );
      }

      return (
        <>
          {allEducation.map((e, i) => (
            <Box
              key={i}
              sx={{
                mb: 2,
                p: 1.5,
                bgcolor: "grey.50",
                borderRadius: 1,
                border: "1px solid #e0e0e0",
              }}
            >
              {/* Entry Header */}
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Chip
                  label={`Entry #${i + 1}`}
                  size="small"
                  sx={{ mr: 1, backgroundColor: "#e3f2fd" }}
                />
                {e.providedBy === "candidate" && (
                  <Chip
                    label="Candidate Provided"
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                )}
              </Box>

              {/* Education Details */}
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                {e.university || "—"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {e.degree || "—"} {e.year ? `(${e.year})` : ""}
              </Typography>

              {/* Timestamp */}
              {e.providedAt && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.5 }}
                >
                  Submitted: {new Date(e.providedAt).toLocaleString()}
                </Typography>
              )}

              {/* Documents for this specific entry */}
              {e.documents && e.documents.length > 0 && (
                <Box sx={{ mt: 1, pt: 1, borderTop: "1px solid #e0e0e0" }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600 }}
                  >
                    📎 Documents for this entry:
                  </Typography>
                  <List dense sx={{ mt: 0.5 }}>
                    {e.documents.map((docId, docIdx) => {
                      // Find the document object from caseDetail.documents
                      const doc = (caseDetail.documents || []).find(
                        (d) => String(d._id || d.id) === String(docId)
                      );

                      if (!doc) return null;

                      return (
                        <ListItem
                          key={docIdx}
                          button
                          onClick={async () => {
                            try {
                              const res = await fetch(
                                `https://orbit-verify-server.onrender.com/api/documents/${
                                  doc._id
                                }/download?token=${localStorage.getItem(
                                  "token"
                                )}`
                              );
                              const data = await res.json();
                              if (data.url) {
                                window.open(data.url, "_blank");
                              } else {
                                alert("Unable to fetch download link");
                              }
                            } catch (err) {
                              alert("Download failed");
                              console.error(err);
                            }
                          }}
                          sx={{
                            py: 0.5,
                            px: 1,
                            backgroundColor: "white",
                            border: "1px solid #e0e0e0",
                            borderRadius: 0.5,
                            mb: 0.5,
                            "&:hover": {
                              backgroundColor: "#f5f5f5",
                            },
                          }}
                        >
                          <ListItemText
                            primary={
                              doc.originalFilename || doc._id || "Document"
                            }
                            primaryTypographyProps={{ variant: "body2" }}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              )}
            </Box>
          ))}

          {/* General education documents not linked to specific entries */}
          {uploads.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", fontWeight: 600, mb: 1 }}
              >
                📎 Additional Education Documents:
              </Typography>
              <DocList docs={uploads} />
            </Box>
          )}
        </>
      );
    }

    // --- EMPLOYMENT VERIFICATION [FIXED] ---
    if (key.includes("employment")) {
      // Data source changed from caseDetail.employment to check.params
      const current = params.current || {};
      const previous = params.previous || {};
      const currentHasData = hasAnyValue(current);
      const previousHasData = hasAnyValue(previous);

      if (!currentHasData && !previousHasData && !uploads.length) {
        return (
          <Typography color="text.secondary">
            No employment details submitted.
          </Typography>
        );
      }
      return (
        <>
          {currentHasData && (
            <Box sx={{ mb: 1, p: 1, bgcolor: "grey.50", borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Current:</strong>
              </Typography>
              <Typography variant="body2">
                Org: {current.organization || "—"}
              </Typography>
              <Typography variant="body2">
                Designation: {current.designation || "—"}
              </Typography>
              <Typography variant="body2">
                Tenure: {current.tenure || "—"}
              </Typography>
            </Box>
          )}
          {previousHasData && (
            <Box sx={{ mb: 1, p: 1, bgcolor: "grey.50", borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Previous:</strong>
              </Typography>
              <Typography variant="body2">
                Org: {previous.organization || "—"}
              </Typography>
              <Typography variant="body2">
                Designation: {previous.designation || "—"}
              </Typography>
              <Typography variant="body2">
                Tenure: {previous.tenure || "—"}
              </Typography>
            </Box>
          )}
          <DocList docs={uploads} />
        </>
      );
    }

    // --- ADDRESS VERIFICATION [FIXED] ---
    if (key.includes("address")) {
      // Data source changed from caseDetail.addressVerification to check.params
      const current = params.current || {};
      const permanent = params.permanent || {};
      const currentHasData = hasAnyValue(current);
      const permanentHasData = hasAnyValue(permanent);

      if (!currentHasData && !permanentHasData && !uploads.length)
        return (
          <Typography color="text.secondary">
            No address details submitted.
          </Typography>
        );
      return (
        <>
          {currentHasData && (
            <Box sx={{ mb: 1, p: 1, bgcolor: "grey.50", borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Current Address</strong>
              </Typography>
              <Typography variant="body2">{current.line1 || "—"}</Typography>
              <Typography variant="body2">
                {[current.city, current.pincode].filter(Boolean).join(", ")}
              </Typography>
            </Box>
          )}
          {permanentHasData && (
            <Box sx={{ mb: 1, p: 1, bgcolor: "grey.50", borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Permanent Address</strong>
              </Typography>
              <Typography variant="body2">{permanent.line1 || "—"}</Typography>
              <Typography variant="body2">
                {[permanent.city, permanent.pincode].filter(Boolean).join(", ")}
              </Typography>
            </Box>
          )}
          <DocList docs={uploads} />
        </>
      );
    }

    // --- UAN [FIXED] ---
    if (key.includes("uan")) {
      // Data source changed from caseDetail.uan to check.params
      if (!hasAnyValue(params) && !uploads.length)
        return (
          <Typography color="text.secondary">
            No UAN details submitted.
          </Typography>
        );
      return (
        <>
          <Box sx={{ mb: 1, p: 1, bgcolor: "grey.50", borderRadius: 1 }}>
            {/* Check for both uan and uanNumber for flexibility */}
            {(params.uan || params.uanNumber) && (
              <Typography variant="body2">
                <strong>UAN Number:</strong> {params.uan || params.uanNumber}
              </Typography>
            )}
            {params.aadhaar && (
              <Typography variant="body2">
                <strong>Aadhaar:</strong> {params.aadhaar}
              </Typography>
            )}
          </Box>
          <DocList docs={uploads} />
        </>
      );
    }

    // --- CREDIT HISTORY CHECK [FIXED] ---
    if (key.includes("credit")) {
      // Data source changed from caseDetail.creditCheck to check.params
      if (!hasAnyValue(params) && !uploads.length)
        return (
          <Typography color="text.secondary">
            No Credit Check details submitted.
          </Typography>
        );
      return (
        <>
          <Box sx={{ mb: 1, p: 1, bgcolor: "grey.50", borderRadius: 1 }}>
            {params.candidateName && (
              <Typography variant="body2">
                <strong>Candidate Name:</strong> {params.candidateName}
              </Typography>
            )}
            {params.pan && (
              <Typography variant="body2">
                <strong>PAN:</strong> {params.pan}
              </Typography>
            )}
            {params.aadhaar && (
              <Typography variant="body2">
                <strong>Aadhaar:</strong> {params.aadhaar}
              </Typography>
            )}
            {params.address && (
              <Typography variant="body2">
                <strong>Address:</strong> {params.address}
              </Typography>
            )}
            {/* Also checking for dob since it's in the log */}
            {params.dob && (
              <Typography variant="body2">
                <strong>Date of Birth:</strong> {params.dob}
              </Typography>
            )}
          </Box>
          <DocList docs={uploads} />
        </>
      );
    }

    // --- GLOBAL DATABASE [FIXED] ---
    if (key.includes("global")) {
      // Data source changed from caseDetail.globalDatabase to check.params
      if (!hasAnyValue(params) && !uploads.length)
        return (
          <Typography color="text.secondary">
            No Global Database details submitted.
          </Typography>
        );
      return (
        <>
          <Box sx={{ mb: 1, p: 1, bgcolor: "grey.50", borderRadius: 1 }}>
            {params.candidateName && (
              <Typography variant="body2">
                <strong>Candidate Name:</strong> {params.candidateName}
              </Typography>
            )}
            {/* Added check to only display DOB if it has a value */}
            {params.dob && (
              <Typography variant="body2">
                <strong>Date of Birth:</strong>{" "}
                {new Date(params.dob).toLocaleDateString()}
              </Typography>
            )}
            {params.address && (
              <Typography variant="body2">
                <strong>Address:</strong> {params.address}
              </Typography>
            )}
          </Box>
          <DocList docs={uploads} />
        </>
      );
    }

    // --- REFERENCE CHECKS [FIXED] ---
    if (key.includes("reference")) {
      // Logic updated to handle different key names like 'name' vs 'refName'
      const refSections = Object.entries(params).filter(
        ([, val]) => val && typeof val === "object"
      );

      if (!refSections.length && !uploads.length)
        return (
          <Typography color="text.secondary">
            No reference details submitted.
          </Typography>
        );

      return (
        <>
          {refSections.map(([sectionName, sectionObj], i) => {
            const name = sectionObj.name || sectionObj.refName;
            const phone = sectionObj.phone || sectionObj.refPhone;
            const email = sectionObj.email || sectionObj.refEmail;
            const relation = sectionObj.relation;
            const designation = sectionObj.refDesignation;

            return (
              <Box
                key={i}
                sx={{ mb: 1, p: 1, bgcolor: "grey.50", borderRadius: 1 }}
              >
                <Typography
                  variant="body2"
                  sx={{ textTransform: "capitalize", fontWeight: 600 }}
                >
                  {sectionName.replace(/_/g, " ")}
                </Typography>
                {name && (
                  <Typography variant="body2">
                    <strong>Name:</strong> {name}
                  </Typography>
                )}
                {phone && (
                  <Typography variant="body2">
                    <strong>Phone:</strong> {phone}
                  </Typography>
                )}
                {email && (
                  <Typography variant="body2">
                    <strong>Email:</strong> {email}
                  </Typography>
                )}
                {relation && (
                  <Typography variant="body2">
                    <strong>Relation:</strong> {relation}
                  </Typography>
                )}
                {designation && (
                  <Typography variant="body2">
                    <strong>Designation:</strong> {designation}
                  </Typography>
                )}
              </Box>
            );
          })}
          <DocList docs={uploads} />
        </>
      );
    }

    // --- GENERIC FALLBACK for any other checks (National ID, Directorship, etc.) ---
    // This part should work for the remaining checks as it already uses `check.params`
    const paramsData = check.params?._self || check.params || {};
    if (hasAnyValue(paramsData) || uploads.length) {
      return (
        <>
          {hasAnyValue(paramsData) && (
            <Box sx={{ mb: 1, p: 1, bgcolor: "grey.50", borderRadius: 1 }}>
              {Object.entries(paramsData).map(
                ([k, v]) =>
                  v && (
                    <Typography key={k} variant="body2">
                      <strong>{k.charAt(0).toUpperCase() + k.slice(1)}:</strong>{" "}
                      {String(v)}
                    </Typography>
                  )
              )}
            </Box>
          )}
          <DocList docs={uploads} />
        </>
      );
    }

    return (
      <Typography color="text.secondary">
        No candidate-submitted data for this check.
      </Typography>
    );
  };

  const renderAdminReview = (check, index) => {
    const checkType = check.checkType || "";

    // Determine if this check has sub-sections based on candidate's submitted `params`
    const subSectionKeys =
      multiSectionChecks.includes(checkType) && check.params
        ? Object.keys(check.params).filter(
            (key) =>
              typeof check.params[key] === "object" &&
              key !== "_self" &&
              key !== "preferences"
          )
        : ["_default"]; // Use a default key for single-section checks

    return (
      <>
        {subSectionKeys.map((subKey) => (
          <Box key={subKey} sx={{ mb: subSectionKeys.length > 1 ? 3 : 0 }}>
            {subSectionKeys.length > 1 && (
              <>
                <Typography
                  variant="subtitle1"
                  sx={{ textTransform: "capitalize", fontWeight: "bold" }}
                >
                  {humanizeCheckType(subKey)}
                </Typography>
                <Divider sx={{ my: 1 }} />
              </>
            )}
            <VerificationFields
              checkIndex={index}
              subSectionKey={subKey}
              stagedVerifiedData={stagedVerifiedData}
              stagedComments={stagedComments}
              stagedVerifiedUploads={stagedVerifiedUploads}
              handleVerifiedFieldChange={handleVerifiedFieldChange}
              handleCommentChange={handleCommentChange}
              handleStageFiles={handleStageFiles}
              removeStagedFile={removeStagedFile}
            />
          </Box>
        ))}

        {/* Status is per-check, not per-subsection, so it stays outside the loop */}
        <FormControl fullWidth margin="normal">
          <InputLabel>Update Status</InputLabel>
          <Select
            value={caseChecks[index]?.status || "Pending"}
            label="Update Status"
            onChange={(e) => handleStatusChange(index, e.target.value)}
          >
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Clear">Clear</MenuItem>
            <MenuItem value="Discrepant">Discrepant</MenuItem>
            <MenuItem value="Insufficiency">Insufficiency</MenuItem>
            <MenuItem value="On Hold">On Hold</MenuItem>
            {/* You may want to add your "Completed" statuses here too */}
          </Select>
        </FormControl>
      </>
    );
  };

  // Page -------------------------------------------------------------

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  if (!caseDetail)
    return (
      <Typography variant="h6" align="center" mt={4}>
        Case not found.
      </Typography>
    );

  return (
    <Grid container spacing={3}>
      {/* Left summary */}
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3, position: "sticky", top: 88 }}>
          <Typography variant="h6">Case Summary</Typography>
          <Typography>
            <strong>Candidate:</strong>{" "}
            {caseDetail.candidateInfo?.candidateName}
          </Typography>
          <Typography>
            <strong>Father's Name:</strong>{" "}
            {caseDetail.candidateInfo?.fatherName}
          </Typography>
          <Typography>
            <strong>Email:</strong> {caseDetail.candidateInfo?.email}
          </Typography>
          <Typography>
            <strong>Contact:</strong>{" "}
            {caseDetail.candidateInfo?.contactNumber || "N/A"}
          </Typography>
          <Typography>
            <strong>Designation:</strong>{" "}
            {caseDetail.candidateInfo?.designation || "N/A"}
          </Typography>
          <Typography>
            <strong>Client:</strong>{" "}
            {caseDetail.clientOrganization?.name || "N/A"}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Button
            variant="contained"
            startIcon={
              isUpdating ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <DownloadIcon />
              )
            }
            fullWidth
            onClick={handleDownloadReport}
            disabled={isUpdating}
          >
            {isUpdating ? "Generating..." : "Download PDF Report"}
          </Button>

          <Button
            variant="contained"
            color="secondary"
            startIcon={<CloudUploadIcon />}
            fullWidth
            onClick={() => setOpenUploadModal(true)}
            sx={{ mt: 2 }}
          >
            Upload Documents
          </Button>

          {message && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {message}
            </Alert>
          )}
        </Paper>
        <UploadCandidateDocumentsModal
          open={openUploadModal}
          onClose={() => setOpenUploadModal(false)}
          caseData={caseDetail}
          onUploadSuccess={handleUploadSuccess}
        />
      </Grid>

      {/* Right: checks as cards */}
      <Grid item xs={12} md={8}>
        <Typography variant="h5" gutterBottom>
          Verification Processing
        </Typography>

        <Grid container spacing={2}>
          {(Array.isArray(caseChecks) ? caseChecks : []).map((check, idx) => (
            <Grid item xs={12} key={check._id || idx}>
              <Card>
                <CardHeader
                  title={
                    check._displayName || humanizeCheckType(check.checkType)
                  }
                  action={
                    <Chip
                      label={check.status}
                      color={getStatusColor(check.status)}
                      size="small"
                    />
                  }
                />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        Report Stated Details
                      </Typography>
                      {renderCandidateSubmission(check)}
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        Verified Details
                      </Typography>
                      {renderAdminReview(check, idx)}
                    </Grid>
                  </Grid>
                </CardContent>

                <CardActions sx={{ justifyContent: "flex-end" }}>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => {
                      // re-sync staged changes for this check from the latest caseChecks / caseDetail
                      const latestCheck =
                        (caseChecks && caseChecks[idx]) || null;
                      const latestComments = latestCheck
                        ? latestCheck.comments || ""
                        : caseDetail?.checks?.[idx]?.comments || "";
                      // verifiedData might be object or JSON string
                      let latestVD = {};
                      if (latestCheck && latestCheck.verifiedData) {
                        if (typeof latestCheck.verifiedData === "string") {
                          try {
                            latestVD = JSON.parse(latestCheck.verifiedData);
                          } catch {
                            latestVD = { value: latestCheck.verifiedData };
                          }
                        } else if (
                          typeof latestCheck.verifiedData === "object"
                        ) {
                          latestVD = { ...latestCheck.verifiedData };
                        }
                      } else if (caseDetail?.checks?.[idx]?.verifiedData) {
                        const vd = caseDetail.checks[idx].verifiedData;
                        if (typeof vd === "string") {
                          try {
                            latestVD = JSON.parse(vd);
                          } catch {
                            latestVD = { value: vd };
                          }
                        } else if (typeof vd === "object") latestVD = { ...vd };
                      }

                      setStagedComments((prev) => ({
                        ...prev,
                        [idx]: latestComments,
                      }));
                      setStagedVerifiedData((prev) => ({
                        ...prev,
                        [idx]: latestVD,
                      }));

                      // reset staged files for this check to whatever persisted ones exist in stagedVerifiedUploads
                      setStagedVerifiedUploads((prev) => {
                        const next = { ...prev };
                        const persisted =
                          (next[idx] || []).filter(
                            (it) => it && it.persisted
                          ) || [];
                        next[idx] = persisted;
                        return next;
                      });

                      setMessage("");
                    }}
                  >
                    Reset
                  </Button>

                  <Button
                    variant="contained"
                    onClick={() => handleSaveCheck(idx)}
                    disabled={isUpdating}
                  >
                    {isUpdating ? <CircularProgress size={18} /> : "Save"}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            onClick={handleSaveAll}
            disabled={isUpdating}
          >
            {isUpdating ? <CircularProgress size={20} /> : "Save All Changes"}
          </Button>
        </Box>
      </Grid>
    </Grid>
  );
};

export default AdminCaseDetailPage;
