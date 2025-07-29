import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Paperclip, X } from 'lucide-react';
import axios from 'axios';
import FileUpload from './FileUpload';
import { useAuth } from '../contexts/AuthContext';
import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true,
});

export default function ChatInterface() {
  const [messages, setMessages] = useState([
    {
      id: '1',
      content: 'Hello! I\'m your AI finance assistant. I can help you create invoices, record transactions, generate balance sheets, and process uploaded invoice documents. What would you like to do today?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(
        '/api/chat/message',
        { message: input, conversationId: 'default' },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );

      const botMessage = {
        id: (Date.now() + 1).toString(),
        content: response.data.message,
        sender: 'bot',
        timestamp: new Date(),
        data: response.data.data
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUploadSuccess = (uploadData) => {
    const uploadMessage = {
      id: Date.now().toString(),
      content: `📄 Document uploaded and processed successfully!\n\n${generateUploadSummary(uploadData.extractedData)}`,
      sender: 'bot',
      timestamp: new Date(),
      data: uploadData.extractedData,
      type: 'file-upload'
    };

    setMessages(prev => [...prev, uploadMessage]);
    setShowFileUpload(false);

    // Suggest next actions
    setTimeout(() => {
      const suggestionMessage = {
        id: (Date.now() + 1).toString(),
        content: generateUploadSuggestions(uploadData.extractedData),
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, suggestionMessage]);
    }, 1000);
  };

  const handleFileUploadError = (error) => {
    const errorMessage = {
      id: Date.now().toString(),
      content: `❌ File upload failed: ${error}\n\nPlease try uploading a different file or check the file format.`,
      sender: 'bot',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, errorMessage]);
    setShowFileUpload(false);
  };

  const generateUploadSummary = (extractedData) => {
    let summary = 'Extracted Information:\n';

    if (extractedData.clientName) {
      summary += `👤 Client: ${extractedData.clientName}\n`;
    }
    if (extractedData.totalAmount) {
      summary += `💰 Amount: $${extractedData.totalAmount}\n`;
    }
    if (extractedData.invoiceNumber) {
      summary += `📄 Invoice #: ${extractedData.invoiceNumber}\n`;
    }
    if (extractedData.invoiceDate) {
      summary += `📅 Date: ${extractedData.invoiceDate}\n`;
    }
    if (extractedData.description) {
      summary += `📝 Description: ${extractedData.description}\n`;
    }

    summary += `\n🎯 Confidence: ${(extractedData.confidence * 100).toFixed(1)}%`;

    return summary;
  };

  const generateUploadSuggestions = (extractedData) => {
    const hasRequiredFields = extractedData.clientName && extractedData.totalAmount;

    if (hasRequiredFields) {
      return `✨ What would you like to do next?\n\n• Say "Create an invoice" to generate a new invoice with this data\n• Ask me to "Record this as a transaction"\n• Request a "Balance sheet update"\n• Upload another document`;
    } else {
      return `⚠️ Missing Information Detected\n\nTo create an invoice, I'll need:\n${!extractedData.clientName ? '• Client name\n' : ''}${!extractedData.totalAmount ? '• Invoice amount\n' : ''}${!extractedData.description ? '• Description (optional)\n' : ''}\n\nYou can provide this information by typing: "Create an invoice for [client] for $[amount]"`;
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-none sm:max-w-6xl mx-auto relative">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-3 max-w-[85%] sm:max-w-md md:max-w-2xl ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}>
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${message.sender === 'bot'
                    ? 'bg-primary-500'
                    : 'bg-gray-500'
                  }`}>
                  {message.sender === 'bot' ? (
                    <Bot className="w-4 h-4 text-white" />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>
              </div>

              {/* Message Bubble */}
              <div className={`rounded-2xl px-4 py-3 max-w-full ${message.sender === 'user'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-800'
                }`}>
                <div
                  className="text-sm leading-relaxed prose prose-sm max-w-none"
                  style={{
                    color: message.sender === 'user' ? 'white' : 'inherit'
                  }}
                  dangerouslySetInnerHTML={{
                    __html: marked(message.content || 'Please Login Again!')
                  }}
                />

                {/* File upload data display */}
                {message.data && message.type === 'file-upload' && (
                  <div className="mt-3 p-3 bg-white/10 rounded-lg border border-white/20">
                    <div className="text-xs font-medium mb-2 opacity-90">Extracted Data:</div>
                    <div className="text-xs font-mono bg-black/10 p-2 rounded overflow-x-auto">
                      <pre className="whitespace-pre-wrap break-all opacity-90">
                        {JSON.stringify(message.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Other data display */}
                {message.data && message.type !== 'file-upload' && (
                  <div className="mt-2 p-2 bg-white/10 rounded text-xs overflow-x-auto">
                    <pre className="whitespace-pre-wrap break-all font-mono opacity-90">
                      {JSON.stringify(message.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Container */}
      <div className="border-t bg-white p-3 sm:p-4 border-gray-200 flex-shrink-0">
        <div className="flex items-end space-x-2 sm:space-x-3">
          <button
            onClick={() => setShowFileUpload(!showFileUpload)}
            className="p-2 text-gray-500 hover:text-primary-500 transition-colors flex-shrink-0 rounded-lg hover:bg-gray-100"
            title="Upload document"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message or upload a document..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none text-sm placeholder-gray-500"
              rows="1"
              disabled={loading}
              style={{
                height: 'auto',
                minHeight: '42px',
                maxHeight: '120px'
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
          </div>

          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-2 px-1">
          <p className="text-xs text-gray-500">
            <span className="hidden sm:inline">💡 Tip: Upload invoice documents using the paperclip icon for automatic data extraction</span>
            <span className="sm:hidden">💡 Tap 📎 to upload documents</span>
          </p>
        </div>
      </div>

      {/* File Upload Modal */}
      {showFileUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowFileUpload(false)}
          ></div>

          {/* Modal Content */}
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
                    Upload Invoice Document
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Upload an invoice PDF file and I'll extract the information for you using AI.
                  </p>
                </div>
                <button
                  onClick={() => setShowFileUpload(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <FileUpload
                onUploadSuccess={handleFileUploadSuccess}
                onUploadError={handleFileUploadError}
              />

              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                <div className="text-xs text-gray-500">
                  <p>Supported formats: PDF • Max size: 10MB</p>
                </div>
                <button
                  onClick={() => setShowFileUpload(false)}
                  className="w-full sm:w-auto px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-center"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}