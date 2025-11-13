import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

interface UpdateInfo {
  version: string;
  releaseDate: string;
  platform: string;
  arch: string;
  files: {
    url: string;
    size: number;
    checksum: string;
  }[];
  releaseNotes?: string;
}

export const GET: RequestHandler = async ({ request, url }) => {
  try {
    // Get device token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Create Supabase client with service role to check auth
    const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify device token
    const { data: deviceToken, error: authError } = await supabase
      .from('device_tokens')
      .select('*')
      .eq('token_hash', token)
      .single();

    if (authError || !deviceToken) {
      return json({ error: 'Invalid device token' }, { status: 401 });
    }

    // Check if token is expired
    if (new Date(deviceToken.expires_at) < new Date()) {
      return json({ error: 'Device token expired' }, { status: 401 });
    }

    // Get query parameters
    const platform = url.searchParams.get('platform') || 'linux';
    const arch = url.searchParams.get('arch') || 'x64';
    const currentVersion = url.searchParams.get('version');

    // List files in the app-updates bucket
    const { data: files, error: listError } = await supabase
      .storage
      .from('app-updates')
      .list('', {
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (listError) {
      console.error('Failed to list update files:', listError);
      return json({ error: 'Failed to fetch updates' }, { status: 500 });
    }

    if (!files || files.length === 0) {
      return json({ error: 'No updates available' }, { status: 404 });
    }

    // Find the latest update for this platform/arch
    // Expected filename format: home-dashboard-{version}-{platform}-{arch}.{ext}
    const platformFiles = files.filter(file => {
      const name = file.name.toLowerCase();
      return name.includes(platform) && name.includes(arch);
    });

    if (platformFiles.length === 0) {
      return json({ error: 'No updates for this platform' }, { status: 404 });
    }

    // Parse version from filename (e.g., home-dashboard-0.1.0-linux-x64.AppImage)
    const latestFile = platformFiles[0];
    const versionMatch = latestFile.name.match(/(\d+\.\d+\.\d+)/);
    if (!versionMatch) {
      return json({ error: 'Invalid update file format' }, { status: 500 });
    }

    const latestVersion = versionMatch[1];

    // If current version matches latest, no update needed
    if (currentVersion && currentVersion === latestVersion) {
      return json({ updateAvailable: false });
    }

    // Get signed URL for download (valid for 1 hour)
    const { data: urlData, error: urlError } = await supabase
      .storage
      .from('app-updates')
      .createSignedUrl(latestFile.name, 3600);

    if (urlError || !urlData) {
      console.error('Failed to create signed URL:', urlError);
      return json({ error: 'Failed to generate download URL' }, { status: 500 });
    }

    // Check for checksum file
    const checksumFileName = `${latestFile.name}.sha256`;
    const { data: checksumData, error: checksumError } = await supabase
      .storage
      .from('app-updates')
      .download(checksumFileName);

    let checksum = '';
    if (!checksumError && checksumData) {
      checksum = await checksumData.text();
      checksum = checksum.trim().split(' ')[0]; // Extract just the hash
    }

    // Build update info
    const updateInfo: UpdateInfo = {
      version: latestVersion,
      releaseDate: latestFile.created_at || new Date().toISOString(),
      platform,
      arch,
      files: [
        {
          url: urlData.signedUrl,
          size: latestFile.metadata?.size || 0,
          checksum,
        },
      ],
    };

    return json({
      updateAvailable: true,
      ...updateInfo,
    });
  } catch (error) {
    console.error('Update check error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
