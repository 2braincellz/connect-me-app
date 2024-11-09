import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const getData = async (endpoint:any) => {
  const response = await fetch(`/${endpoint}`, {
    method: "",
  });
  const data = await response.json();

  return data;
};

export const postData = async (endpoint:any, body:any) => {
  const allHeaders = { "Content-Type": "application/json" };

  const response = await fetch(`/${endpoint}`, {
    method: "POST",
    headers: allHeaders,
    body: JSON.stringify(body),
  });
  
  console.log(response, 'GIOFAJIOAFD')
  const data = await response.json();
  console.log(data, 'GIOFAJIOAFD')
  return data;
};


export function formatSessionDate(dateString: string): string {
  // Create a new Date object
  const date: Date = new Date(dateString);
  
  // Define options for formatting
  const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',  // Can be 'short' or 'numeric' for different formats
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      timeZoneName: 'short'  // To include time zone information
  };
  
  // Format the date using toLocaleDateString
  return date.toLocaleDateString('en-US', options);
}

export function formatDate(dateString: string): string {
  // Create a new Date object
  const date: Date = new Date(dateString);
  
  // Define options for formatting
  const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',  // Can be 'short' or 'numeric' for different formats
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      timeZoneName: 'short'  // To include time zone information
  };
  
  // Format the date using toLocaleDateString
  return date.toLocaleDateString('en-US', options);
}

export function getSessionTimespan(timeStr: string): string {
    // Parse the input string into a Date object
    const originalTime = new Date(timeStr);

    // Check if the date is valid
    if (isNaN(originalTime.getTime())) {
        throw new Error("Invalid date format: " + timeStr);
    }

    // Add 1.5 hours (1 hour and 30 minutes)
    const endTime = new Date(originalTime.getTime() + 1.5 * 60 * 60 * 1000);
    
    // Format start and end times
    const startTimeStr = formatTime(originalTime);
    const endTimeStr = formatTime(endTime);

    return `${startTimeStr} - ${endTimeStr}`;
}


function formatTime(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const isPM = hours >= 12;

  // Convert to 12-hour format
  hours = hours % 12 || 12; // convert 0 to 12

  // Format minutes to be 0 or 30 if applicable
  const formattedMinutes = minutes === 0 ? '' : `:${minutes < 10 ? '0' : ''}${minutes}`;
  
  // Construct the final formatted string
  return `${hours}${formattedMinutes} ${isPM ? 'PM' : 'AM'}`;
}

export function formatMilitaryToStandardTime(militaryTime:string) {
  // Check if the input is in valid military time format
  if (!/^\d{2}:\d{2}$/.test(militaryTime)) {
    return "Invalid time format";
  }

  let [hours, minutes] = militaryTime.split(":").map(Number);

  // Adjust for times past midnight (e.g., 24:00)
  if (hours === 24) {
    hours = 0;
  }

  const period = hours < 12 ? "AM" : "PM";

  // Convert to 12-hour format
  hours = hours % 12 || 12;

  return `${hours}:${minutes.toString().padStart(2, "0")}${period}`;
}

export async function generateTempPassword(input:string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);

  // Generate SHA-256 hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // Convert bytes to hex and take the first 8 characters for a shorter password
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 8);  // Short, 8-character hashed password
}