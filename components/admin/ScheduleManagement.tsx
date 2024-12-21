'use client'
import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, parseISO, isAfter, isValid } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Circle} from 'lucide-react'
import { 
  getAllSessions, 
  rescheduleSession, 
  getAllEnrollments, 
  addSessions,
  updateSession,
  getMeetings,
  getAllProfiles,
  removeSession,
  getMeeting
} from "@/lib/actions/admin.actions";
import {
  getProfileWithProfileId
} from '@/lib/actions/user.actions'
import { toast } from "react-hot-toast";
import { Session, Enrollment, Meeting, Profile } from '@/types';
import { getSessionTimespan } from '@/lib/utils';
import { ChevronRight, ChevronLeft, Calendar, GraduationCap, CircleUserRound } from 'lucide-react';

const Schedule = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [tutors, setTutors] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchSessions();
    fetchEnrollments();
    fetchMeetings();
    fetchStudents();
    fetchTutors();
  },[currentWeek]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const weekStart = startOfWeek(currentWeek);
      const weekEnd = endOfWeek(currentWeek);
      const weekStartString = weekStart.toISOString();
      const weekEndString = weekEnd.toISOString();

      const fetchedSessions = await getAllSessions(weekStartString, weekEndString);
      setSessions(fetchedSessions);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrollments = async () => {
    try {
      console.log('ds')
      const fetchedEnrollments = await getAllEnrollments();
      console.log(fetchedEnrollments)
      console.log('dosajfksaf')
      const validEnrollments = fetchedEnrollments?.filter(enrollment => {
        console.log(enrollment.endDate)
        if (!enrollment.endDate) return true;
        return isAfter(parseISO(enrollment.endDate), new Date());
      });
      if (validEnrollments) {
        setEnrollments(validEnrollments);
      }
    } catch (error) {
      console.error("Failed to fetch enrollments:", error);
      toast.error("Failed to load enrollments");
    }
  };

  const fetchMeetings = async () => {
    try {
      const fetchedMeetings = await getMeetings();
      if (fetchedMeetings) {
        setMeetings(fetchedMeetings);
      }
    } catch (error) {
      console.error("Failed to fetch meetings:", error);
      toast.error("Failed to load meetings");
    }
  };

  const fetchStudents = async () => {
    try {
      const fetchedStudents = await getAllProfiles('Student');
      if (fetchedStudents) {
        setStudents(fetchedStudents);
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
      toast.error("Failed to load students");
    }
  };

  const fetchTutors = async () => {
    try {
      const fetchedTutors = await getAllProfiles('Tutor');
      if (fetchedTutors) {
        setTutors(fetchedTutors);
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
      toast.error("Failed to load students");
    }
  };

  const handleReschedule = async (sessionId: string, newDate: Date) => {
    try {
      const newDateString = newDate.toISOString();
      await rescheduleSession(sessionId, newDateString);
      toast.success("Session rescheduled successfully");
      fetchSessions();
    } catch (error) {
      console.error("Failed to reschedule session:", error);
      toast.error("Failed to reschedule session");
    }
  };

  const handleUpdateWeek = async () => {
    try {
      const weekStart = startOfWeek(currentWeek);
      const weekEnd = endOfWeek(currentWeek);
      
      // Create sessions for all enrollments without checking meeting availability
      const newSessions = await addSessions(
        weekStart.toISOString(), 
        weekEnd.toISOString(), 
        enrollments
      );

      if (!newSessions) {
        throw new Error('No sessions were created');
      }

      // Filter out duplicates
      const existingSessionMap = new Map();
      sessions.forEach(session => {
        if (session?.date) {  // Add null check for date
          const sessionDate = new Date(session.date);
          const key = `${session.student?.id}-${session.tutor?.id}-${isValid(sessionDate) ? format(sessionDate, 'yyyy-MM-dd-HH:mm') : 'invalid-date'}`;
          existingSessionMap.set(key, session);
        }
      });

      const uniqueNewSessions = newSessions.filter(newSession => {
        if (!newSession?.date) return false;  // Skip sessions without dates
        const newSessionDate = new Date(newSession.date);
        const key = `${newSession?.student?.id}-${newSession?.tutor?.id}-${isValid(newSessionDate) ? format(newSessionDate, 'yyyy-MM-dd-HH:mm') : 'invalid-date'}`;
        return !existingSessionMap.has(key);
      });

      setSessions(prevSessions => [...prevSessions, ...uniqueNewSessions]);
      toast.success(`${uniqueNewSessions.length} new sessions added successfully`);
    } catch (error: any) {
      console.error("Failed to add sessions:", error);
      toast.error(`Failed to add sessions. ${error.message}`);
    }
  };

  // Check if a meeting is available (not used in any complete/past session)
  const isMeetingAvailable = (meeting: Meeting) => {
    try {
      const now = new Date();
      return !sessions.some(session => {
        // Skip sessions without dates or meeting IDs
        if (!session?.date || !session?.meeting) return false;
        
        try {
          const sessionEndTime = new Date(session.date);
          sessionEndTime.setHours(sessionEndTime.getHours() + 1.5);
          return (session.status === 'Complete' || sessionEndTime < now) && session.meeting.id === meeting.id;
        } catch (error) {
          console.error("Error processing session date:", error);
          return false;
        }
      });
    } catch (error) {
      console.error("Error checking meeting availability:", error);
      return true; // Default to available if there's an error
    }
  };

  // Filter sessions with valid dates for display
  const getValidSessionsForDay = (day: Date) => {
    return sessions.filter(session => {
      if (!session?.date) return false;
      try {
        return format(parseISO(session.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      } catch (error) {
        console.error("Error filtering session:", error);
        return false;
      }
    });
  };
  
  const handleRemoveSession = async(sessionId:string) => {
    try {
      await removeSession(sessionId)
      setSessions(prevSessions => prevSessions.filter(session => session.id !== sessionId));
      toast.success("Session removed successfully")
    } catch (error) {
      console.error("Failed to remove session",error)
      toast.error("Failed to remove session")
    }
  }

  const handleUpdateSession = async (updatedSession: Session) => {
    try {
      await updateSession(updatedSession);
      toast.success("Session updated successfully");
      setIsModalOpen(false);
      fetchSessions();
    } catch (error) {
      console.error("Failed to update session:", error);
      toast.error("Failed to update session");
    }
  };

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentWeek),
    end: endOfWeek(currentWeek)
  });

  const goToPreviousWeek = () => setCurrentWeek(prevWeek => subWeeks(prevWeek, 1));
  const goToNextWeek = () => setCurrentWeek(prevWeek => addWeeks(prevWeek, 1));

  const getEnrollmentProgress = () => {
    const totalStudents = students.length;
    const studentsThisWeek = new Set(sessions.map(session => session?.student?.id)).size;
    return { totalStudents, studentsThisWeek };
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-left text-gray-800">Schedule</h1>
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" onClick={goToPreviousWeek} className="flex items-center">
            <ChevronLeft className="w-5 h-5 mr-2" /> Previous Week
          </Button>
          <h2 className="text-xl font-semibold text-gray-700">
            {format(weekDays[0], 'MMMM d, yyyy')} - {format(weekDays[6], 'MMMM d, yyyy')}
          </h2>
          <Button variant="outline" onClick={goToNextWeek} className="flex items-center">
            Next Week <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
        
        <Button onClick={handleUpdateWeek} className="mb-4">Update Week</Button>

        {loading ? (
          <div className="text-center py-10">
            <Calendar className="w-10 h-10 animate-spin mx-auto text-blue-500" />
            <p className="mt-4 text-gray-600">Loading sessions...</p>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="border rounded-lg px-2 py-3 bg-gray-50">
                <h3 className="font-semibold mb-2 text-gray-700">{format(day, 'EEEE')}</h3>
                <p className="text-sm mb-4 text-gray-500">{format(day, 'MMM d')}</p>
                {getValidSessionsForDay(day).map(session => (
                    <Card 
                      onClick={() => {
                        setSelectedSession(session);
                        setIsModalOpen(true);
                      }}
                      key={session.id} 
                      className={`hover:cursor-pointer hover:shadow-md mb-2 ${session.status === 'Complete' ? 'bg-green-500/10 border-2' : 'bg-white'}`}
                    >
                      <CardContent className="p-3">
                        <p className="text-xs font-semibold">{session.tutor?.firstName} {session.tutor?.lastName}</p>
                        <p className="text-xs font-normal">{session?.student?.firstName} {session?.student?.lastName}</p>
                        <p className="text-xs text-gray-500">{getSessionTimespan(session.date)}</p>
                        
                        <div className={`text-xs font-medium px-2 py-1 rounded-lg mt-1 border ${session.meeting != null ? 'border-green-300 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {session?.meeting != null && session?.meeting.name != null ? session?.meeting.name  : 'No Meeting Link'}
                        </div>
                        
                        <Button 
                          className="hidden mt-2 w-full text-xs h-6" 
                          onClick={() => {
                            setSelectedSession(session);
                            setIsModalOpen(true);
                          }}
                          variant="outline"
                        >
                          View Details
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                {sessions.filter(session => session?.date && format(parseISO(session.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')).length === 0 && (
                  <p className="text-sm text-gray-400 text-center">No sessions</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-3xl font-bold mb-6 text-left text-gray-800">Enrollment Progress</h3>
        <Card className="mb-6">
          <CardContent className="p-6">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-medium">Total Students:</p>
                <p>{getEnrollmentProgress().totalStudents}</p>
              </div>
              <div>
                <p className="font-medium">Students This Week:</p>
                <p>{getEnrollmentProgress().studentsThisWeek}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session Details</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={selectedSession?.status}
                  onValueChange={(value) => {
                    console.log("Selected value:", value); // Log the selected value
                    if (value) {
                      const updatedSession = { ...selectedSession, status: value };
                      console.log("Updated session:", updatedSession); // Log the updated session
                      setSelectedSession(updatedSession);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {selectedSession?.status ? selectedSession.status : 'Select status'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Complete">Complete</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tutor</Label>
                <Select
                  value={selectedSession.tutor?.id}
                  onValueChange={async (value) => {
                    console.log(value)
                    const selectedTutor = await getProfileWithProfileId(value);
                    if (selectedTutor) {
                      setSelectedSession({ ...selectedSession, tutor: selectedTutor });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {selectedSession.tutor ? `${selectedSession.tutor.firstName} ${selectedSession.tutor.lastName}` : 'Select a tutor'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {tutors.map((tutor) => 
                      tutor.status !== 'Inactive' && (
                        <SelectItem key={tutor.id} value={tutor.id}>
                          {tutor.firstName} {tutor.lastName}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="datetime-local"
                  defaultValue={format(parseISO(selectedSession.date), "yyyy-MM-dd'T'HH:mm")}
                  onChange={(e) => setSelectedSession({...selectedSession, date: new Date(e.target.value).toISOString()})}
                />
              </div>
              <div>
                <Label>Meeting</Label>
                <Select
                  value={selectedSession?.meeting?.id || ''}
                  onValueChange={async (value) => setSelectedSession({...selectedSession, meeting: await getMeeting(value)})}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {selectedSession?.meeting == null || 'Select a meeting'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {meetings.map(meeting => (
                      <SelectItem key={meeting.id} value={meeting.id} className="flex items-center justify-between">
                        <span>{meeting.name} | {meeting.meetingId}</span>
                        <Circle 
                          className={`w-2 h-2 ml-2 ${isMeetingAvailable(meeting) ? 'text-green-500' : 'text-red-500'} fill-current`}
                        />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>
                <div className='flex flex-row justify-between'>
                  <Button onClick={() => handleUpdateSession(selectedSession)}>Update Session</Button>
                  <Button variant='destructive' onClick={() => handleRemoveSession(selectedSession.id)}>Delete Session</Button>
                </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Schedule;