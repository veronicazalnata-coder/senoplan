import { supabase } from '@/lib/supabaseClient';

type ServerId = 'server1' | 'server2';

type BetType = 'besar' | 'kecil' | 'genap' | 'ganjil' | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

export async function createBet(options: {
	playerId: string;
	roundId?: string; // optional for now
	server: ServerId;
	seri: number;
	betType: BetType;
	amount: number;
}) {
	return await supabase.from('bets').insert({
		player_id: options.playerId,
		round_id: options.roundId ?? null,
		bet_type: options.betType,
		amount: options.amount,
		status: 'pending',
	});
}

export async function adminAdjustBet(options: {
	betId: string;
	overrideBetType?: BetType;
	overrideAmount?: number;
	adminId?: string;
}) {
	return await supabase.from('admin_adjustments').insert({
		bet_id: options.betId,
		override_bet_type: options.overrideBetType ?? null,
		override_amount: options.overrideAmount ?? null,
		created_by: options.adminId ?? null,
	});
}