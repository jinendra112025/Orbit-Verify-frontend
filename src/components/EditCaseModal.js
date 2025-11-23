import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Radio,
  RadioGroup,
  FormControl,
  FormControlLabel,
  FormLabel,
  Alert,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// --- Helper Functions ---
const normalizeKey = (s = "") =>
  String(s || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w_]/g, "");

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
// --- End Helper Functions ---

const EditCaseModal = ({ open, onClose, caseData, onUpdate }) => {
  const [formData, setFormData] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [expandedCheck, setExpandedCheck] = useState(null);
  const [alert, setAlert] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    if (caseData) {
      const initialFormData = { ...caseData.candidateInfo };
      initialFormData.checkSpecificData = {};

      (caseData.checks || []).forEach((check) => {
        const normalizedCheckType = normalizeKey(check.checkType);
        initialFormData.checkSpecificData[normalizedCheckType] = check.params
          ? { ...check.params }
          : {};
      });

      setFormData(initialFormData);
      setAlert({ open: false, message: "", severity: "success" });
    }
  }, [caseData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckSpecificChange = (checkType, fieldPath, value) => {
    setFormData((prev) => {
      const newCheckSpecificData = { ...prev.checkSpecificData };
      let currentLevel = newCheckSpecificData[checkType];

      const pathParts = fieldPath.split(".");
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        currentLevel[part] = currentLevel[part]
          ? { ...currentLevel[part] }
          : {};
        currentLevel = currentLevel[part];
      }
      currentLevel[pathParts[pathParts.length - 1]] = value;

      return {
        ...prev,
        checkSpecificData: newCheckSpecificData,
      };
    });
  };

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedCheck(isExpanded ? panel : null);
  };

  const handleSubmit = async () => {
    setIsUpdating(true);
    setAlert({ open: false, message: "", severity: "success" }); // Clear previous alert

    const updatedChecksPayload = (caseData.checks || []).map(
      (originalCheck) => {
        const normalizedCheckType = normalizeKey(originalCheck.checkType);
        const updatedParams =
          formData.checkSpecificData?.[normalizedCheckType] ||
          originalCheck.params;
        return {
          ...originalCheck,
          params: updatedParams,
        };
      }
    );

    try {
      await onUpdate({
        _id: caseData._id,
        candidateInfo: formData,
        checks: updatedChecksPayload,
      });

      // --- ON SUCCESS ---
      setAlert({
        open: true,
        message: "Case updated successfully!",
        severity: "success",
      });
      // We removed onClose() so the modal stays open
    } catch (error) {
      // --- ON ERROR ---
      console.error("Failed to update case:", error);
      setAlert({
        open: true,
        message: "Failed to update case. Please try again.",
        severity: "error",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!caseData) return null;

  // --- START: NEW AND UPDATED RENDER FUNCTIONS ---

  const renderAddressVerificationFields = (checkType) => {
    const data = formData.checkSpecificData?.[checkType] || {};
    data.current = data.current || {};
    data.permanent = data.permanent || {};
    return (
      <>
        <Typography
          variant="subtitle1"
          sx={{ mt: 2, mb: 1, fontWeight: "bold" }}
        >
          Current Address
        </Typography>
        <TextField
          label="Address Line 1"
          value={data.current.line1 || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "current.line1",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="Address Line 2"
          value={data.current.line2 || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "current.line2",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="City"
          value={data.current.city || ""}
          onChange={(e) =>
            handleCheckSpecificChange(checkType, "current.city", e.target.value)
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="State"
          value={data.current.state || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "current.state",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="Pincode"
          value={data.current.pincode || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "current.pincode",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <Typography
          variant="subtitle1"
          sx={{ mt: 3, mb: 1, fontWeight: "bold" }}
        >
          Permanent Address
        </Typography>
        <TextField
          label="Address Line 1"
          value={data.permanent.line1 || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "permanent.line1",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="Address Line 2"
          value={data.permanent.line2 || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "permanent.line2",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="City"
          value={data.permanent.city || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "permanent.city",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="State"
          value={data.permanent.state || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "permanent.state",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="Pincode"
          value={data.permanent.pincode || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "permanent.pincode",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
      </>
    );
  };

  const renderEmploymentVerificationFields = (checkType) => {
    const data = formData.checkSpecificData?.[checkType] || {};
    data.current = data.current || {};
    data.previous = data.previous || {};
    return (
      <>
        <Typography
          variant="subtitle1"
          sx={{ mt: 2, mb: 1, fontWeight: "bold" }}
        >
          Current Employment
        </Typography>
        <TextField
          label="Organization"
          value={data.current.organization || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "current.organization",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="Designation"
          value={data.current.designation || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "current.designation",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="Tenure"
          value={data.current.tenure || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "current.tenure",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <Typography
          variant="subtitle1"
          sx={{ mt: 3, mb: 1, fontWeight: "bold" }}
        >
          Previous Employment
        </Typography>
        <TextField
          label="Organization"
          value={data.previous.organization || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "previous.organization",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="Designation"
          value={data.previous.designation || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "previous.designation",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="Tenure"
          value={data.previous.tenure || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "previous.tenure",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
      </>
    );
  };

  const renderCourtRecordCheckFields = (checkType) => {
    const data = formData.checkSpecificData?.[checkType]?._self || {};
    return (
      <>
        <TextField
          label="Candidate Name"
          value={data.candidateName || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "_self.candidateName",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="Father's Name"
          value={data.fatherName || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "_self.fatherName",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="Date of Birth"
          type="date"
          value={data.dob ? data.dob.split("T")[0] : ""}
          onChange={(e) =>
            handleCheckSpecificChange(checkType, "_self.dob", e.target.value)
          }
          fullWidth
          margin="dense"
          InputLabelProps={{ shrink: true }}
        />
      </>
    );
  };

  const renderCreditHistoryCheckFields = (checkType) => {
    const data = formData.checkSpecificData?.[checkType] || {};
    return (
      <>
        <TextField
          label="Candidate Name"
          value={data.candidateName || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "candidateName",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="Address"
          value={data.address || ""}
          onChange={(e) =>
            handleCheckSpecificChange(checkType, "address", e.target.value)
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="Date of Birth"
          type="date"
          value={data.dob ? data.dob.split("T")[0] : ""}
          onChange={(e) =>
            handleCheckSpecificChange(checkType, "dob", e.target.value)
          }
          fullWidth
          margin="dense"
          InputLabelProps={{ shrink: true }}
        />
      </>
    );
  };

  const renderDirectorshipCheckFields = (checkType) => {
    const data = formData.checkSpecificData?.[checkType]?._self || {};
    return (
      <>
        <TextField
          label="Candidate Name"
          value={data.candidateName || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "_self.candidateName",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="Aadhaar"
          value={data.aadhaar || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "_self.aadhaar",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="PAN"
          value={data.pan || ""}
          onChange={(e) =>
            handleCheckSpecificChange(checkType, "_self.pan", e.target.value)
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="Date of Birth"
          type="date"
          value={data.dob ? data.dob.split("T")[0] : ""}
          onChange={(e) =>
            handleCheckSpecificChange(checkType, "_self.dob", e.target.value)
          }
          fullWidth
          margin="dense"
          InputLabelProps={{ shrink: true }}
        />
      </>
    );
  };

  const renderDrugPanelTestFields = (checkType) => {
    const rootData = formData.checkSpecificData?.[checkType] || {};
    const selfData = rootData._self || {};
    const panelOptions = ["5", "6", "7", "8", "9", "10", "11", "12"];
    return (
      <>
        <TextField
          label="Candidate Name"
          value={selfData.candidateName || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "_self.candidateName",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="Contact Number"
          value={selfData.contactNumber || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "_self.contactNumber",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <FormControl component="fieldset" margin="dense" fullWidth>
          <FormLabel
            component="legend"
            sx={{ fontSize: "0.8rem", color: "rgba(0, 0, 0, 0.6)" }}
          >
            Test Level
          </FormLabel>
          <RadioGroup
            row
            aria-label="Test Level"
            name="labTestLevel"
            value={rootData.labTestLevel || ""}
            onChange={(e) =>
              handleCheckSpecificChange(
                checkType,
                "labTestLevel", // Save to root params
                e.target.value
              )
            }
          >
            {panelOptions.map((panel) => (
              <FormControlLabel
                key={panel}
                value={panel}
                control={<Radio size="small" />}
                label={panel}
              />
            ))}
          </RadioGroup>
        </FormControl>
      </>
    );
  };

  const renderEducationVerificationFields = () => {
    const educationData = caseData?.education || [];
    if (!educationData.length)
      return <Typography>No education details submitted.</Typography>;
    return educationData.map((edu, index) => (
      <Box
        key={index}
        sx={{ border: "1px solid #ddd", p: 1, mb: 1, borderRadius: 1 }}
      >
        <Typography variant="subtitle2">Education {index + 1}</Typography>
        <TextField
          label="University"
          value={edu.university || ""}
          fullWidth
          margin="dense"
          InputProps={{ readOnly: true }}
        />
        <TextField
          label="Degree"
          value={edu.degree || ""}
          fullWidth
          margin="dense"
          InputProps={{ readOnly: true }}
        />
        <TextField
          label="Year"
          value={edu.year || ""}
          fullWidth
          margin="dense"
          InputProps={{ readOnly: true }}
        />
      </Box>
    ));
  };

  const renderGapAnalysisFields = (checkType) => {
    const data = formData.checkSpecificData?.[checkType]?._self || {};
    return (
      <>
        <TextField
          label="From"
          value={data.from || ""}
          onChange={(e) =>
            handleCheckSpecificChange(checkType, "_self.from", e.target.value)
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="To"
          value={data.to || ""}
          onChange={(e) =>
            handleCheckSpecificChange(checkType, "_self.to", e.target.value)
          }
          fullWidth
          margin="dense"
        />
        <FormControl component="fieldset" margin="dense" fullWidth>
          <FormLabel
            component="legend"
            sx={{ fontSize: "0.8rem", color: "rgba(0, 0, 0, 0.6)" }}
          >
            Gap Type
          </FormLabel>
          <RadioGroup
            row
            aria-label="Gap Type"
            name="gapType"
            value={data.gapType || ""}
            onChange={(e) =>
              handleCheckSpecificChange(
                checkType,
                "_self.gapType",
                e.target.value
              )
            }
          >
            <FormControlLabel
              value="Edu to Edu"
              control={<Radio size="small" />}
              label="Edu to Edu"
            />
            <FormControlLabel
              value="Emp to Emp"
              control={<Radio size="small" />}
              label="Emp to Emp"
            />
            <FormControlLabel
              value="Edu to Emp"
              control={<Radio size="small" />}
              label="Edu to Emp"
            />
          </RadioGroup>
        </FormControl>

        <TextField
          label="Reason"
          value={data.reason || ""}
          onChange={(e) =>
            handleCheckSpecificChange(checkType, "_self.reason", e.target.value)
          }
          fullWidth
          margin="dense"
        />
      </>
    );
  };

  const renderGlobalDatabaseFields = (checkType) => {
    const data = formData.checkSpecificData?.[checkType] || {};
    return (
      <>
        <TextField
          label="Candidate Name"
          value={data.candidateName || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "candidateName",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="Address"
          value={data.address || ""}
          onChange={(e) =>
            handleCheckSpecificChange(checkType, "address", e.target.value)
          }
          fullWidth
          margin="dense"
        />
      </>
    );
  };

  const renderNationalIdFields = (checkType) => {
    const data = formData.checkSpecificData?.[checkType]?._self || {};
    return (
      <>
        <TextField
          label="Aadhaar"
          value={data.aadhaar || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "_self.aadhaar",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="PAN"
          value={data.pan || ""}
          onChange={(e) =>
            handleCheckSpecificChange(checkType, "_self.pan", e.target.value)
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="Passport"
          value={data.passport || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "_self.passport",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="Voter ID"
          value={data.voter || ""}
          onChange={(e) =>
            handleCheckSpecificChange(checkType, "_self.voter", e.target.value)
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="Driving Licence"
          value={data.drivingLicence || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "_self.drivingLicence",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
      </>
    );
  };

  const renderPoliceVerificationFields = (checkType) => {
    const data = formData.checkSpecificData?.[checkType]?._self || {};
    return (
      <>
        <TextField
          label="Candidate Name"
          value={data.candidateName || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "_self.candidateName",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="Father's Name"
          value={data.fatherName || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "_self.fatherName",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="Address"
          value={data.address || ""}
          onChange={(e) =>
            handleCheckSpecificChange(
              checkType,
              "_self.address",
              e.target.value
            )
          }
          fullWidth
          margin="dense"
        />
        <TextField
          label="Date of Birth"
          type="date"
          value={data.dob ? data.dob.split("T")[0] : ""}
          onChange={(e) =>
            handleCheckSpecificChange(checkType, "_self.dob", e.target.value)
          }
          fullWidth
          margin="dense"
          InputLabelProps={{ shrink: true }}
        />
      </>
    );
  };

  const renderReferenceChecksFields = (checkType) => {
    const data = formData.checkSpecificData?.[checkType] || {};
    return Object.entries(data).map(([sectionName, sectionData]) => (
      <Box
        key={sectionName}
        sx={{ border: "1px solid #ddd", p: 1, mb: 1, borderRadius: 1 }}
      >
        <Typography variant="subtitle2">
          {humanizeCheckType(sectionName)}
        </Typography>
        {Object.entries(sectionData).map(([key, value]) => (
          <TextField
            key={key}
            label={humanizeCheckType(key)}
            value={value || ""}
            onChange={(e) =>
              handleCheckSpecificChange(
                checkType,
                `${sectionName}.${key}`,
                e.target.value
              )
            }
            fullWidth
            margin="dense"
          />
        ))}
      </Box>
    ));
  };

  const renderUanFields = (checkType) => {
    const data = formData.checkSpecificData?.[checkType] || {};
    return (
      <>
        <TextField
          label="UAN Number"
          value={data.uan || data.uanNumber || ""}
          onChange={(e) =>
            handleCheckSpecificChange(checkType, "uan", e.target.value)
          }
          fullWidth
          margin="dense"
        />
      </>
    );
  };

  const renderGenericSelfFields = (checkType) => {
    const data = formData.checkSpecificData?.[checkType]?._self || {};
    const fieldKeys = Object.keys(data);

    if (fieldKeys.length === 0) {
      return <Typography>No editable fields for this check.</Typography>;
    }

    return (
      <>
        {fieldKeys.map((key) => {
          // Ignore _file objects that might be present
          if (typeof data[key] === "object" && data[key] !== null) {
            return null;
          }
          return (
            <TextField
              key={key}
              label={humanizeCheckType(key)} // Uses your existing helper
              value={data[key] || ""}
              onChange={(e) =>
                handleCheckSpecificChange(
                  checkType,
                  `_self.${key}`,
                  e.target.value
                )
              }
              fullWidth
              margin="dense"
            />
          );
        })}
      </>
    );
  };

  // --- END: NEW RENDER FUNCTIONS ---

  const renderCheckFields = (check) => {
    const normalizedType = normalizeKey(check.checkType);
    switch (normalizedType) {
      case "address_verification":
        return renderAddressVerificationFields(normalizedType);
      case "employment_verification":
        return renderEmploymentVerificationFields(normalizedType);
      case "court_record_check":
        return renderCourtRecordCheckFields(normalizedType);
      case "credit_history_check":
        return renderCreditHistoryCheckFields(normalizedType);
      case "directorship_check":
        return renderDirectorshipCheckFields(normalizedType);
      case "drug_panel_tests":
        return renderDrugPanelTestFields(normalizedType);
      case "education_verification":
        return renderEducationVerificationFields(); // Note: This is read-only for now
      case "gap_analysis":
        return renderGapAnalysisFields(normalizedType);
      case "global_database":
        return renderGlobalDatabaseFields(normalizedType);
      case "national_id_verification":
        return renderNationalIdFields(normalizedType);
      case "police_verification":
        return renderPoliceVerificationFields(normalizedType);
      case "reference_checks":
        return renderReferenceChecksFields(normalizedType);
      case "uan":
        return renderUanFields(normalizedType);
      case "social_media_screening":
        return renderGenericSelfFields(normalizedType);
      case "other_documents":
        return renderGenericSelfFields(normalizedType);
      default:
        return renderGenericSelfFields(normalizedType);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Edit Case Details</DialogTitle>
      <DialogContent dividers>
        <Typography variant="h6" gutterBottom>
          Candidate Information
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1, mb: 3 }}>
          {/* Candidate Info TextFields */}
          <Grid item xs={12} sm={6}>
            <TextField
              name="candidateName"
              label="Candidate Name"
              value={formData.candidateName || ""}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="fatherName"
              label="Father's Name"
              value={formData.fatherName || ""}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="email"
              label="Email ID"
              value={formData.email || ""}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="contactNumber"
              label="Contact Number"
              value={formData.contactNumber || ""}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="designation"
              label="Designation"
              value={formData.designation || ""}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
        </Grid>

        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          Applied Verification Checks
        </Typography>
        <Box sx={{ mt: 1 }}>
          {(caseData.checks || []).map((check, index) => {
            const normalizedType = normalizeKey(check.checkType);
            const panelId = `panel-${normalizedType}-${index}`;
            return (
              <Accordion
                key={panelId}
                expanded={expandedCheck === panelId}
                onChange={handleAccordionChange(panelId)}
                sx={{ mb: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography
                    sx={{ textTransform: "capitalize", fontWeight: "medium" }}
                  >
                    {humanizeCheckType(check.checkType)}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>{renderCheckFields(check)}</AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
        {alert.open && (
          <Alert
            severity={alert.severity}
            sx={{ mt: 2 }}
            onClose={() =>
              setAlert({ open: false, message: "", severity: "success" })
            }
          >
            {alert.message}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ borderColor: "rgba(0, 0, 0, 0.23)", color: "black" }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isUpdating}
        >
          {isUpdating ? <CircularProgress size={24} /> : "Update"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditCaseModal;
