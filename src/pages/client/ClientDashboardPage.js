import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  TableSortLabel,
  TablePagination,
  MenuItem,
  Select,
} from "@mui/material";
import { Search, Add, Download } from "@mui/icons-material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

import { Line } from "react-chartjs-2";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

const statCardStyle = {
  p: 3,
  borderRadius: 2,
  textAlign: "center",
  bgcolor: "white",
  transition: "0.25s ease",
  cursor: "pointer",
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
  },
};

const ClientDashboardPage = () => {
  const [cases, setCases] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortBy, setSortBy] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [page, setPage] = useState(0);
  const rowsPerPage = 6;
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/cases").then((res) => setCases(res.data.cases));
  }, []);

  // Derived stats
  const total = cases.length;
  const completed = cases.filter((c) =>
    c.status.toLowerCase().includes("completed")
  ).length;
  const pending = cases.filter((c) =>
    c.status.toLowerCase().includes("in progress")
  ).length;
  const discrepancy = cases.filter((c) =>
    c.status.toLowerCase().includes("discrepancy")
  ).length;

  const filtered = useMemo(() => {
    return cases
      .filter((c) =>
        c.candidateInfo?.candidateName
          ?.toLowerCase()
          .includes(search.toLowerCase())
      )
      .filter((c) =>
        filterStatus === "All"
          ? true
          : c.status.toLowerCase().includes(filterStatus.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === "name") {
          const A = a.candidateInfo?.candidateName?.toLowerCase();
          const B = b.candidateInfo?.candidateName?.toLowerCase();
          return sortDirection === "asc"
            ? A.localeCompare(B)
            : B.localeCompare(A);
        } else {
          const A = new Date(a.createdAt);
          const B = new Date(b.createdAt);
          return sortDirection === "asc" ? A - B : B - A;
        }
      });
  }, [cases, search, filterStatus, sortBy, sortDirection]);

  const paginated = filtered.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // CSV export
  const exportCSV = () => {
    const headers = ["Candidate", "Designation", "Date", "Status"];
    const csv = [
      headers.join(","),
      ...filtered.map(
        (c) =>
          `${c.candidateInfo?.candidateName},${
            c.candidateInfo?.designation
          },${new Date(c.createdAt).toLocaleDateString()},${c.status}`
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cases_report.csv";
    a.click();
  };

  // Line chart data
  const chartData = {
    labels: cases.map((x) => new Date(x.createdAt).toLocaleDateString("en-IN")),
    datasets: [
      {
        label: "Cases Created",
        data: cases.map(() => 1),
        borderColor: "#00A8E8",
        tension: 0.35,
      },
    ],
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, animation: "fadeIn 0.6s ease" }}>
      {/* HEADER */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 4 }}>
        <Typography variant="h4" fontWeight={600}>
          Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate("/client/create-case")}
          sx={{
            transition: "0.25s",
            "&:hover": { transform: "translateY(-2px)", boxShadow: 4 },
          }}
        >
          Create New Case
        </Button>
      </Box>

      {/* KPI CARDS */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: "Total Cases", value: total },
          { label: "Completed", value: completed },
          { label: "Pending", value: pending },
          { label: "Discrepancies", value: discrepancy },
        ].map((s) => (
          <Grid item xs={6} md={3} key={s.label}>
            <Paper sx={statCardStyle}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {s.label}
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {s.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* LINE CHART */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Line data={chartData} />
      </Paper>

      {/* SEARCH + FILTER + EXPORT */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <TextField
            placeholder="Search candidate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />

          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            {["All", "Completed", "Pending", "Discrepancy"].map((x) => (
              <MenuItem key={x} value={x}>
                {x}
              </MenuItem>
            ))}
          </Select>

          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={exportCSV}
            sx={{
              "&:hover": {
                boxShadow: "0 0 0 3px rgba(0, 204, 255, 0.3)",
                transform: "scale(1.03)",
              },
            }}
          >
            Export CSV
          </Button>
        </Box>

        {/* TABLE */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {[
                  { key: "name", label: "Candidate Name" },
                  { key: null, label: "Designation" },
                  { key: "date", label: "Date" },
                  { key: null, label: "Status" },
                  { key: null, label: "Actions" },
                ].map((c) => (
                  <TableCell key={c.label}>
                    {c.key ? (
                      <TableSortLabel
                        active={sortBy === c.key}
                        direction={sortDirection}
                        onClick={() => {
                          setSortBy(c.key);
                          setSortDirection((p) =>
                            p === "asc" ? "desc" : "asc"
                          );
                        }}
                      >
                        {c.label}
                      </TableSortLabel>
                    ) : (
                      c.label
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {paginated.map((row) => (
                <TableRow
                  key={row._id}
                  sx={{
                    transition: "0.25s",
                    "&:hover": {
                      backgroundColor: "rgba(0,0,0,0.03)",
                      cursor: "pointer",
                    },
                  }}
                  onClick={() => navigate(`/client/case/${row._id}`)}
                >
                  <TableCell>{row.candidateInfo?.candidateName}</TableCell>
                  <TableCell>{row.candidateInfo?.designation}</TableCell>
                  <TableCell>
                    {new Date(row.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Chip label={row.status} size="small" color="primary" />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      variant="contained"
                      size="small"
                      sx={{
                        transition: "0.2s",
                        "&:hover": {
                          boxShadow: "0 0 0 3px rgba(0, 204, 255, 0.4)",
                          transform: "scale(1.05)",
                        },
                      }}
                    >
                      View Report
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* PAGINATION */}
        <TablePagination
          component="div"
          count={filtered.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPageOptions={[]}
        />
      </Paper>
    </Box>
  );
};

export default ClientDashboardPage;
