import { useQuery } from '@tanstack/react-query';

interface UseCostsParams {
    startDate?: string;
    endDate?: string;
}

interface CostData {
    success: boolean;
    data: {
        total_cost: number;
        cost_by_type: Record<string, number>;
        chart_data: Array<{ date: string; amount: number }>;
        records: Array<{
            id: string;
            user_id: string;
            job_id: string | null;
            cost_type: string;
            amount: number;
            details: any | null;
            billing_period: string;
            recorded_at: string;
        }>;
    };
}

/**
 * React Query hook for cost analytics
 * From Section E06 - Cost Tracking
 */
export function useCosts(params?: UseCostsParams) {
    return useQuery<CostData>({
        queryKey: ['costs', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params?.startDate) searchParams.set('start_date', params.startDate);
            if (params?.endDate) searchParams.set('end_date', params.endDate);

            const response = await fetch(`/api/costs?${searchParams}`);

            if (!response.ok) {
                throw new Error('Failed to fetch costs');
            }

            return response.json();
        },
        staleTime: 60 * 1000, // 1 minute
    });
}
