import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useWithdrawalsRealtime(playerId?: string) {
	useEffect(() => {
		if (!playerId) return;
		const channel = supabase
			.channel(`withdrawals_${playerId}`)
			.on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals', filter: `player_id=eq.${playerId}` }, (payload) => {
				try {
					const key = `withdrawalHistory_${playerId}`;
					const history = JSON.parse(localStorage.getItem(key) || '[]');
					if (payload.eventType === 'INSERT') {
						history.push(payload.new);
						localStorage.setItem(key, JSON.stringify(history));
					}
					if (payload.eventType === 'UPDATE') {
						const idx = history.findIndex((h: any) => h.id === payload.new.id);
						if (idx >= 0) {
							history[idx] = payload.new;
							localStorage.setItem(key, JSON.stringify(history));
						}
					}
				} catch (e) {
					console.error('Withdrawals realtime sync error:', e);
				}
			});
		channel.subscribe();
		return () => { channel.unsubscribe(); };
	}, [playerId]);
}