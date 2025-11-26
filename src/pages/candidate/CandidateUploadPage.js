import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  CircularProgress,
  Alert,
  Divider,
  TextField,
  RadioGroup,
  Radio,
  FormControlLabel,
  IconButton,
} from "@mui/material";
import { CheckCircle as CheckCircleIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { useParams } from "react-router-dom";
import api from "../../services/api";

const normalizeKey = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w_]/g, "");

const toCheckSlug = (check) => {
  if (!check) return "";
  if (typeof check === "string") return normalizeKey(check);
  if (check.slug) return normalizeKey(check.slug);
  if (check.name) return normalizeKey(check.name);
  return "";
};

const CandidateUploadPage = () => {
  const { token } = useParams();
  const [requestDetails, setRequestDetails] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  // holds all text inputs + per-section data
  // shape: { [checkSlug]: { [sectionKey]: { fieldName: value, _file?: File } } }
  const [checkDetails, setCheckDetails] = useState({});

  // fetch token details
  useEffect(() => {
    const fetchDetails = async () => {
      if (!token) return;
      try {
        const resp = await api.get(`/public/request-details/${token}`);
        setRequestDetails(resp.data);
      } catch (err) {
        setError(
          err.response?.data?.msg ||
            "This upload link is invalid or has expired."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [token]);

  // -----------------------
  // helpers to mutate state
  // -----------------------
  const handleDetailChange = (checkSlug, sectionKey, field, value) => {
    const section = sectionKey == null ? "_self" : sectionKey;
    setCheckDetails((prev) => {
      const next = { ...prev };
      if (!next[checkSlug]) next[checkSlug] = {};
      if (!next[checkSlug][section]) next[checkSlug][section] = {};
      next[checkSlug][section] = {
        ...next[checkSlug][section],
        [field]: value,
      };
      return next;
    });
  };

  const handleDetailFile = (checkSlug, sectionKey, file) => {
    const section = sectionKey == null ? "_self" : sectionKey;
    setCheckDetails((prev) => {
      const next = { ...prev };
      if (!next[checkSlug]) next[checkSlug] = {};
      if (!next[checkSlug][section]) next[checkSlug][section] = {};
      next[checkSlug][section] = {
        ...next[checkSlug][section],
        _file: file,
      };
      return next;
    });
  };

  const removeDetailFile = (checkSlug, sectionKey) => {
    const section = sectionKey == null ? "_self" : sectionKey;
    setCheckDetails((prev) => {
      const next = { ...prev };
      if (!next[checkSlug] || !next[checkSlug][section]) return prev;
      const sectionObj = { ...next[checkSlug][section] };
      delete sectionObj._file;
      next[checkSlug][section] = sectionObj;
      return next;
    });
  };

  // -----------------------
  // field renderer
  // -----------------------
  const renderField = (checkSlug, sectionKey, field) => {
    const section = sectionKey == null ? "_self" : sectionKey;
    const sectionData = checkDetails?.[checkSlug]?.[section] || {};
    const value = sectionData[field.name] || "";

    // FILE
    if (field.type === "file") {
      const currentFile = sectionData._file;
      return (
        <Box key={field.name} sx={{ mt: 1 }}>
          <Button variant="outlined" component="label">
            {field.label || "Upload Document"}
            <input
              type="file"
              hidden
              onChange={(e) =>
                handleDetailFile(
                  checkSlug,
                  section,
                  e.target.files && e.target.files[0]
                )
              }
            />
          </Button>
          {currentFile && (
            <Box
              sx={{ display: "inline-flex", alignItems: "center", ml: 1 }}
            >
              <Typography variant="caption">{currentFile.name}</Typography>
              <IconButton
                size="small"
                onClick={() => removeDetailFile(checkSlug, section)}
              >
                <DeleteIcon fontSize="inherit" />
              </IconButton>
            </Box>
          )}
        </Box>
      );
    }

    // RADIO (for panel / gap type etc.)
    if (field.type === "radio" && Array.isArray(field.options)) {
      return (
        <Box key={field.name} sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            {field.label}
          </Typography>
          <RadioGroup
            row
            value={value || field.options[0] || ""}
            onChange={(e) =>
              handleDetailChange(checkSlug, section, field.name, e.target.value)
            }
          >
            {field.options.map((opt) => (
              <FormControlLabel
                key={opt}
                value={opt}
                control={<Radio size="small" />}
                label={opt}
              />
            ))}
          </RadioGroup>
        </Box>
      );
    }

    // DATE
    if (field.type === "date" || field.name === "dob") {
      return (
        <TextField
          key={field.name}
          fullWidth
          size="small"
          sx={{ mt: 1 }}
          label={field.label}
          type="date"
          InputLabelProps={{ shrink: true }}
          value={value || ""}
          onChange={(e) =>
            handleDetailChange(checkSlug, section, field.name, e.target.value)
          }
        />
      );
    }

    // default text
    return (
      <TextField
        key={field.name}
        fullWidth
        size="small"
        sx={{ mt: 1 }}
        label={field.label}
        value={value}
        onChange={(e) =>
          handleDetailChange(checkSlug, section, field.name, e.target.value)
        }
      />
    );
  };

  // -----------------------
  // Check renderer (uses same idea as CreateCasePage)
  // -----------------------
  const renderCheckFields = (check) => {
    const schema = check.schema || {};
    const checkSlug = toCheckSlug(check);

    // top-level keys except meta and _self are treated as sections
    const sectionKeys = Object.keys(schema).filter(
      (k) => !["_self", "_meta", "meta"].includes(k)
    );

    return (
      <>
        {sectionKeys.map((sectionKey) => (
          <Box key={sectionKey} sx={{ mb: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, mb: 1 }}
            >
              {sectionKey}
            </Typography>
            {Array.isArray(schema[sectionKey])
              ? schema[sectionKey].map((field) =>
                  renderField(checkSlug, sectionKey, field)
                )
              : null}
          </Box>
        ))}

        {/* Unsectioned fields */}
        {Array.isArray(schema._self) && schema._self.length > 0 && (
          <Box sx={{ mb: 1 }}>
            {schema._self.map((field) =>
              renderField(checkSlug, "_self", field)
            )}
          </Box>
        )}
      </>
    );
  };

  // -----------------------
  // Submit handler
  // -----------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();

      // send text details
      formData.append("checkDetails", JSON.stringify(checkDetails));

      // send ONE file per check (first found in any section) – keeps backend simple
      Object.entries(checkDetails).forEach(([checkSlug, sections]) => {
        let appended = false;
        Object.values(sections || {}).forEach((section) => {
          if (!section || !section._file || appended) return;
          formData.append(checkSlug, section._file);
          appended = true;
        });
      });

      const resp = await api.post(`/public/upload/${token}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage(resp.data.msg || "Information submitted successfully.");
      setIsSubmitted(true);
    } catch (err) {
      setError(
        err.response?.data?.msg ||
          "Submission failed. The link may be expired or files are too large."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // -----------------------
  // UI states
  // -----------------------
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !requestDetails) {
    return (
      <Container maxWidth="sm" sx={{ mt: 5 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (isSubmitted) {
    return (
      <Container
        maxWidth="sm"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "80vh",
        }}
      >
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Submission Successful!
          </Typography>
          <Typography color="text.secondary">
            {message || "Thank you. Your information has been submitted."}
          </Typography>
        </Paper>
      </Container>
    );
  }

  if (!requestDetails) return null;

  const { candidateName, clientName, requestedChecks = [] } = requestDetails;

  return (
    <Container maxWidth="md" sx={{ mt: 5, mb: 5 }}>
      <Paper
        component="form"
        onSubmit={handleSubmit}
        sx={{ p: { xs: 2, sm: 4 } }}
      >
        <Typography variant="h5" align="center" gutterBottom>
          Secure Document Upload
        </Typography>
        <Typography color="text.secondary" align="center">
          For {clientName} Background Verification
        </Typography>
        <Divider sx={{ my: 3 }} />

        <Box sx={{ my: 2, textAlign: "left" }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Hello {candidateName},
          </Typography>
          <Typography color="text.secondary">
            Please provide the following details and documents for your
            background verification.
          </Typography>
        </Box>

        {requestedChecks.map((check) => (
          <Box
            key={check.slug || check.name}
            sx={{ mt: 3, p: 2, border: "1px solid #e0e0e0", borderRadius: 2 }}
          >
            <Typography variant="h6" component="p" sx={{ mb: 1 }}>
              {check.name}
            </Typography>
            {renderCheckFields(check)}
          </Box>
        ))}

        {error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error}
          </Alert>
        )}

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={submitting}
          sx={{ mt: 4, py: 1.5 }}
        >
          {submitting ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Submit All Information"
          )}
        </Button>
      </Paper>
    </Container>
  );
};

export default CandidateUploadPage;
