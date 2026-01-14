import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw redirect(303, '/auth');
	}

	// Fetch the user's profile
	const { data: profile, error } = await supabase
		.from('profiles')
		.select('*')
		.eq('id', session.user.id)
		.single();

	if (error) {
		console.error('Error fetching profile:', error);
	}

	return {
		profile,
		user: session.user,
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();

		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const username = formData.get('username') as string;
		const fullName = formData.get('full_name') as string;
		const employer = formData.get('employer') as string;
		const temperatureUnit = formData.get('temperature_unit') as string;

		// Validate username (optional, but if provided, must be at least 3 characters)
		if (username && username.length < 3) {
			return fail(400, { error: 'Username must be at least 3 characters long' });
		}

		const { error } = await supabase
			.from('profiles')
			.update({
				username: username || null,
				full_name: fullName || null,
				employer: employer || null,
				updated_at: new Date().toISOString()
			})
			.eq('id', session.user.id);

		if (error) {
			console.error('Error updating profile:', error);
			return fail(500, { error: 'Failed to update profile' });
		}

		return { success: true, message: 'Profile updated successfully' };
	},

	updatePassword: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();

		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const newPassword = formData.get('new_password') as string;
		const confirmPassword = formData.get('confirm_password') as string;

		// Validate passwords
		if (!newPassword || newPassword.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters long', action: 'password' });
		}

		if (newPassword !== confirmPassword) {
			return fail(400, { error: 'Passwords do not match', action: 'password' });
		}

		const { error } = await supabase.auth.updateUser({
			password: newPassword
		});

		if (error) {
			console.error('Error updating password:', error);
			return fail(500, { error: 'Failed to update password', action: 'password' });
		}

		return { success: true, message: 'Password updated successfully', action: 'password' };
	},

	uploadAvatar: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();

		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const avatar = formData.get('avatar') as File;

		if (!avatar || avatar.size === 0) {
			return fail(400, { error: 'No file uploaded', action: 'avatar' });
		}

		// Validate file type
		const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
		if (!validTypes.includes(avatar.type)) {
			return fail(400, { error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.', action: 'avatar' });
		}

		// Validate file size (max 2MB)
		const maxSize = 2 * 1024 * 1024;
		if (avatar.size > maxSize) {
			return fail(400, { error: 'File size must be less than 2MB', action: 'avatar' });
		}

		// Generate unique filename
		const fileExt = avatar.name.split('.').pop();
		const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
		const filePath = `avatars/${fileName}`;

		// Upload to Supabase Storage
		const { error: uploadError } = await supabase.storage
			.from('avatars')
			.upload(filePath, avatar, {
				cacheControl: '3600',
				upsert: false
			});

		if (uploadError) {
			console.error('Error uploading avatar:', uploadError);
			return fail(500, { error: 'Failed to upload avatar', action: 'avatar' });
		}

		// Get public URL
		const { data: { publicUrl } } = supabase.storage
			.from('avatars')
			.getPublicUrl(filePath);

		// Update profile with new avatar URL
		const { error: updateError } = await supabase
			.from('profiles')
			.update({
				avatar_url: publicUrl,
				updated_at: new Date().toISOString()
			})
			.eq('id', session.user.id);

		if (updateError) {
			console.error('Error updating profile with avatar:', updateError);
			return fail(500, { error: 'Failed to update profile with new avatar', action: 'avatar' });
		}

		return { success: true, message: 'Avatar uploaded successfully', action: 'avatar', avatarUrl: publicUrl };
	},

	removeAvatar: async ({ locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();

		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		// Update profile to remove avatar URL
		const { error } = await supabase
			.from('profiles')
			.update({
				avatar_url: null,
				updated_at: new Date().toISOString()
			})
			.eq('id', session.user.id);

		if (error) {
			console.error('Error removing avatar:', error);
			return fail(500, { error: 'Failed to remove avatar', action: 'avatar' });
		}

		return { success: true, message: 'Avatar removed successfully', action: 'avatar' };
	}
};
