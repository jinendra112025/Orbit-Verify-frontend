import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";

const normalizeKey = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w_]/g, "");

const BulkCaseCreation = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [selectedChecks, setSelectedChecks] = useState({});
  const [availableChecks, setAvailableChecks] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);
  const [showResultsDialog, setShowResultsDialog] = useState(false);

  // Fetch available checks - Replace with your actual API call
  useEffect(() => {
    const fetchChecks = async () => {
      try {
        // Replace with: const response = await api.get("/checks");
        const response = await fetch("/api/checks", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await response.json();
        const checks = Array.isArray(data) ? data : [];
        const normalized = checks.map((c) => ({
          slug: c.slug || normalizeKey(c.name || ""),
          name: c.name || c.slug || "",
        }));
        setAvailableChecks(normalized);
      } catch (err) {
        console.error("Failed to fetch checks:", err);
        setError("Failed to load verification checks");
      }
    };
    fetchChecks();
  }, []);

  const parseCSV = (text) => {
    const rows = text
      .split("\n")
      .map((row) => row.split(",").map((cell) => cell.trim()));
    const headers = rows[0];
    const data = rows
      .slice(1)
      .filter((row) => row.some((cell) => cell))
      .map((row) => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || "";
        });
        return obj;
      });
    return data;
  };

  const parseExcel = (arrayBuffer) => {
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    return data;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split(".").pop().toLowerCase();

    if (!["csv", "xlsx", "xls"].includes(fileExtension)) {
      setError("Please upload a CSV or Excel file");
      return;
    }

    setSelectedFile(file);
    setError("");

    const reader = new FileReader();

    if (fileExtension === "csv") {
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const data = parseCSV(text);
          setParsedData(data);
        } catch (err) {
          setError("Failed to parse CSV file");
          console.error(err);
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target.result;
          const data = parseExcel(arrayBuffer);
          setParsedData(data);
        } catch (err) {
          setError("Failed to parse Excel file");
          console.error(err);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleCheckChange = (slug) => {
    setSelectedChecks((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

  const downloadTemplate = () => {
    const template =
      "candidateName,fatherName,email,contactNumber,designation\n" +
      "John Doe,Robert Doe,john@example.com,9876543210,Software Engineer\n" +
      "Jane Smith,Michael Smith,jane@example.com,9876543211,Product Manager";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk_upload_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async () => {
    if (!parsedData.length) {
      setError("Please upload a file with candidate data");
      return;
    }

    const selectedChecksList = Object.keys(selectedChecks).filter(
      (key) => selectedChecks[key]
    );
    if (!selectedChecksList.length) {
      setError("Please select at least one verification check");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      // Replace with your actual API call
      const response = await fetch("/api/cases/bulk-create-and-send-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          candidates: parsedData,
          checks: selectedChecksList,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || "An error occurred");
      }

      setResults(data.results);
      setShowResultsDialog(true);
      setMessage(data.msg);

      // Clear form after successful submission
      setSelectedFile(null);
      setParsedData([]);
      setSelectedChecks({});
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setParsedData([]);
  };

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "24px",
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px" }}>
        Bulk Case Creation
      </h1>
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "24px" }}>
        Upload a CSV/Excel file with candidate details and select verification
        checks to send upload links to multiple candidates at once.
      </p>

      {/* Download Template */}
      <div style={{ marginBottom: "24px" }}>
        <button
          onClick={downloadTemplate}
          style={{
            padding: "10px 20px",
            backgroundColor: "white",
            border: "1px solid #1976d2",
            color: "#1976d2",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Download CSV Template
        </button>
        <p style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
          Required columns: candidateName, email. Optional: fatherName,
          contactNumber, designation
        </p>
      </div>

      {/* File Upload */}
      <div style={{ marginBottom: "24px" }}>
        <label
          style={{
            padding: "10px 20px",
            backgroundColor: "#1976d2",
            color: "white",
            borderRadius: "4px",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            fontSize: "14px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            opacity: isSubmitting ? 0.6 : 1,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Upload CSV/Excel File
          <input
            type="file"
            hidden
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            disabled={isSubmitting}
          />
        </label>

        {selectedFile && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: "16px",
              gap: "8px",
            }}
          >
            <span
              style={{
                backgroundColor: "#e3f2fd",
                color: "#1976d2",
                padding: "6px 12px",
                borderRadius: "16px",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {selectedFile.name}
              <button
                onClick={removeFile}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#1976d2",
                  fontSize: "16px",
                  padding: "0 4px",
                }}
              >
                ×
              </button>
            </span>
            <span style={{ fontSize: "14px", color: "#666" }}>
              {parsedData.length} candidates found
            </span>
          </div>
        )}
      </div>

      {/* Preview Table */}
      {parsedData.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "600",
              marginBottom: "12px",
            }}
          >
            Candidate Preview
          </h2>
          <div
            style={{
              maxHeight: "400px",
              overflow: "auto",
              border: "1px solid #e0e0e0",
              borderRadius: "4px",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead
                style={{
                  position: "sticky",
                  top: 0,
                  backgroundColor: "#f5f5f5",
                }}
              >
                <tr>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      borderBottom: "2px solid #ddd",
                      fontSize: "14px",
                    }}
                  >
                    Name
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      borderBottom: "2px solid #ddd",
                      fontSize: "14px",
                    }}
                  >
                    Email
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      borderBottom: "2px solid #ddd",
                      fontSize: "14px",
                    }}
                  >
                    Father's Name
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      borderBottom: "2px solid #ddd",
                      fontSize: "14px",
                    }}
                  >
                    Contact
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      borderBottom: "2px solid #ddd",
                      fontSize: "14px",
                    }}
                  >
                    Designation
                  </th>
                </tr>
              </thead>
              <tbody>
                {parsedData.map((candidate, index) => (
                  <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "12px", fontSize: "14px" }}>
                      {candidate.candidateName}
                    </td>
                    <td style={{ padding: "12px", fontSize: "14px" }}>
                      {candidate.email}
                    </td>
                    <td style={{ padding: "12px", fontSize: "14px" }}>
                      {candidate.fatherName || "-"}
                    </td>
                    <td style={{ padding: "12px", fontSize: "14px" }}>
                      {candidate.contactNumber || "-"}
                    </td>
                    <td style={{ padding: "12px", fontSize: "14px" }}>
                      {candidate.designation || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Check Selection */}
      {parsedData.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <h2
            style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}
          >
            Select Verification Checks
          </h2>
          <p style={{ fontSize: "14px", color: "#666", marginBottom: "16px" }}>
            These checks will be required for all candidates
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
              gap: "8px",
            }}
          >
            {availableChecks.map((check) => (
              <label
                key={check.slug}
                style={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  padding: "8px",
                }}
              >
                <input
                  type="checkbox"
                  checked={!!selectedChecks[check.slug]}
                  onChange={() => handleCheckChange(check.slug)}
                  style={{ marginRight: "8px", cursor: "pointer" }}
                />
                <span style={{ fontSize: "14px" }}>{check.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "#ffebee",
            color: "#c62828",
            borderRadius: "4px",
            marginBottom: "16px",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}
      {message && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "#e8f5e9",
            color: "#2e7d32",
            borderRadius: "4px",
            marginBottom: "16px",
            fontSize: "14px",
          }}
        >
          {message}
        </div>
      )}

      {/* Submit Button */}
      <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
        <button
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            !parsedData.length ||
            !Object.values(selectedChecks).some((v) => v)
          }
          style={{
            padding: "12px 32px",
            backgroundColor:
              isSubmitting ||
              !parsedData.length ||
              !Object.values(selectedChecks).some((v) => v)
                ? "#ccc"
                : "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor:
              isSubmitting ||
              !parsedData.length ||
              !Object.values(selectedChecks).some((v) => v)
                ? "not-allowed"
                : "pointer",
            fontSize: "16px",
            fontWeight: "500",
          }}
        >
          {isSubmitting
            ? "Processing..."
            : `Send Links to ${parsedData.length} Candidates`}
        </button>
      </div>

      {/* Results Dialog */}
      {showResultsDialog && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              maxWidth: "800px",
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ padding: "24px", borderBottom: "1px solid #e0e0e0" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "600", margin: 0 }}>
                Bulk Creation Results
              </h2>
            </div>

            <div style={{ padding: "24px" }}>
              {results && (
                <>
                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      marginBottom: "24px",
                    }}
                  >
                    <span
                      style={{
                        backgroundColor: "#e8f5e9",
                        color: "#2e7d32",
                        padding: "8px 16px",
                        borderRadius: "16px",
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      ✓ {results.successful?.length || 0} Successful
                    </span>
                    <span
                      style={{
                        backgroundColor: "#ffebee",
                        color: "#c62828",
                        padding: "8px 16px",
                        borderRadius: "16px",
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      ✗ {results.failed?.length || 0} Failed
                    </span>
                  </div>

                  {results.successful?.length > 0 && (
                    <div style={{ marginBottom: "24px" }}>
                      <h3
                        style={{
                          fontSize: "16px",
                          fontWeight: "600",
                          marginBottom: "12px",
                        }}
                      >
                        Successfully Created
                      </h3>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "14px",
                        }}
                      >
                        <thead>
                          <tr style={{ backgroundColor: "#f5f5f5" }}>
                            <th
                              style={{
                                padding: "8px",
                                textAlign: "left",
                                borderBottom: "2px solid #ddd",
                              }}
                            >
                              Candidate
                            </th>
                            <th
                              style={{
                                padding: "8px",
                                textAlign: "left",
                                borderBottom: "2px solid #ddd",
                              }}
                            >
                              Email
                            </th>
                            <th
                              style={{
                                padding: "8px",
                                textAlign: "left",
                                borderBottom: "2px solid #ddd",
                              }}
                            >
                              Case ID
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.successful.map((item, index) => (
                            <tr
                              key={index}
                              style={{ borderBottom: "1px solid #eee" }}
                            >
                              <td style={{ padding: "8px" }}>
                                {item.candidate}
                              </td>
                              <td style={{ padding: "8px" }}>{item.email}</td>
                              <td
                                style={{
                                  padding: "8px",
                                  fontFamily: "monospace",
                                  fontSize: "12px",
                                }}
                              >
                                {item.caseId}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {results.failed?.length > 0 && (
                    <div>
                      <h3
                        style={{
                          fontSize: "16px",
                          fontWeight: "600",
                          marginBottom: "12px",
                        }}
                      >
                        Failed
                      </h3>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "14px",
                        }}
                      >
                        <thead>
                          <tr style={{ backgroundColor: "#f5f5f5" }}>
                            <th
                              style={{
                                padding: "8px",
                                textAlign: "left",
                                borderBottom: "2px solid #ddd",
                              }}
                            >
                              Candidate
                            </th>
                            <th
                              style={{
                                padding: "8px",
                                textAlign: "left",
                                borderBottom: "2px solid #ddd",
                              }}
                            >
                              Error
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.failed.map((item, index) => (
                            <tr
                              key={index}
                              style={{ borderBottom: "1px solid #eee" }}
                            >
                              <td style={{ padding: "8px" }}>
                                {item.candidate?.candidateName ||
                                  item.candidate?.email ||
                                  "Unknown"}
                              </td>
                              <td style={{ padding: "8px", color: "#c62828" }}>
                                {item.error}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #e0e0e0",
                textAlign: "right",
              }}
            >
              <button
                onClick={() => setShowResultsDialog(false)}
                style={{
                  padding: "8px 24px",
                  backgroundColor: "#1976d2",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkCaseCreation;
