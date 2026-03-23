import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  Tooltip,
  Fade,
  Grid,
} from "@mui/material";
import {
  CloudUploadRounded as CloudUploadIcon,
  SyncRounded as SyncIcon,
  DeleteRounded as DeleteIcon,
  InsertDriveFileRounded as FileIcon,
  ArrowBackRounded as ArrowBackIcon,
  RefreshRounded as RefreshIcon,
} from "@mui/icons-material";
import { listAdminFiles, uploadAdminJson, deleteAdminFile, syncKnowledge } from "../api/chatApi";
import { useTranslation } from "react-i18next";

const AdminPage = ({ onBack }) => {
  const { t } = useTranslation();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAdminFiles();
      setFiles(data);
      setError(null);
    } catch (err) {
      setError(t("admin.error_load_files"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      setError(t("admin.error_invalid_type"));
      return;
    }

    setUploading(true);
    setSuccess(null);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      await uploadAdminJson(formData);
      setSuccess(t("admin.success_upload"));
      loadFiles();
    } catch (err) {
      setError(t("admin.error_upload"));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (filename) => {
    if (!window.confirm(t("admin.delete_confirm", { filename }))) return;

    try {
      await deleteAdminFile(filename);
      setSuccess(t("admin.success_delete"));
      setFiles(files.filter((f) => f.name !== filename));
    } catch (err) {
      setError(t("admin.error_delete"));
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSuccess(null);
    setError(null);
    try {
      const result = await syncKnowledge();
      setSuccess(t("admin.success_sync"));
    } catch (err) {
      setError(t("admin.error_sync"));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: 4 }}>
      <Container maxWidth="md">
        <Box sx={{ mb: 4, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Breadcrumbs sx={{ mb: 1 }}>
              <Link
                component="button"
                variant="body2"
                onClick={onBack}
                sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary", textDecoration: "none" }}
              >
                <ArrowBackIcon fontSize="inherit" />
                {t("admin.back_chat")}
              </Link>
              <Typography color="text.primary" variant="body2">
                {t("admin.dashboard_title")}
              </Typography>
            </Breadcrumbs>
            <Typography variant="h4" fontWeight={700} color="primary">
              {t("admin.portal_title")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("admin.portal_subtitle")}
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="secondary"
            startIcon={syncing ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
            onClick={handleSync}
            disabled={syncing}
            sx={{ borderRadius: 2, px: 3, py: 1, fontWeight: 600, boxShadow: 3 }}
          >
            {syncing ? t("admin.syncing") : t("admin.sync_button")}
          </Button>
        </Box>

        {error && (
          <Fade in>
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          </Fade>
        )}

        {success && (
          <Fade in>
            <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          </Fade>
        )}

        <Grid container spacing={3}>
          {/* ─── Upload Section ───────────────────────────── */}
          <Grid item xs={12} md={5}>
            <Paper
              sx={{
                p: 3,
                height: "100%",
                borderRadius: 4,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: "2px dashed",
                borderColor: "divider",
                bgcolor: "background.paper",
                transition: "all 0.3s",
                "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
              }}
            >
              <CloudUploadIcon sx={{ fontSize: 60, color: "primary.main", mb: 2, opacity: 0.8 }} />
              <Typography variant="h6" fontWeight={600} gutterBottom>
                {t("admin.upload_title")}
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
                {t("admin.upload_desc")}
              </Typography>
              <input
                accept=".json"
                style={{ display: "none" }}
                id="upload-button"
                type="file"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <label htmlFor="upload-button">
                <Button
                  variant="outlined"
                  component="span"
                  disabled={uploading}
                  startIcon={uploading ? <CircularProgress size={18} /> : null}
                  sx={{ borderRadius: 2, px: 4, textTransform: "none" }}
                >
                  {uploading ? t("admin.uploading") : t("admin.select_file")}
                </Button>
              </label>
            </Paper>
          </Grid>

          {/* ─── File List Section ────────────────────────── */}
          <Grid item xs={12} md={7}>
            <Paper sx={{ borderRadius: 4, overflow: "hidden", height: "100%" }}>
              <Box sx={{ p: 2, bgcolor: "primary.main", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {t("admin.files_title")} ({files.length})
                </Typography>
                <IconButton size="small" color="inherit" onClick={loadFiles}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Box>
              <List sx={{ p: 0, maxHeight: 400, overflowY: "auto" }}>
                {loading ? (
                  <Box sx={{ p: 4, textAlign: "center" }}>
                    <CircularProgress size={30} />
                  </Box>
                ) : files.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: "center" }}>
                    <Typography color="text.disabled">{t("admin.no_files")}</Typography>
                  </Box>
                ) : (
                  files.map((file, index) => (
                    <React.Fragment key={file.name}>
                      <ListItem
                        sx={{
                          py: 1.5,
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                        secondaryAction={
                          <Tooltip title={t("admin.delete_tooltip")}>
                            <IconButton edge="end" color="error" onClick={() => handleDeleteFile(file.name)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        }
                      >
                        <ListItemIcon>
                          <FileIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={file.name}
                          secondary={`${(file.size / 1024).toFixed(2)} KB • ${new Date(file.mtime).toLocaleDateString()}`}
                          primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                          secondaryTypographyProps={{ variant: "caption" }}
                        />
                      </ListItem>
                      {index < files.length - 1 && <Divider />}
                    </React.Fragment>
                  ))
                )}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default AdminPage;
