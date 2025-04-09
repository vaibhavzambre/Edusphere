export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  avatar?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'info' | 'warning' | 'success' | 'error';
}

export interface Resource {
  id: string;
  title: string;
  type: 'document' | 'video' | 'link';
  url: string;
  uploadedBy: string;
  date: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  course: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
  deletedBy?: string[]; // ✅ ADD THIS
  isDeletedForEveryone?: boolean; // ✅ ADD THIS

  attachments?: {
    id: string;
    name: string;
    url: string;
    type: string;
  }[];
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  messages?: Message[];
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'internship' | 'fulltime';
  salary: string;
  description: string;
  requirements: string[];
  source: string;
  postedDate: string;
  applicationDeadline: string;
}

export interface Department {
  id: string;
  name: string;
  email: string;
}