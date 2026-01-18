import { useState, useEffect, useCallback } from 'react';
import { User, Invoice, WebhookPayload } from '../types';
import { SubscriptionBusinessService } from '../services/SubscriptionBusinessService';
import { SubscriptionRepository } from '../repositories/SubscriptionRepository';

export const useSubscriptionManager = (initialUser?: User) => {
    const [user, setUser] = useState<User | undefined>(initialUser);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const refreshInvoices = useCallback(async (userId: string) => {
        setIsLoading(true);
        try {
            const data = await SubscriptionRepository.getInvoicesByUserId(userId);
            setInvoices(data);
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const checkStatus = useCallback((targetUser: User) => {
        return SubscriptionBusinessService.determineUserStatus(targetUser);
    }, []);

    const handlePaymentSimulation = async (targetUser: User) => {
        setIsLoading(true);
        try {
            const payload: WebhookPayload = {
                event: 'PAYMENT_RECEIVED',
                transactionId: `tx_${Date.now()}`,
                userId: targetUser.id,
                amount: targetUser.subscriptionPrice || 0,
                gateway: 'STRIPE'
            };

            const updatedUser = await SubscriptionBusinessService.processPaymentWebhook(payload, targetUser);
            setUser(updatedUser);
            
            // In a real app, this would also trigger a global user update via authContext
            return updatedUser;
        } catch (error) {
            console.error('Payment simulation failed:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const validateDoc = (doc: string, type: 'PERSONAL' | 'BUSINESS') => {
        return SubscriptionBusinessService.validateDocument(doc, type);
    };

    const calculateNewExpiration = (current: string, interval: any) => {
        return SubscriptionBusinessService.calculateNextDue(current, interval);
    };

    return {
        user,
        invoices,
        isLoading,
        refreshInvoices,
        checkStatus,
        handlePaymentSimulation,
        validateDoc,
        calculateNewExpiration,
        setUser // Allow manual updates if needed
    };
};
