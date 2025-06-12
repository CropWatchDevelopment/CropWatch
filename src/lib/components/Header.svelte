<!-- <script lang="ts">
	import { goto } from '$app/navigation';
	import ThemeToggle from './theme/ThemeToggle.svelte';
	let { userName } = $props();

	// Simplified logout function
	function handleLogout() {
		console.log('Logging out user:', userName);
		
		// Call the API endpoint for server-side logout
		fetch('/api/auth/logout', {
			method: 'POST'
		}).then(() => {
			console.log('Server logout successful');
			// Redirect to login page
			goto('/auth/login');
		}).catch(err => {
			console.error('Server logout error:', err);
			// Redirect anyway
			goto('/auth/login');
		});
	}

	// Simple log when userName changes for debugging
	$effect(() => {
		console.log('Header userName updated:', userName);
	});
</script>

<header class="dashboard-header bg-cyan-800 text-white p-4">
	<h1>IoT Dashboard</h1>
	<div class="user-controls">
		<span class="welcome-user">Welcome, {userName}</span>
		<ThemeToggle />
		<button class="logout-button" onclick={handleLogout}> Logout </button>
	</div>
</header>

<style>
	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		/* margin-bottom: 20px; */
	}

	.user-controls {
		display: flex;
		align-items: center;
		gap: 15px;
	}

	.welcome-user {
		font-weight: 500;
	}

	.logout-button {
		background-color: #f44336;
		color: white;
		border: none;
		padding: 8px 16px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
		transition: background-color 0.2s;
	}

	.logout-button:hover {
		background-color: #d32f2f;
	}
</style> -->


<script>
  import { onMount } from 'svelte';
  import CropWatchLogo from '$lib/images/favicon.svg';
  import ThemeToggle from './theme/ThemeToggle.svelte';
  import { getDarkMode } from './theme/theme.svelte';
	import { goto } from '$app/navigation';
  let { userName } = $props();

  let mobileMenuOpen = $state(false);
  let announcementVisible = $state(true);
  
  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }
  
  function closeAnnouncement() {
    announcementVisible = false;
  }
  
  // Close mobile menu when clicking outside
  function handleClickOutside(event) {
    if (!event.target.closest('.mobile-menu') && !event.target.closest('.mobile-menu-btn')) {
      mobileMenuOpen = false;
    }
  }

  function handleLogout() {
		console.log('Logging out user:', userName);
		
		// Call the API endpoint for server-side logout
		fetch('/api/auth/logout', {
			method: 'POST'
		}).then(() => {
			console.log('Server logout successful');
			// Redirect to login page
			goto('/auth/login');
		}).catch(err => {
			console.error('Server logout error:', err);
			// Redirect anyway
			goto('/auth/login');
		});
	}
  
  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });
</script>

<!-- Main Header -->
<header class="relative overflow-hidden border-b transition-colors duration-300 {getDarkMode() 
  ? 'bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 border-green-500/20'
  : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 border-green-500/20'
  }">
  <!-- Animated background pattern -->
  <div class="absolute inset-0 opacity-10">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,_{getDarkMode() ? '#22c55e' : '#10b981'}_2px,_transparent_2px),radial-gradient(circle_at_75%_75%,_{getDarkMode() ? '#10b981' : '#059669'}_1px,_transparent_1px)] bg-[length:60px_60px] animate-[drift_20s_linear_infinite]"></div>
  </div>
  
  <nav class="relative flex w-full p-4 z-10">
    <!-- Logo -->
    <a href="/" class="flex items-center gap-3 transition-transform hover:scale-105">
      <!-- <div class="relative w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30"> -->
        <img src={CropWatchLogo} alt="CropWatch Logo" class="h-10" width="40px" height="40px" />
      <!-- </div> -->
<div class="text-2xl font-bold tracking-tight transition-colors duration-300 text-white">
		  CropWatch<sup><small>®</small></sup>
      </div>
    </a>
    
    <!-- Desktop Navigation -->
    <ul class="hidden lg:flex items-center gap-8">
      <li class="relative group">
        <a href="#solutions" class="relative px-4 py-2 font-medium rounded-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 after:absolute after:bottom-0 after:left-1/2 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-green-500 after:to-emerald-500 after:-translate-x-1/2 after:transition-all after:duration-300 hover:after:w-4/5 flex items-center gap-1 {getDarkMode() 
          ? 'text-white/80 hover:text-green-400 hover:bg-green-500/10' 
          : 'text-gray-700 hover:text-green-600 hover:bg-green-500/10'}">
          Solutions
          <svg class="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </a>
      </li>
      <li>
        <a href="#pricing" class="relative px-4 py-2 font-medium rounded-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 after:absolute after:bottom-0 after:left-1/2 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-green-500 after:to-emerald-500 after:-translate-x-1/2 after:transition-all after:duration-300 hover:after:w-4/5 {getDarkMode() 
          ? 'text-white/80 hover:text-green-400 hover:bg-green-500/10' 
          : 'text-gray-700 hover:text-green-600 hover:bg-green-500/10'}">
          Pricing
        </a>
      </li>
      <li class="relative group">
        <a href="#devices" class="relative px-4 py-2 font-medium rounded-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 after:absolute after:bottom-0 after:left-1/2 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-green-500 after:to-emerald-500 after:-translate-x-1/2 after:transition-all after:duration-300 hover:after:w-4/5 flex items-center gap-1 {getDarkMode() 
          ? 'text-white/80 hover:text-green-400 hover:bg-green-500/10' 
          : 'text-gray-700 hover:text-green-600 hover:bg-green-500/10'}">
          Devices
          <svg class="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </a>
      </li>
      <li>
        <a href="#resources" class="relative px-4 py-2 font-medium rounded-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 after:absolute after:bottom-0 after:left-1/2 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-green-500 after:to-emerald-500 after:-translate-x-1/2 after:transition-all after:duration-300 hover:after:w-4/5 {getDarkMode() 
          ? 'text-white/80 hover:text-green-400 hover:bg-green-500/10' 
          : 'text-gray-700 hover:text-green-600 hover:bg-green-500/10'}">
          Resources
        </a>
      </li>
      <li>
        <a href="#about" class="relative px-4 py-2 font-medium rounded-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 after:absolute after:bottom-0 after:left-1/2 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-green-500 after:to-emerald-500 after:-translate-x-1/2 after:transition-all after:duration-300 hover:after:w-4/5 {getDarkMode() 
          ? 'text-white/80 hover:text-green-400 hover:bg-green-500/10' 
          : 'text-gray-700 hover:text-green-600 hover:bg-green-500/10'}">
          About
        </a>
      </li>
    </ul>
    
    <!-- CTA Button -->
	 <span class="flex-1"></span>
    <div class="hidden md:flex items-center gap-3">
      <ThemeToggle />
      <a href="/contact-us" class="relative inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-green-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-green-500/40 overflow-hidden group">
        <button class="logout-button" onclick={handleLogout}> Logout </button>
        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
      </a>
    </div>
    
    <!-- Mobile menu button -->
    <button 
      onclick={toggleMobileMenu}
      class="lg:hidden p-2 rounded-lg transition-colors mobile-menu-btn {getDarkMode() 
        ? 'text-white hover:bg-white/10' 
        : 'text-gray-700 hover:bg-gray-200/50'}"
	  aria-label="Toggle mobile menu"
	  aria-expanded={mobileMenuOpen}
	  aria-controls="mobile-menu"
	  class:open={mobileMenuOpen}
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
      </svg>
    </button>
  </nav>
</header>

<!-- Secondary Navigation/Breadcrumb Bar -->
<div class="backdrop-blur-sm border-b transition-colors duration-300 {getDarkMode() 
  ? 'bg-slate-800/50 border-slate-700/30' 
  : 'bg-white/50 border-gray-200/30'}">
  <div class="max-w-6xl mx-auto px-4 lg:px-8 py-3">
    <div class="flex items-center justify-between">
      <!-- Breadcrumb or secondary nav -->
      <div class="flex items-center gap-2 text-sm {getDarkMode() ? 'text-slate-400' : 'text-gray-600'}">
        <a href="/" class="hover:text-green-400 transition-colors">Home</a>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
        <span class="{getDarkMode() ? 'text-white' : 'text-gray-900'}">Somehow get current Route???</span>
      </div>
      
      <!-- Quick actions -->
      <div class="hidden md:flex items-center gap-4 text-sm">
        <a href="/marketplace" class="hover:text-green-400 transition-colors flex items-center gap-1 {getDarkMode() ? 'text-slate-400' : 'text-gray-600'}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
          </svg>
          Marketplace
        </a>
        <a href="/partners" class="hover:text-green-400 transition-colors flex items-center gap-1 {getDarkMode() ? 'text-slate-400' : 'text-gray-600'}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
          Partners
        </a>
      </div>
    </div>
  </div>
</div>

<!-- Mobile Menu -->
{#if mobileMenuOpen}
  <div class="lg:hidden absolute top-full left-0 right-0 backdrop-blur-lg border-t mobile-menu z-50 transition-colors duration-300 {getDarkMode() 
    ? 'bg-slate-900/95 border-green-500/20' 
    : 'bg-white/95 border-green-500/30'}">
    <div class="p-4 space-y-2">
      <a href="#solutions" class="block px-4 py-3 rounded-lg transition-colors {getDarkMode() 
        ? 'text-white/80 hover:text-green-400 hover:bg-green-500/10' 
        : 'text-gray-700 hover:text-green-600 hover:bg-green-500/10'}">
        Solutions
      </a>
      <a href="#pricing" class="block px-4 py-3 rounded-lg transition-colors {getDarkMode() 
        ? 'text-white/80 hover:text-green-400 hover:bg-green-500/10' 
        : 'text-gray-700 hover:text-green-600 hover:bg-green-500/10'}">
        Pricing
      </a>
      <a href="#devices" class="block px-4 py-3 rounded-lg transition-colors {getDarkMode() 
        ? 'text-white/80 hover:text-green-400 hover:bg-green-500/10' 
        : 'text-gray-700 hover:text-green-600 hover:bg-green-500/10'}">
        Devices
      </a>
      <a href="#resources" class="block px-4 py-3 rounded-lg transition-colors {getDarkMode() 
        ? 'text-white/80 hover:text-green-400 hover:bg-green-500/10' 
        : 'text-gray-700 hover:text-green-600 hover:bg-green-500/10'}">
        Resources
      </a>
      <a href="#about" class="block px-4 py-3 rounded-lg transition-colors {getDarkMode() 
        ? 'text-white/80 hover:text-green-400 hover:bg-green-500/10' 
        : 'text-gray-700 hover:text-green-600 hover:bg-green-500/10'}">
        About
      </a>
      <div class="pt-2 border-t space-y-2 {getDarkMode() ? 'border-white/10' : 'border-gray-200'}">
        <a href="/demo" class="block px-4 py-3 rounded-lg transition-colors {getDarkMode() 
          ? 'text-white/80 hover:text-green-400 hover:bg-green-500/10' 
          : 'text-gray-700 hover:text-green-600 hover:bg-green-500/10'}">
          Demo
        </a>
        <a href="/contact-us" class="block px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg text-center">
          Get Started
        </a>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes drift {
    0% { transform: translateX(0) translateY(0); }
    100% { transform: translateX(-60px) translateY(-60px); }
  }
</style>