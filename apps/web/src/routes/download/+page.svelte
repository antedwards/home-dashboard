<script lang="ts">
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Download - Home Dashboard</title>
</svelte:head>

<div class="download-page">
	<div class="header">
		<h1>Download Home Dashboard</h1>
		<p class="subtitle">Desktop application for Raspberry Pi 4B (ARM64)</p>
	</div>

	<div class="installation-guide">
		<h2>Installation Instructions</h2>

		<div class="guide-section">
			<h3>Using AppImage (Recommended)</h3>
			<ol>
				<li>Download the <code>.AppImage</code> file below</li>
				<li>Make it executable: <code>chmod +x home-dashboard-*.AppImage</code></li>
				<li>Run it: <code>./home-dashboard-*.AppImage</code></li>
			</ol>
		</div>

		<div class="guide-section">
			<h3>Using Debian Package</h3>
			<ol>
				<li>Download the <code>.deb</code> file below</li>
				<li>Install it: <code>sudo dpkg -i home-dashboard-*.deb</code></li>
				<li>Fix dependencies if needed: <code>sudo apt-get install -f</code></li>
				<li>Run from application menu or: <code>home-dashboard</code></li>
			</ol>
		</div>

		<div class="guide-section">
			<h3>Verifying Downloads</h3>
			<ol>
				<li>Download the <code>.sha256</code> checksum file</li>
				<li>Verify: <code>sha256sum -c home-dashboard-*.sha256</code></li>
			</ol>
		</div>
	</div>

	{#if data.releases.length === 0}
		<div class="no-releases">
			<p>No releases available yet. Check back soon!</p>
		</div>
	{:else}
		<div class="releases">
			{#each data.releases as release}
				<div class="release">
					<div class="release-header">
						<h2>Version {release.version}</h2>
						{#if release.files[0]?.createdAt}
							<span class="release-date">{formatDate(release.files[0].createdAt)}</span>
						{/if}
					</div>

					<div class="files">
						{#each release.files as file}
							{#if file.type === 'appimage' || file.type === 'deb'}
								<div class="file-card">
									<div class="file-info">
										<div class="file-name">
											{#if file.type === 'appimage'}
												<span class="file-icon">📦</span>
											{:else}
												<span class="file-icon">📋</span>
											{/if}
											<span class="name">{file.name}</span>
										</div>
										<div class="file-meta">
											{#if file.type === 'appimage'}
												<span class="badge">AppImage</span>
											{:else}
												<span class="badge">Debian Package</span>
											{/if}
											<span class="size">{formatFileSize(file.size)}</span>
										</div>
									</div>
									<a href={file.url} class="download-btn" download>
										Download
									</a>
								</div>
							{/if}
						{/each}

						<!-- Checksum files -->
						{#each release.files as file}
							{#if file.type === 'checksum'}
								<div class="checksum-file">
									<span class="checksum-icon">🔒</span>
									<a href={file.url} download>{file.name}</a>
								</div>
							{/if}
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<div class="help-section">
		<h2>Need Help?</h2>
		<p>
			If you encounter any issues during installation or setup, please visit our
			<a href="https://github.com/antedwards/home-dashboard" target="_blank" rel="noopener noreferrer">
				GitHub repository
			</a>
			to file an issue or check existing documentation.
		</p>
	</div>
</div>

<style>
	.download-page {
		max-width: 900px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.header h1 {
		font-size: 2.5rem;
		font-weight: 700;
		color: #1f2937;
		margin-bottom: 0.5rem;
	}

	.subtitle {
		font-size: 1.125rem;
		color: #6b7280;
	}

	.installation-guide {
		background: #f9fafb;
		border-radius: 0.75rem;
		padding: 2rem;
		margin-bottom: 3rem;
	}

	.installation-guide h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 1.5rem;
	}

	.guide-section {
		margin-bottom: 1.5rem;
	}

	.guide-section:last-child {
		margin-bottom: 0;
	}

	.guide-section h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #374151;
		margin-bottom: 0.75rem;
	}

	.guide-section ol {
		margin-left: 1.5rem;
		color: #4b5563;
	}

	.guide-section li {
		margin-bottom: 0.5rem;
	}

	.guide-section code {
		background: #e5e7eb;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-family: monospace;
		font-size: 0.875rem;
		color: #1f2937;
	}

	.no-releases {
		text-align: center;
		padding: 3rem;
		background: #f9fafb;
		border-radius: 0.75rem;
	}

	.no-releases p {
		color: #6b7280;
		font-size: 1.125rem;
	}

	.releases {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.release {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		padding: 1.5rem;
	}

	.release-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.release-header h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
	}

	.release-date {
		color: #6b7280;
		font-size: 0.875rem;
	}

	.files {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.file-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		transition: all 0.2s;
	}

	.file-card:hover {
		background: #f3f4f6;
		border-color: #d1d5db;
	}

	.file-info {
		flex: 1;
	}

	.file-name {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.file-icon {
		font-size: 1.5rem;
	}

	.name {
		font-weight: 500;
		color: #1f2937;
		word-break: break-all;
	}

	.file-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		background: #3b82f6;
		color: white;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.size {
		color: #6b7280;
		font-size: 0.875rem;
	}

	.download-btn {
		padding: 0.625rem 1.5rem;
		background: #3b82f6;
		color: white;
		text-decoration: none;
		border-radius: 0.5rem;
		font-weight: 500;
		transition: background-color 0.2s;
	}

	.download-btn:hover {
		background: #2563eb;
	}

	.checksum-file {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.checksum-icon {
		font-size: 1rem;
	}

	.checksum-file a {
		color: #3b82f6;
		text-decoration: none;
	}

	.checksum-file a:hover {
		text-decoration: underline;
	}

	.help-section {
		margin-top: 3rem;
		padding: 2rem;
		background: #eff6ff;
		border-radius: 0.75rem;
		text-align: center;
	}

	.help-section h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 1rem;
	}

	.help-section p {
		color: #4b5563;
		font-size: 1rem;
	}

	.help-section a {
		color: #3b82f6;
		font-weight: 500;
		text-decoration: none;
	}

	.help-section a:hover {
		text-decoration: underline;
	}

	@media (max-width: 640px) {
		.header h1 {
			font-size: 2rem;
		}

		.release-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.file-card {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.download-btn {
			width: 100%;
			text-align: center;
		}
	}
</style>
