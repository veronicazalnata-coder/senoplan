import { useState } from 'react';
import { uploadChatImage } from '@/services/supabaseStorage';

export function useChatUpload(playerId?: string) {
	const [isUploading, setIsUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const upload = async (file: File) => {
		if (!playerId) throw new Error('Missing playerId');
		setIsUploading(true);
		setError(null);
		try {
			const url = await uploadChatImage(playerId, file);
			return url;
		} catch (e: any) {
			setError(e.message ?? 'Upload failed');
			return null;
		} finally {
			setIsUploading(false);
		}
	};

	return { isUploading, error, upload } as const;
}