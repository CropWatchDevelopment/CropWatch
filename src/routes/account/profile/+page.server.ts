import type { Profile } from '$lib/interfaces/profile.interface';
import type { PageServerLoad } from './$types';

const readString = (value: unknown): string => {
	if (typeof value !== 'string') {
		return '';
	}

	return value.trim();
};

const emailToUsername = (email: string): string => {
	const [localPart = ''] = email.split('@');
	return localPart.trim();
};

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.jwt ?? null;
	const email = readString(session?.email);
	const fullName = readString(session?.user_metadata?.full_name);
	const usernameFromMetadata = readString(session?.user_metadata?.name);
	const phoneNumber = readString(session?.phone);

	const profile: Profile = {
		username: usernameFromMetadata || emailToUsername(email),
		full_name: fullName,
		website: '',
		employer: '',
		phone_number: phoneNumber
	};

	return {
		email: email || null,
		role: readString(session?.role) || null,
		profile
	};
};
