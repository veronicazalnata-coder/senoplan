import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

type ServerId = 'server1' | 'server2';

export function useRoundsRealtimeSync() {
	useEffect(() => {
		const channel = supabase
			.channel('rounds_all')
			.on('postgres_changes', { event: '*', schema: 'public', table: 'rounds' }, (payload) => {
				try {
					const row = payload.new as any;
					const serverId = row.server_id as ServerId;
					const nextResult = (row.admin_override_next_result ?? row.next_result) as number | undefined;
					const seri = row.series as number | undefined;

					const currentData = localStorage.getItem('currentServerTimer');
					const timerData: any = currentData ? JSON.parse(currentData) : { server1: {}, server2: {} };

					if (!timerData[serverId]) timerData[serverId] = {};
					if (typeof seri === 'number') timerData[serverId].seri = seri;
					if (typeof nextResult === 'number') timerData[serverId].nextResult = nextResult;
					localStorage.setItem('currentServerTimer', JSON.stringify(timerData));
				} catch (e) {
					console.error('Rounds realtime sync error:', e);
				}
			});

		channel.subscribe();
		return () => { channel.unsubscribe(); };
	}, []);
}