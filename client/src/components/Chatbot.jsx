import { useState, useEffect, useRef } from "react";
import { X, Send, Mic, StopCircle, MessageSquare, Sparkles, User, Bot } from "lucide-react";
import Groq from "groq-sdk";
import toast, { Toaster } from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const groq = new Groq({ apiKey: GROQ_API_KEY, dangerouslyAllowBrowser: true });

const systemPrompt = `You are a helpful, knowledgeable, and friendly AI assistant. You can help with a wide variety of tasks including:
- Answering questions on various topics
- Providing explanations and tutorials
- Helping with problem-solving
- Offering creative suggestions
- Having casual conversations
- Assisting with research and information gathering

Always be concise, accurate, and helpful. Format your responses clearly using markdown when appropriate.`;

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I'm here to help. What can I assist you with today?",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const customComponents = {
    h1: ({ node, ...props }) => (
      <h1 className="text-xl font-semibold my-2 text-gray-900 dark:text-white" {...props} />
    ),
    h2: ({ node, ...props }) => (
      <h2 className="text-lg font-semibold my-2 text-gray-800 dark:text-gray-100" {...props} />
    ),
    h3: ({ node, ...props }) => (
      <h3 className="text-base font-medium my-1.5 text-gray-800 dark:text-gray-100" {...props} />
    ),
    p: ({ node, ...props }) => <p className="my-1.5 leading-relaxed text-[15px]" {...props} />,
    li: ({ node, ...props }) => <li className="ml-4 list-disc my-0.5" {...props} />,
    ul: ({ node, ...props }) => <ul className="my-1.5 space-y-0.5" {...props} />,
    ol: ({ node, ...props }) => <ol className="my-1.5 space-y-0.5 list-decimal ml-4" {...props} />,
    code: ({ node, inline, className, children, ...props }) => {
      if (inline) {
        return (
          <code className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-1.5 py-0.5 rounded text-sm font-mono">
            {children}
          </code>
        );
      }
      return (
        <pre className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 rounded-lg overflow-auto my-2 border border-gray-200 dark:border-gray-700">
          <code className="text-sm font-mono" {...props}>{children}</code>
        </pre>
      );
    },
    blockquote: ({ node, ...props }) => (
      <blockquote
        className="border-l-2 border-gray-300 dark:border-gray-600 pl-3 italic my-2 text-gray-600 dark:text-gray-400"
        {...props}
      />
    ),
  };

  const handleMessage = async (text) => {
    if (!text.trim()) return;

    const userMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const chatResponse = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((msg) => ({ role: msg.role, content: msg.content })),
          userMessage,
        ],
        temperature: 0.7,
        max_tokens: 1024,
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: chatResponse.choices[0].message.content },
      ]);
    } catch (error) {
      console.error("Error getting response:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I apologize, but I encountered an error. Please try again.",
        },
      ]);
      toast.error("Failed to get response");
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) =>
        chunksRef.current.push(event.data);
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await processAudioInput(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast.success("Recording started");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      setIsRecording(false);
      toast.success("Recording stopped");
    }
  };

  const processAudioInput = async (audioBlob) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      formData.append("model", "whisper-large-v3");

      const response = await fetch(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
          body: formData,
        }
      );

      const data = await response.json();
      if (data.text) {
        setInputMessage(data.text);
        await handleMessage(data.text);
      }
    } catch (error) {
      console.error("Error processing voice input:", error);
      toast.error("Error processing voice command");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Custom CSS for animations */}
      <style>{`
        @keyframes chatbotSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes chatbotSlideOut {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
        }
        
        @keyframes buttonPop {
          from {
            opacity: 0;
            transform: scale(0.8) rotate(-10deg);
          }
          to {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }
        
        .chatbot-open {
          animation: chatbotSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        .chatbot-close {
          animation: chatbotSlideOut 0.3s cubic-bezier(0.4, 0, 1, 1) forwards;
        }
        
        .button-pop {
          animation: buttonPop 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        /* Custom Scrollbar Styles */
        .chatbot-messages::-webkit-scrollbar {
          width: 8px;
        }
        
        .chatbot-messages::-webkit-scrollbar-track {
          background: rgba(148, 163, 184, 0.1);
          border-radius: 10px;
        }
        
        .chatbot-messages::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, rgba(200, 183, 239, 1), rgba(238, 193, 193, 1));
          border-radius: 10px;
          transition: background 0.3s ease;
        }
        
        .chatbot-messages::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, rgba(177, 149, 225, 1), rgba(138, 149, 231, 1));
        }
        
        /* Dark mode scrollbar */
        .dark .chatbot-messages::-webkit-scrollbar-track {
          background: rgba(71, 85, 105, 0.2);
        }
        
        .dark .chatbot-messages::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, rgba(158, 159, 229, 1), rgba(134, 160, 245, 1));
        }
        
        .dark .chatbot-messages::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, rgb(79, 70, 229), rgb(124, 58, 237));
        }
      `}</style>

      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="button-pop group relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 hover:from-slate-800 hover:via-slate-700 hover:to-slate-800 text-white rounded-full p-3 sm:p-4 shadow-2xl transition-all duration-500 hover:scale-110 border border-white/10 backdrop-blur-xl"
            aria-label="Open chat">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <MessageSquare size={24} className="sm:size-[26px] relative z-10 drop-shadow-lg" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-xl group-hover:blur-2xl transition-all duration-500"></div>
          </button>
        ) : (
          <div className={`chatbot-open fixed inset-0 sm:inset-auto sm:bottom-0 sm:right-0 backdrop-blur-2xl bg-white/80 dark:bg-slate-900/80 sm:rounded-3xl shadow-2xl dark:shadow-[0_0_40px_rgba(255,255,255,0.15)]
                         w-full h-full sm:w-[420px] md:w-[440px] lg:w-[460px] sm:h-auto sm:max-h-[min(720px,calc(100vh-8rem))] 
                         flex flex-col border-0 sm:border border-white/20 dark:border-slate-700/50 overflow-hidden`}>
            {/* Glassmorphic background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/50 dark:from-slate-800/30 dark:via-slate-900/30 dark:to-slate-800/30 pointer-events-none"></div>
            <div className="absolute top-0 left-0 w-48 h-48 sm:w-72 sm:h-72 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-48 h-48 sm:w-72 sm:h-72 bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl pointer-events-none"></div>

            {/* Header */}
            <div className="relative p-4 sm:p-5 backdrop-blur-xl bg-white/40 dark:bg-slate-900/40 border-b border-white/20 dark:border-slate-700/50">
              <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-slate-800 to-slate-900 dark:from-white dark:to-gray-100 rounded-2xl flex items-center justify-center shadow-lg">
                      <Sparkles size={18} className="sm:size-[20px] text-white dark:text-slate-900" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-base sm:text-lg">AI Assistant</h3>
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 sm:gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      Active
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-xl p-2 sm:p-2.5 transition-all duration-300 hover:rotate-90 backdrop-blur-sm"
                  aria-label="Close chat">
                  <X size={18} className="sm:size-[20px] text-slate-600 dark:text-slate-400" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="chatbot-messages flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 sm:space-y-6 min-h-0 relative">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-2 sm:gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"
                    } animate-in fade-in slide-in-from-bottom-3 duration-500`}
                  style={{ animationDelay: `${index * 100}ms` }}>

                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-lg ${message.role === "user"
                    ? "bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-100 dark:to-white"
                    : "bg-gradient-to-br from-slate-600 to-slate-800 dark:from-slate-500 dark:to-slate-700"
                    }`}>
                    {message.role === "user" ? (
                      <User size={16} className="sm:size-[18px] text-white dark:text-slate-900" />
                    ) : (
                      <Bot size={16} className="sm:size-[18px] text-white" />
                    )}
                  </div>

                  {/* Message Content */}
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] relative group ${message.role === "user"
                      ? "backdrop-blur-xl bg-gradient-to-br from-slate-800 to-slate-900 dark:from-white dark:to-gray-50 text-white dark:text-slate-900 rounded-3xl rounded-tr-md px-4 py-3 sm:px-5 sm:py-3.5 shadow-xl border border-white/10 dark:border-slate-200/50"
                      : "backdrop-blur-xl bg-white/60 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 rounded-3xl rounded-tl-md px-4 py-3 sm:px-5 sm:py-3.5 border border-white/40 dark:border-slate-700/50 shadow-lg"
                      }`}>
                    {/* Glassmorphic shine effect */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 to-transparent opacity-50 pointer-events-none"></div>

                    <div className="relative z-10">
                      {message.role === "assistant" ? (
                        <div className="markdown-content prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={customComponents}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm sm:text-[15px] leading-relaxed">{message.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-2 sm:gap-3 animate-in fade-in slide-in-from-bottom-3">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Bot size={16} className="sm:size-[18px] text-white" />
                  </div>
                  <div className="backdrop-blur-xl bg-white/60 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 px-4 py-3 sm:px-5 sm:py-3.5 rounded-3xl rounded-tl-md shadow-lg relative">
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 to-transparent opacity-50 pointer-events-none"></div>
                    <div className="flex items-center gap-2 relative z-10">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input section */}
            <div className="relative p-3 sm:p-4 backdrop-blur-xl bg-white/40 dark:bg-slate-900/40 border-t border-white/20 dark:border-slate-700/50">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`flex items-center justify-center p-2.5 sm:p-3 rounded-2xl transition-all duration-300 backdrop-blur-sm shadow-lg ${isRecording
                    ? "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-red-500/50 scale-110"
                    : "bg-white/60 hover:bg-white/80 dark:bg-slate-800/60 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-white/40 dark:border-slate-700/50 hover:scale-105"
                    }`}
                  disabled={isLoading}
                  aria-label={isRecording ? "Stop recording" : "Start recording"}>
                  {isRecording ? <StopCircle size={18} className="sm:size-[20px]" /> : <Mic size={18} className="sm:size-[20px]" />}
                </button>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && handleMessage(inputMessage)
                    }
                    placeholder="Type your message..."
                    className="w-full px-4 py-3 sm:px-5 sm:py-3.5 backdrop-blur-xl bg-white/60 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 rounded-2xl 
                            focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 focus:border-transparent
                            text-sm sm:text-base text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 
                            transition-all duration-300 shadow-lg hover:bg-white/70 dark:hover:bg-slate-800/70"
                    disabled={isRecording || isLoading}
                  />
                </div>

                <button
                  onClick={() => handleMessage(inputMessage)}
                  disabled={isLoading || !inputMessage.trim() || isRecording}
                  className="relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 
                          dark:from-white dark:to-gray-100 dark:hover:from-gray-100 dark:hover:to-white
                          text-white dark:text-slate-900 p-3 sm:p-3.5 rounded-2xl 
                          transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed 
                          shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 
                          border border-white/10 dark:border-slate-200/20 backdrop-blur-sm
                          disabled:hover:scale-100"
                  aria-label="Send message">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                  <Send size={18} className="sm:size-[20px] relative z-10" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Chatbot;