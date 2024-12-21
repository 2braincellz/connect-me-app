// lib/student.actions.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Profile, Session } from '@/types'
import { getProfileWithProfileId } from './user.actions'
import { getMeeting } from './admin.actions'

const supabase = createClientComponentClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});




export async function getStudentSessions(profileId: string, startDate?: string, endDate?: string): Promise<Session[]> {
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
    .eq('student_id', profileId);

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
    meeting: await getMeeting(session.meeting_id),
    status: session.status,
    student: await getProfileWithProfileId(session.student_id),
    tutor: await getProfileWithProfileId(session.tutor_id)
  })));

  return sessions;
}

export async function rescheduleSession(sessionId: string, newDate: string, studentId: string): Promise<void> {
  try {
    // First, get the current session details
    const { data: sessionData, error: sessionError } = await supabase
      .from('Sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      throw sessionError;
    }

    if (sessionData) {
      return sessionData[0];
    }

    // Create a notification for the admin
    const { error: notificationError } = await supabase
      .from('Notifications')
      .insert({
        session_id: sessionId,
        previous_date: sessionData.date,
        suggested_date: newDate,
        student_id: studentId,
        tutor_id: sessionData.tutor_id,
        type: 'RESCHEDULE_REQUEST',
        status: 'PENDING'
      });

    if (notificationError) {
      throw notificationError;
    }

    console.log('Reschedule request notification created successfully');
  } catch (error) {
    console.error('Error creating reschedule request:', error);
    throw error;
  }
}


export async function enrollInSession(studentId: string, sessionId: string) {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .update({ student_id: studentId })
      .eq('id', sessionId)
      .is('student_id', null)  // Ensure the session is not already taken
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error enrolling in session:', error)
    throw error
  }
}

export async function cancelEnrollment(sessionId: string) {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .update({ student_id: null })
      .eq('id', sessionId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error cancelling enrollment:', error)
    throw error
  }
}

export async function getStudentTutor(studentId: string) {
  try {
    const { data, error } = await supabase
      .from('student_tutor_assignments')
      .select(`
        *,
        tutors (*)
      `)
      .eq('student_id', studentId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching student tutor:', error)
    throw error
  }
}

export async function submitFeedback(sessionId: string, feedback: string, rating: number) {
  try {
    const { data, error } = await supabase
      .from('session_feedback')
      .insert({
        session_id: sessionId,
        feedback: feedback,
        rating: rating
      })
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error submitting feedback:', error)
    throw error
  }
}

export async function getStudentProgress(studentId: string) {
  try {
    const { data, error } = await supabase
      .from('student_progress')
      .select('*')
      .eq('student_id', studentId)
      .order('date', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching student progress:', error)
    throw error
  }
}

