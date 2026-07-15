import { SignUp } from "@clerk/nextjs";
import { BrainLogo } from "@/components/BrainLogo";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-4">
      <BrainLogo size={48} className="h-12 w-12" />
      <SignUp />
    </div>
  );
}
