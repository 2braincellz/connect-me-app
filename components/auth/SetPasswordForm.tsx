'use client'

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useForm } from 'react-hook-form'
import toast, { Toaster } from "react-hot-toast"

// Schema now properly validates password matching
const formSchema = z.object({
  password: z.string().min(6, {
    message: 'Password must be at least 6 characters long.',
  }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export default function SetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true)
    setError(null)

    try {
      const code = searchParams.get('code')
      
      if (!code) {
        toast.error("no code")
        throw new Error('Reset code is missing. Please use the reset link from your email.')
      }

      // Exchange the code for a session first
      const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        toast.error("exchange error")
        throw exchangeError
      }

      if (!session) {
        toast.error("No session")
        throw new Error('No session established. Please try the reset link again.')
      }

      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: values.password
      })

      if (updateError) {
        toast.error("Failed to update")
        throw updateError
      }

      toast.success('Password updated successfully')
      router.push('/login')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while resetting your password'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    placeholder="Enter your new password"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    placeholder="Confirm your new password"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? 'Updating Password...' : 'Update Password'}
          </Button>
        </form>
      </Form>
      <Toaster />
    </div>
  )
}



// 'use client';

// import { zodResolver } from '@hookform/resolvers/zod';
// import { useForm } from 'react-hook-form';
// import * as z from 'zod';
// import { useRouter, useSearchParams } from 'next/navigation';
// import toast, { Toaster } from 'react-hot-toast';
// import { useState } from 'react';
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';

// const formSchema = z.object({
//   password: z.string().min(6, { message: 'Password must be at least 6 characters long.' }),
// });

// export default function ResetPasswordForm() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const supabase = createClientComponentClient();
//   const [isLoading, setIsLoading] = useState(false);

//   const form = useForm({
//     resolver: zodResolver(formSchema),
//     defaultValues: {
//       password: '',
//     },
//   });

//   const onSubmit = async (values) => {
//     setIsLoading(true);
//     const accessToken = searchParams.get('access_token');
//     if (!accessToken) {
//       toast.error('Code is missing. Please try the reset link again.');
//       return;
//     }

//     const { error } = await supabase.auth.updateUser({
//       password: values.password,
//     }, accessToken);

//     if (error) {
//       toast.error(error.message);
//     } else {
//       toast.success('Password reset successfully!');
//       router.push('/login');
//     }
//     setIsLoading(false);
//   };

//   return (
//     <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 rounded-md">
//       <Input
//         placeholder="New Password"
//         type="password"
//         {...form.register('password')}
//       />
//       <Button disabled={isLoading} type="submit" className='w-full bg-blue-400'>
//         {isLoading ? 'Setting Password...' : 'Set New Password'}
//       </Button>
//       <Toaster />
//     </form>
//   );
// }





// 'use client';

// import { useEffect, useState } from 'react';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { useForm } from 'react-hook-form';
// import * as z from 'zod';
// import { useRouter, useSearchParams} from 'next/navigation';
// import toast, { Toaster } from 'react-hot-toast';
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';

// const formSchema = z.object({
//   password: z.string().min(6, { message: 'Password must be at least 6 characters long.' }),
// });

// export default function ResetPasswordForm() {
//   const supabase = createClientComponentClient();
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const [isLoading, setIsLoading] = useState(false);

//   const form = useForm({
//     resolver: zodResolver(formSchema),
//     defaultValues: {
//       password: '',
//     },
//   });

//   const code = searchParams.get('code');

//   useEffect(() => {
//     const init = async () => {
//       console.log(code);
//       const { data } = await supabase.auth.getSession();
//       console.log("SESSION DATA:", data.session);

//       if (!data.session && code) {
//         const { data: newSession, error: newSessionError } =
//           await supabase.auth.exchangeCodeForSession(code);

//         console.log("NEW SESSION DATA:", newSession.session);

//         if (newSessionError) {
//           console.log(newSessionError);
//         }

//         if (newSession.session) {
//           await supabase.auth.setSession(newSession.session);
//         }

//         setIsLoading(false);
//       }
//     };

//     init();
//   }, [code]);


//   const onSubmit = async (values) => {
//     setIsLoading(true);

//     const code = searchParams.get('code');
//     if (code) {
//         const exchangeCode = async () => {
//           const { data, error } = await supabase.auth.exchangeCodeForSession(code);
//           if (error) {
//             toast.error(error.message);
//           } else {
//             toast.success('Session created successfully!');
//           }
//         };
//         exchangeCode();
//   }

//     const { password } = values;

//     const { error } = await supabase.auth.updateUser({
//       password,
//     });

//     if (error) {
//       toast.error(error.message);
//     } else {
//       toast.success('Password reset successfully!');
//     //   router.push('/login'); // Redirect to login or other page as desired
//     }

//     setIsLoading(false);
//   };

//   return (
//     <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 rounded-md">
//       <Input
//         placeholder="New Password"
//         type="password"
//         {...form.register('password')}
//       />
//       <Button disabled={isLoading} type="submit" className='w-full bg-blue-400'>
//         {isLoading ? 'Setting Password...' : 'Set New Password'}
//       </Button>
//       <Toaster />
//     </form>
//   );
// }