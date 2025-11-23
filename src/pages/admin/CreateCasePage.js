import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  Paper,
  TextField,
  Typography,
  Stepper,
  Step,
  StepLabel,
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  Radio,
  FormLabel,
  Alert,
  FormHelperText,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { Delete as DeleteIcon } from "@mui/icons-material";

const steps = ["Candidate Details", "Upload Documents", "Select Checks"];

const normalizeKey = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w_]/g, "");

const canonicalFor = (c) => {
  if (!c) return "";
  if (c.slug) return c.slug;
  if (c.name) return normalizeKey(c.name);
  return "";
};

const CreateCasePage = () => {
  const [uploadMethod, setUploadMethod] = useState("admin_upload");
  const [checksList, setChecksList] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedChecks, setSelectedChecks] = useState({});
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [educationDetails, setEducationDetails] = useState([]);
  const [formData, setFormData] = useState({ clientOrganization: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [sendLinkChecks, setSendLinkChecks] = useState([]);

  // structured states you already had (kept)
  const [employment, setEmployment] = useState({
    current: { organization: "", designation: "", tenure: "" },
    previous: { organization: "", designation: "", tenure: "" },
  });

  const [creditCheck, setCreditCheck] = useState({
    address: "",
  });

  const [globalDatabase, setGlobalDatabase] = useState({
    address: "",
    dob: "",
  });

  const [uan, setUan] = useState({
    aadhaar: "",
    uanNumber: "",
  });

  const [addressVerification, setAddressVerification] = useState({
    current: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      pincode: "",
      country: "",
      from: "",
      to: "",
      landmark: "",
      residenceType: "",
      contactPerson: "",
      contactNumber: "",
    },
    permanent: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      pincode: "",
      country: "",
      from: "",
      to: "",
    },
    preferences: {
      mode: "",
      preferredTime: "",
      altContactName: "",
      altContactNumber: "",
      notes: "",
    },
  });

  const [nationalId, setNationalId] = useState({
    aadhaar: { number: "" },
    pan: { number: "" },
    passport: { number: "" },
    voter: { number: "" },
    drivingLicence: { number: "" },
  });

  // Generic per-check details (fallback):
  // shape: { "<Check Name>": { "<sectionName>": { field: value, _file: File }, notes: "...", subOptions: { selected / map } } }
  const [checkDetails, setCheckDetails] = useState({});

  const toCheckSlug = (check) => {
    if (!check) return "";
    if (typeof check === "string") return normalizeKey(check);
    if (check.slug) return check.slug;
    if (check.name) return normalizeKey(check.name);
    return "";
  };

  // small helper to ensure nested path exists
  const ensurePath = (obj, check, subKey) => {
    const copy = { ...obj };
    if (!copy[check]) copy[check] = {};
    if (!copy[check][subKey]) copy[check][subKey] = {};
    return copy;
  };

  // files chosen for known fields (uploads keyed by deterministic keys)
  // e.g. uploads['employment_current'] = [File, File2]
  const [uploads, setUploads] = useState({});

  const handleFileUpload = (e, key) => {
    const files = Array.from(e.target.files || []);
    setUploads((prev) => ({ ...prev, [key]: files }));
  };

  // NEW: Handler to remove a file from the 'uploads' state
  const removeUpload = (keyToRemove) => {
    setUploads((prev) => {
      const next = { ...prev };
      delete next[keyToRemove];
      return next;
    });
  };

  // NEW: Handler to remove a file from the 'checkDetails' state (for National ID, Other Docs)
  const removeDetailFile = (check, subKey = "_self") => {
    const key = toCheckSlug(check);
    const sKey = subKey == null ? "_self" : String(subKey);

    setCheckDetails((prev) => {
      const next = { ...prev };
      if (next[key] && next[key][sKey] && next[key][sKey]._file) {
        const updatedSection = { ...next[key][sKey] };
        delete updatedSection._file;
        next[key] = { ...next[key], [sKey]: updatedSection };

        if (Object.keys(updatedSection).length === 0) {
          delete next[key][sKey];
        }
        if (Object.keys(next[key]).length === 0) {
          delete next[key];
        }
      }
      return next;
    });
  };

  // fetch clients and checks
  useEffect(() => {
    // quick mount log so we know effect ran
    console.log(
      "[CreateCasePage] useEffect mounted - fetching clients & checks"
    );

    const fetchDataAndBuildChecks = async () => {
      try {
        console.log("[CreateCasePage] About to call /clients and /checks");
        const [clientsResp, apiChecksResp] = await Promise.all([
          api.get("/clients"),
          api.get("/checks"),
        ]);

        console.log(
          "[CreateCasePage] /clients response:",
          clientsResp && clientsResp.data
        );
        console.log(
          "[CreateCasePage] /checks response:",
          apiChecksResp && apiChecksResp.data
        );

        setClients(clientsResp.data || []);

        // normalize raw API payload (guard for many shapes)
        const apiChecksRaw = Array.isArray(apiChecksResp.data)
          ? apiChecksResp.data
          : [];
        console.log(
          "[CreateCasePage] apiChecksRaw length =",
          apiChecksRaw.length
        );

        const normalized = apiChecksRaw.map((c, idx) => {
          const guessName = c.name || c.label || c.displayName || "";
          const slug =
            c.slug || c.key || normalizeKey(guessName || `check_${idx}`);
          return {
            name: (guessName || slug.replace(/_/g, " ")).trim(),
            slug: normalizeKey(slug),
            category: c.category || c.group || "Other",
            description: c.description || c.desc || "",
            _schema: c.schema || c._schema || c.formSchema || null,
            raw: c,
          };
        });

        console.log("[CreateCasePage] normalized checks:", normalized);

        // Deduplicate by normalized name: prefer entries that have a _schema
        const byName = new Map();
        normalized.forEach((entry) => {
          const nameKey = normalizeKey(entry.name || entry.slug);
          const existing = byName.get(nameKey);
          if (!existing) {
            byName.set(nameKey, entry);
            return;
          }
          // If existing has schema already, keep it and enrich metadata
          if (existing._schema) {
            existing.category = existing.category || entry.category;
            existing.description = existing.description || entry.description;
            byName.set(nameKey, existing);
            return;
          }
          // if existing has no schema but this one does, replace
          if (entry._schema) {
            byName.set(nameKey, entry);
          } else {
            // neither has schema — keep existing but enrich metadata
            existing.category = existing.category || entry.category;
            existing.description = existing.description || entry.description;
            byName.set(nameKey, existing);
          }
        });

        const effectiveChecks = Array.from(byName.values()).map((c) => ({
          ...c,
          slug: normalizeKey(c.slug || c.name),
        }));

        // expose for debugging in console
        if (typeof window !== "undefined") {
          window.__checksListForDebug__ = effectiveChecks;
        }

        console.log(
          "[CreateCasePage] effectiveChecks (deduped):",
          effectiveChecks.map((x) => ({
            name: x.name,
            slug: x.slug,
            hasSchema: !!x._schema,
            category: x.category,
          }))
        );

        setChecksList(effectiveChecks);
      } catch (err) {
        // ALWAYS log the error so it is visible in devtools
        console.error("[CreateCasePage] Failed fetching checks/clients:", err);
        setError("Failed to load checks/clients. Try refreshing.");
        setChecksList([]);
      }
    };

    fetchDataAndBuildChecks();
  }, []);

  const canonicalKey = (check) => {
    if (!check) return "";
    if (check.slug) return check.slug;
    if (check.name)
      return check.name.toString().toLowerCase().replace(/\s+/g, "_");
    return "";
  };

  // helper to test if a check is selected (accepts check object or slug/name)
  const isSelected = (checkOrKey) => {
    const key =
      typeof checkOrKey === "string" ? checkOrKey : canonicalKey(checkOrKey);
    return !!selectedChecks[key];
  };

  const handleFormChange = (event) =>
    setFormData({ ...formData, [event.target.name]: event.target.value });

  const handleCheckChange = (event) => {
    const { name, checked } = event.target;
    const key = name.trim();

    setSelectedChecks((prev) => {
      const next = { ...prev, [key]: checked };
      // if unchecking parent, remove any checkDetails for it
      if (!checked) {
        setCheckDetails((cdPrev) => {
          const cdNext = { ...cdPrev };
          if (cdNext[key]) delete cdNext[key];
          return cdNext;
        });
      }
      return next;
    });
  };

  // subOption handling (used for older checks that have subOptions)
  const handleSubOptionChange = (
    parentCheck,
    subOptionValue,
    isRadio = false,
    checked = true
  ) => {
    const parentSlug = toCheckSlug(parentCheck);
    const normalizedSub = normalizeKey(subOptionValue);

    setCheckDetails((prev) => {
      const next = { ...prev };

      if (!next[parentSlug]) next[parentSlug] = {};
      if (!next[parentSlug].subOptions) next[parentSlug].subOptions = {};

      if (isRadio) {
        // radio: store a single selected value (use raw value so it's human readable)
        next[parentSlug].subOptions.selected = subOptionValue;
        // don't mirror radios into selectedChecks (keeps selectedChecks focused on checkbox state)
      } else {
        // checkbox style sub-options: keep a map keyed by normalizedSub
        const prevMap = { ...(next[parentSlug].subOptions.map || {}) };
        if (checked) prevMap[normalizedSub] = true;
        else delete prevMap[normalizedSub];
        next[parentSlug].subOptions.map = prevMap;
      }

      return next;
    });

    // mirror non-radio sub-options to selectedChecks using deterministic key
    if (!isRadio) {
      const mirrorKey = `${parentSlug}__${normalizedSub}`;
      setSelectedChecks((prevSel) => ({ ...prevSel, [mirrorKey]: !!checked }));
    }
  };

  const isSubOptionSelected = (
    parentCheck,
    subOptionValue,
    isRadio = false
  ) => {
    const parentSlug = toCheckSlug(parentCheck);
    const normalizedSub = normalizeKey(subOptionValue);
    const parent = checkDetails[parentSlug];
    if (!parent || !parent.subOptions) return false;
    if (isRadio) return parent.subOptions.selected === subOptionValue;
    return !!(parent.subOptions.map && parent.subOptions.map[normalizedSub]);
  };

  const handleDetailChange = (check, subKey = "_self", field, value) => {
    const key = toCheckSlug(check);
    const sKey = subKey == null ? "_self" : String(subKey);

    setCheckDetails((prev) => {
      // shallow copy of prev
      const next = { ...prev };

      // ensure shape exists
      if (!next[key]) next[key] = {};
      if (!next[key][sKey]) next[key][sKey] = {};

      // set field immutably
      next[key][sKey] = { ...next[key][sKey], [field]: value };

      return next;
    });
  };
  const handleDetailFile = (check, subKey = "_self", file) => {
    const key = toCheckSlug(check);
    const sKey = subKey == null ? "_self" : String(subKey);

    setCheckDetails((prev) => {
      const next = { ...prev };

      if (!next[key]) next[key] = {};
      if (!next[key][sKey]) next[key][sKey] = {};

      // store single file (if you need multiple files you can store array)
      next[key][sKey] = { ...next[key][sKey], _file: file };

      return next;
    });
  };

  // generic drag/drop selection
  const handleFileChange = (event) =>
    setSelectedFiles([
      ...selectedFiles,
      ...Array.from(event.target.files || []),
    ]);

  const removeFile = (fileName) =>
    setSelectedFiles(selectedFiles.filter((file) => file.name !== fileName));

  // =======================
  // Education Handlers (existing behavior)
  // =======================
  const addEducation = () => {
    setEducationDetails([
      ...educationDetails,
      { university: "", degree: "", year: "", document: null },
    ]);
  };

  const handleEducationChange = (index, field, value) => {
    const updated = [...educationDetails];
    updated[index][field] = value;
    setEducationDetails(updated);
  };

  const handleEducationFile = (index, file) => {
    const updated = [...educationDetails];
    updated[index].document = file;
    setEducationDetails(updated);
  };

  const removeEducation = (index) => {
    const updated = [...educationDetails];
    updated.splice(index, 1);
    setEducationDetails(updated);
  };

  // -----------------------
  // Schema-driven field renderer
  // -----------------------
  const getSchemaForCheck = (check) => {
    if (!check) return null;

    // If the check object itself already contains a schema (returned by /api/checks)
    if (check.schema && typeof check.schema === "object") return check.schema;
    if (check._schema && typeof check._schema === "object")
      return check._schema;

    // If passed a slug or name, try to locate in checksList (fetched from backend)
    const slug =
      typeof check === "string"
        ? normalizeKey(check)
        : check.slug || normalizeKey(check.name || "");
    const found = checksList.find(
      (c) =>
        (c.slug && normalizeKey(c.slug) === slug) ||
        normalizeKey(c.name || "") === slug
    );
    if (found) return found.schema || found._schema || null;

    return null;
  };

  const renderSchemaSection = (check, sectionKey, fields) => {
    // canonical names
    const checkName = check.name || "";
    const checkSlug = check.slug || normalizeKey(checkName);
    const slug = checkSlug;
    const displayName = checkName;

    // Special-case mapping to existing states
    const isEmployment = checkName === "Employment Verification";
    const isEducation = checkName === "Education Verification";
    const isNationalId =
      checkName === "National ID Verification" || checkName === "National ID";
    const isAddress = checkName === "Address Verification";
    const isCredit =
      checkName === "Credit History Check" || checkName === "Credit Check";
    const isGlobal = checkName === "Global Database";
    const isUan = checkName === "UAN";
    const isDrug = checkName === "Drug Panel Tests";
    const isCourtPolice =
      checkName === "Court Record Check" || checkName === "Police Verification";
    const isReference = checkName === "Reference Checks";
    const isGap = checkName === "Gap Analysis";
    const isSocialMedia = checkName === "Social Media Screening";
    const isDirectorship = checkName === "Directorship Check";

    // helper to read/store values from checkDetails using slug and sectionKey
    const readDetail = (field) =>
      checkDetails?.[checkSlug]?.[sectionKey]?.[field] || "";
    const readFile = () => checkDetails?.[checkSlug]?.[sectionKey]?._file;

    return (
      <Box
        key={sectionKey}
        sx={{ mb: 2, p: 2, border: "1px solid #eee", borderRadius: 1 }}
      >
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
          {sectionKey === "_self" ? "" : sectionKey}
        </Typography>

        {/* Education */}
        {isEducation && (
          <>
            {educationDetails.map((edu, index) => (
              <Box key={index} sx={{ mb: 1 }}>
                <TextField
                  label="University"
                  value={edu.university}
                  onChange={(e) =>
                    handleEducationChange(index, "university", e.target.value)
                  }
                  fullWidth
                  sx={{ mb: 1 }}
                  size="small"
                />
                <TextField
                  label="Degree"
                  value={edu.degree}
                  onChange={(e) =>
                    handleEducationChange(index, "degree", e.target.value)
                  }
                  fullWidth
                  sx={{ mb: 1 }}
                  size="small"
                />
                <TextField
                  label="Year of Passing"
                  value={edu.year}
                  onChange={(e) =>
                    handleEducationChange(index, "year", e.target.value)
                  }
                  fullWidth
                  sx={{ mb: 1 }}
                  size="small"
                />
                <Button variant="outlined" component="label" sx={{ mb: 1 }}>
                  {edu.document ? edu.document.name : "Upload Document"}
                  <input
                    type="file"
                    hidden
                    onChange={(e) =>
                      handleEducationFile(index, e.target.files[0])
                    }
                  />
                </Button>
                <Button
                  variant="text"
                  color="error"
                  onClick={() => removeEducation(index)}
                >
                  Remove
                </Button>
              </Box>
            ))}
            <Button variant="contained" onClick={addEducation}>
              + Add Education
            </Button>
          </>
        )}

        {/* Employment */}
        {isEmployment &&
          fields.map((fld) => {
            const which = sectionKey.toLowerCase().includes("current")
              ? "current"
              : "previous";
            const val = employment?.[which]?.[fld.name] || "";

            if (fld.type === "file") {
              const key = `${slug}__${normalizeKey(sectionKey)}__${normalizeKey(
                fld.name
              )}`;
              return (
                <Box key={fld.name} sx={{ mb: 1 }}>
                  <Button variant="outlined" component="label">
                    {fld.label}
                    <input
                      type="file"
                      hidden
                      multiple={false}
                      onClick={(e) => (e.target.value = null)}
                      onChange={(e) => handleFileUpload(e, key)}
                    />
                  </Button>
                  {uploads[key]?.length
                    ? uploads[key].map((file, index) => (
                        <Box
                          key={index}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            ml: 1,
                            mt: 0.5,
                          }}
                        >
                          <Typography variant="caption">{file.name}</Typography>
                          <IconButton
                            size="small"
                            onClick={() => removeUpload(key)}
                            sx={{ ml: 0.5 }}
                          >
                            <DeleteIcon fontSize="inherit" />
                          </IconButton>
                        </Box>
                      ))
                    : null}
                </Box>
              );
            }

            return (
              <TextField
                key={fld.name}
                label={fld.label}
                value={val}
                onChange={(e) =>
                  setEmployment((prev) => ({
                    ...prev,
                    [which]: { ...prev[which], [fld.name]: e.target.value },
                  }))
                }
                fullWidth
                size="small"
                sx={{ mb: 1 }}
              />
            );
          })}

        {/* National ID: render single upload and inputs (DL + Voter option added) */}
        {isNationalId &&
          (() => {
            // show all text inputs (Aadhaar, PAN, Passport, DL, Voter) mapped to nationalId state
            // but show only one upload button for ID proof
            const fileKey = `${slug}__id_proof`;
            return (
              <Box>
                {fields
                  .filter((f) => f.type !== "file")
                  .map((fld) => (
                    <TextField
                      key={fld.name}
                      label={fld.label}
                      value={
                        readDetail(fld.name) ||
                        (nationalId[fld.name]
                          ? nationalId[fld.name].number || ""
                          : "")
                      }
                      onChange={(e) =>
                        handleDetailChange(
                          checkSlug,
                          sectionKey,
                          fld.name,
                          e.target.value
                        )
                      }
                      fullWidth
                      size="small"
                      sx={{ mb: 1 }}
                    />
                  ))}

                <Box sx={{ mb: 1 }}>
                  <Button variant="outlined" component="label">
                    Upload ID Proof
                    <input
                      type="file"
                      hidden
                      multiple={false}
                      onClick={(e) => (e.target.value = null)}
                      onChange={(e) =>
                        handleDetailFile(
                          checkSlug,
                          sectionKey,
                          e.target.files[0]
                        )
                      }
                    />
                  </Button>
                  {readFile() ? (
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        ml: 1,
                      }}
                    >
                      <Typography variant="caption">
                        {readFile().name}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => removeDetailFile(checkSlug, sectionKey)}
                        sx={{ ml: 0.5 }}
                      >
                        <DeleteIcon fontSize="inherit" />
                      </IconButton>
                    </Box>
                  ) : null}
                </Box>
              </Box>
            );
          })()}

        {/* Address Verification */}
        {isAddress &&
          fields.map((fld) => {
            if (fld.type === "file") {
              const key = `${slug}__${normalizeKey(sectionKey)}__${normalizeKey(
                fld.name
              )}`;
              return (
                <Box key={fld.name} sx={{ mb: 1 }}>
                  <Button variant="outlined" component="label">
                    {fld.label}
                    <input
                      type="file"
                      hidden
                      multiple={false}
                      onClick={(e) => (e.target.value = null)}
                      onChange={(e) => handleFileUpload(e, key)}
                    />
                  </Button>
                  {uploads[key]?.length
                    ? uploads[key].map((file, index) => (
                        <Box
                          key={index}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            ml: 1,
                            mt: 0.5,
                          }}
                        >
                          <Typography variant="caption">{file.name}</Typography>
                          <IconButton
                            size="small"
                            onClick={() => removeUpload(key)}
                            sx={{ ml: 0.5 }}
                          >
                            <DeleteIcon fontSize="inherit" />
                          </IconButton>
                        </Box>
                      ))
                    : null}
                </Box>
              );
            }

            // determine which sub-path (current/permanent/preferences)
            let targetPath = "current";
            if (sectionKey.toLowerCase().includes("permanent"))
              targetPath = "permanent";
            if (
              sectionKey.toLowerCase().includes("preference") ||
              sectionKey.toLowerCase().includes("preferences")
            )
              targetPath = "preferences";

            // handle radio explicitly for address preferences
            if (fld.type === "radio" && Array.isArray(fld.options)) {
              const current =
                addressVerification?.[targetPath]?.[fld.name] ||
                fld.options[0] ||
                "";
              return (
                <Box key={fld.name} sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    {fld.label}
                  </Typography>
                  <RadioGroup
                    row
                    name={`${slug}__${sectionKey}__${fld.name}`}
                    value={current}
                    onChange={(e) =>
                      setAddressVerification((prev) => ({
                        ...prev,
                        [targetPath]: {
                          ...(prev[targetPath] || {}),
                          [fld.name]: e.target.value,
                        },
                      }))
                    }
                  >
                    {fld.options.map((opt) => (
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

            // default: text input mapped into addressVerification state
            const value = addressVerification?.[targetPath]?.[fld.name] || "";

            return (
              <TextField
                key={fld.name}
                label={fld.label}
                value={value}
                onChange={(e) =>
                  setAddressVerification((prev) => ({
                    ...prev,
                    [targetPath]: {
                      ...(prev[targetPath] || {}),
                      [fld.name]: e.target.value,
                    },
                  }))
                }
                fullWidth
                size="small"
                sx={{ mb: 1 }}
              />
            );
          })}

        {/* Credit, Global, UAN, Drug handled similarly to before but use slug keys */}
        {isCredit &&
          fields.filter((f) => f.name !== "aadhaar" && f.name !== "pan").map((fld) => {
            if (fld.type === "file") {
              const key = `${slug}__${normalizeKey(sectionKey)}__${normalizeKey(
                fld.name
              )}`;
              return (
                <Box key={fld.name} sx={{ mb: 1 }}>
                  <Button variant="outlined" component="label">
                    {fld.label}
                    <input
                      type="file"
                      hidden
                      multiple={false}
                      onClick={(e) => (e.target.value = null)}
                      onChange={(e) => handleFileUpload(e, key)}
                    />
                  </Button>
                  {uploads[key]?.length
                    ? uploads[key].map((file, index) => (
                        <Box
                          key={index}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            ml: 1,
                            mt: 0.5,
                          }}
                        >
                          <Typography variant="caption">{file.name}</Typography>
                          <IconButton
                            size="small"
                            onClick={() => removeUpload(key)}
                            sx={{ ml: 0.5 }}
                          >
                            <DeleteIcon fontSize="inherit" />
                          </IconButton>
                        </Box>
                      ))
                    : null}
                </Box>
              );
            }

            // --- ADDED THIS BLOCK ---
            if (fld.type === "date") {
              const value = (creditCheck?.[fld.name] || "").split("T")[0];
              return (
                <TextField
                  key={fld.name}
                  label={fld.label}
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={value}
                  onChange={(e) =>
                    setCreditCheck((prev) => ({
                      ...prev,
                      [fld.name]: e.target.value,
                    }))
                  }
                  fullWidth
                  size="small"
                  sx={{ mb: 1 }}
                />
              );
            }
            // --- END OF ADDED BLOCK ---

            const value = creditCheck?.[fld.name] || "";
            return (
              <TextField
                key={fld.name}
                label={fld.label}
                value={value}
                onChange={(e) =>
                  setCreditCheck((prev) => ({
                    ...prev,
                    [fld.name]: e.target.value,
                  }))
                }
                fullWidth
                size="small"
                sx={{ mb: 1 }}
              />
            );
          })}

        {isGlobal &&
          fields.map((fld) => {
            if (fld.type === "file") {
              const key = `${slug}__${normalizeKey(sectionKey)}__${normalizeKey(
                fld.name
              )}`;
              return (
                <Box key={fld.name} sx={{ mb: 1 }}>
                  <Button variant="outlined" component="label">
                    {fld.label}
                    <input
                      type="file"
                      hidden
                      multiple={false}
                      onClick={(e) => (e.target.value = null)}
                      onChange={(e) => handleFileUpload(e, key)}
                    />
                  </Button>
                  {uploads[key]?.length
                    ? uploads[key].map((file, index) => (
                        <Box
                          key={index}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            ml: 1,
                            mt: 0.5,
                          }}
                        >
                          <Typography variant="caption">{file.name}</Typography>
                          <IconButton
                            size="small"
                            onClick={() => removeUpload(key)}
                            sx={{ ml: 0.5 }}
                          >
                            <DeleteIcon fontSize="inherit" />
                          </IconButton>
                        </Box>
                      ))
                    : null}
                </Box>
              );
            }
            const value = globalDatabase?.[fld.name] || "";
            return (
              <TextField
                key={fld.name}
                label={fld.label}
                value={value}
                onChange={(e) =>
                  setGlobalDatabase((prev) => ({
                    ...prev,
                    [fld.name]: e.target.value,
                  }))
                }
                fullWidth
                size="small"
                sx={{ mb: 1 }}
              />
            );
          })}

        {isUan &&
          fields.map((fld) => {
            if (fld.type === "file") {
              const key = `${slug}__${normalizeKey(sectionKey)}__${normalizeKey(
                fld.name
              )}`;
              return (
                <Box key={fld.name} sx={{ mb: 1 }}>
                  <Button variant="outlined" component="label">
                    {fld.label}
                    <input
                      type="file"
                      hidden
                      multiple={false}
                      onClick={(e) => (e.target.value = null)}
                      onChange={(e) => handleFileUpload(e, key)}
                    />
                  </Button>
                  {uploads[key]?.length
                    ? uploads[key].map((file, index) => (
                        <Box
                          key={index}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            ml: 1,
                            mt: 0.5,
                          }}
                        >
                          <Typography variant="caption">{file.name}</Typography>
                          <IconButton
                            size="small"
                            onClick={() => removeUpload(key)}
                            sx={{ ml: 0.5 }}
                          >
                            <DeleteIcon fontSize="inherit" />
                          </IconButton>
                        </Box>
                      ))
                    : null}
                </Box>
              );
            }
            const value = uan?.[fld.name] || "";
            return (
              <TextField
                key={fld.name}
                label={fld.label}
                value={value}
                onChange={(e) =>
                  setUan((prev) => ({ ...prev, [fld.name]: e.target.value }))
                }
                fullWidth
                size="small"
                sx={{ mb: 1 }}
              />
            );
          })}

        {isDrug &&
          fields.map((fld) => {
            if (fld.type === "radio" && fld.options) {
              const current =
                checkDetails?.[checkSlug]?.[sectionKey]?.[fld.name] ||
                fld.options[0] ||
                "";
              return (
                <RadioGroup
                  key={fld.name}
                  row
                  name={`${checkSlug}__${fld.name}`}
                  value={current}
                  onChange={(e) =>
                    handleDetailChange(
                      checkSlug,
                      sectionKey,
                      fld.name,
                      e.target.value
                    )
                  }
                >
                  {fld.options.map((opt) => (
                    <FormControlLabel
                      key={opt}
                      value={opt}
                      control={<Radio size="small" />}
                      label={opt}
                    />
                  ))}
                </RadioGroup>
              );
            }
            return fieldsRenderGeneric(check, sectionKey, [fld]);
          })}

        {/* Generic fallback */}
        {fields
          .filter(
            (f) =>
              !(
                isEducation ||
                isEmployment ||
                isNationalId ||
                isAddress ||
                isCredit ||
                isGlobal ||
                isUan ||
                isDrug
              )
          )
          .map((fld) => fieldsRenderGeneric(check, sectionKey, [fld]))}
      </Box>
    );
  };
  // generic single-field renderer used by fallback
  const fieldsRenderGeneric = (check, sectionKey, fields) => {
    const checkSlug = check.slug || normalizeKey(check.name);
    return fields.map((fld) => {
      if (fld.type === "file") {
        return (
          <Box key={fld.name} sx={{ mb: 1 }}>
            <Button variant="outlined" component="label">
              {fld.label}
              <input
                type="file"
                hidden
                onClick={(e) => (e.target.value = null)}
                onChange={(e) => {
                  const file = e.target.files[0];
                  handleDetailFile(checkSlug, sectionKey, file);
                }}
              />
            </Button>
            {checkDetails?.[checkSlug]?.[sectionKey]?._file ? (
              <Typography variant="caption" sx={{ ml: 1 }}>
                {checkDetails[checkSlug][sectionKey]._file.name}
              </Typography>
            ) : null}
          </Box>
        );
      }

      if (fld.type === "date" || fld.name === "dob") {
        return (
          <TextField
            key={fld.name}
            label={fld.label}
            type="date"
            InputLabelProps={{ shrink: true }}
            fullWidth
            size="small"
            sx={{ mb: 1 }}
            value={checkDetails?.[checkSlug]?.[sectionKey]?.[fld.name] || ""}
            onChange={(e) =>
              handleDetailChange(
                checkSlug,
                sectionKey,
                fld.name,
                e.target.value
              )
            }
          />
        );
      }

      if (fld.type === "radio" && fld.options) {
        const current =
          checkDetails?.[checkSlug]?.[sectionKey]?.[fld.name] || fld.options[0];
        return (
          <RadioGroup
            key={fld.name}
            row
            name={`${checkSlug}__${fld.name}`}
            value={current}
            onChange={(e) =>
              handleDetailChange(
                checkSlug,
                sectionKey,
                fld.name,
                e.target.value
              )
            }
          >
            {fld.options.map((opt) => (
              <FormControlLabel
                key={opt}
                value={opt}
                control={<Radio size="small" />}
                label={opt}
              />
            ))}
          </RadioGroup>
        );
      }

      return (
        <TextField
          key={fld.name}
          label={fld.label}
          fullWidth
          size="small"
          sx={{ mb: 1 }}
          value={checkDetails?.[checkSlug]?.[sectionKey]?.[fld.name] || ""}
          onChange={(e) =>
            handleDetailChange(checkSlug, sectionKey, fld.name, e.target.value)
          }
        />
      );
    });
  };

  // put this in your CreateCasePage.js (replace the old renderCheckFields)
  const renderCheckFields = (check) => {
    const schema = getSchemaForCheck(check);
    if (!schema) return null;

    // meta can be on top-level schema as `_meta` or `meta`
    const meta = schema._meta || schema.meta || {};
    const onlyUpload = !!meta.onlyUpload;

    // If onlyUpload is true: show a compact upload UI (and any single text field if present)
    if (onlyUpload) {
      const selfFields = Array.isArray(schema._self) ? schema._self : [];

      const textField = selfFields.find(
        (f) => !f.type || f.type === "text" || f.type === "string"
      );
      const fileField = selfFields.find(
        (f) => f.type === "file" || f.name === "_file"
      );

      const checkSlug = check.slug || normalizeKey(check.name);
      const existingTextVal = textField
        ? checkDetails?.[checkSlug]?.["_self"]?.[textField.name] || ""
        : "";

      return (
        <Box sx={{ mb: 2 }}>
          {textField ? (
            <TextField
              fullWidth
              size="small"
              label={textField.label || textField.name}
              placeholder={textField.placeholder || ""}
              value={existingTextVal}
              onChange={(e) =>
                handleDetailChange(
                  checkSlug,
                  "_self",
                  textField.name,
                  e.target.value
                )
              }
              sx={{ mb: 1 }}
            />
          ) : null}

          {fileField ? (
            <Box>
              <Button variant="outlined" component="label">
                {fileField.label || "Upload Documents"}
                <input
                  type="file"
                  hidden
                  multiple={false}
                  onClick={(e) => (e.target.value = null)}
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    if (file) {
                      handleDetailFile(checkSlug, "_self", file);
                    }
                  }}
                />
              </Button>
              {checkDetails?.[checkSlug]?.["_self"]?._file ? (
                <Box
                  sx={{ display: "inline-flex", alignItems: "center", ml: 1 }}
                >
                  <Typography variant="caption">
                    {checkDetails[checkSlug]["_self"]._file.name}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => removeDetailFile(checkSlug, "_self")}
                    sx={{ ml: 0.5 }}
                  >
                    <DeleteIcon fontSize="inherit" />
                  </IconButton>
                </Box>
              ) : null}
            </Box>
          ) : null}
        </Box>
      );
    }

    // Not onlyUpload: render named sections first, then _self
    // collect named section keys (skip meta and _self)
    const namedSectionKeys = Object.keys(schema || {}).filter(
      (k) => k !== "_meta" && k !== "meta" && k !== "_self"
    );

    return (
      <>
        {/* render named sections first (Current Address, Permanent Address, etc.) */}
        {namedSectionKeys.map((sectionKey) =>
          renderSchemaSection(check, sectionKey, schema[sectionKey])
        )}

        {/* then render _self (if present) so "verificationMode" shows after the address blocks) */}
        {Array.isArray(schema._self)
          ? renderSchemaSection(check, "_self", schema._self)
          : null}
      </>
    );
  };

  // =======================
  // Submit Handler
  // =======================
  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setError("");

    try {
      // ---- send_link path (unchanged) ----
      if (uploadMethod === "send_link") {
        // 1) client-side validation: email is required to send a link
        const email =
          formData && formData.email ? formData.email.toString().trim() : "";
        if (!email) {
          setIsSubmitting(false);
          setError(
            "Candidate email is required to send an upload link. Please enter the candidate's email."
          );
          return;
        }

        // If admin must choose a client organization, validate that too
        if (!formData.clientOrganization) {
          setIsSubmitting(false);
          setError(
            "Client organization is required to send link. Please select one."
          );
          return;
        }

        // 2) Determine which checks to include in the send-link payload.
        // Prefer explicit sendLinkChecks (from dropdown). If empty, fall back to selectedChecks.
        let checksToSend =
          Array.isArray(sendLinkChecks) && sendLinkChecks.length
            ? sendLinkChecks.slice()
            : Object.keys(selectedChecks || {}).filter(
                (k) => selectedChecks[k]
              );

        // Normalize keys to simple slugs (defensive)
        checksToSend = checksToSend
          .map((s) => (typeof s === "string" ? s.trim() : s))
          .filter(Boolean);

        if (!checksToSend.length) {
          setIsSubmitting(false);
          setError(
            "Please select at least one verification check for which the candidate should upload documents."
          );
          return;
        }

        // 3) Build the payload — keep same shape backend expects
        const payload = {
          candidateInfo: formData, // backend parseMaybeJSON handles object/string
          checks: checksToSend,
          clientOrganization: formData.clientOrganization,
        };

        // Debug logging - helpful while backend integration is being verified
        console.log(
          "[CreateCasePage] Sending create-and-send-link payload:",
          payload
        );

        try {
          // increase timeout for this call (30s) in case sending email / external API is slow
          const resp = await api.post("/cases/create-and-send-link", payload, {
            timeout: 30000,
          });

          // Debug response
          console.log(
            "[CreateCasePage] /cases/create-and-send-link response:",
            resp && resp.data ? resp.data : resp
          );

          // show backend message (if provided) or a default success note
          const msg =
            resp?.data?.msg || "Upload link has been sent to the candidate.";
          setMessage(msg);

          // navigate after short delay so user sees confirmation
          setTimeout(() => navigate("/admin"), 2500);
          return;
        } catch (err) {
          console.error(
            "[CreateCasePage] Error while calling create-and-send-link:",
            err
          );

          // Prefer a server-provided message, fall back to axios/JS error text
          const serverMsg =
            err?.response?.data?.msg ||
            (err?.response?.data ? JSON.stringify(err.response.data) : null) ||
            err?.message ||
            "Failed to send upload link.";

          setError(serverMsg);
          setIsSubmitting(false);
          return;
        }
      }

      // ---- admin_upload path ----
      const data = new FormData();

      // Candidate info (as one JSON blob)
      data.append("candidateInfo", JSON.stringify(formData));
      if (formData.clientOrganization)
        data.append("clientOrganization", formData.clientOrganization);

      // Build canonical active parent checks only (avoid sub-option mirror keys)
      const effectiveChecks = checksList && checksList.length ? checksList : [];
      const parentSlugsSet = new Set(effectiveChecks.map((c) => c.slug));
      const activeParentSlugs = Object.keys(selectedChecks).filter(
        (k) => selectedChecks[k] && parentSlugsSet.has(k)
      );

      const checksPayload = activeParentSlugs.map((checkSlug) => {
        const found = effectiveChecks.find((c) => c.slug === checkSlug) || {};
        const checkTypeValue =
          found.slug || normalizeKey(found.name || checkSlug);
        const detail = checkDetails?.[checkSlug] || {};
        const params = {};

        if (detail.subOptions) {
          if (detail.subOptions.selected)
            params.subOption = detail.subOptions.selected;
          if (detail.subOptions.map) params.subOptions = detail.subOptions.map;
        }
        if (detail.notes) params.notes = detail.notes;

        Object.keys(detail).forEach((k) => {
          if (!["subOptions", "notes"].includes(k)) params[k] = detail[k];
        });

        // ✅ Special handling for drug panel
        if (checkTypeValue === "drug_panel_tests") {
          const selected =
            detail?._self?.labTestLevel ||
            detail?._self?.selected ||
            detail?.subOptions?.selected ||
            null;
          if (selected) {
            params.labTestLevel = selected;
          }
        }

        return {
          checkType: checkTypeValue,
          status: "Pending",
          comments: "",
          params,
        };
      });
      data.append("checks", JSON.stringify(checksPayload));

      // ===== Structured sections (send if you have them in state) =====
      if (employment) data.append("employment", JSON.stringify(employment));
      if (creditCheck) data.append("creditCheck", JSON.stringify(creditCheck));
      if (globalDatabase)
        data.append("globalDatabase", JSON.stringify(globalDatabase));
      if (uan) data.append("uan", JSON.stringify(uan));
      if (addressVerification)
        data.append("addressVerification", JSON.stringify(addressVerification));
      if (nationalId) data.append("nationalId", JSON.stringify(nationalId));

      // ===== Files & uploadFieldKeys (IMPORTANT: order must match files appended) =====
      const uploadFieldKeys = [];
      const appendFilesForKey = (fieldKey, files) => {
        (files || []).forEach((file) => {
          data.append("caseDocuments", file);
          uploadFieldKeys.push(fieldKey);
        });
      };

      // 1) files added via dedicated uploads (employment_current, national_id_aadhaar, etc.)
      Object.entries(uploads).forEach(([fieldKey, files]) => {
        appendFilesForKey(fieldKey, files);
      });

      // 2) files present in checkDetails structure (generic mini-forms)
      Object.entries(checkDetails).forEach(([checkName, detailObj]) => {
        // detailObj may be { _self: { ... }, "Current Employment": { ... } }
        Object.entries(detailObj || {}).forEach(([subKey, vals]) => {
          if (!vals) return;
          if (vals._file) {
            const key = `${normalizeKey(checkName)}__${normalizeKey(subKey)}`;
            appendFilesForKey(key, [vals._file]);
          }
        });
      });

      // 3) education documents (index-based keys)
      educationDetails.forEach((edu, idx) => {
        if (edu.document) {
          const key = `education_verification__document_${idx}`;
          appendFilesForKey(key, [edu.document]);
        }
      });

      // 4) drag/drop general files
      selectedFiles.forEach((file, idx) => {
        const key = `general__${idx}__${normalizeKey(file.name)}`;
        appendFilesForKey(key, [file]);
      });

      // If we appended any files, add uploadFieldKeys
      if (uploadFieldKeys.length) {
        data.append("uploadFieldKeys", JSON.stringify(uploadFieldKeys));
      }

      // ===== Dynamic mini-forms (fallback) =====
      if (checkDetails && Object.keys(checkDetails).length > 0) {
        data.append("checkDetails", JSON.stringify(checkDetails));
      }

      // ===== Education block (unchanged) =====
      if (educationDetails.length > 0) {
        data.append(
          "educationDetails",
          JSON.stringify(
            educationDetails.map((edu) => ({
              university: edu.university,
              degree: edu.degree,
              year: edu.year,
            }))
          )
        );
      }

      // Finally create the case
      const response = await api.post("/cases", data);
      setMessage("Case created successfully!");
      navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.msg || "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------- JSX ----------
  // Use effective checks (if API returned checksList it will be used, else schemaChecks)
  const effectiveChecksList = checksList && checksList.length ? checksList : [];
  const groupedChecks = effectiveChecksList.reduce((acc, c) => {
    const cat = c.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(c);
    return acc;
  }, {});

  return (
    <Paper sx={{ p: 3 }} component="form" onSubmit={handleSubmit}>
      <Typography variant="h5" gutterBottom align="center">
        Initiate New Background Check
      </Typography>

      <Stepper activeStep={-1} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Candidate Info */}
      <Typography variant="h6" gutterBottom>
        Step 1: Candidate Details
      </Typography>
      <Grid container spacing={2} mb={4}>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Candidate Name"
            name="candidateName"
            required
            onChange={handleFormChange}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Candidate Father’s Name"
            name="fatherName"
            onChange={handleFormChange}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Email ID"
            name="email"
            type="email"
            required
            onChange={handleFormChange}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Contact Number"
            name="contactNumber"
            onChange={handleFormChange}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Designation"
            name="designation"
            required
            onChange={handleFormChange}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth required sx={{ minWidth: 220 }}>
            <InputLabel>Client Organization</InputLabel>
            <Select
              name="clientOrganization"
              value={formData.clientOrganization}
              label="Client Organization"
              onChange={handleFormChange}
            >
              {clients.map((client) => (
                <MenuItem key={client._id} value={client._id}>
                  {client.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <Typography variant="h6" gutterBottom>
        Step 2: Upload Documents
      </Typography>
      <FormControl component="fieldset" sx={{ mb: 2 }}>
        <FormLabel component="legend">
          How would you like to provide documents?
        </FormLabel>
        <RadioGroup
          row
          name="uploadMethod"
          value={uploadMethod}
          onChange={(e) => setUploadMethod(e.target.value)}
        >
          <FormControlLabel
            value="admin_upload"
            control={<Radio />}
            label="I will upload documents now"
          />
          <FormControlLabel
            value="send_link"
            control={<Radio />}
            label="Send a link to the candidate to upload"
          />
        </RadioGroup>
      </FormControl>
      {uploadMethod === "send_link" && (
        <Box sx={{ mb: 2, maxWidth: 700 }}>
          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <InputLabel id="send-link-checks-label">
              Select checks allowed for candidate
            </InputLabel>
            <Select
              labelId="send-link-checks-label"
              multiple
              value={sendLinkChecks}
              onChange={(e) => setSendLinkChecks(e.target.value)}
              renderValue={(selected) => {
                // show friendly names if you have checksList, otherwise slugs
                if (!selected || selected.length === 0)
                  return "No checks selected";
                if (checksList && checksList.length) {
                  const names = selected.map((s) => {
                    const found = checksList.find(
                      (c) =>
                        (c.slug || normalizeKey(c.name || "")) === s ||
                        normalizeKey(c.name || "") === s
                    );
                    return found ? found.name || s : s;
                  });
                  return names.join(", ");
                }
                return selected.join(", ");
              }}
            >
              {(checksList && checksList.length
                ? checksList
                : Object.keys(groupedChecks || {}) || []
              ).map((c, idx) => {
                // checksList may be array of objects { slug, name }
                const slug =
                  typeof c === "string"
                    ? normalizeKey(c)
                    : c.slug || normalizeKey(c.name || "");
                const label = typeof c === "string" ? c : c.name || slug;
                return (
                  <MenuItem key={slug} value={slug}>
                    <Checkbox checked={sendLinkChecks.indexOf(slug) > -1} />
                    <ListItemText primary={label} />
                  </MenuItem>
                );
              })}
            </Select>
            <FormHelperText>
              Pick which verifications the candidate can upload documents for
              (they will receive an upload link).
            </FormHelperText>
          </FormControl>
        </Box>
      )}

      {/* Checks */}
      {uploadMethod !== "send_link" ? (
        <>
          <Typography variant="h6" gutterBottom>
            Step 3: Selection of Checks
          </Typography>

          {Object.keys(groupedChecks).map((category) => (
            <Box key={category} sx={{ mb: 3 }}>
              {/* <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            {category}
          </Typography> */}
              <FormGroup>
                <Grid container spacing={2}>
                  {groupedChecks[category].map((check) => {
                    const checkboxKey = check.slug || normalizeKey(check.name); // canonical key
                    const checkSchema = check._schema || check.schema || null;
                    const isOnlyUpload = Boolean(
                      checkSchema &&
                        checkSchema._meta &&
                        checkSchema._meta.onlyUpload
                    );
                    const otherFieldLabel =
                      (checkSchema &&
                        checkSchema._meta &&
                        checkSchema._meta.uploadLabel) ||
                      "Upload Documents";
                    return (
                      <Grid
                        item
                        xs={12}
                        key={checkboxKey}
                        data-check-slug={checkboxKey}
                      >
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={!!selectedChecks[checkboxKey]}
                              onChange={handleCheckChange}
                              name={checkboxKey}
                            />
                          }
                          label={
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Typography variant="body1">
                                {check.name}
                              </Typography>
                              {check.description ? (
                                <Typography
                                  variant="caption"
                                  sx={{ ml: 1, color: "text.secondary" }}
                                >
                                  — {check.description}
                                </Typography>
                              ) : null}
                            </Box>
                          }
                        />

                        {/* legacy subOptions (if API provided) */}
                        {check.subOptions && selectedChecks[checkboxKey] && (
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              ml: 3,
                              mt: 1,
                            }}
                          >
                            {check.type === "radio" ? (
                              <RadioGroup
                                row
                                name={`${checkboxKey}_subOption`}
                                value={
                                  checkDetails[checkboxKey]?.subOptions
                                    ?.selected || check.subOptions[0]
                                }
                                onChange={(e) =>
                                  handleSubOptionChange(
                                    checkboxKey,
                                    e.target.value,
                                    true
                                  )
                                }
                              >
                                {check.subOptions.map((sub) => (
                                  <FormControlLabel
                                    key={sub}
                                    value={sub}
                                    control={<Radio size="small" />}
                                    label={sub}
                                  />
                                ))}
                              </RadioGroup>
                            ) : (
                              check.subOptions.map((sub) => {
                                const subName = `${checkboxKey}__${normalizeKey(
                                  sub
                                )}`;
                                return (
                                  <FormControlLabel
                                    key={subName}
                                    control={
                                      <Checkbox
                                        checked={isSubOptionSelected(
                                          checkboxKey,
                                          sub,
                                          false
                                        )}
                                        onChange={(e) =>
                                          handleSubOptionChange(
                                            checkboxKey,
                                            sub,
                                            false,
                                            e.target.checked
                                          )
                                        }
                                        name={subName}
                                        size="small"
                                      />
                                    }
                                    label={sub}
                                    sx={{ ml: 0 }}
                                  />
                                );
                              })
                            )}
                            <Box sx={{ mt: 1 }}>
                              <TextField
                                size="small"
                                fullWidth
                                placeholder="Optional: add notes / params for this check"
                                value={checkDetails[checkboxKey]?.notes || ""}
                                onChange={(e) =>
                                  setCheckDetails((prev) => ({
                                    ...prev,
                                    [checkboxKey]: {
                                      ...(prev[checkboxKey] || {}),
                                      notes: e.target.value,
                                    },
                                  }))
                                }
                              />
                            </Box>
                          </Box>
                        )}

                        {/* Schema-driven fields rendered for this check */}
                        {selectedChecks[checkboxKey] && (
                          <Box sx={{ ml: 3, mt: 1 }}>
                            {renderCheckFields(check)}
                          </Box>
                        )}
                      </Grid>
                    );
                  })}
                </Grid>
              </FormGroup>
            </Box>
          ))}
        </>
      ) : (
        <Box sx={{ mb: 3 }}>
          <Alert severity="info">
            You chose to send an upload link to candidate. Checks selection is
            skipped — the candidate will upload documents themselves.
          </Alert>
        </Box>
      )}

      {message && (
        <Alert severity="success" sx={{ my: 2 }}>
          {message}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          disabled={isSubmitting}
        >
          {isSubmitting ? <CircularProgress size={24} /> : "Submit Case"}
        </Button>
      </Box>
    </Paper>
  );
};

export default CreateCasePage;
