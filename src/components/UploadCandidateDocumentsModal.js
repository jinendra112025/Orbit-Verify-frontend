import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Alert,
  CircularProgress,
  Chip,
  Divider,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material";

const UploadCandidateDocumentsModal = ({
  open,
  onClose,
  caseData,
  onUploadSuccess,
}) => {
  const [selectedCheck, setSelectedCheck] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [educationDetails, setEducationDetails] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const checks = caseData?.checks || [];

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);

    // Check if education is selected
    const isEducation = selectedCheck.toLowerCase().includes("education");

    if (isEducation) {
      // For education, add with empty details
      const newEducationEntries = files.map((file) => ({
        file,
        university: "",
        degree: "",
        year: "",
      }));
      setEducationDetails([...educationDetails, ...newEducationEntries]);
    } else {
      // For other checks, just add files
      setSelectedFiles([...selectedFiles, ...files]);
    }
  };

  const handleRemoveFile = (index) => {
    const isEducation = selectedCheck.toLowerCase().includes("education");

    if (isEducation) {
      setEducationDetails(educationDetails.filter((_, i) => i !== index));
    } else {
      setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
    }
  };

  const handleEducationDetailChange = (index, field, value) => {
    const updated = [...educationDetails];
    updated[index][field] = value;
    setEducationDetails(updated);
  };

  const handleUpload = async () => {
    if (!selectedCheck) {
      setMessage({ type: "error", text: "Please select a check type" });
      return;
    }

    const isEducation = selectedCheck.toLowerCase().includes("education");
    const filesToUpload = isEducation
      ? educationDetails.map((ed) => ed.file)
      : selectedFiles;

    if (filesToUpload.length === 0) {
      setMessage({ type: "error", text: "Please select at least one file" });
      return;
    }

    // Validate education details
    if (isEducation) {
      const hasEmptyFields = educationDetails.some(
        (ed) => !ed.university || !ed.degree || !ed.year
      );
      if (hasEmptyFields) {
        setMessage({
          type: "error",
          text: "Please fill in all education details (University, Degree, Year)",
        });
        return;
      }
    }

    setIsUploading(true);
    setMessage({ type: "", text: "" });

    try {
      const formData = new FormData();

      // Find the check index
      const checkIndex = checks.findIndex((c) => c.checkType === selectedCheck);

      // Append files
      filesToUpload.forEach((file) => {
        formData.append("candidateDocuments", file);
      });

      // Build upload mapping
      const uploadMapping = filesToUpload.map((file, idx) => {
        const mapping = {
          checkType: selectedCheck,
          checkIndex: checkIndex,
          subSectionKey: "_self",
        };

        // Add education details if applicable
        if (isEducation && educationDetails[idx]) {
          mapping.university = educationDetails[idx].university;
          mapping.degree = educationDetails[idx].degree;
          mapping.year = educationDetails[idx].year;
        }

        return mapping;
      });

      formData.append("uploadMapping", JSON.stringify(uploadMapping));

      const response = await fetch(
        `${
          process.env.REACT_APP_API_URL ||
          "https://orbit-verify-server.onrender.com/api"
        }/cases/${caseData._id}/upload-for-candidate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || "Upload failed");
      }

      setMessage({
        type: "success",
        text: data.msg || "Documents uploaded successfully!",
      });

      // Reset form
      setTimeout(() => {
        setSelectedCheck("");
        setSelectedFiles([]);
        setEducationDetails([]);
        onUploadSuccess(data.case);
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Upload error:", error);
      setMessage({
        type: "error",
        text: error.message || "Failed to upload documents",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedCheck("");
      setSelectedFiles([]);
      setEducationDetails([]);
      setMessage({ type: "", text: "" });
      onClose();
    }
  };

  const isEducation = selectedCheck.toLowerCase().includes("education");
  const displayFiles = isEducation ? educationDetails : selectedFiles;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <CloudUploadIcon color="primary" />
          <Typography variant="h6">Upload Documents for Candidate</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {message.text && (
          <Alert
            severity={message.type}
            sx={{ mb: 2 }}
            onClose={() => setMessage({ type: "", text: "" })}
          >
            {message.text}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Select Check Type</InputLabel>
            <Select
              value={selectedCheck}
              label="Select Check Type"
              onChange={(e) => {
                setSelectedCheck(e.target.value);
                setSelectedFiles([]);
                setEducationDetails([]);
              }}
            >
              {checks.map((check, idx) => (
                <MenuItem key={idx} value={check.checkType}>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    width="100%"
                  >
                    <Typography>
                      {check.checkType
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Typography>
                    <Chip
                      label={check.status}
                      size="small"
                      color={check.status === "Pending" ? "warning" : "default"}
                    />
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {selectedCheck && (
          <>
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUploadIcon />}
              fullWidth
              sx={{ mb: 2 }}
            >
              Select Files
              <input
                type="file"
                hidden
                multiple
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
            </Button>

            {displayFiles.length > 0 && (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  Selected Files ({displayFiles.length})
                </Typography>
                <List sx={{ maxHeight: 300, overflow: "auto" }}>
                  {isEducation
                    ? educationDetails.map((item, idx) => (
                        <Box key={idx}>
                          <ListItem
                            sx={{
                              bgcolor: "grey.50",
                              mb: 2,
                              borderRadius: 1,
                              flexDirection: "column",
                              alignItems: "stretch",
                            }}
                          >
                            <Box
                              display="flex"
                              alignItems="center"
                              justifyContent="space-between"
                              width="100%"
                              mb={1}
                            >
                              <Box display="flex" alignItems="center" gap={1}>
                                <DescriptionIcon color="action" />
                                <ListItemText
                                  primary={item.file.name}
                                  secondary={`${(item.file.size / 1024).toFixed(
                                    2
                                  )} KB`}
                                />
                              </Box>
                              <IconButton
                                edge="end"
                                onClick={() => handleRemoveFile(idx)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                            <Divider sx={{ my: 1 }} />
                            <Box display="flex" gap={1} flexDirection="column">
                              <TextField
                                size="small"
                                label="University"
                                value={item.university}
                                onChange={(e) =>
                                  handleEducationDetailChange(
                                    idx,
                                    "university",
                                    e.target.value
                                  )
                                }
                                required
                              />
                              <TextField
                                size="small"
                                label="Degree"
                                value={item.degree}
                                onChange={(e) =>
                                  handleEducationDetailChange(
                                    idx,
                                    "degree",
                                    e.target.value
                                  )
                                }
                                required
                              />
                              <TextField
                                size="small"
                                label="Year"
                                value={item.year}
                                onChange={(e) =>
                                  handleEducationDetailChange(
                                    idx,
                                    "year",
                                    e.target.value
                                  )
                                }
                                required
                              />
                            </Box>
                          </ListItem>
                        </Box>
                      ))
                    : selectedFiles.map((file, idx) => (
                        <ListItem
                          key={idx}
                          sx={{ bgcolor: "grey.50", mb: 1, borderRadius: 1 }}
                          secondaryAction={
                            <IconButton
                              edge="end"
                              onClick={() => handleRemoveFile(idx)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          }
                        >
                          <DescriptionIcon color="action" sx={{ mr: 2 }} />
                          <ListItemText
                            primary={file.name}
                            secondary={`${(file.size / 1024).toFixed(2)} KB`}
                          />
                        </ListItem>
                      ))}
                </List>
              </>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isUploading}>
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={isUploading || displayFiles.length === 0}
          startIcon={
            isUploading ? <CircularProgress size={20} /> : <CloudUploadIcon />
          }
        >
          {isUploading ? "Uploading..." : "Upload Documents"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UploadCandidateDocumentsModal;
