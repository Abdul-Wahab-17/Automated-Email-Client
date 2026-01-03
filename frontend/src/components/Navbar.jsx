import React, { useState, useEffect, useRef } from 'react';
import useEmailStore from '../stores/emailStore';
import '../styles/Navbar.css';

const Navbar = () => {
  const emails = useEmailStore(state => state.emails);
  const [isGlowing, setIsGlowing] = useState(false);
  const prevCountRef = useRef(emails.length);

  // Trigger glow animation when email count changes
  useEffect(() => {
    if (emails.length !== prevCountRef.current) {
      setIsGlowing(true);
      prevCountRef.current = emails.length;

      // Remove glow after animation completes
      const timer = setTimeout(() => setIsGlowing(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [emails.length]);

  // Auto-Send Feature State
  const [showConfirm, setShowConfirm] = useState(false);

  // Get auto-send actions/state from store
  /* 
     Fixing Infinite Loop: 
     Fetching state individually prevents unstable object references from causing
     unnecessary re-renders and potential loops in React's strict mode / dev tools.
  */
  const autoSendAllEmails = useEmailStore((state) => state.autoSendAllEmails);
  const stopAutoSend = useEmailStore((state) => state.stopAutoSend);
  const isAutoSending = useEmailStore((state) => state.isAutoSending);

  // Debug log to verify state sync
  useEffect(() => {
    console.log("Navbar: isAutoSending changed to", isAutoSending);
  }, [isAutoSending]);

  // Handle Toggle Click
  const handleToggle = () => {
    console.log("Toggle clicked. Current status:", isAutoSending);
    if (!isAutoSending) {
      // If turning ON, show confirmation
      setShowConfirm(true);
    } else {
      // If turning OFF (aborting), call stop action
      stopAutoSend();
    }
  };

  // Confirm Auto-Send
  const confirmAutoSend = () => {
    setShowConfirm(false);

    // Trigger the mass email sending
    console.log("Auto-Send enabled: Triggering mass send...");
    autoSendAllEmails();
  };

  // Cancel Auto-Send
  const cancelAutoSend = () => {
    setShowConfirm(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <svg className="logo-icon" width="36" height="36" viewBox="0 0 24 24" fill="none">
            {/* Mail envelope base */}
            <rect x="2" y="5" width="20" height="14" rx="2" stroke="url(#logoGradient)" strokeWidth="2" fill="none" />
            <path d="M2 7L12 13L22 7" stroke="url(#logoGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {/* AI Lightning bolt accent */}
            <path d="M14 10L12 14H14L12 18" stroke="url(#logoGradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="url(#logoGradient)" opacity="0.9" />
            <defs>
              <linearGradient id="logoGradient" x1="2" y1="5" x2="22" y2="19" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="50%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#4f46e5" />
              </linearGradient>
            </defs>
          </svg>
          <h1 className="logo-gradient">IntelliMail</h1>
        </div>

        <div className="navbar-actions">
          {/* Auto-Send Toggle */}
          <div
            className="auto-send-toggle-container"
            onClick={handleToggle}
            title="Toggle Auto-Send"
            style={{ cursor: 'pointer' }}
          >
            <span className={`auto-send-label ${isAutoSending ? 'active' : ''}`}>
              {isAutoSending ? 'Auto-Send ON' : 'Auto-Send OFF'}
            </span>
            <div className={`toggle-switch ${isAutoSending ? 'active' : ''}`}>
              <div className="toggle-handle"></div>
            </div>
          </div>

          <div className="navbar-inbox">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            <div className="inbox-info">
              <span className="inbox-label">Inbox:</span>
              <span className={`inbox-count ${isGlowing ? 'inbox-count-glow' : ''}`}>{emails.length} messages</span>
            </div>
          </div>
        </div>
      </div>

      {/* Helper Modal for Auto-Send Confirmation */}
      {showConfirm && (
        <div className="navbar-modal-overlay">
          <div className="navbar-modal-content">
            <h3>⚠️ Enable Auto-Send?</h3>
            <p>
              If you enable this, messages will be replied to <strong>automatically</strong>.
              <br />
              You will <strong>NOT</strong> be able to review or customize them before sending.
            </p>
            <div className="navbar-modal-actions">
              <button className="navbar-btn-cancel" onClick={cancelAutoSend}>Cancel</button>
              <button className="navbar-btn-confirm" onClick={confirmAutoSend}>Continue</button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
