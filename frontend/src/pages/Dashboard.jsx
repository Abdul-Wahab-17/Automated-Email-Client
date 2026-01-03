import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import EmailList from '../components/EmailList';
import EmailDetailsModal from '../components/EmailDetailsModal';
import ToastContainer from '../components/Toast';
import useEmailStore from '../stores/emailStore';
import '../styles/Dashboard.css';

// Custom Chatbot - No external libraries
import CustomChatbot from '../chatbot/CustomChatbot';

const Dashboard = () => {
  const fetchNewEmails = useEmailStore(state => state.fetchNewEmails);
  const setEmails = useEmailStore(state => state.setEmails);
  const [openChat, setOpenChat] = useState(false);

  // Keep ref to latest fetchNewEmails
  const fetchNewEmailsRef = React.useRef(fetchNewEmails);

  // Update ref when function changes
  React.useEffect(() => {
    fetchNewEmailsRef.current = fetchNewEmails;
  }, [fetchNewEmails]);

  // Initial load
  useEffect(() => {
    setEmails();
  }, [setEmails]);

  // Poll for new emails every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Polling for new emails...');
      fetchNewEmailsRef.current(); // Use ref to get latest function
    }, 5000);

    return () => clearInterval(interval);
  }, []); // Empty deps - interval runs once, uses ref for latest function

  return (
    <div className="dashboard">
      <Navbar />

      <main className="dashboard-main">
        <div className="dashboard-content">
          <EmailList />
          <EmailDetailsModal />
        </div>
      </main>

      {/* Floating Chat Button */}
      <button
        onClick={() => setOpenChat(!openChat)}
        className={`chat-toggle-button ${openChat ? 'open' : ''}`}
      >
        {openChat ? '✕' : '💬'}
      </button>

      {/* Chat Window */}
      {openChat && (
        <div className="chatbot-container">
          <CustomChatbot />
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
};

export default Dashboard;
