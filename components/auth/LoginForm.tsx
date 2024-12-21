'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import Link from "next/link"
import { useRouter } from "next/navigation"
import toast, { Toaster } from "react-hot-toast";
import { useState } from "react"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const formSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  password: z.string().min(6, {
    message: 'Password must be at least 6 characters.',
  })
})

export default function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClientComponentClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })

      if (error) {
        throw error
      }

      if (data.user) {
        toast.success('Logged in successfully')
        router.push('/dashboard')
        router.refresh()
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('An unknown error occurred')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4 p-0 rounded-md">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className='w-full'>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Enter your email address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter your password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormDescription>
          Forgot Password
        </FormDescription>
        <Button disabled={isLoading} type="submit" className='w-full bg-blue-400'>
          {isLoading ? 'Logging in...' : 'Login'}
        </Button>

        <FormDescription>
          Don&apos;t have an account? <Link href='/register'><b>Register</b></Link>
        </FormDescription>
      </form>
      <Toaster/>
    </Form>
  )
}