// lib/admins.actions.ts

// lib/student.actions.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Profile, Session, Notification, Event, Enrollment, Meeting } from '@/types'
import { getProfileWithProfileId } from './user.actions'
import { addDays, format, parse, parseISO, isBefore, isAfter, setHours, setMinutes } from 'date-fns'; // Only use date-fns
import {generateTempPassword} from '@/lib/utils'


const supabase = createClientComponentClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});


/* PROFILES */
export async function getAllProfiles(role:'Student'|'Tutor'|'Admin') {
  try {
    const { data, error } = await supabase
      .from('Profiles')
      .select(`
        id,
        created_at,
        role,
        user_id,
        first_name,
        last_name,
        date_of_birth,
        start_date,
        availability,
        email,
        parent_name,
        parent_phone,
        parent_email,
        tutor_ids,
        timezone,
        subjects_of_interest,
        status
      `)
      .eq("role",role);

    if (error) {
      console.error('Error fetching profile in Admin Actions:', error.message);
      console.error('Error details:', error);
      return null;
    }

    if (!data) {
      console.log('No profiles found');
      return null;
    }

  // Mapping the fetched data to the Profile object
  const userProfiles: Profile[] = data.map((profile: any) => ({
    id: profile.id,
    createdAt: profile.created_at,
    role: profile.role,
    userId: profile.user_id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    dateOfBirth: profile.date_of_birth,
    startDate: profile.start_date,
    availability: profile.availability,
    email: profile.email,
    parentName: profile.parent_name,
    parentPhone: profile.parent_phone,
    parentEmail: profile.parent_email,
    tutorIds: profile.tutor_ids,
    timeZone: profile.timezone,
    subjectsOfInterest: profile.subjects_of_interest,
    status: profile.status,
  }));


    console.log('Mapped profile data:', userProfiles);
    return userProfiles;
  } catch (error) {
    console.error('Unexpected error in getProfile:', error);
    return null;
  }
}

export const sendConfirmationEmail = async (email: string, tempPassword: string): Promise<void> => {
  const supabase = createClientComponentClient();

  try {
    const { error } = await supabase.auth.signUp({
      email: email,
      password: tempPassword,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
      }
    });

    console.log(email)

    if (error) {
      console.error('Error sending confirmation email:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in sendConfirmationEmail:', error);
    throw error;
  }
};

export const addUser = async (profile: Partial<Profile>, role: string): Promise<Profile> => {
  const supabase = createClientComponentClient();
  try {
    if (!profile.email) {
      throw new Error('Email is required to create a student profile');
    }

    // Generate temp password
    const tempPasswordInput = profile?.lastName || profile?.email + Date.now();
    const tempPassword = await generateTempPassword(tempPasswordInput);
    
    
    // Create user with email confirmation
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: profile.email,
      password: tempPassword,
      options: {
        data: {
          role: role,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (signUpError) {
      console.error('Error in signup:', signUpError);
      throw signUpError;
    }

    if (!authData.user?.id) {
      throw new Error('No user ID returned from signup');
    }

    // If the email wasn't sent successfully, try resending it
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: profile.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (resendError) {
        console.error('Error resending confirmation:', resendError);
      }
    }

    console.log('User created and confirmation email sent');

    // Create the student profile
    const newProfile = {
      user_id: authData.user.id,
      role: 'Student',
      first_name: profile.firstName || '',
      last_name: profile.lastName || '',
      date_of_birth: profile.dateOfBirth || '',
      start_date: profile.startDate || new Date().toISOString(),
      availability: profile.availability || [],
      email: profile.email,
      parent_name: profile.parentName || '',
      parent_phone: profile.parentPhone || '',
      parent_email: profile.parentEmail || '',
      timezone: profile.timeZone || '',
      subjects_of_interest: profile.subjectsOfInterest || [],
      tutor_ids: [],
      status: 'Active',
    };

    const { data: profileData, error: profileError } = await supabase
      .from('Profiles')
      .insert([newProfile])
      .select('*')
      .single();

    if (profileError) {
      console.error('Error creating profile:', profileError);
      throw profileError;
    }

    if (!profileData) {
      throw new Error('Profile data not returned after insertion');
    }

    return {
      id: profileData.id,
      createdAt: profileData.created_at,
      userId: profileData.user_id,
      role: profileData.role,
      firstName: profileData.first_name,
      lastName: profileData.last_name,
      dateOfBirth: profileData.date_of_birth,
      startDate: profileData.start_date,
      availability: profileData.availability,
      email: profileData.email,
      parentName: profileData.parent_name,
      parentPhone: profileData.parent_phone,
      parentEmail: profileData.parent_email,
      timeZone: profileData.timezone,
      subjectsOfInterest: profileData.subjects_of_interest,
      tutorIds: profileData.tutor_ids,
      status: profileData.status,
    };
  } catch (error) {
    console.error('Error adding student:', error);
    throw error;
  }
};


export async function deactivateUser(profileId: string) {
  try {
    const { data, error } = await supabase
      .from('Profiles')
      .update({ status: 'Inactive' })
      .eq('id', profileId)
      .select('*')
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error deactivating user:', error)
    throw error
  }
}

export async function reactivateUser(profileId: string) {
  try {
    const { data, error } = await supabase
      .from('Profiles')
      .update({ status: 'Active' })
      .eq('id', profileId)
      .select('*')
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error reactivating user:', error)
    throw error
  }
}

/* USERS */
export const createUser = async (email: string,password:string): Promise<string | null> => {
  try {
    // Call signUp to create a new user
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }

    console.log('User created successfully:', data);

    // Return the user ID
    return data?.user?.id || null; // Use optional chaining to safely access id
  } catch (error) {
    console.error('Error creating user:', error);
    return null; // Return null if there was an error
  }
};


/* SESSIONS */
export async function createSession(sessionData: any) {
  const { data, error } = await supabase
    .from('Sessions')
    .insert(sessionData)
    .single()

  if (error) throw error
  return data
}

export async function getAllSessions(startDate?: string, endDate?: string): Promise<Session[]> {
  let query = supabase
    .from('Sessions')
    .select(`
      id,
      created_at,
      environment,
      student_id,
      tutor_id,
      date,
      summary,
      meeting_id,
      status
    `)

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching student sessions:', error.message);
    throw error;
  }

  // Map the result to the Session interface
  const sessions: Session[] = await Promise.all(data.map(async (session: any) => ({
    id: session.id,
    createdAt: session.created_at,
    environment: session.environment,
    date: session.date,
    summary: session.summary,
    meetingId: session.meeting_id,
    student: await getProfileWithProfileId(session.student_id),
    tutor: await getProfileWithProfileId(session.tutor_id),
    status:session.status
  })));

  return sessions;
}

export async function rescheduleSession(sessionId: string, newDate: string) {
  const { data, error } = await supabase
    .from('Sessions')
    .update({ date: newDate })
    .eq('id', sessionId)
    .single()

  if (error) throw error
  return data
}

export async function addSessions(
  weekStartString: string,
  weekEndString: string,
  enrollments: Enrollment[],
) {
  const weekStart = parseISO(weekStartString);
  const weekEnd = parseISO(weekEndString);
  const sessions: Session[] = [];
  const scheduledSessions: Set<string> = new Set();

  for (const enrollment of enrollments) {
    const { student, tutor, availability } = enrollment;

    if (!student || !tutor) continue;

    for (const avail of availability) {
      const { day, startTime, endTime } = avail;

      if (!startTime || startTime.includes('-')) {
        console.error(`Invalid time format for availability: ${startTime}`);
        continue;
      }

      const [availStart, availEnd] = [startTime, endTime];

      if (!availStart || !availEnd) {
        console.error(`Invalid start or end time: start=${availStart}, end=${availEnd}`);
        continue;
      }

      let sessionDate = new Date(weekStart);
      while (sessionDate <= weekEnd) {
        if (format(sessionDate, 'EEEE').toLowerCase() === day.toLowerCase()) {
          const availStartTime = parse(availStart.toLowerCase(), 'HH:mm', sessionDate);
          const availEndTime = parse(availEnd.toLowerCase(), 'HH:mm', sessionDate);

          if (isNaN(availStartTime.getTime()) || isNaN(availEndTime.getTime())) {
            console.error(`Invalid parsed time: start=${availStart}, end=${availEnd}`);
            break;
          }

          const sessionStartTime = setMinutes(setHours(sessionDate, availStartTime.getHours()), availStartTime.getMinutes());
          const sessionEndTime = setMinutes(setHours(sessionDate, availEndTime.getHours()), availEndTime.getMinutes());

          if (isBefore(sessionStartTime, weekStart) || isAfter(sessionEndTime, weekEnd)) {
            sessionDate = addDays(sessionDate, 1);
            continue;
          }

          // Check for duplicates
          const sessionKey = `${student.id}-${tutor.id}-${format(sessionStartTime, 'yyyy-MM-dd-HH:mm')}`;
          if (scheduledSessions.has(sessionKey)) {
            console.warn(`Duplicate session detected: ${sessionKey}`);
            sessionDate = addDays(sessionDate, 1);
            continue;
          }

          // Create session without requiring a meeting link
          const { data: session, error } = await supabase
            .from('Sessions')
            .insert({
              date: sessionStartTime.toISOString(),
              student_id: student.id,
              tutor_id: tutor.id,
              status: 'Active',
              summary: enrollment.summary,
            })
            .single();

          if (error) {
            console.error('Error creating session:', error);
            continue;
          }

          sessions.push(session);
          scheduledSessions.add(sessionKey);
        }
        sessionDate = addDays(sessionDate, 1);
      }
    }
  }

  return sessions;
}

// Function to update a session
export async function updateSession(updatedSession: Session) {
  const { id, status, tutor, student, date, meetingId } = updatedSession;

  const { data, error } = await supabase
    .from('Sessions')
    .update({
      status: status,
      student_id: student?.id,
      tutor_id: tutor?.id,
      date: date,
      meeting_id: meetingId
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating session:', error);
    return null;
  }

  if (data) {
    return data[0];
  }
}

export async function removeSession(sessionId:string) {
  // Create a notification for the admin
  const { error: eventError } = await supabase
  .from('Sessions')
  .delete()
  .eq('id',sessionId)

if (eventError) {
  throw eventError;
}
}

/* MEETINGS */
export async function getMeetings(): Promise<Meeting[] | null> {
  try {
    // Fetch meeting details from Supabase
    const { data, error } = await supabase
      .from('Meetings')
      .select(`
        id,
        link,
        meeting_id,
        password,
        created_at
      `)
    
    // Check for errors and log them
    if (error) {
      console.error('Error fetching event details:', error.message);
      return null; // Returning null here is valid since the function returns Promise<Notification[] | null>
    }

    // Check if data exists
    if (!data) {
      console.log('No events found:');
      return null; // Valid return
    }

    // Mapping the fetched data to the Notification object
    const meetings: Meeting[] = await Promise.all(data.map(async (meeting: any) => ({
      id: meeting.id,
      meetingId:meeting.meeting_id,
      password:meeting.password,
      link:meeting.link,
      createdAt:meeting.created_at
    })));

    return meetings; // Return the array of notifications
  } catch (error) {
    console.error('Unexpected error in getMeeting:', error);
    return null; // Valid return
  }
}


/* ENROLLMENTS */
export async function getAllEnrollments(): Promise<Enrollment[] | null> {
  try {
    // Fetch meeting details from Supabase
    const { data, error } = await supabase
      .from('Enrollments')
      .select(`
        id,
        created_at,
        summary,
        student_id,
        tutor_id,
        start_date,
        end_date,
        availability
      `)
    
    // Check for errors and log them
    if (error) {
      console.error('Error fetching event details:', error.message);
      return null; // Returning null here is valid since the function returns Promise<Notification[] | null>
    }

    // Check if data exists
    if (!data) {
      console.log('No events found:');
      return null; // Valid return
    }

    // Mapping the fetched data to the Notification object
    const enrollments: Enrollment[] = await Promise.all(data.map(async (enrollment: any) => ({
      createdAt: enrollment.created_at,
      id: enrollment.id,
      summary: enrollment.summary,
      student: await getProfileWithProfileId(enrollment.student_id),
      tutor: await getProfileWithProfileId(enrollment.tutor_id),
      startDate:enrollment.start_date,
      endDate:enrollment.end_date,
      availability: enrollment.availability
    })));

    console.log(data[0].student_id)

    return enrollments; // Return the array of enrollments
  } catch (error) {
    console.error('Unexpected error in getMeeting:', error);
    return null
  }
}

export const updateEnrollment = async (enrollment: Enrollment) => {
  const { data, error } = await supabase
    .from('Enrollments')
    .update({
      student_id: enrollment.student?.id,
      tutor_id: enrollment.tutor?.id,
      summary: enrollment.summary,
      start_date: enrollment.startDate,
      end_date: enrollment.endDate,
      availability: enrollment.availability,
    })
    .eq('id', enrollment.id)
    .select('*')  // Ensure it selects all columns
    .single();    // Ensure only one object is returned

  if (error) {
    console.error('Error updating enrollment:', error);
    throw error;
  }

  return data;
};


export const addEnrollment = async (enrollment: Omit<Enrollment, 'id' | 'createdAt'>) => {
  console.log(enrollment)
  const { data, error } = await supabase
    .from('Enrollments')
    .insert({
      student_id: enrollment.student?.id,
      tutor_id: enrollment.tutor?.id,
      summary: enrollment.summary,
      start_date: enrollment.startDate,
      end_date: enrollment.endDate,
      availability: enrollment.availability,
    })
    .select(`*`)
    .single()

  if (error) {
    console.error('Error adding enrollment:', error);
    throw error;
  }

  console.log(data)

  return {
    createdAt: data.created_at,
    id: data.id,
    summary: data.summary,
    student: await getProfileWithProfileId(data.student_id),
    tutor: await getProfileWithProfileId(data.tutor_id),
    startDate:data.start_date,
    endDate:data.end_date,
    availability: data.availability
  }
};

export const removeEnrollment = async (enrollmentId: string) => {
  const { data, error } = await supabase
    .from('Enrollments')
    .delete()
    .eq('id', enrollmentId);

  if (error) {
    console.error('Error removing enrollment:', error);
    throw error;
  }

  return data;
};


/* EVENTS */
export async function getEvents(tutorId:string): Promise<Event[] | null> {
  try {
    // Fetch meeting details from Supabase
    const { data, error } = await supabase
      .from('Events')
      .select(`
        id,
        created_at,
        date,
        summary,
        tutor_id,
        hours
      `)
      .eq("tutor_id",tutorId)
    
    // Check for errors and log them
    if (error) {
      console.error('Error fetching event details:', error.message);
      return null; // Returning null here is valid since the function returns Promise<Notification[] | null>
    }

    // Check if data exists
    if (!data) {
      console.log('No events found:');
      return null; // Valid return
    }

    // Mapping the fetched data to the Notification object
    const events: Event[] = await Promise.all(data.map(async (event: any) => ({
      createdAt: event.created_at,
      id: event.id,
      summary: event.summary,
      tutorId: event.tutor_id,
      date:event.date,
      hours:event.hours
    })));

    return events; // Return the array of notifications
  } catch (error) {
    console.error('Unexpected error in getMeeting:', error);
    return null; // Valid return
  }
}

export async function getEventsWithTutorMonth(tutorId:string, selectedMonth: string): Promise<Event[] | null> {
  try {
    // Fetch event details filtered by tutor IDs and selected month
    const { data, error } = await supabase
      .from('Events')
      .select(`
        id,
        created_at,
        date,
        summary,
        tutor_id,
        hours
      `)
      .eq('tutor_id', tutorId) // Filter by tutor IDs
      .gte('date', selectedMonth) // Filter events from the start of the selected month
      .lt('date', new Date(new Date(selectedMonth).setMonth(new Date(selectedMonth).getMonth() + 1)).toISOString()); // Filter before the start of the next month
    
    // Check for errors and log them
    if (error) {
      console.error('Error fetching event details:', error.message);
      return null;
    }

    // Check if data exists
    if (!data) {
      console.log('No events found:');
      return null;
    }

    // Map the fetched data to the Event object
    const events: Event[] = data.map((event: any) => ({
      createdAt: event.created_at,
      id: event.id,
      summary: event.summary,
      tutorId: event.tutor_id,
      date: event.date,
      hours:event.hours
    }));

    return events; // Return the array of events
  } catch (error) {
    console.error('Unexpected error in getEventsWithTutorMonth:', error);
    return null;
  }
}

export async function createEvent(event:Event) {
      // Create a notification for the admin
      const { error: eventError } = await supabase
      .from('Events')
      .insert({
        date: event.date,
        summary:event.summary,
        tutor_id:event.tutorId,
        hours:event.hours
      });

    if (eventError) {
      throw eventError;
    }
}

export async function removeEvent(eventId:string) {
  // Create a notification for the admin
  const { error: eventError } = await supabase
  .from('Events')
  .delete()
  .eq('id',eventId)

if (eventError) {
  throw eventError;
}
}


/* NOTIFICATIONS */
export async function getAllNotifications(): Promise<Notification[] | null> {
  try {
    // Fetch meeting details from Supabase
    const { data, error } = await supabase
      .from('Notifications')
      .select(`
        id,
        created_at,
        session_id,
        previous_date,
        suggested_date,
        tutor_id,
        student_id,
        status,
        summary
      `);
    
    // Check for errors and log them
    if (error) {
      console.error('Error fetching notification details:', error.message);
      return null; // Returning null here is valid since the function returns Promise<Notification[] | null>
    }

    // Check if data exists
    if (!data) {
      console.log('No notifications found:');
      return null; // Valid return
    }

    // Mapping the fetched data to the Notification object
    const notifications: Notification[] = await Promise.all(data.map(async (notification: any) => ({
      createdAt: notification.created_at,
      id: notification.id,
      summary: notification.summary,
      sessionId: notification.session_id,
      previousDate: notification.previous_date,
      suggestedDate: notification.suggested_date,
      student: await getProfileWithProfileId(notification.student_id),
      tutor: await getProfileWithProfileId(notification.tutor_id),
      status: notification.status
    })));

    return notifications; // Return the array of notifications
  } catch (error) {
    console.error('Unexpected error in getMeeting:', error);
    return null; // Valid return
  }
}

export const updateNotification = async (notificationId: string, status: 'Active' | 'Resolved') => {
  try {
      const { data, error } = await supabase
          .from('Notifications') // Adjust this table name to match your database
          .update({ status: status }) // Update the status field
          .eq('id', notificationId); // Assuming `id` is the primary key for the notifications table

      if (error) {
          throw error; // Handle the error as needed
      }

      return data; // Return the updated notification data or whatever is needed
  } catch (error) {
      console.error('Error updating notification:', error);
      throw new Error('Failed to update notification');
  }
};
