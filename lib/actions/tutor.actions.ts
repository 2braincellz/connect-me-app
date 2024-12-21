// lib/tutors.actions.ts

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Profile, Session } from '@/types'
import { getProfileWithProfileId } from './user.actions'
import { getMeeting } from './admin.actions'

const supabase = createClientComponentClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

export async function getTutorSessions(profileId: string, startDate?: string, endDate?: string): Promise<Session[]> {
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
      meeting_id
    `)
    .eq('tutor_id', profileId);

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
    student: await getProfileWithProfileId(session.student_id),
    tutor: await getProfileWithProfileId(session.tutor_id),
    status: session.status
  })));

  return sessions;
}


export async function getTutorStudents(tutorId: string) {
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
      .contains('tutor_ids', [tutorId]);

    if (error) {
      console.error('Error fetching profile in Tutor Actions:', error.message);
      console.error('Error details:', error);
      return null;
    }

    if (!data) {
      console.log('No profile found for tutor ID:', tutorId);
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



export async function rescheduleSession(sessionId: string, newDate: any) {
  console.log(sessionId)
  const { data, error } = await supabase
    .from('Sessions')
    .update({ date: newDate })
    .eq('id', sessionId)
    .select('*')
    .single()

  if (error) throw error
  if (data) {
    return data[0];
  }

  console.log(data)
}


export async function cancelSession(sessionId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .update({ status: 'CANCELLED' })
    .eq('id', sessionId)
    .single()

  if (error) throw error
  return data
}

export async function addSessionNotes(sessionId: string, notes: string) {
  const { data, error } = await supabase
    .from('sessions')
    .update({ notes: notes })
    .eq('id', sessionId)
    .single()

  if (error) throw error
  return data
}





export async function logSessionAttendance(sessionId: string, attended: boolean) {
  const { data, error } = await supabase
    .from('Sessions')
    .update({ attended: attended })
    .eq('id', sessionId)
    .single()

  if (error) throw error
  return data
}