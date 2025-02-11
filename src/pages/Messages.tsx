import React, { useState } from 'react';
import ConversationList from '../components/messages/ConversationList';
import ChatWindow from '../components/messages/ChatWindow';
import type { Conversation, Message } from '../types';

// Mock data - In production, this would come from an API
const mockConversations: Conversation[] = [
  {
    id: '1',
    participants: [
      {
        id: '1',
        name: 'John Doe',
        role: 'student',
        email: 'john@example.com',
      },
      {
        id: '2',
        name: 'Prof. Smith',
        role: 'teacher',
        email: 'smith@example.com',
      },
    ],
    lastMessage: {
      id: '1',
      senderId: '2',
      receiverId: '1',
      content: 'Don\'t forget about tomorrow\'s assignment!',
      timestamp: new Date().toISOString(),
      read: false,
    },
    unreadCount: 1,
    messages: [
      {
        id: '1',
        senderId: '2',
        receiverId: '1',
        content: 'Don\'t forget about tomorrow\'s assignment!',
        timestamp: new Date().toISOString(),
        read: false,
      },
    ],
  },
  {
    id: '2',
    participants: [
      {
        id: '1',
        name: 'John Doe',
        role: 'student',
        email: 'john@example.com',
      },
      {
        id: '3',
        name: 'Dr. Johnson',
        role: 'teacher',
        email: 'johnson@example.com',
      },
    ],
    lastMessage: {
      id: '2',
      senderId: '1',
      receiverId: '3',
      content: 'Thank you for the feedback!',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      read: true,
    },
    unreadCount: 0,
    messages: [
      {
        id: '2',
        senderId: '1',
        receiverId: '3',
        content: 'Thank you for the feedback!',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: true,
      },
    ],
  },
];

const currentUser = {
  id: '1',
  name: 'John Doe',
  role: 'student',
  email: 'john@example.com',
};

export default function Messages() {
  const [conversations, setConversations] = useState(mockConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  const handleSendMessage = (content: string) => {
    if (!selectedConversation) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      receiverId: selectedConversation.participants.find(p => p.id !== currentUser.id)!.id,
      content,
      timestamp: new Date().toISOString(),
      read: false,
    };

    const updatedConversations = conversations.map(conv => {
      if (conv.id === selectedConversation.id) {
        return {
          ...conv,
          lastMessage: newMessage,
          messages: [...(conv.messages || []), newMessage],
        };
      }
      return conv;
    });

    setConversations(updatedConversations);
    setSelectedConversation(updatedConversations.find(c => c.id === selectedConversation.id)!);
  };

  return (
    <div className="h-full flex">
      <ConversationList
        conversations={conversations}
        currentUser={currentUser}
        onSelectConversation={setSelectedConversation}
        selectedConversationId={selectedConversation?.id}
      />
      {selectedConversation ? (
        <ChatWindow
          conversation={selectedConversation}
          currentUser={currentUser}
          onSendMessage={handleSendMessage}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <p className="text-gray-500">Select a conversation to start messaging</p>
        </div>
      )}
    </div>
  );
}