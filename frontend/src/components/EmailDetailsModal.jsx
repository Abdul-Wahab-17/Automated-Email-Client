import React, { useState } from 'react';
import useEmailStore from '../stores/emailStore';
import '../styles/EmailDetailsModal.css';

const EmailDetailsModal = () => {
  const {
    selectedEmail,
    isModalOpen,
    suggestedReply,
    toneAttributes,
    userCustomizationText,
    isListening,
    voiceTranscript,
    closeModal,
    setToneFormality,
    setToneLength,
    regenerateWithBackend,
    startVoiceInput,
    stopVoiceInput,
    updateUserCustomizationText,
    updateReply,
    sendReply,
  } = useEmailStore();

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [activeTab, setActiveTab] = useState('text'); // 'text' or 'voice'

  // Version history state
  const [replyHistory, setReplyHistory] = useState([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);

  // Load version history when modal opens
  React.useEffect(() => {
    if (isModalOpen && selectedEmail) {
      const storageKey = `reply_history_${selectedEmail.id}`;
      const stored = localStorage.getItem(storageKey);

      if (stored) {
        try {
          const history = JSON.parse(stored);
          setReplyHistory(history);
          setCurrentVersionIndex(history.length - 1);
        } catch (e) {
          // Invalid storage, start fresh
          const initialHistory = [suggestedReply];
          setReplyHistory(initialHistory);
          setCurrentVersionIndex(0);
          localStorage.setItem(storageKey, JSON.stringify(initialHistory));
        }
      } else {
        // First time opening this email's modal
        const initialHistory = [suggestedReply];
        setReplyHistory(initialHistory);
        setCurrentVersionIndex(0);
        localStorage.setItem(storageKey, JSON.stringify(initialHistory));
      }
    }
  }, [isModalOpen, selectedEmail]);

  // Clear all version history immediately when modal closes
  React.useEffect(() => {
    return () => {
      // Cleanup on unmount (when modal closes)
      if (selectedEmail) {
        const storageKey = `reply_history_${selectedEmail.id}`;
        localStorage.removeItem(storageKey);
        console.log(`Cleared all version history for email ${selectedEmail.id}`);
      }
    };
  }, [selectedEmail]);

  // Auto-trigger regeneration when voice input stops naturally or manually
  React.useEffect(() => {
    // If we just stopped listening and have a transcript, regenerate
    if (!isListening && voiceTranscript && voiceTranscript.trim()) {
      // Only trigger if we are in the 'voice' tab to avoid side effects
      if (activeTab === 'voice') {
        updateUserCustomizationText(voiceTranscript);
        handleRegenerateWithCustomization();
      }
    }
  }, [isListening, voiceTranscript, activeTab]);

  if (!isModalOpen || !selectedEmail) return null;

  const handleRegenerateWithCustomization = async () => {
    setIsRegenerating(true);
    const newReply = await regenerateWithBackend();

    if (newReply) {
      // Add new version to history after successful regeneration
      // Use the returned newReply, NOT suggestedReply (which might be stale)
      const newHistory = [...replyHistory, newReply];
      setReplyHistory(newHistory);
      setCurrentVersionIndex(newHistory.length - 1);

      // Save to localStorage
      const storageKey = `reply_history_${selectedEmail.id}`;
      localStorage.setItem(storageKey, JSON.stringify(newHistory));
    }

    setIsRegenerating(false);
  };

  const handlePreviousVersion = () => {
    if (currentVersionIndex > 0) {
      const newIndex = currentVersionIndex - 1;
      setCurrentVersionIndex(newIndex);
      updateReply(replyHistory[newIndex]);
    }
  };

  const handleNextVersion = () => {
    if (currentVersionIndex < replyHistory.length - 1) {
      const newIndex = currentVersionIndex + 1;
      setCurrentVersionIndex(newIndex);
      updateReply(replyHistory[newIndex]);
    }
  };

  const handleReplyChange = (newText) => {
    // Update the display
    updateReply(newText);

    // Update current version in history
    const updatedHistory = [...replyHistory];
    updatedHistory[currentVersionIndex] = newText;
    setReplyHistory(updatedHistory);

    // Save to localStorage
    if (selectedEmail) {
      const storageKey = `reply_history_${selectedEmail.id}`;
      localStorage.setItem(storageKey, JSON.stringify(updatedHistory));
    }
  };

  const handleVoiceInput = () => {
    if (isListening) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  };

  const handleSendReply = () => {
    // Only show confirmation if there are multiple versions
    if (replyHistory.length > 1) {
      setShowConfirmation(true);
    } else {
      // Direct send if only one version exists
      confirmSend();
    }
  };

  const confirmSend = async () => {
    setIsSending(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    sendReply(selectedEmail.id, suggestedReply);

    // Clear version history from localStorage when sending
    if (selectedEmail) {
      const storageKey = `reply_history_${selectedEmail.id}`;
      localStorage.removeItem(storageKey);
      console.log(`Cleared all version history for sent email ${selectedEmail.id}`);
    }

    setIsSending(false);
    setShowConfirmation(false);
    closeModal();
  };

  const cancelSend = () => {
    setShowConfirmation(false);
  };

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>

        {/* Confirmation Overlay */}
        {showConfirmation && (
          <div className="confirmation-overlay">
            <div className="confirmation-dialog">
              <div className="confirmation-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h3>Confirm Reply</h3>
              <p className="confirmation-text">
                You are about to send <span className="version-highlight">Version {currentVersionIndex + 1}</span> of this reply to the customer.
              </p>
              <div className="confirmation-actions">
                <button className="action-btn cancel-btn" onClick={cancelSend}>
                  Cancel
                </button>
                <button className="action-btn confirm-btn" onClick={confirmSend} disabled={isSending}>
                  {isSending ? (
                    <>
                      <span className="spinner"></span>
                      Sending...
                    </>
                  ) : (
                    <>
                      Yes, Send Reply
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <header className="modal-header">
          <div className="header-content">
            <h1>Customize Reply</h1>
            <p className="header-subtitle">Refine the AI-generated response to your preference</p>
          </div>
          <button className="close-btn" onClick={closeModal} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6L18 18" />
            </svg>
          </button>
        </header>

        {/* Main Content */}
        <main className="modal-main">

          {/* Left Panel - AI Reply */}
          <section className="panel reply-panel">
            <span className="panel-floating-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              AI Suggested Reply
            </span>

            {/* Version Navigation */}
            {replyHistory.length > 1 && (
              <div className="version-navigation">
                <button
                  className="version-btn"
                  onClick={handlePreviousVersion}
                  disabled={currentVersionIndex === 0}
                  title="Previous version"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                  Previous
                </button>
                <span className="version-indicator">
                  Version {currentVersionIndex + 1} of {replyHistory.length}
                </span>
                <button
                  className="version-btn"
                  onClick={handleNextVersion}
                  disabled={currentVersionIndex === replyHistory.length - 1}
                  title="Next version"
                >
                  Next
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            )}

            <textarea
              className="reply-content-editable"
              value={suggestedReply}
              onChange={(e) => handleReplyChange(e.target.value)}
              placeholder="AI generated reply will appear here..."
              rows="10"
            />
            <div className="summary-badge">
              <strong>Summary:</strong> {selectedEmail.customerEmailSummary || "No summary available."}
            </div>
            <button
              className="send-reply-btn"
              onClick={handleSendReply}
              disabled={isSending}
            >
              {isSending ? (
                <>
                  <span className="spinner"></span>
                  Sending...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" />
                  </svg>
                  Reply with this Message
                </>
              )}
            </button>
          </section>

          {/* Right Panel - Controls */}
          <section className="panel control-panel">

            {/* Tone Settings */}
            <div className="settings-group">
              <h3 className="group-label">Response Settings</h3>
              <div className="settings-row">
                <div className="setting-field">
                  <label>Tone</label>
                  <select
                    value={toneAttributes.formality}
                    onChange={(e) => setToneFormality(e.target.value)}
                  >
                    <option value="No Change">No Change</option>
                    <option value="Friendly">Friendly</option>
                    <option value="Semi-Formal">Semi-Formal</option>
                    <option value="Formal">Formal</option>
                  </select>
                </div>
                <div className="setting-field">
                  <label>Length</label>
                  <select
                    value={toneAttributes.length}
                    onChange={(e) => setToneLength(e.target.value)}
                  >
                    <option value="No Change">No Change</option>
                    <option value="Concise">Concise</option>
                    <option value="Normal">Normal</option>
                    <option value="Detailed">Detailed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Input Method Tabs */}
            <div className="input-section">
              <div className="tab-header">
                <button
                  className={`tab-btn ${activeTab === 'text' ? 'active' : ''}`}
                  onClick={() => setActiveTab('text')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  </svg>
                  Type
                </button>
                <button
                  className={`tab-btn ${activeTab === 'voice' ? 'active' : ''}`}
                  onClick={() => setActiveTab('voice')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8" />
                  </svg>
                  Voice
                </button>
              </div>

              <div className="tab-content">
                {activeTab === 'text' ? (
                  <div className="text-input-area">
                    <textarea
                      value={userCustomizationText}
                      onChange={(e) => updateUserCustomizationText(e.target.value)}
                      placeholder="Enter additional instructions to customize the reply..."
                      rows="4"
                    />
                    <button
                      className="action-btn primary"
                      onClick={handleRegenerateWithCustomization}
                      disabled={isRegenerating}
                    >
                      {isRegenerating ? (
                        <>
                          <span className="spinner"></span>
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                            <path d="M21 3v5h-5" />
                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                            <path d="M3 21v-5h5" />
                          </svg>
                          Regenerate Reply
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="voice-input-area">
                    <div className={`voice-transcript-box ${isListening ? 'active' : ''}`}>
                      {isListening ? (
                        <p className="voice-transcript-text">
                          {voiceTranscript || "Listening... Start speaking now"}
                        </p>
                      ) : (
                        <p className="voice-prompt">Click the button below and speak your instructions</p>
                      )}
                    </div>
                    <button
                      className={`action-btn ${isListening ? 'recording' : 'secondary'}`}
                      onClick={handleVoiceInput}
                      disabled={isRegenerating}
                    >
                      {isRegenerating ? (
                        <>
                          <span className="spinner"></span>
                          Processing...
                        </>
                      ) : isListening ? (
                        <>
                          <div className="recording-dot"></div>
                          Stop Recording
                        </>
                      ) : (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
                          </svg>
                          {voiceTranscript ? 'Re-record' : 'Start Recording'}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

          </section>
        </main>

      </div>
    </div>
  );
};

export default EmailDetailsModal;