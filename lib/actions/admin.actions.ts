// lib/admins.actions.ts

// lib/student.actions.ts
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  Profile,
  Session,
  Notification,
  Event,
  Enrollment,
  Meeting,
} from "@/types";
import { getProfileWithProfileId } from "./user.actions";
import {
  addDays,
  format,
  parse,
  parseISO,
  isBefore,
  isAfter,
  setHours,
  setMinutes,
} from "date-fns"; // Only use date-fns
import ResetPassword from "@/app/(public)/set-password/page";
// import { getMeeting } from "./meeting.actions";

const supabase = createClientComponentClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

/* PROFILES */
export async function getAllProfiles(role: "Student" | "Tutor" | "Admin") {
  try {
    const { data, error } = await supabase
      .from("Profiles")
      .select(
        `
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
      `
      )
      .eq("role", role);

    if (error) {
      console.error("Error fetching profile in Admin Actions:", error.message);
      console.error("Error details:", error);
      return null;
    }

    if (!data) {
      console.log("No profiles found");
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

    console.log("Mapped profile data:", userProfiles);
    return userProfiles;
  } catch (error) {
    console.error("Unexpected error in getProfile:", error);
    return null;
  }
}

export const addStudent = async (
  studentData: Partial<Profile>
): Promise<Profile> => {
  const supabase = createClientComponentClient();

  try {
    console.log(studentData);
    if (!studentData.email) {
      throw new Error("Email is required to create a student profile");
    }

    // Check if a user with this email already exists
    const { data: existingUser, error: userCheckError } = await supabase
      .from("Profiles")
      .select("user_id")
      .eq("email", studentData.email)
      .single();

    if (userCheckError && userCheckError.code !== "PGRST116") {
      // PGRST116 means no rows returned, which is what we want
      throw userCheckError;
    }

    if (existingUser) {
      throw new Error("A user with this email already exists");
    }

    //-----Moved After Duplicate Check to prevent Sending confimration email-----
    const tempPassword = await createPassword();
    const userId = await createUser(studentData.email, tempPassword);

    // Create the student profile without id and createdAt
    const newStudentProfile = {
      user_id: userId,
      role: "Student",
      first_name: studentData.firstName || "",
      last_name: studentData.lastName || "",
      date_of_birth: studentData.dateOfBirth || "",
      start_date: studentData.startDate || new Date().toISOString(),
      availability: studentData.availability || [],
      email: studentData.email,
      parent_name: studentData.parentName || "",
      parent_phone: studentData.parentPhone || "",
      parent_email: studentData.parentEmail || "",
      timezone: studentData.timeZone || "",
      subjects_of_interest: studentData.subjectsOfInterest || [],
      tutor_ids: [], // Changed from tutorIds to tutor_ids
      status: "Active",
    };

    // Add student profile to the database
    const { data: profileData, error: profileError } = await supabase
      .from("Profiles") // Ensure 'profiles' is correctly cased
      .insert(newStudentProfile)
      .select("*");

    if (profileError) throw profileError;

    // Ensure profileData is defined and cast it to the correct type
    if (!profileData) {
      throw new Error("Profile data not returned after insertion");
    }

    // Type assertion to ensure profileData is of type Profile
    const createdProfile: any = profileData;

    // Return the newly created profile data, including autogenerated fields
    return {
      id: createdProfile.id, // Assuming 'id' is the generated key
      createdAt: createdProfile.createdAt, // Assuming 'created_at' is the generated timestamp
      userId: createdProfile.userId, // Adjust based on your schema
      role: createdProfile.role,
      firstName: createdProfile.firstName,
      lastName: createdProfile.lastName,
      dateOfBirth: createdProfile.dateOfBirth,
      startDate: createdProfile.startDate,
      availability: createdProfile.availability,
      email: createdProfile.email,
      parentName: createdProfile.parentName,
      parentPhone: createdProfile.parentPhone,
      parentEmail: createdProfile.parentEmail,
      timeZone: createdProfile.timeZone,
      subjectsOfInterest: createdProfile.subjectsOfInterest,
      tutorIds: createdProfile.tutorIds,
      status: createdProfile.status,
    };
  } catch (error) {
    console.error("Error adding student:", error);
    throw error;
  }
};

export const addTutor = async (
  tutorData: Partial<Profile>
): Promise<Profile> => {
  const supabase = createClientComponentClient();
  try {
    console.log(tutorData);
    if (!tutorData.email) {
      throw new Error("Email is required to create a student profile");
    }

    // Check if a user with this email already exists
    const { data: existingUser, error: userCheckError } = await supabase
      .from("Profiles")
      .select("user_id")
      .eq("email", tutorData.email)
      .single();

    if (userCheckError && userCheckError.code !== "PGRST116") {
      // PGRST116 means no rows returned, which is what we want
      throw userCheckError;
    }

    if (existingUser) {
      throw new Error("A user with this email already exists");
    }

    //-----Moved After Duplicate Check to prevent Sending confimration email-----
    const tempPassword = await createPassword();
    const userId = await createUser(tutorData.email, tempPassword);

    // Create the student profile without id and createdAt
    const newTutorProfile = {
      user_id: userId,
      role: "Tutor",
      first_name: tutorData.firstName || "",
      last_name: tutorData.lastName || "",
      date_of_birth: tutorData.dateOfBirth || "",
      start_date: tutorData.startDate || new Date().toISOString(),
      availability: tutorData.availability || [],
      email: tutorData.email,
      timezone: tutorData.timeZone || "",
      subjects_of_interest: tutorData.subjectsOfInterest || [],
      tutor_ids: [], // Changed from tutorIds to tutor_ids
      status: "Active",
    };

    // Add tutor profile to the database
    const { data: profileData, error: profileError } = await supabase
      .from("Profiles") // Ensure 'profiles' is correctly cased
      .insert(newTutorProfile)
      .select("*");

    if (profileError) throw profileError;

    // Ensure profileData is defined and cast it to the correct type
    if (!profileData) {
      throw new Error("Profile data not returned after insertion");
    }

    // Type assertion to ensure profileData is of type Profile
    const createdProfile: any = profileData;

    // Return the newly created profile data, including autogenerated fields
    return {
      id: createdProfile.id, // Assuming 'id' is the generated key
      createdAt: createdProfile.createdAt, // Assuming 'created_at' is the generated timestamp
      userId: createdProfile.userId, // Adjust based on your schema
      role: createdProfile.role,
      firstName: createdProfile.firstName,
      lastName: createdProfile.lastName,
      dateOfBirth: createdProfile.dateOfBirth,
      startDate: createdProfile.startDate,
      availability: createdProfile.availability,
      email: createdProfile.email,
      parentName: createdProfile.parentName,
      parentPhone: createdProfile.parentPhone,
      parentEmail: createdProfile.parentEmail,
      timeZone: createdProfile.timeZone,
      subjectsOfInterest: createdProfile.subjectsOfInterest,
      tutorIds: createdProfile.tutorIds,
      status: createdProfile.status,
    };
  } catch (error) {
    console.error("Error adding student:", error);
    throw error;
  }
};

export async function deactivateUser(profileId: string) {
  try {
    const { data, error } = await supabase
      .from("Profiles")
      .update({ status: "Inactive" })
      .eq("id", profileId)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error deactivating user:", error);
    throw error;
  }
}

export async function reactivateUser(profileId: string) {
  try {
    const { data, error } = await supabase
      .from("Profiles")
      .update({ status: "Active" })
      .eq("id", profileId)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error reactivating user:", error);
    throw error;
  }
}

/* USERS */
export const createUser = async (
  email: string,
  password: string
): Promise<string | null> => {
  try {
    // Call signUp to create a new user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}`,
      },
    });

    if (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }

    console.log("User created successfully:", data);

    // Return the user ID
    return data?.user?.id || null; // Use optional chaining to safely access id
  } catch (error) {
    console.error("Error creating user:", error);
    return null; // Return null if there was an error
  }
};

/* SESSIONS */
export async function createSession(sessionData: any) {
  const { data, error } = await supabase
    .from("Sessions")
    .insert(sessionData)
    .single();

  if (error) throw error;
  return data;
}

export async function getAllSessions(
  startDate?: string,
  endDate?: string
): Promise<Session[]> {
  let query = supabase.from("Sessions").select(`
      id,
      created_at,
      environment,
      student_id,
      tutor_id,
      date,
      summary,
      meeting_id,
      status
    `);

  if (startDate) {
    query = query.gte("date", startDate);
  }
  if (endDate) {
    query = query.lte("date", endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching student sessions:", error.message);
    throw error;
  }

  // Map the result to the Session interface
  const sessions: Session[] = await Promise.all(
    data.map(async (session: any) => ({
      id: session.id,
      createdAt: session.created_at,
      environment: session.environment,
      date: session.date,
      summary: session.summary,
      // meetingId: session.meeting_id,
      meeting: await getMeeting(session.meeting_id),
      student: await getProfileWithProfileId(session.student_id),
      tutor: await getProfileWithProfileId(session.tutor_id),
      status: session.status,
    }))
  );

  console.log(sessions);

  return sessions;
}

export async function rescheduleSession(sessionId: string, newDate: string) {
  const { data, error } = await supabase
    .from("Sessions")
    .update({ date: newDate })
    .eq("id", sessionId)
    .single();

  if (error) throw error;
  return data;
}

export async function getSessionKeys() {
  const sessionKeys: Set<string> = new Set();

  const { data, error } = await supabase
    .from("Sessions")
    .select("student_id, tutor_id, date");

  if (error) {
    console.error("Error fetching sessions:", error);
    throw error;
  }

  if (!data) return sessionKeys;

  data.forEach((session) => {
    if (session.date) {
      const sessionDate = new Date(session.date);
      const key = `${session.student_id}-${session.tutor_id}-${format(
        sessionDate,
        "yyyy-MM-dd-HH:mm"
      )}`;
      sessionKeys.add(key);
    }
  });

  return sessionKeys;
}

export async function addSessions(
  weekStartString: string,
  weekEndString: string,
  enrollments: Enrollment[]
) {
  const weekStart = parseISO(weekStartString);
  const weekEnd = parseISO(weekEndString);
  const sessions: Session[] = [];

  // const scheduledSessions: Set<string> = new Set();
  // ! Fixed issue with duplicate sessions created and shown in the schedule
  const scheduledSessions: Set<string> = await getSessionKeys(); //!

  for (const enrollment of enrollments) {
    const { student, tutor, availability } = enrollment;

    if (!student || !tutor) continue;

    for (const avail of availability) {
      const { day, startTime, endTime } = avail;

      if (!startTime || startTime.includes("-")) {
        console.error(`Invalid time format for availability: ${startTime}`);
        console.log('Errored Enrollment', enrollment)
        continue;
      }

      const [availStart, availEnd] = [startTime, endTime];

      if (!availStart || !availEnd) {
        console.error(
          `Invalid start or end time: start=${availStart}, end=${availEnd}`
        );
        continue;
      }

      let sessionDate = new Date(weekStart);
      while (sessionDate <= weekEnd) {
        if (format(sessionDate, "EEEE").toLowerCase() === day.toLowerCase()) {
          const availStartTime = parse(
            availStart.toLowerCase(),
            "HH:mm",
            sessionDate
          );
          const availEndTime = parse(
            availEnd.toLowerCase(),
            "HH:mm",
            sessionDate
          );

          if (
            isNaN(availStartTime.getTime()) ||
            isNaN(availEndTime.getTime())
          ) {
            console.error(
              `Invalid parsed time: start=${availStart}, end=${availEnd}`
            );
            break;
          }

          const sessionStartTime = setMinutes(
            setHours(sessionDate, availStartTime.getHours()),
            availStartTime.getMinutes()
          );
          const sessionEndTime = setMinutes(
            setHours(sessionDate, availEndTime.getHours()),
            availEndTime.getMinutes()
          );

          if (
            isBefore(sessionStartTime, weekStart) ||
            isAfter(sessionEndTime, weekEnd)
          ) {
            sessionDate = addDays(sessionDate, 1);
            continue;
          }

          // Check for duplicates
          const sessionKey = `${student.id}-${tutor.id}-${format(
            sessionStartTime,
            "yyyy-MM-dd-HH:mm"
          )}`;
          if (scheduledSessions.has(sessionKey)) {
            console.warn(`Duplicate session detected: ${sessionKey}`);
            sessionDate = addDays(sessionDate, 1);
            continue;
          }

          console.log(enrollment);

          const { data: session, error } = await supabase
            .from("Sessions")
            .insert({
              date: sessionStartTime.toISOString(),
              student_id: student.id,
              tutor_id: tutor.id,
              status: "Active",
              summary: enrollment.summary,
              meeting_id: enrollment.meetingId || null, //TODO: invalid uuid input syntax, uuid doesn't take ""
            })
            .single();

          if (error) {
            console.error("Error creating session:", error);
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
  // const { id, status, tutor, student, date, meetingId } = updatedSession;
  const { id, status, tutor, student, date, meeting } = updatedSession;

  console.log(id);
  console.log(status);
  console.log(meeting);

  const { data, error } = await supabase
    .from("Sessions")
    .update({
      status: status,
      student_id: student?.id,
      tutor_id: tutor?.id,
      date: date,
      // meeting_id: meetingId,
      // meeting: meeting,
      meeting_id: meeting?.id,
    })
    .eq("id", id);
  console.log("UPDATING...");

  if (error) {
    console.error("Error updating session:", error);
    return null;
  }

  if (data) {
    console.log(data[0]);
    return data[0];
  } else {
    console.error("NO DATA");
  }
}

export async function removeSession(sessionId: string) {
  // Create a notification for the admin
  const { error: eventError } = await supabase
    .from("Sessions")
    .delete()
    .eq("id", sessionId);

  console.log(sessionId);

  if (eventError) {
    throw eventError;
  }
}

/* MEETINGS */
export async function getMeetings(): Promise<Meeting[] | null> {
  try {
    // Fetch meeting details from Supabase
    const { data, error } = await supabase.from("Meetings").select(`
        id,
        link,
        meeting_id,
        password,
        created_at,
        name
      `);

    // Check for errors and log them
    if (error) {
      console.error("Error fetching event details:", error.message);
      return null; // Returning null here is valid since the function returns Promise<Notification[] | null>
    }

    // Check if data exists
    if (!data) {
      console.log("No events found:");
      return null; // Valid return
    }

    // Mapping the fetched data to the Notification object
    const meetings: Meeting[] = await Promise.all(
      data.map(async (meeting: any) => ({
        id: meeting.id,
        name: meeting.name,
        meetingId: meeting.meeting_id,
        password: meeting.password,
        link: meeting.link,
        createdAt: meeting.created_at,
        // name: meeting.name,
      }))
    );

    return meetings; // Return the array of notifications
  } catch (error) {
    console.error("Unexpected error in getMeeting:", error);
    return null; // Valid return
  }
}

/* ENROLLMENTS */
export async function getAllEnrollments(): Promise<Enrollment[] | null> {
  try {
    // Fetch meeting details from Supabase
    const { data, error } = await supabase.from("Enrollments").select(`
        id,
        created_at,
        summary,
        student_id,
        tutor_id,
        start_date,
        end_date,
        availability,
        meetingId
      `);

    // Check for errors and log them
    if (error) {
      console.error("Error fetching event details:", error.message);
      return null; // Returning null here is valid since the function returns Promise<Notification[] | null>
    }

    // Check if data exists
    if (!data) {
      console.log("No events found:");
      return null; // Valid return
    }

    // Mapping the fetched data to the Notification object
    const enrollments: Enrollment[] = await Promise.all(
      data.map(async (enrollment: any) => ({
        createdAt: enrollment.created_at,
        id: enrollment.id,
        summary: enrollment.summary,
        student: await getProfileWithProfileId(enrollment.student_id),
        tutor: await getProfileWithProfileId(enrollment.tutor_id),
        startDate: enrollment.start_date,
        endDate: enrollment.end_date,
        availability: enrollment.availability,
        meetingId: enrollment.meetingId,
      }))
    );

    console.log(data[0].student_id);

    return enrollments; // Return the array of enrollments
  } catch (error) {
    console.error("Unexpected error in getMeeting:", error);
    return null;
  }
}

export async function getMeeting(id: string): Promise<Meeting | null> {
  try {
    // Fetch meeting details from Supabase
    const { data, error } = await supabase
      .from("Meetings")
      .select(
        `
        id,
        link,
        meeting_id,
        password,
        created_at,
        name
      `
      )
      .eq("id", id)
      .single();

    // Check for errors and log them
    if (error) {
      console.error("Error fetching event details:", error.message);
      return null; // Returning null here is valid since the function returns Promise<Notification[] | null>
    }
    // Check if data exists
    if (!data) {
      console.log("No events found:");
      return null; // Valid return
    }
    // Mapping the fetched data to the Notification object
    const meeting: Meeting = {
      id: data.id,
      name: data.name,
      meetingId: data.meeting_id,
      password: data.password,
      link: data.link,
      createdAt: data.created_at,
    };
    console.log(meeting);
    return meeting; // Return the array of notifications
  } catch (error) {
    console.error("Unexpected error in getMeeting:", error);
    return null; // Valid return
  }
}

export const updateEnrollment = async (enrollment: Enrollment) => {
  const { data, error } = await supabase
    .from("Enrollments")
    .update({
      student_id: enrollment.student?.id,
      tutor_id: enrollment.tutor?.id,
      summary: enrollment.summary,
      start_date: enrollment.startDate,
      end_date: enrollment.endDate,
      availability: enrollment.availability,
      meetingId: enrollment.meetingId,
    })
    .eq("id", enrollment.id)
    .select("*") // Ensure it selects all columns
    .single(); // Ensure only one object is returned

  if (error) {
    console.error("Error updating enrollment:", error);
    throw error;
  }

  return data;
};

export const addEnrollment = async (
  enrollment: Omit<Enrollment, "id" | "createdAt">
) => {
  console.log(enrollment);
  const { data, error } = await supabase
    .from("Enrollments")
    .insert({
      student_id: enrollment.student?.id,
      tutor_id: enrollment.tutor?.id,
      summary: enrollment.summary,
      start_date: enrollment.startDate,
      end_date: enrollment.endDate,
      availability: enrollment.availability,
      meetingId: enrollment.meetingId,
    })
    .select(`*`)
    .single();

  if (error) {
    console.error("Error adding enrollment:", error);
    throw error;
  }

  console.log(data);

  return {
    createdAt: data.created_at,
    id: data.id,
    summary: data.summary,
    student: await getProfileWithProfileId(data.student_id),
    tutor: await getProfileWithProfileId(data.tutor_id),
    startDate: data.start_date,
    endDate: data.end_date,
    availability: data.availability,
    meetingId: data.meetingId,
  };
};

export const removeEnrollment = async (enrollmentId: string) => {
  const { data, error } = await supabase
    .from("Enrollments")
    .delete()
    .eq("id", enrollmentId);

  if (error) {
    console.error("Error removing enrollment:", error);
    throw error;
  }

  return data;
};

/* EVENTS */
export async function getEvents(tutorId: string): Promise<Event[] | null> {
  try {
    // Fetch meeting details from Supabase
    const { data, error } = await supabase
      .from("Events")
      .select(
        `
        id,
        created_at,
        date,
        summary,
        tutor_id,
        hours
      `
      )
      .eq("tutor_id", tutorId);

    // Check for errors and log them
    if (error) {
      console.error("Error fetching event details:", error.message);
      return null; // Returning null here is valid since the function returns Promise<Notification[] | null>
    }

    // Check if data exists
    if (!data) {
      console.log("No events found:");
      return null; // Valid return
    }

    // Mapping the fetched data to the Notification object
    const events: Event[] = await Promise.all(
      data.map(async (event: any) => ({
        createdAt: event.created_at,
        id: event.id,
        summary: event.summary,
        tutorId: event.tutor_id,
        date: event.date,
        hours: event.hours,
      }))
    );

    return events; // Return the array of notifications
  } catch (error) {
    console.error("Unexpected error in getMeeting:", error);
    return null; // Valid return
  }
}

export async function getEventsWithTutorMonth(
  tutorId: string,
  selectedMonth: string
): Promise<Event[] | null> {
  try {
    // Fetch event details filtered by tutor IDs and selected month
    const { data, error } = await supabase
      .from("Events")
      .select(
        `
        id,
        created_at,
        date,
        summary,
        tutor_id,
        hours
      `
      )
      .eq("tutor_id", tutorId) // Filter by tutor IDs
      .gte("date", selectedMonth) // Filter events from the start of the selected month
      .lt(
        "date",
        new Date(
          new Date(selectedMonth).setMonth(
            new Date(selectedMonth).getMonth() + 1
          )
        ).toISOString()
      ); // Filter before the start of the next month

    // Check for errors and log them
    if (error) {
      console.error("Error fetching event details:", error.message);
      return null;
    }

    // Check if data exists
    if (!data) {
      console.log("No events found:");
      return null;
    }

    // Map the fetched data to the Event object
    const events: Event[] = data.map((event: any) => ({
      createdAt: event.created_at,
      id: event.id,
      summary: event.summary,
      tutorId: event.tutor_id,
      date: event.date,
      hours: event.hours,
    }));

    return events; // Return the array of events
  } catch (error) {
    console.error("Unexpected error in getEventsWithTutorMonth:", error);
    return null;
  }
}

export async function createEvent(event: Event) {
  // Create a notification for the admin
  const { error: eventError } = await supabase.from("Events").insert({
    date: event.date,
    summary: event.summary,
    tutor_id: event.tutorId,
    hours: event.hours,
  });

  if (eventError) {
    throw eventError;
  }
}

export async function removeEvent(eventId: string) {
  // Create a notification for the admin
  const { error: eventError } = await supabase
    .from("Events")
    .delete()
    .eq("id", eventId);

  if (eventError) {
    throw eventError;
  }
}

/* NOTIFICATIONS */
export async function getAllNotifications(): Promise<Notification[] | null> {
  try {
    // Fetch meeting details from Supabase
    const { data, error } = await supabase.from("Notifications").select(`
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
      console.error("Error fetching notification details:", error.message);
      return null; // Returning null here is valid since the function returns Promise<Notification[] | null>
    }

    // Check if data exists
    if (!data) {
      console.log("No notifications found:");
      return null; // Valid return
    }

    // Mapping the fetched data to the Notification object
    const notifications: Notification[] = await Promise.all(
      data.map(async (notification: any) => ({
        createdAt: notification.created_at,
        id: notification.id,
        summary: notification.summary,
        sessionId: notification.session_id,
        previousDate: notification.previous_date,
        suggestedDate: notification.suggested_date,
        student: await getProfileWithProfileId(notification.student_id),
        tutor: await getProfileWithProfileId(notification.tutor_id),
        status: notification.status,
      }))
    );

    return notifications; // Return the array of notifications
  } catch (error) {
    console.error("Unexpected error in getMeeting:", error);
    return null; // Valid return
  }
}

export const updateNotification = async (
  notificationId: string,
  status: "Active" | "Resolved"
) => {
  try {
    const { data, error } = await supabase
      .from("Notifications") // Adjust this table name to match your database
      .update({ status: status }) // Update the status field
      .eq("id", notificationId); // Assuming `id` is the primary key for the notifications table

    if (error) {
      throw error; // Handle the error as needed
    }

    return data; // Return the updated notification data or whatever is needed
  } catch (error) {
    console.error("Error updating notification:", error);
    throw new Error("Failed to update notification");
  }
};

export async function createPassword(): Promise<string> {
  let password = "";

  for (let i = 0; i < 10; ++i) {
    password += Math.floor(Math.random() * 10);
  }

  return password;
}
