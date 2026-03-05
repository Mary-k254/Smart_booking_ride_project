// supabase/functions/mpesa-callback/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
    const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const callback = await req.json();

    // Extract data from callback
    const { Body: { stkCallback } } = callback;
    const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = stkCallback;

    if (ResultCode === 0 && CallbackMetadata) {
        const receipt = CallbackMetadata.Item.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value;
        const amount = CallbackMetadata.Item.find((i: any) => i.Name === 'Amount')?.Value;
        const phone = CallbackMetadata.Item.find((i: any) => i.Name === 'PhoneNumber')?.Value;

        // Update payment status
        await supabase
            .from('payments')
            .update({
                status: 'completed',
                mpesa_receipt: receipt
            })
            .eq('mpesa_receipt', receipt);

        // Update trip status to completed
        const { data: payment } = await supabase
            .from('payments')
            .select('trip_id')
            .eq('mpesa_receipt', receipt)
            .single();

        if (payment) {
            await supabase
                .from('trips')
                .update({ status: 'completed' })
                .eq('id', payment.trip_id);
        }
    }

    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Success" }), {
        headers: { "Content-Type": "application/json" },
    });
});