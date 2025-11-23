import React, { useState, useEffect } from "react";
import {
  Paper,
  Box,
  Typography,
  Button,
  Grid,
  Chip,
  Divider,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { useParams } from "react-router-dom";
import api from "../../services/api";

import {
  Fingerprint,
  Work,
  School,
  Home,
  Gavel,
  CreditCard,
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Person as PersonIcon,
  Badge as BadgeIcon,
  Article as ArticleIcon,
} from "@mui/icons-material";

// --- HELPER FUNCTIONS (some ported from AdminCaseDetailPage for consistency) ---

const getCheckIcon = (checkType = "") => {
  const lowerCaseCheckType = checkType.toLowerCase();
  if (
    lowerCaseCheckType.includes("identity") ||
    lowerCaseCheckType.includes("national id")
  )
    return <Fingerprint />;
  if (lowerCaseCheckType.includes("employment")) return <Work />;
  if (lowerCaseCheckType.includes("education")) return <School />;
  if (lowerCaseCheckType.includes("address")) return <Home />;
  if (lowerCaseCheckType.includes("court")) return <Gavel />;
  if (lowerCaseCheckType.includes("credit")) return <CreditCard />;
  if (lowerCaseCheckType.includes("reference")) return <PersonIcon />;
  if (lowerCaseCheckType.includes("directorship")) return <BadgeIcon />;
  return <ArticleIcon />;
};

const getStatusColor = (status = "") => {
  const lowerCaseStatus = status.toLowerCase();
  if (lowerCaseStatus.includes("clear")) return "success";
  if (lowerCaseStatus.includes("discrepant")) return "error";
  if (lowerCaseStatus.includes("amber")) return "warning";
  if (lowerCaseStatus.includes("insufficiency")) return "info";
  return "default";
};

const normalizeKey = (s = "") =>
  (s || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const DetailItem = ({ label, value }) =>
  value ? (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
        {value}
      </Typography>
    </Box>
  ) : null;

// --- UPDATED: This function is now much more detailed, like the admin page ---
const renderCandidateData = (check, caseDetail) => {
  const key = normalizeKey(check.checkType || "");

  // --- EDUCATION (Still handled as a special case as it uses a different data source) ---
  if (key.includes("education")) {
    const edu = caseDetail.education || [];
    if (!edu.length) {
      return (
        <Typography color="text.secondary">
          No education details provided.
        </Typography>
      );
    }
    return edu.map((e, i) => (
      <DetailItem
        key={i}
        label={`Education ${i + 1}`}
        value={`${e.degree || ""} from ${e.university || ""} (${
          e.year || "N/A"
        })`}
      />
    ));
  }

  // --- NEW: UNIFIED RENDERER FOR ALL OTHER CHECKS ---
  const params = check.params || {};

  // Helper to format keys like 'candidateName' into 'Candidate Name'
  const formatLabel = (key) => {
    // We don't want to display "_self" as a title
    if (key.toLowerCase() === "_self") return null;
    const result = key.replace(/([A-Z])/g, " $1");
    return result.charAt(0).toUpperCase() + result.slice(1);
  };

  // This recursive function can render nested objects
  const renderObject = (dataObject) => {
    return Object.entries(dataObject).map(([key, value]) => {
      const label = formatLabel(key);

      // If the value is another object, we dive deeper (recursion)
      if (typeof value === "object" && value !== null) {
        return (
          <Box key={key} sx={{ mt: label ? 1.5 : 0, pl: label ? 0.5 : 0 }}>
            {/* Render a subtitle for nested sections like "Professional Reference" */}
            {label && (
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {label}
              </Typography>
            )}
            {renderObject(value)}
          </Box>
        );
      }

      // If it's a simple value, render the detail item
      if (value === null || value === undefined || String(value).trim() === "")
        return null;

      // The label for a simple value should be its key, formatted nicely
      const finalLabel = label || formatLabel(key);
      if (!finalLabel) return null; // Don't render if there's no valid label

      return <DetailItem key={key} label={finalLabel} value={String(value)} />;
    });
  };

  const renderedElements = renderObject(params);

  // Check if any actual content was rendered
  const hasContent = React.Children.toArray(renderedElements).some(
    (child) => child !== null
  );

  if (!hasContent) {
    return (
      <Typography variant="body2" color="text.secondary">
        No candidate details provided for this check.
      </Typography>
    );
  }

  return renderedElements;
};

const ClientCaseDetailPage = () => {
  const { id } = useParams();
  const [caseDetail, setCaseDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const response = await api.get(`/cases/${id}`);
        setCaseDetail(response.data);
      } catch (error) {
        setError("Failed to load case details. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchCase();
  }, [id]);

  const handleDownloadReport = async () => {
    setDownloading(true);
    setError("");
    try {
      const response = await api.get(`/cases/${id}/report`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      let filename = `Report_Case_${id}.pdf`;
      const contentDisposition = response.headers["content-disposition"];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Sorry, the report could not be downloaded at this time.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress size={50} />
      </Box>
    );
  }
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 4 }}>
        {error}
      </Alert>
    );
  }
  if (!caseDetail) {
    return (
      <Typography variant="h5" align="center" sx={{ mt: 5 }}>
        Case not found.
      </Typography>
    );
  }

  const isReportReady =
    caseDetail.status && caseDetail.status.toLowerCase().includes("completed");
  const safeChecks = (caseDetail.checks || []).filter(
    (check) => check && (check._id || check.checkType)
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4, textAlign: "center" }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Verification Report
        </Typography>
        <Typography variant="h6" color="text.secondary">
          {caseDetail.candidateInfo?.candidateName}
        </Typography>
      </Box>

      <Grid container justifyContent="center">
        <Grid item xs={12} md={10} lg={9}>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={7}>
              <Paper sx={{ p: 3, height: "100%" }}>
                <Typography variant="h6" gutterBottom>
                  Case Summary
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <DetailItem
                  label="Candidate Name"
                  value={caseDetail.candidateInfo?.candidateName}
                />
                <DetailItem
                  label="Email"
                  value={caseDetail.candidateInfo?.email}
                />
                <DetailItem
                  label="Client"
                  value={caseDetail.clientOrganization?.name}
                />
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={5}>
              <Paper sx={{ p: 3, height: "100%" }}>
                <Typography variant="h6" gutterBottom>
                  Checks Selected
                </Typography>
                <Divider sx={{ mb: 1.5 }} />
                {safeChecks.map((check) => (
                  <Box
                    key={check._id || check.checkType}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      py: 0.5,
                    }}
                  >
                    <Box sx={{ color: "primary.main" }}>
                      {getCheckIcon(check.checkType)}
                    </Box>
                    <Typography variant="body2">
                      {check._displayName}
                    </Typography>
                  </Box>
                ))}
              </Paper>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>
            Verification Details
          </Typography>
          {safeChecks.map((check, index) => (
            <Accordion
              key={check._id || index}
              sx={{ mb: 1.5 }}
              defaultExpanded
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    width: "100%",
                  }}
                >
                  {getCheckIcon(check.checkType)}
                  <Typography sx={{ fontWeight: 500, flexGrow: 1 }}>
                    {check._displayName}
                  </Typography>
                  <Chip
                    label={check.status}
                    color={getStatusColor(check.status)}
                    size="small"
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ bgcolor: "action.hover" }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Candidate Provided Data
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    {renderCandidateData(check, caseDetail)}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Admin Verified Data
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    {Object.keys(check.verifiedData || {}).length > 0 ? (
                      Object.entries(check.verifiedData).map(([key, value]) => (
                        <DetailItem
                          key={key}
                          label={key.replace(/_/g, " ")}
                          value={String(value)}
                        />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Verification pending or not applicable.
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}

          <Box sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
            <Button
              variant="contained"
              size="large"
              sx={{ py: 1.5, px: 5 }}
              startIcon={
                downloading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <DownloadIcon />
                )
              }
              onClick={handleDownloadReport}
              disabled={!isReportReady || downloading}
            >
              {downloading ? "Generating..." : "Download Full Report"}
            </Button>
          </Box>
          {!isReportReady && (
            <Typography
              variant="caption"
              display="block"
              align="center"
              sx={{ mt: 1 }}
            >
              Report will be available once the case is completed.
            </Typography>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default ClientCaseDetailPage;
