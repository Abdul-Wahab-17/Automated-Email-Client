import React, { useState, useRef, useEffect } from 'react';
import '../styles/Chatbot.css';

/**
 * Simple Custom Chatbot with Voice Input
 * Draggable & Resizable Window
 */

const API_ENDPOINT = "http://localhost:5678/webhook/9ff7a410-574e-4a8c-a103-6942d7f815b7/chat";

const CustomChatbot = () => {
    // Chat State
    const [messages, setMessages] = useState([
        { id: 1, text: "Hi! How can I help you today?", sender: "bot" }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    // Window Position & Size
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [size, setSize] = useState({ width: 400, height: 520 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Refs
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const recognitionRef = useRef(null);
    const chatWindowRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Focus input on mount and after loading completes
    useEffect(() => {
        if (!loading) {
            inputRef.current?.focus();
        }
    }, [loading]);

    // Initialize speech recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onstart = () => {
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

            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
                setIsRecording(false);

                // Auto-send the message after transcription
                setTimeout(() => {
                    if (transcript.trim()) {
                        sendMessageWithText(transcript);
                    }
                }, 100);
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsRecording(false);
            };

            recognitionRef.current.onend = () => {
                setIsRecording(false);
            };
        }
    }, []);

    // Dragging logic
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragStart.x,
                    y: e.clientY - dragStart.y
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStart]);

    // Resizing logic
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isResizing && chatWindowRef.current) {
                const rect = chatWindowRef.current.getBoundingClientRect();
                const newWidth = e.clientX - rect.left;
                const newHeight = e.clientY - rect.top;

                setSize({
                    width: Math.max(300, Math.min(newWidth, 600)),
                    height: Math.max(400, Math.min(newHeight, 700))
                });
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    const handleDragStart = (e) => {
        if (e.target.classList.contains('chatbot-header')) {
            const rect = chatWindowRef.current.getBoundingClientRect();
            setDragStart({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
            setIsDragging(true);
        }
    };

    const handleResizeStart = (e) => {
        e.stopPropagation();
        setIsResizing(true);
    };

    /**
   * Send message with specific text (used by voice input)
   */
    const sendMessageWithText = async (messageText) => {
        if (!messageText.trim() || loading) return;

        // Add user message
        setMessages(prev => [...prev, {
            id: Date.now(),
            text: messageText,
            sender: "user"
        }]);
        setInput("");
        setLoading(true);

        try {
            // Call API
            const response = await fetch(API_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "sendMessage",
                    sessionId: "simple-session",
                    chatInput: messageText
                })
            });

            const data = await response.json();

            // Get reply from response
            const botReply = data.output || data.reply || data.response || data.message || "Got your message!";

            // Add bot message
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: botReply,
                sender: "bot"
            }]);

        } catch (error) {
            console.error("Chat error:", error);

            // Add error message
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: "Error connecting. Make sure n8n is running.",
                sender: "bot"
            }]);
        }

        setLoading(false);
    };

    /**
     * Send message to API and get response
     */
    const sendMessage = async () => {
        const userMessage = input.trim();
        if (!userMessage || loading) return;

        await sendMessageWithText(userMessage);
    };

    /**
     * Toggle voice recording
     */
    const toggleVoiceInput = () => {
        if (!recognitionRef.current) {
            alert("Speech recognition is not supported in your browser. Please use Chrome or Edge.");
            return;
        }

        if (isRecording) {
            recognitionRef.current.stop();
            setIsRecording(false);
        } else {
            recognitionRef.current.start();
            setIsRecording(true);
        }
    };

    /**
     * Handle Enter key
     */
    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div
            ref={chatWindowRef}
            className="custom-chatbot-window"
            style={{
                left: position.x ? `${position.x}px` : 'auto',
                top: position.y ? `${position.y}px` : 'auto',
                right: position.x ? 'auto' : '24px',
                bottom: position.y ? 'auto' : '90px',
                width: `${size.width}px`,
                height: `${size.height}px`
            }}
        >
            {/* Draggable Header */}
            <div
                className="chatbot-header"
                onMouseDown={handleDragStart}
            >
                <div className="chatbot-header-title">
                    <span className="chatbot-icon">💬</span>
                    <span>Chat Assistant</span>
                </div>
                <div className="chatbot-header-hint">Drag to move</div>
            </div>

            {/* Chat Content */}
            <div className="custom-chatbot">
                {/* Messages */}
                <div className="chatbot-messages">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`message-wrapper ${msg.sender}`}>
                            <div className={`message ${msg.sender}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}

                    {/* Loading dots */}
                    {loading && (
                        <div className="message-wrapper bot">
                            <div className="message bot loading">
                                <div className="typing-indicator">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="chatbot-input-container">
                    {/* Voice Button */}
                    <button
                        className={`chatbot-voice-btn ${isRecording ? 'recording' : ''}`}
                        onClick={toggleVoiceInput}
                        disabled={loading}
                        title={isRecording ? "Stop recording" : "Start voice input"}
                    >
                        {isRecording ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="6" width="12" height="12" rx="2" />
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                <line x1="12" y1="19" x2="12" y2="23"></line>
                                <line x1="8" y1="23" x2="16" y2="23"></line>
                            </svg>
                        )}
                    </button>

                    {/* Text Input */}
                    <input
                        ref={inputRef}
                        type="text"
                        className="chatbot-input"
                        placeholder={isRecording ? "Listening..." : "Type a message..."}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={loading}
                    />

                    {/* Send Button */}
                    <button
                        className="chatbot-send-btn"
                        onClick={sendMessage}
                        disabled={!input.trim() || loading}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
            </div>

            {/* Resize Handle */}
            <div
                className="chatbot-resize-handle"
                onMouseDown={handleResizeStart}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15l-6 6M21 8l-13 13"></path>
                </svg>
            </div>
        </div>
    );
};

export default CustomChatbot;
