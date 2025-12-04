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
  Breadcrumbs,
  Link as MUILink,
  Stack,
  Tooltip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
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
  ArrowBack as ArrowBackIcon,
  HomeOutlined as HomeOutlinedIcon,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";

// ---------- ICON / STATUS HELPERS ----------

const getCheckIcon = (checkType = "") => {
  const lowerCaseCheckType = checkType.toLowerCase();
  if (
    lowerCaseCheckType.includes("identity") ||
    lowerCaseCheckType.includes("national id")
  )
    return <Fingerprint fontSize="small" />;
  if (lowerCaseCheckType.includes("employment")) return <Work fontSize="small" />;
  if (lowerCaseCheckType.includes("education")) return <School fontSize="small" />;
  if (lowerCaseCheckType.includes("address")) return <Home fontSize="small" />;
  if (lowerCaseCheckType.includes("court")) return <Gavel fontSize="small" />;
  if (lowerCaseCheckType.includes("credit")) return <CreditCard fontSize="small" />;
  if (lowerCaseCheckType.includes("reference")) return <PersonIcon fontSize="small" />;
  if (lowerCaseCheckType.includes("directorship")) return <BadgeIcon fontSize="small" />;
  return <ArticleIcon fontSize="small" />;
};

const getStatusColor = (status = "") => {
  const s = status.toLowerCase();
  if (s.includes("clear")) return "success";
  if (s.includes("discrepant")) return "error";
  if (s.includes("amber")) return "warning";
  if (s.includes("insufficiency")) return "info";
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
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
      >
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
        {value}
      </Typography>
    </Box>
  ) : null;

const formatDate = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ---------- CANDIDATE DATA RENDERER ----------

const renderCandidateData = (check, caseDetail) => {
  const key = normalizeKey(check.checkType || "");

  // EDUCATION (special case)
  if (key.includes("education")) {
    const edu = caseDetail.education || [];
    if (!edu.length) {
      return (
        <Typography color="text.secondary" variant="body2">
          No education details provided.
        </Typography>
      );
    }
    return edu.map((e, i) => (
      <DetailItem
        key={i}
        label={`Education ${i + 1}`}
        value={`${e.degree || ""} from ${e.university || ""} ${
          e.year ? `(${e.year})` : ""
        }`}
      />
    ));
  }

  // Unified renderer for the rest
  const params = check.params || {};

  const formatLabel = (rawKey) => {
    if (!rawKey || rawKey.toLowerCase() === "_self") return null;
    const withSpaces = rawKey.replace(/([A-Z])/g, " $1").replace(/_/g, " ");
    return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
  };

  const renderObject = (dataObject, level = 0) =>
    Object.entries(dataObject).map(([key, value]) => {
      const label = formatLabel(key);

      if (typeof value === "object" && value !== null) {
        return (
          <Box key={key} sx={{ mt: label ? 1.5 : 0, pl: level ? 1.5 : 0 }}>
            {label && (
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, fontWeight: 600, color: "text.primary" }}
              >
                {label}
              </Typography>
            )}
            {renderObject(value, level + 1)}
          </Box>
        );
      }

      if (value === null || value === undefined || String(value).trim() === "") {
        return null;
      }

      const finalLabel = label || key;
      return (
        <DetailItem
          key={key}
          label={finalLabel}
          value={typeof value === "string" ? value : String(value)}
        />
      );
    });

  const rendered = renderObject(params);
  const hasContent = React.Children.toArray(rendered).some(Boolean);

  if (!hasContent) {
    return (
      <Typography variant="body2" color="text.secondary">
        No candidate details provided for this check.
      </Typography>
    );
  }

  return rendered;
};

// ---------- MAIN COMPONENT ----------

const ClientCaseDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [caseDetail, setCaseDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const res = await api.get(`/cases/${id}`);
        setCaseDetail(res.data);
      } catch (e) {
        console.error(e);
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
      const cd = response.headers["content-disposition"];
      if (cd) {
        const match = cd.match(/filename="?(.+)"?/);
        if (match && match[1]) filename = match[1];
      }

      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setError("Sorry, the report could not be downloaded at this time.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Alert severity="error">{error}</Alert>
      </Box>
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
    caseDetail.status 

  const safeChecks = (caseDetail.checks || []).filter(
    (check) => check && (check._id || check.checkType)
  );

  const candidate = caseDetail.candidateInfo || {};
  const clientOrg = caseDetail.clientOrganization || {};
  const createdAt = caseDetail.createdAt;
  const updatedAt = caseDetail.updatedAt;

  return (
    <Box
      sx={{
        p: { xs: 2, md: 4 },
        bgcolor: "background.default",
        minHeight: "100vh",
      }}
    >
      {/* TOP NAV / BREADCRUMB */}
      <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between" }}>
        <Stack spacing={1}>
          <Breadcrumbs separator="›" aria-label="breadcrumb">
            <MUILink
              underline="hover"
              color="inherit"
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
              onClick={() => navigate("/client")}
            >
              <HomeOutlinedIcon fontSize="small" />
              Client Portal
            </MUILink>
            <MUILink
              underline="hover"
              color="inherit"
              onClick={() => navigate("/client")}
            >
              Cases
            </MUILink>
            <Typography color="text.primary">Case Details</Typography>
          </Breadcrumbs>

          <Box>
            <Typography variant={isMobile ? "h5" : "h4"} fontWeight={600}>
              Verification Report
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {candidate.candidateName || "Candidate"}
            </Typography>
          </Box>
        </Stack>

        {!isMobile && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Chip
              label={caseDetail.status || "Status Unknown"}
              color={getStatusColor(caseDetail.status)}
              sx={{ fontWeight: 500 }}
            />
            <Tooltip
              title={
                isReportReady
                  ? "Download the full signed PDF report"
                  : "Report becomes available when case is completed"
              }
            >
              <span>
                <Button
                  variant="contained"
                  startIcon={
                    downloading ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <DownloadIcon />
                    )
                  }
                  disabled={!isReportReady || downloading}
                  onClick={handleDownloadReport}
                  sx={{
                    px: 3,
                    py: 1,
                    textTransform: "none",
                    borderRadius: 999,
                    boxShadow: 3,
                    transition: "0.2s",
                    "&:hover": { boxShadow: 6, transform: "translateY(-1px)" },
                  }}
                >
                  {downloading ? "Preparing..." : "Download Report"}
                </Button>
              </span>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* MAIN CONTENT */}
      <Grid container spacing={3}>
        {/* LEFT: DETAILS / CHECKS */}
        <Grid item xs={12} md={8.5}>
          {/* Case + Client summary */}
          <Paper
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 3,
              boxShadow: 3,
              background:
                "linear-gradient(135deg, rgba(0,0,0,0.02), rgba(0,0,0,0.04))",
            }}
          >
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <Typography variant="h6" gutterBottom>
                  Case Overview
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <DetailItem
                  label="Candidate Name"
                  value={candidate.candidateName}
                />
                <DetailItem label="Email" value={candidate.email} />
                <DetailItem
                  label="Designation"
                  value={candidate.designation}
                />
                <DetailItem label="Client" value={clientOrg.name} />
              </Grid>
              <Grid item xs={12} md={5}>
                <Typography variant="h6" gutterBottom>
                  Case Metadata
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <DetailItem label="Case ID" value={caseDetail._id || id} />
                <DetailItem
                  label="Created On"
                  value={formatDate(createdAt)}
                />
                <DetailItem label="Last Updated" value={formatDate(updatedAt)} />
                <DetailItem label="Current Status" value={caseDetail.status} />
              </Grid>
            </Grid>
          </Paper>

          {/* Checks list */}
          <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6">Verification Details</Typography>
            <Typography variant="body2" color="text.secondary">
              ({safeChecks.length} checks)
            </Typography>
          </Box>

          {safeChecks.length === 0 && (
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                No checks have been configured for this case.
              </Typography>
            </Paper>
          )}

          {safeChecks.map((check, index) => (
            <Accordion
              key={check._id || index}
              defaultExpanded={index === 0}
              sx={{
                mb: 1.5,
                borderRadius: 2,
                boxShadow: 1,
                overflow: "hidden",
                "&::before": { display: "none" },
                transition: "0.2s",
                "&:hover": {
                  boxShadow: 4,
                  transform: "translateY(-1px)",
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  bgcolor: "background.paper",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    width: "100%",
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "999px",
                      bgcolor: "primary.light",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "primary.main",
                    }}
                  >
                    {getCheckIcon(check.checkType)}
                  </Box>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                      }}
                    >
                      {check._displayName}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                    >
                      Check Type: {check.checkType}
                    </Typography>
                  </Box>
                  <Chip
                    label={check.status}
                    color={getStatusColor(check.status)}
                    size="small"
                    sx={{ fontWeight: 500 }}
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
                    {check.verifiedData &&
                    Object.keys(check.verifiedData).length > 0 ? (
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

          {/* Download button for mobile */}
          {isMobile && (
            <Box sx={{ mt: 3, textAlign: "center" }}>
              <Tooltip
                title={
                  isReportReady
                    ? "Download the full signed PDF report"
                    : "Report becomes available when case is completed"
                }
              >
                <span>
                  <Button
                    variant="contained"
                    startIcon={
                      downloading ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <DownloadIcon />
                      )
                    }
                    disabled={!isReportReady || downloading}
                    onClick={handleDownloadReport}
                    sx={{
                      px: 4,
                      py: 1.2,
                      borderRadius: 999,
                      textTransform: "none",
                    }}
                  >
                    {downloading ? "Preparing..." : "Download Report"}
                  </Button>
                </span>
              </Tooltip>
              {!isReportReady && (
                <Typography
                  variant="caption"
                  display="block"
                  sx={{ mt: 1 }}
                  color="text.secondary"
                >
                  Report will be available once the case is completed.
                </Typography>
              )}
            </Box>
          )}
        </Grid>

        {/* RIGHT: STICKY SUMMARY PANEL */}
        <Grid item xs={12} md={3.5}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              boxShadow: 3,
              position: { md: "sticky" },
              top: { md: 96 },
            }}
          >
            <Stack direction="row" justifyContent="space-between" mb={1.5}>
              <Typography variant="h6" fontWeight={600}>
                Summary
              </Typography>
              <Chip
                label={caseDetail.status}
                size="small"
                color={getStatusColor(caseDetail.status)}
              />
            </Stack>
            <Divider sx={{ mb: 2 }} />

            <DetailItem label="Candidate" value={candidate.candidateName} />
            <DetailItem label="Email" value={candidate.email} />
            <DetailItem label="Contact" value={candidate.contactNumber} />
            <DetailItem label="Designation" value={candidate.designation} />
            <DetailItem label="Client" value={clientOrg.name} />
            <DetailItem
              label="Checks Count"
              value={`${safeChecks.length} selected`}
            />
            <DetailItem label="Created On" value={formatDate(createdAt)} />

            <Box sx={{ mt: 2 }}>
              <Button
                variant="text"
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate("/client")}
              >
                Back to Cases
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ClientCaseDetailPage;
