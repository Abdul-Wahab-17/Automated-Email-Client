import React, { useEffect } from 'react';
import useEmailStore from '../stores/emailStore';
import '../styles/Toast.css';

const Toast = ({ id, type, message }) => {
    const removeToast = useEmailStore(state => state.removeToast);

    useEffect(() => {
        // Auto-remove success and error toasts after 3 seconds
        if (type !== 'loading') {
            const timer = setTimeout(() => {
                removeToast(id);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [id, type, removeToast]);

    return (
        <div className={`toast toast-${type}`}>
            {type === 'loading' && (
                <div className="toast-spinner"></div>
            )}
            {type === 'success' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
            )}
            {type === 'error' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
            )}
            <span className="toast-message">{message}</span>
        </div>
    );
};

const ToastContainer = () => {
    const toasts = useEmailStore(state => state.toasts);

    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <Toast key={toast.id} {...toast} />
            ))}
        </div>
    );
};

export default ToastContainer;
