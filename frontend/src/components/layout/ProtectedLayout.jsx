import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppContext } from '@/context/app-context.js';
import AppLayout from './AppLayout';

export default function ProtectedLayout() {
    const { token } = useAppContext();

    if (!token) {
        return <Navigate to="/" replace />;
    }

    return <AppLayout />;
}
