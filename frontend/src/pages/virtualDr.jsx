import React, { useState, useEffect, useRef } from 'react';
import '../ui/virtualdr.css';
import '@splinetool/viewer';


const VirtualDoctor = () => {
  // State variables
  const [currentChatId, setCurrentChatId] = useState(null);
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusIndicator, setStatusIndicator] = useState('Online');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const messagesContainerRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const videoRef = useRef(null);
  const recognitionRef = useRef(null);

  // Cookie functions
  const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  const csrfToken = getCookie('csrftoken');
  const authToken = getCookie('authToken');

  // Request headers for API calls
  const getRequestHeaders = () => {
    const headers = {
      'X-CSRFToken': csrfToken,
      'Content-Type': 'application/json'
    };
    
    if (authToken) {
      headers['Authorization'] = `Token ${authToken}`;
    }
    
    return headers;
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  // Load chat history
  const loadChats = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/bot/chats/`, {
        method: 'GET',
        headers: getRequestHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      setChats(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading chats:', error);
      setError(error.message);
      setIsLoading(false);
    }
  };

  // Load a specific chat
  const loadChat = async (chatId) => {
    setCurrentChatId(chatId);
    setIsLoading(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/bot/chats/${chatId}/messages/`, {
        method: 'GET',
        headers: getRequestHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      setMessages(data);
      setIsLoading(false);
      
      // Scroll to bottom after messages load
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
      setError(error.message);
      setIsLoading(false);
    }
  };

  // Create a new chat
  const createNewChat = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/bot/chats/`, {
        method: 'POST',
        headers: getRequestHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      await loadChats();
      loadChat(data.chat_id);
      
      // Close sidebar on mobile
      if (window.innerWidth < 768) {
        setIsMobileNavOpen(false);
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      setError(error.message);
    }
  };

  // Send a message
  const sendMessage = async (message) => {
    if (!currentChatId || !message.trim()) return;
    
    setInputMessage('');
    
    // Show typing indicator (add temporary message)
    const tempMessages = [...messages, { type: 'typing-indicator', id: 'typing' }];
    setMessages(tempMessages);
    
    // Scroll to bottom
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
    
    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/bot/chats/${currentChatId}/messages/`, {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({ message: message })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Remove typing indicator and add actual messages
      setMessages(prevMessages => 
        prevMessages
          .filter(msg => msg.id !== 'typing')
          .concat([data.user_message, data.ai_message])
      );
      
      // Speak AI response
      speakAIResponse(data.ai_message.message);
      
      // Scroll to bottom
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove typing indicator and show error
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== 'typing')
      );
      
      setError(error.message);
      
      // Auto-remove error after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    }
  };

  // Text-to-Speech for AI responses
  const speakAIResponse = (text) => {
    // Remove any HTML tags from the text
    const cleanText = text.replace(/<[^>]*>/g, '');
    
    // Create speech synthesis utterance
    const speech = new SpeechSynthesisUtterance(cleanText);
    
    // Configure voice settings
    speech.rate = 1.0;  // Speed of speech
    speech.pitch = 1.0; // Pitch
    speech.volume = 1.0; // Volume
    
    // Try to find a female voice for the doctor
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(voice => 
      voice.name.includes('female') || 
      voice.name.includes('Woman') || 
      voice.name.includes('girl')
    );
    
    if (femaleVoice) {
      speech.voice = femaleVoice;
    }
    
    // Show speaking indicator
    setStatusIndicator('Speaking');
    
    // Speak the text
    window.speechSynthesis.speak(speech);
    
    // When done speaking, reset the status
    speech.onend = function() {
      setStatusIndicator('Online');
    };
  };

  // Speech-to-Text setup
  const setupSpeechRecognition = () => {
    // Check browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Your browser does not support speech recognition. Try using Chrome or Edge.');
      return false;
    }
    
    // Create speech recognition object
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    // Configure
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';
    
    // Handle results
    recognitionRef.current.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
        
      // Update input field with transcript
      setInputMessage(transcript);
      
      // If this is a final result
      if (event.results[0].isFinal) {
        // Auto-submit after a short delay
        if (transcript.trim().length > 0) {
          setTimeout(() => {
            if (isListening && currentChatId) {
              sendMessage(transcript.trim());
              stopListening();
            }
          }, 1000);
        }
      }
    };
    
    // Handle errors
    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      stopListening();
    };
    
    // Handle end of speech input
    recognitionRef.current.onend = () => {
      if (isListening) {
        // If we're still supposed to be listening, restart
        recognitionRef.current.start();
      }
    };
    
    return true;
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      if (!setupSpeechRecognition()) {
        return;
      }
    }
    
    setIsListening(true);
    recognitionRef.current.start();
    setStatusIndicator('Listening...');
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      setIsListening(false);
      recognitionRef.current.stop();
      setStatusIndicator('Online');
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Camera functions
  const startCamera = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(function(stream) {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            cameraStreamRef.current = stream;
            setCameraActive(true);
          }
        })
        .catch(function(error) {
          console.error('Camera error:', error);
          alert('Unable to access camera. Please check permissions.');
        });
    } else {
      alert('Your browser does not support camera access.');
    }
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      cameraStreamRef.current = null;
      setCameraActive(false);
    }
  };

  const toggleCamera = () => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // Check auth status
  const checkAuthStatus = () => {
    return !!authToken;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputMessage.trim() && currentChatId) {
      sendMessage(inputMessage);
    }
  };

  // Toggle sidebar for mobile
  const toggleSidebar = () => {
    setIsMobileNavOpen(!isMobileNavOpen);
  };

  // Load chats on component mount
  useEffect(() => {
    if (checkAuthStatus()) {
      loadChats();
    }
    
    // Initialize voices for speech synthesis
    window.speechSynthesis.onvoiceschanged = function() {
      console.log('Voices loaded:', window.speechSynthesis.getVoices().length);
    };
    
    // Load available voices
    window.speechSynthesis.getVoices();
    
    // Clean up on unmount
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      }
      
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Handle window resize to close sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 992 && isMobileNavOpen) {
        setIsMobileNavOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileNavOpen]);

  return (
    <div className="virtual-doctor-container">
      {/* Mobile toggle button */}
      <button className="mobile-toggle" onClick={toggleSidebar}>
        <i className="fas fa-bars"></i>
      </button>
      
      {/* Overlay for mobile sidebar */}
      <div 
        className={`sidebar-overlay ${isMobileNavOpen ? 'active' : ''}`} 
        onClick={toggleSidebar}
      ></div>
      
      <div className="main-layout">
        {/* Left sidebar - Chat history */}
        <div className={`chat-history-panel ${isMobileNavOpen ? 'open' : ''}`}>
          <div className="panel-header">
            <h2>Chat History</h2>
            <button className="new-chat-btn" onClick={createNewChat}>
              <i className="fas fa-plus"></i> New Chat
            </button>
          </div>
          
          <div className="chat-list-container">
            {isLoading && chats.length === 0 ? (
              <div className="loading-state">Loading chats...</div>
            ) : error ? (
              <div className="error-state">
                {error.includes('401') 
                  ? 'Please log in to view your chats' 
                  : 'Error loading chats'}
              </div>
            ) : chats.length === 0 ? (
              <div className="empty-state">
                No previous chats found. Start a new conversation!
              </div>
            ) : (
              <ul className="chat-list">
                {chats.map(chat => (
                  <li 
                    key={chat.id} 
                    className={`chat-item ${currentChatId === chat.id ? 'active' : ''}`}
                    onClick={() => {
                      loadChat(chat.id);
                      if (window.innerWidth < 768) {
                        setIsMobileNavOpen(false);
                      }
                    }}
                  >
                    <div className="chat-item-content">
                      <div className="chat-item-preview">{chat.preview}</div>
                      <div className="chat-item-time">{formatDate(chat.created_at)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        {/* Middle column - Avatar and Camera */}
        <div className="avatar-panel">
          <div className="panel-header">
            <h2>Virtual Doctor</h2>
            <div className={`status-badge ${statusIndicator.toLowerCase()}`}>
              {statusIndicator}
            </div>
          </div>
          
          <div className="avatar-content">
            <div className="spline-container">
              <spline-viewer url="https://prod.spline.design/cOzASNbuQZklJ8d0/scene.splinecode"></spline-viewer>
            </div>
            
            <div className="camera-container">
              <div className="camera-content">
                {cameraActive ? (
                  <video ref={videoRef} autoPlay playsInline className="camera-feed"></video>
                ) : (
                  <div className="camera-placeholder">
                    <i className="fas fa-video-slash"></i>
                    <span>Camera Off</span>
                  </div>
                )}
              </div>
              
              <button 
                className={`camera-toggle-btn ${cameraActive ? 'active' : ''}`} 
                onClick={toggleCamera}
              >
                <i className={`fas ${cameraActive ? 'fa-video-slash' : 'fa-video'}`}></i>
                {cameraActive ? 'Turn Off Camera' : 'Turn On Camera'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Right column - Chat interface */}
        <div className="chat-panel">
          <div className="panel-header">
            <div className="doctor-avatar">
              <i className="fas fa-user-md"></i>
            </div>
            <h2>Consultation</h2>
          </div>
          
          <div className="chat-content">
            <div 
              ref={messagesContainerRef}
              className="messages-container"
            >
              {!currentChatId ? (
                <div className="welcome-screen">
                  <div className="welcome-icon">
                    <i className="fas fa-comment-medical"></i>
                  </div>
                  <h3>Welcome to Virtual Doctor</h3>
                  <p>Select a previous conversation or start a new chat to begin your consultation.</p>
                </div>
              ) : isLoading ? (
                <div className="loading-screen">
                  <div className="loading-spinner"></div>
                  <p>Loading your conversation...</p>
                </div>
              ) : error ? (
                <div className="error-screen">
                  <i className="fas fa-exclamation-circle"></i>
                  <p>{error}</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="empty-chat-screen">
                  <p>Start the conversation by sending a message!</p>
                </div>
              ) : (
                <div className="message-list">
                  {messages.map((message, index) => (
                    message.type === 'typing-indicator' ? (
                      <div key="typing" className="typing-indicator">
                        <span></span><span></span><span></span>
                      </div>
                    ) : (
                      <div key={message.id || index} className={`message ${message.type}`}>
                        <div className="message-bubble">
                          <div className="message-content" dangerouslySetInnerHTML={{ __html: message.message.replace(/\n/g, '<br>') }}></div>
                          <div className="message-time">{formatDate(message.created_at)}</div>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
            
            <form onSubmit={handleSubmit} className="chat-input-form">
              <input 
                type="text" 
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message here..."
                disabled={!currentChatId || isLoading}
                className="chat-input"
              />
              <button 
                type="button"
                onClick={toggleListening}
                className={`mic-button ${isListening ? 'active' : ''}`}
                disabled={!currentChatId || isLoading}
              >
                <i className={`fas ${isListening ? 'fa-microphone' : 'fa-microphone-slash'}`}></i>
              </button>
              <button 
                type="submit" 
                className="send-button"
                disabled={!currentChatId || isLoading || !inputMessage.trim()}
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualDoctor;