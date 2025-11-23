import { createSlice } from '@reduxjs/toolkit';
import { jwtDecode } from "jwt-decode";

// A robust function to get the initial state from localStorage
const getInitialState = () => {
    try {
        const token = localStorage.getItem('token');
        // Check if a token exists
        if (token) {
            const decodedToken = jwtDecode(token);
            // Check if the token's expiration time is in the future
            if (decodedToken.exp * 1000 > Date.now()) {
                // If the token is valid and not expired, return an authenticated state
                return {
                    user: decodedToken.user,
                    token: token,
                    isAuthenticated: true,
                };
            }
        }
    } catch (error) {
        // If the token is invalid or decoding fails, it will be caught here
        console.error("Invalid token found in localStorage", error);
        localStorage.removeItem('token'); // Clean up the bad token
    }
    
    // Default (logged out) state if no valid token is found
    return {
        user: null,
        token: null,
        isAuthenticated: false,
    };
};

const initialState = getInitialState();

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        // Reducer for a successful login. It updates the state and saves the token.
        loginSuccess: (state, action) => {
            const { token } = action.payload;
            const decodedToken = jwtDecode(token);

            state.isAuthenticated = true;
            state.token = token;
            state.user = decodedToken.user;
            localStorage.setItem('token', token);
        },
        // Reducer for logging out. It clears the state and removes the token.
        logout: (state) => {
            state.isAuthenticated = false;
            state.token = null;
            state.user = null;
            localStorage.removeItem('token');
        },
    },
});

export const { loginSuccess, logout } = authSlice.actions;

export default authSlice.reducer;