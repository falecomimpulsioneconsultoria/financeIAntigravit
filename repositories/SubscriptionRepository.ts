import { Invoice, User } from "../types";

import { supabase } from "../lib/supabaseClient";

export const SubscriptionRepository = {
    // Access Invoices from Supabase
    getInvoicesByUserId: async (userId: string): Promise<Invoice[]> => {
        const { data, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('user_id', userId)
            .order('due_date', { ascending: false });

        if (error) {
            console.error('Error fetching invoices:', error);
            return [];
        }

        return (data || []).map((inv: any) => ({
            id: inv.id,
            userId: inv.user_id,
            amount: inv.amount,
            status: inv.status,
            dueDate: inv.due_date,
            paidAt: inv.paid_at,
            referenceMonth: inv.reference_month,
            pdfUrl: inv.pdf_url
        }));
    },

    saveInvoice: async (invoice: Invoice): Promise<void> => {
        const payload = {
            user_id: invoice.userId,
            amount: invoice.amount,
            status: invoice.status,
            due_date: invoice.dueDate,
            paid_at: invoice.paidAt,
            reference_month: invoice.referenceMonth,
            pdf_url: invoice.pdfUrl
        };

        const { error } = await supabase
            .from('invoices')
            .insert([payload]);

        if (error) {
            console.error('Error saving invoice:', error);
            throw error;
        }
    },

    updateUserSubscriptionData: async (user: User, data: Partial<User>): Promise<User> => {
        const updates: any = {};
        if (data.planId !== undefined) updates.plan_id = data.planId;
        if (data.paymentStatus !== undefined) updates.payment_status = data.paymentStatus;
        if (data.expirationDate !== undefined) updates.expiration_date = data.expirationDate;
        if (data.subscriptionPrice !== undefined) updates.subscription_price = data.subscriptionPrice;

        if (Object.keys(updates).length > 0) {
            const { error } = await supabase
                .from('profiles') // Assuming 'profiles' stores user extra data
                .update(updates)
                .eq('id', user.id);

            if (error) {
                console.error('Error updating user subscription data:', error);
                throw error;
            }
        }
        
        return { ...user, ...data };
    }
};
