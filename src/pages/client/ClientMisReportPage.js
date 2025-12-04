import React, { useState, useEffect } from "react";
import {
  Paper,
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  TablePagination,
} from "@mui/material";
import { Download as DownloadIcon } from "@mui/icons-material";
import api from "../../services/api";

// Helper function to calculate TAT in days
const calculateTAT = (start, end) => {
  if (!start || !end) return "N/A";
  const startDate = new Date(start);
  const endDate = new Date(end);
  const differenceInTime = endDate.getTime() - startDate.getTime();
  const differenceInDays = differenceInTime / (1000 * 3600 * 24);
  return differenceInDays.toFixed(2);
};

// Helper function to convert the detailed data to a CSV file
const convertCasesToCSV = (data) => {
  const headers = [
    "Candidate Name",
    "Case Create Date",
    "Case Start Date",
    "Report Closed Date",
    "Status",
    "TAT (Days)",
  ];
  const csvRows = [headers.join(",")];

  for (const row of data) {
    const values = [
      row.candidateInfo?.candidateName,
      new Date(row.createdAt).toLocaleDateString(),
      row.caseStartDate
        ? new Date(row.caseStartDate).toLocaleDateString()
        : "Not Started",
      row.reportClosedDate
        ? new Date(row.reportClosedDate).toLocaleDateString()
        : "In Progress",
      row.status,
      calculateTAT(row.caseStartDate, row.reportClosedDate),
    ].map((val) => `"${String(val || "").replace(/"/g, '""')}"`);
    csvRows.push(values.join(","));
  }
  return csvRows.join("\n");
};

const ClientMisReportPage = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCases, setTotalCases] = useState(0);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        // The /cases endpoint is already filtered by client and supports pagination
        const response = await api.get(
          `/cases?page=${page + 1}&limit=${rowsPerPage}`
        );
        setCases(response.data.cases);
        setTotalCases(response.data.totalCases);
      } catch (error) {
        console.error("Failed to fetch MIS report:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [page, rowsPerPage]);

  const handleDownloadCSV = async () => {
    try {
      // Fetch all cases for the client without pagination for a full report
      const response = await api.get("/cases?limit=9999");
      const csvData = convertCasesToCSV(response.data.cases);

      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().split("T")[0];
      link.setAttribute("href", url);
      link.setAttribute("download", `MIS_Report_${date}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download CSV:", error);
      alert("Failed to download report.");
    }
  };

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5">MIS Detailed Report</Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleDownloadCSV}
        >
          Download as CSV
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Candidate Name</TableCell>
              <TableCell>Case Create Date</TableCell>
              <TableCell>Case Start Date</TableCell>
              <TableCell>Report Closed Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>TAT (Days)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cases.map((row) => (
              <TableRow key={row._id}>
                <TableCell>
                  {row.candidateInfo?.candidateName || "N/A"}
                </TableCell>
                <TableCell>
                  {new Date(row.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {row.caseStartDate
                    ? new Date(row.caseStartDate).toLocaleDateString()
                    : "Not Started"}
                </TableCell>
                <TableCell>
                  {row.reportClosedDate
                    ? new Date(row.reportClosedDate).toLocaleDateString()
                    : "In Progress"}
                </TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell>
                  {calculateTAT(row.caseStartDate, row.reportClosedDate)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={totalCases}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default ClientMisReportPage;
