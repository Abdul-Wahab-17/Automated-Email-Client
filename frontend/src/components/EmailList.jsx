import React, { useEffect, useState } from 'react';
import useEmailStore from '../stores/emailStore';
import '../styles/EmailList.css';

const EmailList = () => {
  const {
    emails,
    setEmails,
    openModal,
    sendEmail
  } = useEmailStore();

  // State for Summary Feature
  const [hoveredSummaryId, setHoveredSummaryId] = useState(null);
  const [activeSummaryId, setActiveSummaryId] = useState(null);

  // State for Sorting
  const [sortOption, setSortOption] = useState('time-asc'); // Combined sort option

  useEffect(() => {
    setEmails();
  }, [setEmails]);

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const toggleSummary = (e, emailId) => {
    e.stopPropagation(); // Prevent card click if necessary
    if (activeSummaryId === emailId) {
      setActiveSummaryId(null);
    } else {
      setActiveSummaryId(emailId);
    }
  };

  // Sort emails based on current sort option
  const sortedEmails = [...emails].sort((a, b) => {
    const [sortBy, sortOrder] = sortOption.split('-');

    if (sortBy === 'time') {
      const dateA = new Date(a.createdAT);
      const dateB = new Date(b.createdAT);
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    } else if (sortBy === 'sender') {
      const nameA = a.senderName.toLowerCase();
      const nameB = b.senderName.toLowerCase();
      if (sortOrder === 'asc') {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    }
    return 0;
  });

  return (
    <div className="email-list-container">
      {/* Sort Controls */}
      <div className="sort-actions-container">
        <div className="sort-controls-minimal">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5h4M11 9h7M11 13h10M3 17l3 3m0 0l3-3m-3 3V4" />
          </svg>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="sort-select-minimal"
          >
            <option value="time-desc">Time (Newest First)</option>
            <option value="time-asc">Time (Oldest First)</option>
            <option value="sender-asc">Sender (A to Z)</option>
            <option value="sender-desc">Sender (Z to A)</option>
          </select>
        </div>
      </div>

      {sortedEmails.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-content">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="empty-icon">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            <h3>All Caught Up!</h3>
            <p>No new emails in your list.</p>
          </div>
        </div>
      ) : (
        <div className="email-list">
          {sortedEmails.map((email) => (
            <div key={email.id} className="email-card">
              <div
                className="email-card-content"
                onClick={() => openModal(email)}
              >
                {/* Header: Sender & Meta */}
                <div className="email-card-header">
                  <div className="sender-info">
                    <div className="sender-avatar">
                      {email.senderName.charAt(0)}
                    </div>
                    <div className="sender-details">
                      <h3 className="sender-name">{email.senderName}</h3>
                      <p className="sender-email">{email.sender}</p>
                    </div>
                  </div>
                  <div className="email-meta">
                    <span className="email-time">{formatTimeAgo(email.createdAT)}</span>

                    {/* Summary Trigger */}
                    <div
                      className={`summary-trigger ${activeSummaryId === email.id ? 'active' : ''}`}
                      onMouseEnter={() => setHoveredSummaryId(email.id)}
                      onMouseLeave={() => setHoveredSummaryId(null)}
                      onClick={(e) => toggleSummary(e, email.id)}
                      title="View Summary"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="9" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="9" y1="13" x2="15" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="9" y1="17" x2="13" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>

                      {/* Summary Modal */}
                      {(hoveredSummaryId === email.id || activeSummaryId === email.id) && (
                        <div className="summary-modal">
                          <div className="summary-modal-header">
                            <span className="summary-title">Email Summary</span>
                            {activeSummaryId === email.id && (
                              <span className="pinned-indicator" title="Pinned">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M16 3H8V5H9L8 14H5V16H11V22H13V16H19V14H18L17 5H18V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </span>
                            )}
                          </div>
                          <p className="summary-content">
                            {email.customerEmailSummary || "No summary available."}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Body: Subject & Preview */}
                <div className="email-card-body">
                  <h4 className="email-subject">{email.subject}</h4>
                  <p className="email-preview">{email.customerEmail}</p>
                </div>

                {/* Footer: AI Reply & Actions */}
                <div className="email-card-footer">
                  <div className="ai-reply-section">
                    <div className="ai-floating-badge">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sparkle-icon">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                      </svg>
                      <span className="ai-label">AI Draft</span>
                    </div>

                    <div className="ai-reply-text">
                      {email.Reply_of_email}
                    </div>
                  </div>

                  <div className="email-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal(email);
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      Customize
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        sendEmail(email.id);
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmailList;