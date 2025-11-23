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
} from "@mui/material";
import { CheckCircle as CheckCircleIcon } from "@mui/icons-material";
import { useParams } from "react-router-dom";
import api from "../../services/api";

// Helper function to create a "slug" from a check name
const toCheckSlug = (check) => {
  if (!check) return "";
  if (typeof check === "string")
    return check
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^\w_]/g, "");
  if (check.slug) return check.slug;
  if (check.name)
    return check.name
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^\w_]/g, "");
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

  // NEW STATE: To hold all form data (text fields and files)
  const [checkDetails, setCheckDetails] = useState({});

  useEffect(() => {
    const fetchDetails = async () => {
      if (token) {
        try {
          const response = await api.get(`/public/request-details/${token}`);
          setRequestDetails(response.data);
        } catch (error) {
          setError(
            error.response?.data?.msg ||
              "This upload link is invalid or has expired."
          );
        } finally {
          setLoading(false);
        }
      }
    };
    fetchDetails();
  }, [token]);

  // NEW HANDLERS: To manage changes in the dynamic form fields
  const handleDetailChange = (check, subKey = "_self", field, value) => {
    const key = toCheckSlug(check);
    setCheckDetails((prev) => {
      const next = { ...prev };
      if (!next[key]) next[key] = {};
      if (!next[key][subKey]) next[key][subKey] = {};
      next[key][subKey] = { ...next[key][subKey], [field]: value };
      return next;
    });
  };

  const handleDetailFile = (check, subKey = "_self", file) => {
    const key = toCheckSlug(check);
    setCheckDetails((prev) => {
      const next = { ...prev };
      if (!next[key]) next[key] = {};
      if (!next[key][subKey]) next[key][subKey] = {};
      next[key][subKey] = { ...next[key][subKey], _file: file };
      return next;
    });
  };

  // NEW SUBMIT HANDLER: To send both text data and files
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    const formData = new FormData();

    // 1. Append the text field data as a JSON string
    formData.append("checkDetails", JSON.stringify(checkDetails));

    // 2. Append all the files
    for (const checkSlug in checkDetails) {
      const details = checkDetails[checkSlug];
      if (details._self && details._self._file) {
        formData.append(checkSlug, details._self._file);
      }
    }

    try {
      const response = await api.post(`/public/upload/${token}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(response.data.msg);
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

  // NEW RENDER FUNCTION: Renders form fields based on a schema
  const renderCheckFields = (check) => {
    const schema = check.schema;
    if (!schema || !schema._self)
      return <p>No details required for this check.</p>;

    const checkSlug = toCheckSlug(check);

    // We will only render the "_self" section of the schema for candidates
    return schema._self.map((field) => {
      if (field.type === "file") {
        const currentFile = checkDetails[checkSlug]?._self?._file;
        return (
          <Box key={field.name} sx={{ mt: 1 }}>
            <Button variant="outlined" component="label">
              {field.label || "Upload Document"}
              <input
                type="file"
                hidden
                onChange={(e) =>
                  handleDetailFile(checkSlug, "_self", e.target.files[0])
                }
              />
            </Button>
            {currentFile && (
              <Typography variant="caption" sx={{ ml: 2 }}>
                {currentFile.name}
              </Typography>
            )}
          </Box>
        );
      }
      // Default to a text field
      return (
        <TextField
          key={field.name}
          fullWidth
          size="small"
          sx={{ mt: 2 }}
          label={field.label}
          value={checkDetails[checkSlug]?._self?.[field.name] || ""}
          onChange={(e) =>
            handleDetailChange(checkSlug, "_self", field.name, e.target.value)
          }
        />
      );
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
        <CircularProgress />
      </Box>
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
          <Typography color="textSecondary">
            {message || "Thank you. Your information has been submitted."}
          </Typography>
        </Paper>
      </Container>
    );
  }

  if (error && !requestDetails) {
    return (
      <Container maxWidth="sm" sx={{ mt: 5 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!requestDetails) return null;

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
          For {requestDetails.clientName} Background Verification
        </Typography>
        <Divider sx={{ my: 3 }} />
        <Box sx={{ my: 2, textAlign: "left" }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Hello {requestDetails.candidateName},
          </Typography>
          <Typography color="text.secondary">
            Please provide the following details and documents for your
            background verification.
          </Typography>
        </Box>

        {requestDetails.requestedChecks.map((check) => (
          <Box
            key={check.slug}
            sx={{ mt: 3, p: 2, border: "1px solid #e0e0e0", borderRadius: 2 }}
          >
            <Typography variant="h6" component="p" sx={{ mb: 1 }}>
              {check.name}
            </Typography>
            {/* This function will now render the dynamic form */}
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
