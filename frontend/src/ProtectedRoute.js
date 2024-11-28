import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    const voter_id = localStorage.getItem('voter_id');
    
    if (!voter_id) {
        return <Navigate to="/login" replace />;
    }
    
    return children;
};

export default ProtectedRoute;
