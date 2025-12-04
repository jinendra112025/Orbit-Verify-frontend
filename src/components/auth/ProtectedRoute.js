import React from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  // Check the authentication status from the Redux store
  const { isAuthenticated } = useSelector((state) => state.auth);
  let location = useLocation();

  // If the user is not authenticated, redirect them to the login page
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If the user is authenticated, render the component they were trying to access
  return children;
};

export default ProtectedRoute;
