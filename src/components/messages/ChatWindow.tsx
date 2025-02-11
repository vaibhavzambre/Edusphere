import React, { useState } from 'react';
import { Paperclip, Send, Smile } from 'lucide-react';
import type { Conversation, Message, User } from '../../types';

interface ChatWindowProps {
  conversation: Conversation;
  currentUser: User;
  onSendMessage: (content: string) => void;
}

export default function ChatWindow({
  conversation,
  currentUser,
  onSendMessage,
}: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState('');
  const otherParticipant = conversation.participants.find(
    (p) => p.id !== currentUser.id
  )!;

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <img
            src={otherParticipant.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParticipant.name)}`}
            alt={otherParticipant.name}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <h2 className="font-medium text-gray-900">{otherParticipant.name}</h2>
            <p className="text-sm text-gray-500 capitalize">{otherParticipant.role}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.messages?.map((message: Message) => {
          const isCurrentUser = message.senderId === currentUser.id;
          return (
            <div
              key={message.id}
              className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  isCurrentUser
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <span className="text-xs opacity-75 mt-1 block">
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-end space-x-3">
          <button className="p-2 text-gray-500 hover:text-gray-600">
            <Paperclip className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-600">
            <Smile className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 max-h-32 resize-none"
              rows={1}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}