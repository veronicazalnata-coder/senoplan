import { supabase } from '@/lib/supabaseClient';

export async function uploadChatImage(playerId: string, file: File) {
	const filePath = `${playerId}/${Date.now()}-${file.name}`;
	const { data, error } = await supabase.storage.from('chat-images').upload(filePath, file, {
		cacheControl: '3600',
		upsert: false,
	});
	if (error) throw error;
	const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(data.path);
	return urlData.publicUrl;
}