import { createTheme } from '@mui/material/styles';

// A professional and modern color palette
const palette = {
    primary: {
        main: '#34495e', // A deep, slate blue for a corporate feel
    },
    secondary: {
        main: '#1abc9c', // A vibrant teal for accents and call-to-action buttons
    },
    background: {
        default: '#f4f6f8', // A very light grey for a clean, spacious background
        paper: '#ffffff',
    },
    text: {
        primary: '#2c3e50',
        secondary: '#7b8a8b',
    },
    success: { main: '#2ecc71' },
    error: { main: '#e74c3c' },
    warning: { main: '#f39c12' },
};

export const theme = createTheme({
  palette: palette,
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 8, // Softer, more modern rounded corners
  },
  components: {
    // Component-specific overrides for a consistent look
    MuiButton: {
        styleOverrides: {
            root: {
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: 'none',
                '&:hover': {
                    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
                }
            }
        }
    },
    MuiPaper: {
        styleOverrides: {
            root: {
                // Remove the border and rely on subtle shadows for depth
                border: 'none',
            }
        },
        defaultProps: {
            elevation: 1, // A very subtle default shadow
        }
    },
    MuiCard: {
        defaultProps: {
            elevation: 1,
        }
    },
    MuiAppBar: {
        styleOverrides: {
            root: {
                boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.06)',
                borderBottom: '1px solid #dfe4e8'
            }
        },
        defaultProps: {
            elevation: 0, // Remove the default heavy shadow
        }
    },
    MuiDrawer: {
        styleOverrides: {
            paper: {
                borderRight: 'none',
            }
        }
    }
  }
});