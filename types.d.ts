import { PHASE_DEVELOPMENT_SERVER } from "next/dist/shared/lib/constants";

interface Profile {
  id: string;
  createdAt: string; // Date when the profile was created
  role: 'Student' | 'Tutor' | 'Admin';
  userId: string; // Foreign key or identifier
  firstName: string;
  lastName: string;
  dateOfBirth: string; // Format: YYYY-MM-DD
  startDate: string; // Format: YYYY-MM-DD, start date of the user's involvement
  availability: { day: string; startTime: string, endTime:string }[]; // Example: [{ day: "Monday", time: "3PM-6PM" }]
  email: string;
  parentName?: string; // Optional
  parentPhone?: string; // Optional
  parentEmail?: string; // Optional
  timeZone: string; // Example: 'America/New_York'
  subjectsOfInterest: string[]; // Array of subjects
  status: 'Active' | 'Inactive' | 'Deleted';
  tutorIds: string[]
}

interface Session {
  id: string;
  createdAt: string;
  environment: 'Virtual' | 'In-Person';
  student: Profile | null;
  tutor: Profile | null;
  date: string;
  summary:string;
  meeting?: Meeting | null;
  status: string;
}

interface Meeting {
  name: string;
  id: string;
  createdAt: string;
  password: string,
  meetingId: string;
  link:string;
}

interface Notification {
  createdAt: string;
  id:string;
  summary: string; // You can adjust the name here for clarity
  sessionId: string;
  previousDate: string;
  suggestedDate: string;
  student: Profile | null;
  tutor: Profile | null;
  status: 'Active' | 'Resolved';
}
  
// Type for Events
interface Event {
  createdAt:string;
  date: string; // Format: YYYY-MM-DD
  summary:string;
  tutorId:string;
  id:string;
  hours:number;
}
  
// Type for Student Enrollments
interface Enrollment {
  id: string;
  createdAt: string;
  student: Profile | null;
  tutor: Profile | null;
  summary: string;
  startDate: string;
  endDate:string;
  availability: { day: string; startTime: string, endTime: string }[]; // Ensure startTime and endTime have AM/PM format
}
  