import type { PageServerLoad } from './$types';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async () => {
	const supabase = createClient(
		env.SUPABASE_URL || '',
		env.SUPABASE_SERVICE_ROLE_KEY || ''
	);

	try {
		// List all files in the app-updates bucket
		const { data: files, error } = await supabase.storage
			.from('app-updates')
			.list('', {
				limit: 100,
				sortBy: { column: 'created_at', order: 'desc' }
			});

		if (error) {
			console.error('Error fetching releases:', error);
			return { releases: [] };
		}

		// Group files by version
		const releaseMap = new Map<string, {
			version: string;
			files: Array<{
				name: string;
				size: number;
				createdAt: string;
				type: 'appimage' | 'deb' | 'checksum' | 'metadata';
				url: string;
			}>;
		}>();

		for (const file of files || []) {
			// Extract version from filename (e.g., home-dashboard-0.1.0-arm64.AppImage)
			const versionMatch = file.name.match(/home-dashboard-(\d+\.\d+\.\d+)/);
			if (!versionMatch) continue;

			const version = versionMatch[1];

			if (!releaseMap.has(version)) {
				releaseMap.set(version, { version, files: [] });
			}

			const release = releaseMap.get(version)!;

			// Get public URL for the file
			const { data: urlData } = supabase.storage
				.from('app-updates')
				.getPublicUrl(file.name);

			let type: 'appimage' | 'deb' | 'checksum' | 'metadata';
			if (file.name.endsWith('.AppImage')) {
				type = 'appimage';
			} else if (file.name.endsWith('.deb')) {
				type = 'deb';
			} else if (file.name.endsWith('.sha256')) {
				type = 'checksum';
			} else {
				type = 'metadata';
			}

			release.files.push({
				name: file.name,
				size: file.metadata?.size || 0,
				createdAt: file.created_at || '',
				type,
				url: urlData.publicUrl
			});
		}

		// Convert to array and sort by version (newest first)
		const releases = Array.from(releaseMap.values()).sort((a, b) => {
			const aParts = a.version.split('.').map(Number);
			const bParts = b.version.split('.').map(Number);

			for (let i = 0; i < 3; i++) {
				if (aParts[i] !== bParts[i]) {
					return bParts[i] - aParts[i];
				}
			}
			return 0;
		});

		return { releases };
	} catch (err) {
		console.error('Error loading releases:', err);
		return { releases: [] };
	}
};
