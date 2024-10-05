'use client'
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, Plus, Edit, Trash } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getAllEnrollments, addEnrollment, removeEnrollment, updateEnrollment, getAllProfiles } from '@/lib/actions/admin.actions';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Enrollment, Profile, Event } from '@/types';
import toast from "react-hot-toast";
import AvailabilityFormat from '@/components/student/AvailabilityFormat'
import AvailabilityForm from '@/components/ui/availability-form'

const EnrollmentList = () => {
    const supabase = createClientComponentClient();
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [filteredEnrollments, setFilteredEnrollments] = useState<Enrollment[]>([]);
    const [students, setStudents] = useState<Profile[]>([]);
    const [tutors, setTutors] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterValue, setFilterValue] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
    const [newEnrollment, setNewEnrollment] = useState<Omit<Enrollment, "id" | "createdAt">>({
        student: {} as Profile,  // Initialize as an empty Profile
        tutor: {} as Profile,    // Initialize as an empty Profile
        summary: '',
        startDate: '',
        endDate: '',
        availability: [{"day": '',"startTime": '',"endTime":''}]
    });

    useEffect(() => {
        fetchEnrollments();
        fetchProfiles();
    }, [supabase.auth]);

    useEffect(() => {
        const filtered = enrollments.filter(enrollment =>
            enrollment.student?.firstName.toLowerCase().includes(filterValue.toLowerCase()) ||
            enrollment.tutor?.firstName.toLowerCase().includes(filterValue.toLowerCase())
        );
        setFilteredEnrollments(filtered);
        setCurrentPage(1);
    }, [filterValue, enrollments]);

    const fetchEnrollments = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError) throw new Error(userError.message);
            if (!user) throw new Error('No user found');

            const enrollmentsData = await getAllEnrollments();
            if (!enrollmentsData) throw new Error('No enrollments found');

            const sortedEnrollments = enrollmentsData.sort((a, b) =>
                new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
            );

            setEnrollments(sortedEnrollments);
            setFilteredEnrollments(sortedEnrollments);
        } catch (error) {
            console.error('Error fetching enrollment data:', error);
            setError(error instanceof Error ? error.message : 'An unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    const fetchProfiles = async () => {
        try {
            const studentsData = await getAllProfiles("Student");
            const tutorsData = await getAllProfiles("Tutor");
            if (studentsData) setStudents(studentsData.filter(s => s.status === 'Active'));
            if (tutorsData) setTutors(tutorsData.filter(t => t.status === 'Active'));
        } catch (error) {
            console.error('Error fetching profiles:', error);
        }
    };

    const totalPages = Math.ceil(filteredEnrollments.length / rowsPerPage);

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    const handleRowsPerPageChange = (value: string) => {
        setRowsPerPage(parseInt(value));
        setCurrentPage(1);
    };

    const paginatedEnrollments = filteredEnrollments.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const handleInputChange = (e: { target: { name: string, value: string } }) => {
        const { name, value } = e.target;
      
        // Helper function to handle nested updates
        const handleNestedChange = (obj: any, key: string, value: any) => {
          const keys = key.split('.'); // Split key by dot notation (e.g., 'tutor.id')
          let temp = obj;
          
          keys.forEach((k, index) => {
            if (index === keys.length - 1) {
              // Final key, update its value
              temp[k] = value;
            } else {
              // Traverse nested objects
              temp[k] = temp[k] || {};
              temp = temp[k];
            }
          });
      
          return { ...obj };
        };
      
        if (selectedEnrollment) {
          setSelectedEnrollment(prevState => handleNestedChange({ ...prevState }, name, value));
        } else {
          setNewEnrollment(prevState => handleNestedChange({ ...prevState }, name, value));
        }
      };
      

    const handleAddEnrollment = async () => {
        try {
            const addedEnrollment = await addEnrollment(newEnrollment);
            if (addedEnrollment) {
                setEnrollments([addedEnrollment, ...enrollments]);
                setIsAddModalOpen(false);
                resetNewEnrollment();
                toast.success('Enrollment added successfully');
            }
        } catch (error) {
            console.error('Error adding enrollment:', error);
            toast.error('Failed to add enrollment');
        }
    };

    const handleUpdateEnrollment = async () => {
        if (selectedEnrollment) {
            try {
                const updatedEnrollment = await updateEnrollment(selectedEnrollment);
                if (updatedEnrollment) {
                    setEnrollments(enrollments.map((e:Enrollment) => 
                        e.id === updatedEnrollment.id 
                        ? updatedEnrollment 
                        : e) as Enrollment[]);  // Explicitly cast as Enrollment[]
                }
                setIsEditModalOpen(false);
                setSelectedEnrollment(null);
                toast.success('Enrollment updated successfully');
            } catch (error) {
                console.error('Error updating enrollment:', error);
                toast.error('Failed to update enrollment');
            }
        }
    };    

    const handleDeleteEnrollment = async () => {
        if (selectedEnrollment) {
            try {
                await removeEnrollment(selectedEnrollment.id);
                setEnrollments(enrollments.filter(e => e.id !== selectedEnrollment.id));
                setIsDeleteModalOpen(false);
                setSelectedEnrollment(null);
                toast.success('Enrollment deleted successfully');
            } catch (error) {
                console.error('Error deleting enrollment:', error);
                toast.error('Failed to delete enrollment');
            }
        }
    };

    const resetNewEnrollment = () => {
        setNewEnrollment({
            student: {} as Profile,
            tutor: {} as Profile,
            summary: '',
            startDate: '',
            endDate: '',
            availability: [{"day": '',"startTime": '',"endTime":''}]
        });
    };

    return (
        <main className="p-8">
            <h1 className="text-3xl font-bold mb-6">All Enrollments</h1>
            <div className="flex space-x-6">
                <div className="flex-grow bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex space-x-2">
                            <Input
                                type="text"
                                placeholder="Filter enrollments..."
                                className="w-64"
                                value={filterValue}
                                onChange={(e) => setFilterValue(e.target.value)}
                            />
                            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Plus className="mr-2 h-4 w-4" /> Add Enrollment
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>Add New Enrollment</DialogTitle>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="student" className="text-right">Student</Label>
                                            <Select 
                                                name="student" 
                                                value={newEnrollment.student?.id || ''}  // Ensure the value is either the selected student id or an empty string
                                                onValueChange={(value) => handleInputChange({ target: { name: 'student.id', value } })}  // Handle the nested "student.id"
                                                >
                                                <SelectTrigger className="col-span-3">
                                                    <SelectValue placeholder="Select a student" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {students.map((student) => (
                                                    <SelectItem key={student.id} value={student.id}>
                                                        {student.firstName} {student.lastName}
                                                    </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="tutor" className="text-right">Tutor</Label>
                                            <Select 
                                                name="tutor" 
                                                value={newEnrollment.tutor?.id || ''}  
                                                onValueChange={(value) => handleInputChange({ target: { name: 'tutor.id', value } })}  // Pass nested name and value
                                                >
                                                <SelectTrigger className="col-span-3">
                                                    <SelectValue placeholder="Select a tutor" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {tutors.map((tutor) => (
                                                    <SelectItem key={tutor.id} value={tutor.id}>
                                                        {tutor.firstName} {tutor.lastName}
                                                    </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <AvailabilityForm
                                            availabilityList={newEnrollment.availability}
                                            setAvailabilityList={(availability) => setNewEnrollment({ ...newEnrollment, availability })}
                                        />
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="summary" className="text-right">Summary</Label>
                                            <Input
                                                id="summary"
                                                name="summary"
                                                value={newEnrollment.summary}
                                                onChange={handleInputChange}
                                                className="col-span-3"
                                            />
                                        </div>
                                        
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="startDate" className="text-right">Start Date</Label>
                                            <Input
                                                id="startDate"
                                                name="startDate"
                                                type="date"
                                                value={newEnrollment.startDate}
                                                onChange={handleInputChange}
                                                className="col-span-3"
                                            />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="endDate" className="text-right">End Date</Label>
                                            <Input
                                                id="endDate"
                                                name="endDate"
                                                type="date"
                                                value={newEnrollment.endDate}
                                                onChange={handleInputChange}
                                                className="col-span-3"
                                            />
                                        </div>
                                    </div>
                                    <Button onClick={handleAddEnrollment}>Add Enrollment</Button>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {['Student', 'Tutor','Availability','Summary', 'Start Date', 'End Date', 'Actions'].map((header) => (
                                    <TableHead key={header}>{header}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedEnrollments.map((enrollment) => (
                                <TableRow key={enrollment.id}>
                                    <TableCell>{enrollment.student?.firstName} {enrollment.student?.lastName}</TableCell>
                                    <TableCell>{enrollment.tutor?.firstName} {enrollment.tutor?.lastName}</TableCell>
                                    <TableCell>
                                        <AvailabilityFormat availability={enrollment.availability}/>
                                    </TableCell>
                                    <TableCell>{enrollment.summary}</TableCell>
                                    <TableCell>{enrollment.startDate}</TableCell>
                                    <TableCell>{enrollment.endDate}</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => { setSelectedEnrollment(enrollment); setIsEditModalOpen(true); }}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => { setSelectedEnrollment(enrollment); setIsDeleteModalOpen(true); }}>
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <div className="flex justify-between mt-4">
                        <span>{filteredEnrollments.length} row(s) total.</span>
                        <div className="flex items-center space-x-2">
                            <span>Rows per page</span>
                            <Select value={rowsPerPage.toString()} onValueChange={handleRowsPerPageChange}>
                                <SelectTrigger className="w-[70px]">
                                    <SelectValue placeholder={rowsPerPage.toString()} />
                                </SelectTrigger>
                                <SelectContent>
                                    {[10, 20, 50].map(value => (
                                        <SelectItem key={value} value={value.toString()}>{value}</SelectItem>
                                    ))}
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

            {/* Edit Enrollment Modal */}
<Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
    <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
            <DialogTitle>Edit Enrollment</DialogTitle>
        </DialogHeader>
        {selectedEnrollment && (
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="studentId" className="text-right">Student</Label>
                    <Select name="studentId" value={selectedEnrollment.student?.id} onValueChange={(value) => handleInputChange({ target: { name: 'studentId', value } } as any)}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select a student" />
                        </SelectTrigger>
                        <SelectContent>
                            {students.map((student) => (
                                <SelectItem key={student.id} value={student.id}>
                                    {student.firstName} {student.lastName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="tutorId" className="text-right">Tutor</Label>
                    <Select name="tutorId" value={selectedEnrollment.tutor?.id} onValueChange={(value) => handleInputChange({ target: { name: 'tutorId', value } } as any)}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select a tutor" />
                        </SelectTrigger>
                        <SelectContent>
                            {tutors.map((tutor) => (
                                <SelectItem key={tutor.id} value={tutor.id}>
                                    {tutor.firstName} {tutor.lastName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <AvailabilityForm
                    availabilityList={selectedEnrollment?.availability}
                    setAvailabilityList={(availability) => handleInputChange({ target: { name: 'availability', availability } } as any)}
                />

                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="summary" className="text-right">Summary</Label>
                    <Input
                        id="summary"
                        name="summary"
                        value={selectedEnrollment.summary}
                        onChange={handleInputChange}
                        className="col-span-3"
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="startDate" className="text-right">Start Date</Label>
                    <Input
                        id="startDate"
                        name="startDate"
                        type="date"
                        value={selectedEnrollment.startDate}
                        onChange={handleInputChange}
                        className="col-span-3"
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="endDate" className="text-right">End Date</Label>
                    <Input
                        id="endDate"
                        name="endDate"
                        type="date"
                        value={selectedEnrollment.endDate}
                        onChange={handleInputChange}
                        className="col-span-3"
                    />
                </div>
            </div>
        )}
        <Button onClick={handleUpdateEnrollment}>Update Enrollment</Button>
    </DialogContent>
</Dialog>

{/* Delete Enrollment Modal */}
<Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
    <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
            <DialogTitle>Delete Enrollment</DialogTitle>
        </DialogHeader>
        <div className="py-4">
            <p>Are you sure you want to delete this enrollment? This action cannot be undone.</p>
        </div>
        <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteEnrollment}>Delete</Button>
        </div>
    </DialogContent>
</Dialog>

{loading && <p>Loading...</p>}
{error && <p className="text-red-500">Error: {error}</p>}
</main>
);
};

export default EnrollmentList;