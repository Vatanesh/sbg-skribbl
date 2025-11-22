import React, { useState, useRef, useEffect } from 'react';
import { socket } from '../socket';
import { useSoundEffects } from '../hooks/useSoundEffects';

export interface Message {
  from?: string;
  senderId?: string;
  text?: string;
  message?: string;
  system?: boolean;
  isCorrectGuess?: boolean;
  timestamp?: number;
}

interface ChatProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isDisabled?: boolean;
  isDrawer?: boolean;
}

function Chat({ messages = [], onSendMessage, isDisabled = false, isDrawer = false }: ChatProps) {
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { playSound } = useSoundEffects();
  const currentUserId = socket.id;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Play sounds for new messages
  useEffect(() => {
    if (messages.length === 0) return;
    const latest = messages[messages.length - 1];
    if (latest.system) return; // no sound for system messages
    if (latest.isCorrectGuess && (latest.from === socket.id || latest.senderId === socket.id)) {
      playSound('correct-guess');
    } else if (latest.from !== socket.id) {
      // incoming chat from others
      playSound('chat-message');
    }
  }, [messages, playSound]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isDisabled) return;
    onSendMessage(text.trim());
    setText('');
  };

  const getMessageClass = (message: Message) => {
    if (message.system) return 'msg system';
    if (message.isCorrectGuess) {
      // Only show as correct guess if it's from the current user
      if (message.from === currentUserId || message.senderId === currentUserId) {
        return 'msg correct-guess';
      }
      return 'msg hidden-guess';
    }
    return 'msg';
  };

  const shouldShowMessage = (message: Message) => {
    // System messages are always visible
    if (message.system) return true;

    // Correct guesses are only visible to the person who sent them
    if (message.isCorrectGuess) {
      return message.from === currentUserId || message.senderId === currentUserId;
    }

    // Regular messages are visible to everyone except drawer messages (which are filtered server-side)
    return true;
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredMessages = messages.filter(shouldShowMessage);

  return (
    <div className="chat card">
      <h3>Chat & Guesses {isDrawer && <span className="drawer-notice">(👁️ View only)</span>}</h3>
      <div className="messages" style={{ height: 220, overflowY: 'auto', marginBottom: 8 }}>
        {filteredMessages.map((m, i) => (
          <div key={i} className={getMessageClass(m)}>
            {m.timestamp && (
              <span className="message-time">{formatTimestamp(m.timestamp)}</span>
            )}
            {m.system ? (
              <em>{m.text}</em>
            ) : (
              <span>
                <strong>{m.from || 'Unknown'}: </strong>
                <span className="message-content">
                  {m.isCorrectGuess ? (
                    <span className="correct-guess-text">✅ Correct guess!</span>
                  ) : (
                    m.message || m.text
                  )}
                </span>
              </span>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={submit} className="chat-form">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={isDisabled ? "Drawers can't send messages" : "Type your guess or chat..."}
          maxLength={100}
          disabled={isDisabled}
        />
        <button
          type="submit"
          disabled={!text.trim() || isDisabled}
          title={isDisabled ? "Drawers can't send messages" : "Send message"}
        >
          💬
        </button>
      </form>
      {isDisabled && (
        <div className="chat-restriction-notice">
          🤐 No chatting while drawing to keep it fair!
        </div>
      )}
    </div>
  );
}

export default Chat;