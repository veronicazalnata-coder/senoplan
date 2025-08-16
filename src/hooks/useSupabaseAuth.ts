import { useEffect, useState } from 'react';

export function useSupabaseAuth(loginUserId?: string) {
	const [userId, setUserId] = useState<string | undefined>(undefined);
	useEffect(() => {
		setUserId(loginUserId);
	}, [loginUserId]);
	return { userId };
}