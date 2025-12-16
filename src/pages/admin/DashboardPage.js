import React, { useState, useEffect, useMemo } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
  TextField,
  InputAdornment,
  IconButton,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
} from "@mui/material";
import {
  Clear as ClearIcon,
  Search as SearchIcon,
  Send as SendIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import EditCaseModal from "../../components/EditCaseModal";
import EditIcon from "@mui/icons-material/Edit";

// Helpers to normalize status and pick chip color
const getStatusKey = (raw = "") => {
  const s = (raw || "").toLowerCase();
  if (s.includes("clear") || s.includes("green")) return "Clear";
  if (s.includes("discrep")) return "Discrepancy";
  if (s.includes("amber")) return "Amber";
  if (s.includes("insuff")) return "Insufficiency";
  if (s.includes("on hold") || s.includes("hold")) return "On Hold";
  if (s.includes("pending")) return "Pending";
  return raw;
};

const getStatusColor = (status) => {
  const key = getStatusKey(status);
  if (key === "Clear") return "success";
  if (key === "Discrepancy") return "error";
  if (key === "Amber") return "warning";
  if (key === "Insufficiency") return "info";
  if (key === "On Hold") return "default";
  return "default";
};

const DashboardPage = () => {
  const [allCases, setAllCases] = useState([]); // will contain all cases across pages
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // --- NEW: State for delete confirmation dialog ---
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [caseToEdit, setCaseToEdit] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [openResendDialog, setOpenResendDialog] = useState(false);
  const [caseToResend, setCaseToResend] = useState(null);
  const [isResending, setIsResending] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const navigate = useNavigate();

  // Debounce searchTerm -> debouncedSearch
  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedSearch(searchTerm.trim().toLowerCase()),
      500
    );
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset page when filters/search/rowsPerPage change
  useEffect(
    () => setPage(0),
    [statusFilter, clientFilter, debouncedSearch, rowsPerPage]
  );

  // Fetch all pages from paginated /cases endpoint, then fetch clients
  useEffect(() => {
    let mounted = true;
    const loadAllCases = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const initialLimit = 50; // page size for initial fetch
        console.log(`Fetching /cases?page=1&limit=${initialLimit}`);
        const page1Res = await api.get(`/cases?page=1&limit=${initialLimit}`);
        const body = page1Res?.data ?? {};
        const firstPageCases = Array.isArray(body.cases)
          ? body.cases
          : Array.isArray(body.data)
          ? body.data
          : Array.isArray(body)
          ? body
          : [];
        const totalPages = body.totalPages ?? 1;

        let all = Array.isArray(firstPageCases) ? [...firstPageCases] : [];
        console.log("Page 1 loaded:", all.length, "totalPages:", totalPages);

        if (totalPages > 1) {
          // fetch remaining pages concurrently (2..totalPages)
          const pageRequests = [];
          for (let p = 2; p <= totalPages; p++) {
            pageRequests.push(
              api.get(`/cases?page=${p}&limit=${initialLimit}`)
            );
          }

          const results = await Promise.allSettled(pageRequests);
          results.forEach((r, idx) => {
            if (r.status === "fulfilled") {
              const d = r.value?.data ?? {};
              const list = Array.isArray(d.cases)
                ? d.cases
                : Array.isArray(d.data)
                ? d.data
                : Array.isArray(d)
                ? d
                : [];
              if (Array.isArray(list)) {
                all.push(...list);
                console.log(`Page ${idx + 2} loaded: ${list.length}`);
              } else {
                console.warn(`Page ${idx + 2} returned unexpected shape`, d);
              }
            } else {
              console.warn(`Failed to fetch page ${idx + 2}`, r.reason);
            }
          });
        }

        if (!mounted) return;
        setAllCases(all);
        console.log("Total cases loaded:", all.length);

        // Fetch clients
        try {
          const clientsRes = await api.get("/clients");
          const clientsPayload = clientsRes?.data ?? [];
          const clientsArr = Array.isArray(clientsPayload)
            ? clientsPayload
            : clientsPayload.clients ?? clientsPayload.data ?? [];
          if (mounted) setClients(Array.isArray(clientsArr) ? clientsArr : []);
          console.log(
            "Clients loaded:",
            Array.isArray(clientsArr) ? clientsArr.length : 0
          );
        } catch (cErr) {
          console.warn("Failed to fetch clients", cErr);
          if (mounted) setClients([]);
        }
      } catch (err) {
        console.error("Error loading cases:", err);
        if (mounted) {
          setErrorMsg(`Failed to load cases: ${err?.message || err}`);
          setAllCases([]);
          setClients([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadAllCases();
    return () => {
      mounted = false;
    };
  }, []);

  // client-side filtering (status, client, search)
  const filteredCases = useMemo(() => {
    const s = debouncedSearch;
    return allCases.filter((c) => {
      const statusMatch = statusFilter
        ? getStatusKey(c.status) === getStatusKey(statusFilter)
        : true;
      const clientMatch =
        clientFilter !== "all"
          ? c.clientOrganization?._id?.toString() ===
              clientFilter?.toString() ||
            c.clientOrganization?.id?.toString() === clientFilter?.toString()
          : true;

      const searchMatch = s
        ? (c.candidateInfo?.candidateName || "").toLowerCase().includes(s) ||
          (c.candidateInfo?.email || "").toLowerCase().includes(s) ||
          (c.candidateInfo?.mobile || "").toLowerCase().includes(s) ||
          (c.clientOrganization?.name || "").toLowerCase().includes(s)
        : true;

      return statusMatch && clientMatch && searchMatch;
    });
  }, [allCases, statusFilter, clientFilter, debouncedSearch]);

  // KPIs based on allCases (global totals)
  const kpiData = useMemo(
    () => ({
      pending: filteredCases.filter((c) => getStatusKey(c.status) === "Pending")
        .length,
      insufficiency: filteredCases.filter(
        (c) => getStatusKey(c.status) === "Insufficiency"
      ).length,
      amber: filteredCases.filter((c) => getStatusKey(c.status) === "Amber")
        .length,
      discrepancy: filteredCases.filter(
        (c) => getStatusKey(c.status) === "Discrepancy"
      ).length,
      green: filteredCases.filter((c) => getStatusKey(c.status) === "Clear")
        .length,
      onHold: filteredCases.filter((c) => getStatusKey(c.status) === "On Hold")
        .length,
    }),
    [filteredCases] // Changed dependency from allCases to filteredCases
  );

  // client-side pagination
  const paginatedCases = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredCases.slice(start, start + rowsPerPage);
  }, [filteredCases, page, rowsPerPage]);

  // --- NEW: Handlers for the delete process ---
  const handleOpenDeleteDialog = (caseItem) => {
    setCaseToDelete(caseItem);
    setOpenConfirmDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenConfirmDialog(false);
    setCaseToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!caseToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/cases/${caseToDelete._id}`);
      setAllCases((prevCases) =>
        prevCases.filter((c) => c._id !== caseToDelete._id)
      );
      // ✅ Show success message after successful deletion
      setSnackbar({
        open: true,
        message: "Case deleted successfully!",
        severity: "success",
      });
    } catch (err) {
      console.error("Failed to delete case:", err);
      // ✅ Show error message when deletion fails
      setSnackbar({
        open: true,
        message: `Failed to delete case. ${
          err?.response?.data?.msg || err.message
        }`,
        severity: "error",
      });
    } finally {
      setIsDeleting(false);
      handleCloseDeleteDialog();
    }
  };

  const handleOpenEditModal = (caseItem) => {
    setCaseToEdit(caseItem);
    setOpenEditModal(true);
  };

  const handleCloseEditModal = () => {
    setOpenEditModal(false);
    setCaseToEdit(null);
  };

  const handleUpdateCase = async (updatedCaseData) => {
    setIsUpdating(true);
    setErrorMsg(""); // Clear previous errors

    try {
      const payload = {
        candidateInfo: updatedCaseData.candidateInfo,
        checks: JSON.stringify(updatedCaseData.checks),
      };

      const response = await api.put(`/cases/${updatedCaseData._id}`, payload);
      setAllCases((prevCases) =>
        prevCases.map((c) => (c._id === response.data._id ? response.data : c))
      );

      // ✅ Show success message AFTER successful update
      setSnackbar({
        open: true,
        message: "Case updated successfully!",
        severity: "success",
      });
      handleCloseEditModal();
    } catch (err) {
      console.error("Failed to update case:", err);
      // ✅ Show error in snackbar
      setSnackbar({
        open: true,
        message: `Failed to update case. ${
          err?.response?.data?.msg || err.message
        }`,
        severity: "error",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenResendDialog = (caseItem) => {
    setCaseToResend(caseItem);
    setOpenResendDialog(true);
  };

  const handleCloseResendDialog = () => {
    setOpenResendDialog(false);
    setCaseToResend(null);
  };

  const handleConfirmResend = async () => {
    if (!caseToResend) return;
    setIsResending(true);

    try {
      const response = await api.post("/cases/resend-link", {
        caseId: caseToResend._id,
      });

      setSnackbar({
        open: true,
        message: response.data.msg || "Upload link resent successfully!",
        severity: "success",
      });
    } catch (err) {
      console.error("Failed to resend link:", err);
      setSnackbar({
        open: true,
        message: `Failed to resend link. ${
          err?.response?.data?.msg || err.message
        }`,
        severity: "error",
      });
    } finally {
      setIsResending(false);
      handleCloseResendDialog();
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const statusFilters = [
    "Pending",
    "Insufficiency",
    "Amber",
    "Completed - Discrepancy Found",
    "Completed - Green (Clear)",
    "On Hold",
  ];

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box>
      <Grid container spacing={3} mb={3}>
        {Object.entries(kpiData).map(([key, value]) => (
          <Grid item xs={12} sm={6} md={2} key={key}>
            <Card>
              <CardContent>
                <Typography
                  color="textSecondary"
                  gutterBottom
                  sx={{ textTransform: "capitalize" }}
                >
                  {key.replace(/([A-Z])/g, " $1")}
                </Typography>
                <Typography variant="h5" component="div">
                  {value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper>
        <Box p={2}>
          <Typography variant="h6" gutterBottom>
            Cases
          </Typography>

          {errorMsg && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setErrorMsg("")}
            >
              {errorMsg}
            </Alert>
          )}

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              mb: 2,
              alignItems: "center",
            }}
          >
            <TextField
              size="small"
              label="Search candidate / client / email / phone"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm("")}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
              sx={{ minWidth: 360 }}
            />

            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel id="org-filter-label">
                Filter by Organization
              </InputLabel>
              <Select
                labelId="org-filter-label"
                value={clientFilter}
                label="Filter by Organization"
                onChange={(e) => setClientFilter(e.target.value)}
              >
                <MenuItem value="all">
                  <em>Show All</em>
                </MenuItem>
                {Array.isArray(clients) &&
                  clients.map((client) => (
                    <MenuItem
                      key={client._id || client.id}
                      value={client._id || client.id}
                    >
                      {client.name || client.companyName || client.title}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <Box>
              {statusFilters.map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "contained" : "outlined"}
                  onClick={() => setStatusFilter(status)}
                  sx={{ mr: 1, mb: 1 }}
                >
                  {status}
                </Button>
              ))}
              <Button
                variant="outlined"
                onClick={() => setStatusFilter("")}
                sx={{ mr: 1, mb: 1 }}
              >
                Clear Status
              </Button>
            </Box>
          </Box>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Candidate Name</TableCell>
                <TableCell>Client Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedCases.map((row) => {
                const isPending = getStatusKey(row.status) === "Pending";

                return (
                  <TableRow key={row._id || row.id}>
                    <TableCell>
                      {row.candidateInfo?.candidateName ??
                        row.candidateName ??
                        "N/A"}
                    </TableCell>
                    <TableCell>
                      {row.clientOrganization?.name ||
                        row.clientOrganization?.companyName ||
                        "N/A"}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.status}
                        color={getStatusColor(row.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell
                      sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}
                    >
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() =>
                          navigate(`/admin/case/${row._id || row.id}`)
                        }
                      >
                        View/Manage
                      </Button>

                      {/* --- NEW: Resend Link Button (only for Pending cases) --- */}
                      {isPending && (
                        <Button
                          variant="contained"
                          size="small"
                          color="secondary"
                          startIcon={<SendIcon />}
                          onClick={() => handleOpenResendDialog(row)}
                          sx={{
                            backgroundColor: "#9c27b0",
                            "&:hover": { backgroundColor: "#7b1fa2" },
                          }}
                        >
                          Resend Link
                        </Button>
                      )}

                      <Button
                        variant="contained"
                        size="small"
                        color="info"
                        startIcon={<EditIcon />}
                        onClick={() => handleOpenEditModal(row)}
                      >
                        Edit
                      </Button>

                      <Button
                        variant="contained"
                        size="small"
                        color="error"
                        onClick={() => handleOpenDeleteDialog(row)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {paginatedCases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No cases found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredCases.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* --- NEW: Confirmation Dialog --- */}
      <Dialog open={openConfirmDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the case for candidate{" "}
            <strong>{caseToDelete?.candidateInfo?.candidateName}</strong>? This
            action will permanently remove all associated data and cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseDeleteDialog}
            sx={{ borderColor: "rgba(0, 0, 0, 0.23)", color: "black" }}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? <CircularProgress size={24} /> : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openResendDialog} onClose={handleCloseResendDialog}>
        <DialogTitle>Resend Upload Link</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to resend the document upload link to{" "}
            <strong>{caseToResend?.candidateInfo?.candidateName}</strong> at{" "}
            <strong>{caseToResend?.candidateInfo?.email}</strong>?
            <br />
            <br />
            This will generate a new link valid for 3 days and invalidate any
            previous link.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseResendDialog}
            sx={{ borderColor: "rgba(0, 0, 0, 0.23)", color: "black" }}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmResend}
            color="secondary"
            variant="contained"
            disabled={isResending}
            sx={{
              backgroundColor: "#9c27b0",
              "&:hover": { backgroundColor: "#7b1fa2" },
            }}
          >
            {isResending ? <CircularProgress size={24} /> : "Resend Link"}
          </Button>
        </DialogActions>
      </Dialog>
      <EditCaseModal
        open={openEditModal}
        onClose={handleCloseEditModal}
        caseData={caseToEdit}
        onUpdate={handleUpdateCase}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DashboardPage;
