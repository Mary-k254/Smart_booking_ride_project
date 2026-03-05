// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function Login() {
    const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
    const [plateNumber, setPlateNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const router = useRouter();
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const formatPhone = (p: string) => {
        const cleaned = p.replace(/\D/g, '');
        if (cleaned.startsWith('0')) return `+254${cleaned.slice(1)}`;
        if (cleaned.startsWith('254')) return `+${cleaned}`;
        if (cleaned.startsWith('7')) return `+254${cleaned}`;
        return `+${cleaned}`;
    };

    const sendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formattedPhone = formatPhone(phone);

        const { error } = await supabase.auth.signInWithOtp({
            phone: formattedPhone,
        });

        if (error) {
            setError(error.message);
        } else {
            setStep('otp');
        }
        setLoading(false);
    };

    const verifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formattedPhone = formatPhone(phone);

        const { data, error } = await supabase.auth.verifyOtp({
            phone: formattedPhone,
            token: otp,
            type: 'sms',
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        // Check if profile exists
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user!.id)
            .single();

        if (profile) {
            router.push(profile.role === 'driver' ? '/driver' : '/passenger');
        } else {
            setStep('profile');
        }
        setLoading(false);
    };

    const createProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error: profileError } = await supabase.from('profiles').insert({
            id: user.id,
            role,
            full_name: fullName,
            phone_number: formatPhone(phone),
        });

        if (profileError) {
            setError(profileError.message);
            setLoading(false);
            return;
        }

        if (role === 'driver') {
            const { error: vehicleError } = await supabase.from('vehicles').insert({
                driver_id: user.id,
                plate_number: plateNumber.toUpperCase(),
            });

            if (vehicleError) {
                setError(vehicleError.message);
                setLoading(false);
                return;
            }
        }

        router.push(role === 'driver' ? '/driver' : '/passenger');
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
                <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
                    Smart Ride
                </h1>
                <p className="text-center text-gray-600 mb-8">Kenya</p>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {step === 'phone' && (
                    <form onSubmit={sendOTP} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Phone Number
                            </label>
                            <div className="flex">
                                <span className="inline-flex items-center px-4 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-600 font-medium">
                                    +254
                                </span>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="flex-1 input-field rounded-l-none"
                                    placeholder="712345678"
                                    required
                                />
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? 'Sending...' : 'Send Code'}
                        </button>
                    </form>
                )}

                {step === 'otp' && (
                    <form onSubmit={verifyOTP} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Enter Code
                            </label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="input-field text-center text-2xl tracking-widest"
                                placeholder="123456"
                                maxLength={6}
                                required
                            />
                        </div>
                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? 'Verifying...' : 'Verify'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep('phone')}
                            className="btn-secondary"
                        >
                            Back
                        </button>
                    </form>
                )}

                {step === 'profile' && (
                    <form onSubmit={createProfile} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="input-field"
                                placeholder="John Doe"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                I am a
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setRole('passenger')}
                                    className={`py-3 rounded-lg border-2 font-medium transition-all ${role === 'passenger'
                                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    Passenger
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('driver')}
                                    className={`py-3 rounded-lg border-2 font-medium transition-all ${role === 'driver'
                                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    Driver
                                </button>
                            </div>
                        </div>

                        {role === 'driver' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Vehicle Plate Number
                                </label>
                                <input
                                    type="text"
                                    value={plateNumber}
                                    onChange={(e) => setPlateNumber(e.target.value)}
                                    className="input-field uppercase"
                                    placeholder="KXX 123X"
                                    required
                                />
                            </div>
                        )}

                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? 'Creating...' : 'Get Started'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}