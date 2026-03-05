// src/app/api/payment/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const { tripId, amount, phoneNumber } = await request.json();

    // Format phone
    const formattedPhone = phoneNumber.replace(/\D/g, '').replace(/^0/, '254');

    // MPesa Daraja API credentials
    const consumerKey = process.env.MPESA_CONSUMER_KEY!;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET!;
    const passkey = process.env.MPESA_PASSKEY!;
    const shortcode = process.env.MPESA_SHORTCODE!;
    const isSandbox = process.env.MPESA_ENV === 'sandbox';

    try {
        // 1. Get access token
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
        const tokenRes = await fetch(
            `https://${isSandbox ? 'sandbox' : 'api'}.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`,
            { headers: { Authorization: `Basic ${auth}` } }
        );
        const { access_token } = await tokenRes.json();

        // 2. Generate password
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

        // 3. STK Push
        const stkRes = await fetch(
            `https://${isSandbox ? 'sandbox' : 'api'}.safaricom.co.ke/mpesa/stkpush/v1/processrequest`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    BusinessShortCode: shortcode,
                    Password: password,
                    Timestamp: timestamp,
                    TransactionType: 'CustomerPayBillOnline',
                    Amount: amount,
                    PartyA: formattedPhone,
                    PartyB: shortcode,
                    PhoneNumber: formattedPhone,
                    CallBackURL: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/mpesa-callback`,
                    AccountReference: `SmartRide-${tripId}`,
                    TransactionDesc: 'Smart Ride Payment',
                }),
            }
        );

        const result = await stkRes.json();

        if (result.ResponseCode === '0') {
            // Save payment record
            const supabase = createRouteHandlerClient({ cookies });
            await supabase.from('payments').insert({
                trip_id: tripId,
                amount,
                phone_number: formattedPhone,
                status: 'pending',
            });

            return NextResponse.json({ success: true, checkoutRequestID: result.CheckoutRequestID });
        }

        return NextResponse.json({ error: result.errorMessage }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: 'Payment failed' }, { status: 500 });
    }
}