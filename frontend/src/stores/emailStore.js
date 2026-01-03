import { create } from 'zustand';

const useEmailStore = create((set, get) => ({
  emails: [],
  selectedEmail: null,
  isModalOpen: false,
  suggestedReply: "",
  // Refactored Tone State
  toneAttributes: {
    formality: "No Change",
    length: "No Change"
  },
  userCustomizationText: "",

  // Voice Input State
  isListening: false,
  voiceTranscript: "",
  recognition: null,
  voiceMode: "email", // 'email' or 'chatbot'
  chatActions: null, // { sendUserMessage: (msg) => {} }

  // Toast Notifications
  toasts: [],

  addToast: (toast) => {
    const id = Date.now() + Math.random();
    const newToast = { id, ...toast };
    set((state) => ({ toasts: [...state.toasts, newToast] }));
    return id;
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
  },

  mockEmails: [],

  setEmails: async () => {
    try {
      const res = await fetch("http://localhost:5000/messages/onscreen");
      const emails = await res.json();

      set({ emails });
      console.log("Fetched onscreen emails:", emails);
      return emails;
    } catch (err) {
      console.error("Error fetching emails:", err);
      return [];
    }
  },

  fetchNewEmails: async () => {
    const { emails } = get();

    try {
      const res = await fetch("http://localhost:5000/messages/pending");
      const newMsgs = await res.json();

      if (newMsgs.length > 0) {
        // Backend now returns transformed data
        const merged = [...emails, ...newMsgs];

        // De-duplicate by ID
        const uniqueEmails = Array.from(new Map(merged.map(e => [e.id, e])).values());

        set({ emails: uniqueEmails });
        console.log("Fetched new pending emails:", newMsgs);
      }
    } catch (err) {
      console.error("Error fetching new emails:", err);
    }
  },

  sendEmail: async (id, customReplyText = null) => {
    const { emails, addToast, removeToast } = get();

    // Find the email being sent
    const emailToSend = emails.find(e => e.id === id);
    if (!emailToSend) {
      console.error("Email not found:", id);
      return;
    }

    // Use custom reply text if provided (from modal edit), otherwise use original
    const replyToSend = customReplyText || emailToSend.Reply_of_email;

    // Store original position for potential restoration
    const originalIndex = emails.findIndex(e => e.id === id);

    // Optimistic removal from UI
    const updatedEmails = emails.filter(email => email.id !== id);
    set({ emails: updatedEmails });

    // Show yellow loading toast
    const loadingToastId = addToast({
      type: 'loading',
      message: 'Sending email...'
    });

    console.log("Sending email to n8n webhook:", replyToSend);

    try {
      const res = await fetch(`http://localhost:5000/send-email/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          llm_reply: replyToSend
        })
      });
      const data = await res.json();

      // Remove loading toast
      removeToast(loadingToastId);

      if (data.success) {
        console.log("Email sent successfully:", data.n8nResult);

        // Show green success toast with sender email
        addToast({
          type: 'success',
          message: `Email sent to ${emailToSend.sender}`
        });
      } else {
        throw new Error(data.message || "Failed to send email");
      }
    } catch (err) {
      console.error("Error sending email:", err);

      // Remove loading toast if still present
      removeToast(loadingToastId);

      // Restore email to original position
      const currentEmails = get().emails;
      const restoredEmails = [
        ...currentEmails.slice(0, originalIndex),
        emailToSend,
        ...currentEmails.slice(originalIndex)
      ];
      set({ emails: restoredEmails });

      // Show error toast
      addToast({
        type: 'error',
        message: 'Failed to send email. Please try again.'
      });
    }
  },

  // Auto-Send State
  isAutoSending: false,

  stopAutoSend: () => {
    console.log("Stopping auto-send...");
    set({ isAutoSending: false });
  },

  autoSendAllEmails: async () => {
    const { emails, sendEmail, addToast } = get();
    console.log("Starting Auto-Send for all emails:", emails.length);

    // Guard: Empty list
    if (emails.length === 0) {
      addToast({
        type: 'error',
        message: 'No emails to auto-send!'
      });
      return;
    }

    // Set sending flag
    set({ isAutoSending: true });

    // Snapshot IDs to treat them safely in a loop
    const emailIds = emails.map(e => e.id);

    // Process sequentially
    for (const id of emailIds) {
      // CHECK: Abort if stopped
      if (!get().isAutoSending) {
        console.log("Auto-Send process aborted by user.");
        break; // Stop the loop immediately
      }

      await sendEmail(id);

      // Small delay - keeps UI responsive and allows user time to hit stop
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    // Reset flag when done or aborted
    set({ isAutoSending: false });
    console.log("Auto-Send cycle finished.");
  },

  openModal: (email) => {
    set({
      selectedEmail: email,
      isModalOpen: true,
      suggestedReply: email.Reply_of_email
    });
  },

  closeModal: () => {
    set({
      selectedEmail: null,
      isModalOpen: false,
      suggestedReply: "",
      userCustomizationText: "",
      isListening: false,
      voiceTranscript: ""
    });
  },

  updateReply: (text) => {
    set({ suggestedReply: text });
  },

  // New Tone Setters
  setToneFormality: (formality) => {
    set((state) => ({
      toneAttributes: { ...state.toneAttributes, formality }
    }));
  },

  setToneLength: (length) => {
    set((state) => ({
      toneAttributes: { ...state.toneAttributes, length }
    }));
  },

  updateUserCustomizationText: (text) => {
    set({ userCustomizationText: text });
  },

  clearCustomizationText: () => {
    set({ userCustomizationText: "" });
  },

  sendReply: (emailId, replyText) => {
    console.log(`Sending reply for email ${emailId}:`, replyText);
    get().sendEmail(emailId, replyText);
  },

  regenerateWithBackend: async () => {
    const { selectedEmail, toneAttributes, userCustomizationText, emails, addToast } = get();

    if (!selectedEmail) {
      console.error("No email selected for regeneration");
      addToast({
        type: 'error',
        message: 'No email selected for regeneration'
      });
      return false;
    }

    // Combine tone attributes for backend
    let formalityPart = toneAttributes.formality;
    let lengthPart = toneAttributes.length;

    if (lengthPart !== "No Change") {
      lengthPart = `${lengthPart} length`;
    }

    const combinedTone = `${formalityPart}, ${lengthPart}`;

    console.log("Combined tone:", combinedTone);
    console.log("User customization text:", userCustomizationText);
    console.log("Selected email:", selectedEmail);

    try {
      const response = await fetch("http://localhost:5678/webhook/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: selectedEmail,
          tone: combinedTone,
          improvement_text: userCustomizationText
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      console.log("Backend response:", data);

      const newReply = data?.llm_reply?.llm_reply;
      if (!newReply) {
        console.error("No llm_reply in response:", data);
        addToast({
          type: 'error',
          message: 'Failed to regenerate reply. No response from AI.'
        });
        return false;
      }

      const updatedEmails = emails.map(email =>
        email.id === selectedEmail.id
          ? { ...email, Reply_of_email: newReply }
          : email
      );

      set({ emails: updatedEmails });
      set({ suggestedReply: newReply });
      console.log("Successfully updated frontend email with new reply:", newReply);

      // Show success toast
      addToast({
        type: 'success',
        message: 'Reply regenerated successfully!'
      });

      set({ userCustomizationText: "" });
      set({ userCustomizationText: "" });
      return newReply;

    } catch (error) {
      console.error("Error regenerating reply:", error);
      addToast({
        type: 'error',
        message: 'Error regenerating reply. Please try again.'
      });
      return null;
    }
  },

  regenerateReply: () => {
    const { selectedEmail } = get();
    if (!selectedEmail) {
      console.error("No email selected for regeneration");
      return;
    }
    console.log("Regenerate reply called - use regenerateWithBackend instead");
  },

  voiceInputReply: () => {
    console.log("Voice input activated - placeholder");
    alert("Voice input feature coming soon!");
  },

  // Voice Input Functions
  startVoiceInput: (mode = "email") => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice input is not supported in your browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Changed to false for better accuracy (like chatbot)
    recognition.interimResults = false; // Changed to false to avoid partial/wrong inputs
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log("Voice recognition started in mode:", mode);
      set({ isListening: true, voiceTranscript: "", voiceMode: mode });

      // Play a short beep sound when recording starts
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // 800 Hz beep
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    };

    recognition.onresult = (event) => {
      // Simplified for non-continuous mode
      const transcript = event.results[0][0].transcript;
      set({ voiceTranscript: transcript });
      console.log("Transcript:", transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      set({ isListening: false });

      if (event.error === 'no-speech') {
        // alert("No speech detected. Please try again."); // Optional: remove alert to be less intrusive
      } else if (event.error === 'not-allowed') {
        alert("Microphone access denied. Please allow microphone access.");
      } else {
        // alert(`Error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log("Voice recognition ended");
      set({ isListening: false });
      // Removed auto-restart logic
    };

    recognition.start();
    set({ recognition });
  },

  stopVoiceInput: async () => {
    const { recognition, voiceTranscript } = get();

    if (recognition) {
      recognition.stop();
      set({ isListening: false, recognition: null });
    }
    console.log("Voice input stopped before the sending");
    if (voiceTranscript.trim()) {
      const { voiceMode, chatActions } = get();

      if (voiceMode === "email") {
        // Regeneration is now handled by the UI component (EmailDetailsModal)
        // to prevent duplicate API calls and duplicate toast notifications
        console.log("Voice stopped - waiting for UI to handle regeneration");
      } else if (voiceMode === "chatbot") {
        console.log("Sending voice transcript to chatbot:", voiceTranscript);
        if (chatActions && chatActions.sendUserMessage) {
          chatActions.sendUserMessage(voiceTranscript);
        } else {
          console.error("Chat actions not registered");
        }
        set({ voiceTranscript: "" });
      }
    }
    else {
      console.log("No voice transcript to send");
    }
  },

  cancelVoiceInput: () => {
    const { recognition } = get();

    if (recognition) {
      recognition.stop();
    }

    set({
      isListening: false,
      recognition: null,
      voiceTranscript: ""
    });
  },
  setChatActions: (actions) => {
    set({ chatActions: actions });
  }
}));

export default useEmailStore;