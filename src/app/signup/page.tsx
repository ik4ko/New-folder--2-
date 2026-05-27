"use client"

import React, { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, ArrowLeft, Rocket, Building2, Mail, Key,
  BadgeCheck, Phone, AlertCircle, User,
} from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { createClient } from '@/lib/supabase/client';
import { provisionAgency } from '@/app/actions/provision-agency';

// ---------------------------------------------------------------------------
// Zod schema -- CMS 2026 compliant producer registration
// ---------------------------------------------------------------------------
const signupSchema = z
  .object({
    role: z.enum(['agency_owner', 'solo_broker'], {
      required_error: 'Please select your producer role.',
    }),
    firstName: z.string().min(1, 'First name is required.').max(50),
    lastName: z.string().min(1, 'Last name is required.').max(50),
    agencyName: z.string().optional(),
    phone: z
      .string()
      .min(1, 'Phone number is required.')
      .regex(
        /^(\+1[\s.-]?)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})$/,
        'Enter a valid US phone number.',
      ),
    email: z.string().email('Enter a valid email address.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    tpmoCertified: z.boolean().refine((v) => v === true, {
      message: 'You must agree to TPMO regulations to continue.',
    }),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'agency_owner' && !data.agencyName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Agency name is required for Agency Owners.',
        path: ['agencyName'],
      });
    }
  });

type SignupFormValues = z.infer<typeof signupSchema>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1.5 ml-2">
      <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
      <p className="text-[10px] font-bold text-red-400">{message}</p>
    </div>
  );
}

function SignupFormContent() {
  const [isMounted, setIsMounted] = useState(false);
  const [emailPending, setEmailPending] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get('plan') || 'broker-individual';
  const { toast } = useToast();

  const authBg = PlaceHolderImages.find((img) => img.id === 'auth-bg');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: 'solo_broker', tpmoCertified: false },
  });

  const role = watch('role');
  const tpmoCertified = watch('tpmoCertified');

  useEffect(() => { setIsMounted(true); }, []);

  const handleResend = async () => {
    if (!submittedEmail || resendLoading || resendSent) return;
    setResendLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({ type: 'signup', email: submittedEmail });
    setResendLoading(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Could not resend', description: error.message });
    } else {
      setResendSent(true);
    }
  };

  const onSubmit = async (data: SignupFormValues) => {
    const supabase = createClient();
    console.log("Auth Attempt [Signup]:", data.email);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Signup returned no user object.');

      // Provision agency and broker rows via server action (uses supabaseAdmin, bypasses RLS)
      await provisionAgency({
        userId: authData.user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        agencyName: data.role === 'agency_owner' ? (data.agencyName ?? null) : null,
        phone: data.phone,
        role: data.role,
        tpmoCertifiedAt: new Date().toISOString(),
        billingPlan: planParam,
      });

      if (authData.session) {
        // Email confirmation disabled -- session is live, hard-navigate to dashboard
        // for a fresh server render that picks up the session cookie.
        window.location.href = '/dashboard';
      } else {
        // Email confirmation required -- show full-page confirmation screen
        setSubmittedEmail(data.email);
        setEmailPending(true);
      }
    } catch (error: any) {
      console.error('CRITICAL Registration Error:', {
        code: error.code,
        message: error.message,
        fullError: error,
      });
      toast({ variant: 'destructive', title: 'Registration Failed', description: error.message });
    }
  };

  if (emailPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-5xl">✉️</div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Check Your Email</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            We sent a confirmation link to{' '}
            <span className="text-white font-semibold">{submittedEmail}</span>.
            Click the link in that email to activate your account and get started.
          </p>
          <p className="text-slate-600 text-xs mt-2">
            Didn&apos;t receive it? Check your spam folder or{' '}
            <button
              onClick={handleResend}
              disabled={resendLoading || resendSent}
              className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors disabled:opacity-50"
            >
              {resendSent ? 'email sent' : resendLoading ? 'sending…' : 'resend the email'}
            </button>
            .
          </p>
          <a
            href="/login"
            className="inline-block mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors"
          >
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col min-h-screen bg-slate-950 text-foreground overflow-hidden">
      <div className="absolute inset-0 z-0">
        {isMounted && (
          <Image
            src={authBg?.imageUrl || 'https://picsum.photos/seed/med1/2400/1600'}
            alt="Authentication Background"
            fill
            className="object-cover opacity-60"
            priority
            data-ai-hint="medical laboratory"
          />
        )}
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" />
      </div>

      <header className="relative h-20 px-8 flex items-center justify-between z-10">
        <Link href="/"><Logo /></Link>
        <Button
          variant="ghost" size="sm" asChild
          className="rounded-xl font-black uppercase text-[10px] tracking-widest text-white hover:bg-white/10 hover:text-white"
        >
          <Link href="/"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Home</Link>
        </Button>
      </header>

      <main className="relative flex-1 flex items-center justify-center p-8 z-10 py-12">
        <Card className="max-w-lg w-full rounded-[3.5rem] shadow-2xl p-10 border border-white/10 bg-white/5 dark:bg-slate-900/20 backdrop-blur-2xl animate-in zoom-in-95 duration-500">

          <div className="text-center space-y-2 mb-8">
            <div className="flex justify-center mb-4">
              <Logo iconOnly className="scale-125" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Provision Node</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
              Initialize Agency Trial · CMS 2026 Compliant
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

            {/* Role selector */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-2 text-white/70">
                Producer Role
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'agency_owner', label: 'Agency Account' },
                  { value: 'solo_broker',  label: "I'm an Individual Broker" },
                ] as const).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue('role', value, { shouldValidate: true })}
                    className={`h-12 rounded-2xl border font-black uppercase text-[10px] tracking-widest transition-all ${
                      role === value
                        ? 'border-primary bg-primary/20 text-primary'
                        : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <FieldError message={errors.role?.message} />
            </div>

            {/* Agency Name -- visible only for Agency Owner */}
            {role === 'agency_owner' && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-2 text-white/70">
                  Legal Agency Name
                </Label>
                <div className="relative group">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-primary transition-colors" />
                  <Input
                    {...register('agencyName')}
                    placeholder="e.g. Elite Medicare Group LLC"
                    className="h-14 rounded-2xl bg-white/5 border-white/10 text-white pl-12 font-bold placeholder:text-white/20 focus:ring-primary focus:border-primary/50 shadow-inner"
                  />
                </div>
                <FieldError message={errors.agencyName?.message} />
              </div>
            )}

            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-2 text-white/70">First Name</Label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-primary transition-colors" />
                  <Input
                    {...register('firstName')}
                    placeholder="Jane"
                    className="h-14 rounded-2xl bg-white/5 border-white/10 text-white pl-12 font-bold placeholder:text-white/20 focus:ring-primary focus:border-primary/50 shadow-inner"
                  />
                </div>
                <FieldError message={errors.firstName?.message} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-2 text-white/70">Last Name</Label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-primary transition-colors" />
                  <Input
                    {...register('lastName')}
                    placeholder="Smith"
                    className="h-14 rounded-2xl bg-white/5 border-white/10 text-white pl-12 font-bold placeholder:text-white/20 focus:ring-primary focus:border-primary/50 shadow-inner"
                  />
                </div>
                <FieldError message={errors.lastName?.message} />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-2 text-white/70">Phone Number (US)</Label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-primary transition-colors" />
                <Input
                  {...register('phone')}
                  type="tel"
                  placeholder="+1 (202) 555-0100"
                  className="h-14 rounded-2xl bg-white/5 border-white/10 text-white pl-12 font-bold placeholder:text-white/20 focus:ring-primary focus:border-primary/50 shadow-inner"
                />
              </div>
              <FieldError message={errors.phone?.message} />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-2 text-white/70">Agent Email</Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-primary transition-colors" />
                <Input
                  {...register('email')}
                  type="email"
                  placeholder="name@agency.com"
                  className="h-14 rounded-2xl bg-white/5 border-white/10 text-white pl-12 font-bold placeholder:text-white/20 focus:ring-primary focus:border-primary/50 shadow-inner"
                />
              </div>
              <FieldError message={errors.email?.message} />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-2 text-white/70">Secure Password</Label>
              <div className="relative group">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-primary transition-colors" />
                <Input
                  {...register('password')}
                  type="password"
                  placeholder="********  (min. 8 characters)"
                  className="h-14 rounded-2xl bg-white/5 border-white/10 text-white pl-12 font-bold placeholder:text-white/20 focus:ring-primary focus:border-primary/50 shadow-inner"
                />
              </div>
              <FieldError message={errors.password?.message} />
            </div>

            {/* TPMO Certification */}
            <div className={`rounded-2xl border p-4 space-y-3 transition-colors ${
              errors.tpmoCertified ? 'border-red-500/40 bg-red-500/5' : 'border-white/10 bg-white/5'
            }`}>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="tpmo"
                  checked={!!tpmoCertified}
                  onCheckedChange={(checked) => setValue('tpmoCertified', !!checked, { shouldValidate: true })}
                  className="mt-0.5 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0"
                />
                <Label
                  htmlFor="tpmo"
                  className="text-[10px] font-bold text-white/70 leading-relaxed cursor-pointer"
                >
                  I certify that I am a licensed insurance agent and I agree
                  to abide by all CMS Third-Party Marketing Organization (TPMO) regulations,
                  including the 10-year call recording and 48-hour SOA rules.
                </Label>
              </div>
              <FieldError message={errors.tpmoCertified?.message} />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-lg mt-4 shadow-xl shadow-primary/20 uppercase tracking-tighter transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? <Loader2 className="animate-spin" />
                : <><span>Register &amp; Continue</span><Rocket className="w-5 h-5" /></>
              }
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/10 space-y-3 text-center">
            <Link
              href="/login"
              className="block text-[10px] font-black text-white/50 uppercase tracking-widest hover:text-primary transition-colors"
            >
              Already a partner? Log In
            </Link>
            <p className="text-[9px] text-white/30 leading-relaxed font-normal">
              By registering you agree to our{' '}
              <Link href="/compliance#terms" className="underline hover:text-white/60 transition-colors">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/compliance#privacy" className="underline hover:text-white/60 transition-colors">Privacy Policy</Link>.
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <SignupFormContent />
    </Suspense>
  );
}
