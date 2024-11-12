import SetPasswordForm from "@/components/auth/SetPasswordForm"


export default function SetPasswordPage() {

    return (
    <main>
        <section className = "w-full flex flex-col items-center h-[100vh]">
            <div className="container h-full mx-auto max-w-lg p-10 flex flex-col items-center justify-center align-center">
                <div className='p-8 flex flex-col items-center justify-center gap-4 border border-gray-300 rounded-xl'>
                    <div className='flex flex-col gap-3'>
                        <h1 className="text-2xl text-center font-bold">Set your Password</h1>
                            <p className='text-sm text-gray-600'>Enter your email and password below to log in.</p>
                    </div>
            <SetPasswordForm />
          </div>
        </div>
      </section>
    </main>

    )

}
