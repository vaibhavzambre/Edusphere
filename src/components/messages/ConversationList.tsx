import React from 'react';
import { Search } from 'lucide-react';
import type { Conversation, User } from '../../types';

interface ConversationListProps {
  conversations: Conversation[];
  currentUser: User;
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversationId?: string;
}

export default function ConversationList({
  conversations,
  currentUser,
  onSelectConversation,
  selectedConversationId,
}: ConversationListProps) {
  return (
    <div className="w-80 border-r border-gray-200 h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conversation) => {
          const otherParticipant = conversation.participants.find(
            (p) => p.id !== currentUser.id
          )!;
          
          return (
            <button
              key={conversation.id}
              onClick={() => onSelectConversation(conversation)}
              className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-50 ${
                selectedConversationId === conversation.id ? 'bg-indigo-50' : ''
              }`}
            >
              <img
                src={otherParticipant.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParticipant.name)}`}
                alt={otherParticipant.name}
                className="w-12 h-12 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900 truncate">
                    {otherParticipant.name}
                  </p>
                  {conversation.lastMessage && (
                    <span className="text-xs text-gray-500">
                      {new Date(conversation.lastMessage.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
                {conversation.lastMessage && (
                  <p className="text-sm text-gray-500 truncate">
                    {conversation.lastMessage.content}
                  </p>
                )}
                {conversation.unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-indigo-600 rounded-full">
                    {conversation.unreadCount}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}