'use client'
import React, { useState, useEffect } from 'react';
import { Bell, ChevronDown, Plus, Link as LinkIcon, Eye, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AvailabilityFormat from '@/components/student/AvailabilityFormat'
import { Combobox } from '@/components/ui/combobox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getProfile } from '@/lib/actions/user.actions';
import { getAllProfiles, addUser, deactivateUser,reactivateUser } from '@/lib/actions/admin.actions';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Profile } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import toast, { Toaster } from "react-hot-toast";

const StudentList = ({ 
  isOpen, 
  onOpenChange, 
  onDeactivate 
}: { 
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  students: Array<{ id: string; firstName: string; lastName: string; status: string }>
  onDeactivate: (studentId: string) => void
}) => {
  const supabase = createClientComponentClient();
  const [students, setStudents] = useState<Profile[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Profile[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState<Partial<Profile>>({
    role: 'Student',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    startDate: '',
    availability: [],
    email: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    timeZone: '',
    subjectsOfInterest: [],
    status: 'Active',
    tutorIds: []
  });

  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);

  useEffect(() => {
    const getStudentData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error(userError.message);
        if (!user) throw new Error('No user found');

        const profileData = await getProfile(user.id);
        if (!profileData) throw new Error('No profile found');

        setProfile(profileData);

        const studentsData = await getAllProfiles("Student");
        if (!studentsData) throw new Error('No students found');

        setStudents(studentsData);
        setFilteredStudents(studentsData);
      } catch (error) {
        console.error('Error fetching tutor data:', error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    getStudentData();
  }, [supabase.auth, students]);

  useEffect(() => {
    const filtered = students.filter(student =>
      student.firstName?.toLowerCase().includes(filterValue.toLowerCase()) ||
      student.lastName?.toLowerCase().includes(filterValue.toLowerCase())
    );
    setFilteredStudents(filtered);
    setCurrentPage(1);
  }, [filterValue, students]);

  const totalPages = Math.ceil(filteredStudents.length / rowsPerPage);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewStudent(prev => ({ ...prev, [name]: value }));
  };

  const handleAvailabilityChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const { name, value } = e.target;
    setNewStudent(prev => {
      const newAvailability = [...(prev.availability || [])];
      newAvailability[index] = { ...newAvailability[index], [name]: value };
      return { ...prev, availability: newAvailability };
    });
  };

  const handleSubjectsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const subjects = e.target.value.split(',').map(subject => subject.trim());
    setNewStudent(prev => ({ ...prev, subjectsOfInterest: subjects }));
  };

  const handleAddStudent = async () => {
    try {
      // Ensure addStudent returns a Profile
      const addedStudent: Profile = await addUser(newStudent,'Student');
  
      // Update local state
      setStudents(prevStudents => {
        // Check if addedStudent is valid
        if (addedStudent) {
          return [...prevStudents, addedStudent]; // Ensure returning an array of Profile
        }
        return prevStudents; // Return previous state if addedStudent is not valid
      });
  
      setFilteredStudents(prevFiltered => {
        // Check if addedStudent is valid
        if (addedStudent) {
          return [...prevFiltered, addedStudent]; // Ensure returning an array of Profile
        }
        return prevFiltered; // Return previous state if addedStudent is not valid
      });
  
      if (addedStudent) {
        // Close modal and show success toast
        setIsModalOpen(false);
        setStudents(prevStudents => [...prevStudents, addedStudent]);

        toast.success('Successfully added student.')
    
        // Reset form
        setNewStudent({
            role: 'Student',
            firstName: '',
            lastName: '',
            dateOfBirth: '',
            startDate: '',
            availability: [],
            email: '',
            parentName: '',
            parentPhone: '',
            parentEmail: '',
            timeZone: '',
            subjectsOfInterest: [],
            status: 'Active',
            tutorIds: []
        });
      }
    } catch (error) {
      const err = error as Error;
      console.error('Error adding student:', error);
      toast.error('Failed to Add Student.')
      toast.error(`${err.message}`)
    }
  };

  const handleDeactivateStudent = async () => {
    if (selectedStudentId) {
      try {
        const data = await deactivateUser(selectedStudentId); // Call deactivateUser function with studentId
        if (data) {
            toast.success('Student deactivated successfully');
            setIsDeactivateModalOpen(false);
            setSelectedStudentId(null);
        }
      } catch (error) {
        toast.error('Failed to deactivate student');
      }
    }
  };

  const handleReactivateStudent = async () => {
    if (selectedStudentId) {
      try {
        const data = await reactivateUser(selectedStudentId); // Call deactivateUser function with studentId
        if (data) {
            toast.success('Student reactivated successfully');
            setIsReactivateModalOpen(false);
            setSelectedStudentId(null);
        }
      } catch (error) {
        toast.error('Failed to deactivate student');
      }
    }
  };
  

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">All Students</h1>
      
      <div className="flex space-x-6">
        <div className="flex-grow bg-white rounded-lg shadow p-6">
          
          <div className="flex justify-between items-center mb-4">
            <div className="flex space-x-2">
              <Input 
                type="text" 
                placeholder="Filter students..." 
                className="w-64" 
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
              />
              {/*Add Student*/}
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button>Add Student</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Student</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="firstName" className="text-right">First Name</Label>
                      <Input id="firstName" name="firstName" value={newStudent.firstName} onChange={handleInputChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="lastName" className="text-right">Last Name</Label>
                      <Input id="lastName" name="lastName" value={newStudent.lastName} onChange={handleInputChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="email" className="text-right">Email</Label>
                      <Input id="email" name="email" type="email" value={newStudent.email} onChange={handleInputChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="dateOfBirth" className="text-right">Date of Birth</Label>
                      <Input id="dateOfBirth" name="dateOfBirth" type="date" value={newStudent.dateOfBirth} onChange={handleInputChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="startDate" className="text-right">Start Date</Label>
                      <Input id="startDate" name="startDate" type="date" value={newStudent.startDate} onChange={handleInputChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="parentName" className="text-right">Parent Name</Label>
                      <Input id="parentName" name="parentName" value={newStudent.parentName} onChange={handleInputChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="parentPhone" className="text-right">Parent Phone</Label>
                      <Input id="parentPhone" name="parentPhone" value={newStudent.parentPhone} onChange={handleInputChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="parentEmail" className="text-right">Parent Email</Label>
                      <Input id="parentEmail" name="parentEmail" type="email" value={newStudent.parentEmail} onChange={handleInputChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="timeZone" className="text-right">Time Zone</Label>
                      <Input id="timeZone" name="timeZone" value={newStudent.timeZone} onChange={handleInputChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="subjectsOfInterest" className="text-right">Subjects of Interest</Label>
                      <Input id="subjectsOfInterest" name="subjectsOfInterest" value={newStudent.subjectsOfInterest?.join(', ')} onChange={handleSubjectsChange} className="col-span-3" />
                    </div>
                    {/* Add more fields for availability if needed */}
                  </div>
                  <Button onClick={handleAddStudent}>Add Student</Button>
                </DialogContent>
              </Dialog>
              {/*Deactivate Student*/}
              <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="destructive">Deactivate Student</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select a Student to Deactivate</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label htmlFor="studentSelect" className="text-right">
            Student
          </Label>
          <div className="relative">
            <Combobox
              list={students
                .filter(student => student.status === 'Active')
                .map(student => ({
                  value: student.id,
                  label: `${student.firstName} ${student.lastName}`
                }))}
              category="student"
              onValueChange={setSelectedStudentId}
            />
          </div>
        </div>
        <Button 
          onClick={handleDeactivateStudent} 
          disabled={!selectedStudentId}
          className="w-full"
        >
          Confirm Deactivation
        </Button>
      </DialogContent>
    </Dialog>
              {/*Reactivate Student*/}
              <Dialog open={isReactivateModalOpen} onOpenChange={setIsReactivateModalOpen}>
                <DialogTrigger asChild>
                  <Button className='bg-blue-500'>Reactivate Student</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md overflow-auto">
                  <DialogHeader>
                    <DialogTitle>Select a Student to Reactivate</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Label htmlFor="studentSelect" className="text-right">Student</Label>
                    <div className="relative">
                      <Combobox
                        list={students
                          .filter(student => student.status === 'Inactive')
                          .map(student => ({
                            value: student.id,
                            label: `${student.firstName} ${student.lastName}`
                          }))}
                        category="student"
                        onValueChange={setSelectedStudentId}
                      />
                    </div>
                  </div>
                  <Button onClick={handleReactivateStudent} disabled={!selectedStudentId}>
                    Confirm Reactivation
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Subjects Learning</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Parent Phone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedStudents.map((student, index) => (
                <TableRow key={index}>
                  <TableCell>{student.status}</TableCell>
                  <TableCell>{student.startDate}</TableCell>
                  <TableCell>{student.firstName} {student.lastName}</TableCell>
                  <TableCell><AvailabilityFormat availability={student.availability}/></TableCell>
                  <TableCell className='flex flex-col'>
                    {student.subjectsOfInterest?.map((item,index)=>(
                        <span key={index}>{item}</span>
                    ))}
                  </TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>{student.parentPhone}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex justify-between items-center">
            <span>{filteredStudents.length} row(s) total.</span>
            <div className="flex items-center space-x-2">
              <span>Rows per page</span>
              <Select value={rowsPerPage.toString()} onValueChange={handleRowsPerPageChange}>
                <SelectTrigger className="w-[70px]">
                  <SelectValue placeholder={rowsPerPage.toString()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>Page {currentPage} of {totalPages}</span>
              <div className="flex space-x-1">
                <Button variant="ghost" size="icon" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages}>
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toaster/>
    </main>
  );
};

export default StudentList