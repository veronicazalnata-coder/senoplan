import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useRealTimeSync(playerId?: string) {
	useEffect(() => {
		if (!playerId) return;

		const channel = supabase
			.channel(`messages_player_${playerId}`)
			.on('postgres_changes', {
				event: '*',
				schema: 'public',
				table: 'messages',
				filter: `player_id=eq.${playerId}`,
			}, (payload) => {
				try {
					const key = `chatMessages_${playerId}`;
					const existing = JSON.parse(localStorage.getItem(key) || '[]');
					if (payload.eventType === 'INSERT') {
						existing.push({
							id: payload.new.id,
							text: payload.new.text,
							image: payload.new.image_url,
							sender: payload.new.sender,
							timestamp: new Date(payload.new.created_at)
						});
						localStorage.setItem(key, JSON.stringify(existing));
					}
					// For updates/deletes, a full reload could be implemented
				} catch (_) {}
			});

		channel.subscribe();
		return () => { channel.unsubscribe(); };
	}, [playerId]);
}