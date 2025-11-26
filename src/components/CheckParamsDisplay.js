import React from "react";
import { Box, Typography, Paper, Grid, Chip, Divider } from "@mui/material";

/**
 * Renders check parameters in a readable format
 * Handles special cases like education (params.list), address (params.current/permanent), etc.
 */
const CheckParamsDisplay = ({ check }) => {
  const { checkType, params = {}, status } = check;

  const normalizedType = checkType.toLowerCase().replace(/\s+/g, "_");

  // ========================================
  // EDUCATION VERIFICATION - Display list array
  // ========================================
  if (normalizedType === "education_verification") {
    const educationList = params.list || [];

    if (educationList.length === 0) {
      return (
        <Box sx={{ p: 2 }}>
          <Typography color="text.secondary" variant="body2">
            No education details provided
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ p: 2 }}>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 600, mb: 2, color: "#1976d2" }}
        >
          Education Details ({educationList.length}{" "}
          {educationList.length === 1 ? "entry" : "entries"})
        </Typography>

        {educationList.map((edu, index) => (
          <Paper
            key={index}
            elevation={0}
            sx={{
              p: 2,
              mb: 2,
              backgroundColor: "#f8f9fa",
              border: "1px solid #e0e0e0",
              borderRadius: 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
              <Chip
                label={`Entry #${index + 1}`}
                size="small"
                sx={{ mr: 1, backgroundColor: "#e3f2fd" }}
              />
              {edu.providedBy === "candidate" && (
                <Chip
                  label="Candidate Provided"
                  size="small"
                  color="success"
                  variant="outlined"
                />
              )}
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 600 }}
                >
                  University/Institution
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {edu.university || "Not provided"}
                </Typography>
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 600 }}
                >
                  Degree/Qualification
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {edu.degree || "Not provided"}
                </Typography>
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 600 }}
                >
                  Year of Passing
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {edu.year || "Not provided"}
                </Typography>
              </Grid>
            </Grid>

            {edu.providedAt && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: "block" }}
              >
                Submitted on: {new Date(edu.providedAt).toLocaleString()}
              </Typography>
            )}
          </Paper>
        ))}
      </Box>
    );
  }

  // ========================================
  // ADDRESS VERIFICATION - Display current/permanent
  // ========================================
  if (normalizedType === "address_verification") {
    const current = params.current || {};
    const permanent = params.permanent || {};

    const formatAddress = (addr) => {
      return [
        addr.line1,
        addr.line2,
        addr.city,
        addr.state,
        addr.pincode,
        addr.country,
      ]
        .filter(Boolean)
        .join(", ");
    };

    return (
      <Box sx={{ p: 2 }}>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 600, mb: 2, color: "#1976d2" }}
        >
          Address Details
        </Typography>

        {/* Current Address */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2,
            backgroundColor: "#f8f9fa",
            border: "1px solid #e0e0e0",
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Current Address
          </Typography>
          <Typography variant="body2">
            {formatAddress(current) || "Not provided"}
          </Typography>
          {(current.from || current.to) && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: "block" }}
            >
              Period: {current.from || "N/A"} to {current.to || "Present"}
            </Typography>
          )}
        </Paper>

        {/* Permanent Address */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2,
            backgroundColor: "#f8f9fa",
            border: "1px solid #e0e0e0",
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Permanent Address
          </Typography>
          <Typography variant="body2">
            {formatAddress(permanent) || "Not provided"}
          </Typography>
        </Paper>

        {/* Verification Mode */}
        {params.verificationMode && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Verification Mode:
            </Typography>
            <Chip label={params.verificationMode} size="small" sx={{ ml: 1 }} />
          </Box>
        )}
      </Box>
    );
  }

  // ========================================
  // EMPLOYMENT VERIFICATION - Display current/previous
  // ========================================
  if (normalizedType === "employment_verification") {
    const current = params.current || {};
    const previous = params.previous || {};

    return (
      <Box sx={{ p: 2 }}>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 600, mb: 2, color: "#1976d2" }}
        >
          Employment Details
        </Typography>

        {/* Current Employment */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2,
            backgroundColor: "#f8f9fa",
            border: "1px solid #e0e0e0",
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Current Employment
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Organization
              </Typography>
              <Typography variant="body2">
                {current.organization || "Not provided"}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Designation
              </Typography>
              <Typography variant="body2">
                {current.designation || "Not provided"}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Tenure
              </Typography>
              <Typography variant="body2">
                {current.tenure || "Not provided"}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Previous Employment */}
        {(previous.organization || previous.designation) && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 2,
              backgroundColor: "#f8f9fa",
              border: "1px solid #e0e0e0",
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Previous Employment
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Organization
                </Typography>
                <Typography variant="body2">
                  {previous.organization || "Not provided"}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Designation
                </Typography>
                <Typography variant="body2">
                  {previous.designation || "Not provided"}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Tenure
                </Typography>
                <Typography variant="body2">
                  {previous.tenure || "Not provided"}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        )}
      </Box>
    );
  }

  // ========================================
  // GENERIC DISPLAY - Show all params as key-value
  // ========================================
  const excludeKeys = [
    "_file",
    "documents",
    "current",
    "permanent",
    "list",
    "providedBy",
    "providedAt",
  ];
  const displayableKeys = Object.keys(params).filter(
    (key) =>
      !excludeKeys.includes(key) &&
      params[key] !== null &&
      params[key] !== undefined &&
      params[key] !== ""
  );

  if (displayableKeys.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="text.secondary" variant="body2">
          No details provided yet
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 600, mb: 2, color: "#1976d2" }}
      >
        Check Details
      </Typography>

      <Grid container spacing={2}>
        {displayableKeys.map((key) => {
          const value = params[key];
          const displayValue =
            typeof value === "object"
              ? JSON.stringify(value, null, 2)
              : String(value);

          return (
            <Grid item xs={12} sm={6} key={key}>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  backgroundColor: "#f8f9fa",
                  border: "1px solid #e0e0e0",
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 600 }}
                >
                  {key
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ mt: 0.5, wordBreak: "break-word" }}
                >
                  {displayValue}
                </Typography>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default CheckParamsDisplay;
