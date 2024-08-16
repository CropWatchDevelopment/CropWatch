<script lang="ts">
    import { goto } from '$app/navigation';
    import { mdiAccount, mdiDevices, mdiEye } from '@mdi/js';
    import { onMount } from 'svelte';
    import { Button, ExpansionPanel, ListItem } from 'svelte-ux';
    
    let users: any[] = [];
    let searchTerm = ''; // Two-way binding for search input
    let sortDirection = 'asc'; // Track sort direction for device sorting
    let emailSortDirection = 'asc'; // Track sort direction for email sorting
    let sortBy = 'devices'; // Track what to sort by: 'devices' or 'email'
    let filteredAndSortedUsers: any[] = []; // Store the final filtered and sorted users
    
    // Fetch users on mount
    onMount(async () => {
      const usersPromise = await fetch('/api/v1/users');
      users = await usersPromise.json();
      updateUsers(); // Apply sorting and filtering after fetching
    });
  
    // Filter and sort users
    function updateUsers() {
      filteredAndSortedUsers = users
        .filter(user => user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) // Filter by search term
        .sort((a, b) => {
          if (sortBy === 'devices') {
            const diff = a.devices.length - b.devices.length;
            return sortDirection === 'asc' ? diff : -diff;
          } else if (sortBy === 'email') {
            const emailComparison = a.email.localeCompare(b.email);
            return emailSortDirection === 'asc' ? emailComparison : -emailComparison;
          }
        });
    }
  
    // Toggle sort direction for devices and update users
    function toggleDeviceSortDirection() {
      sortBy = 'devices';
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      updateUsers();
    }
  
    // Toggle sort direction for email and update users
    function toggleEmailSortDirection() {
      sortBy = 'email';
      emailSortDirection = emailSortDirection === 'asc' ? 'desc' : 'asc';
      updateUsers();
    }
  
    // Watch for search term changes
    $: searchTerm, updateUsers();
  </script>
  
  <h1>All Users ({filteredAndSortedUsers.length}):</h1>
  
  <div class="controls">
    <!-- Search Bar -->
    <input
      type="text"
      bind:value={searchTerm}
      placeholder="Search by email"
      class="search-input"
    />
  
    <!-- Sort by Number of Devices Button -->
    <Button on:click={toggleDeviceSortDirection} class="sort-button">
      Sort by number of devices ({sortDirection})
    </Button>
  
    <!-- Sort by Email Button -->
    <Button on:click={toggleEmailSortDirection} class="sort-button">
      Sort by email ({emailSortDirection})
    </Button>
  </div>
  
  <ul>
    {#each filteredAndSortedUsers as user}
      {#if user.email}
        <ExpansionPanel>
          <ListItem
            slot="trigger"
            title="{user.email}"
            subheading={user.devices.length + ' devices'}
            icon={mdiAccount}
            avatar={{ class: 'bg-surface-content/50 text-surface-100/90' }}
            class="flex-1"
            noShadow
          />
          <div>
            {#each user.devices as deviceOwner}
              {#if deviceOwner}
                <ListItem title={deviceOwner.name} icon={mdiDevices}>
                  <div slot="actions">
                    <Button
                      icon={mdiEye}
                      variant="fill"
                      color="info"
                      on:click={() => goto(`/app/devices/${deviceOwner.dev_eui}/data`)}
                    />
                  </div>
                </ListItem>
              {/if}
            {/each}
          </div>
        </ExpansionPanel>
      {/if}
    {/each}
  </ul>
  
  <style>
    .controls {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    
    .search-input {
      flex: 1;
      padding: 0.5rem;
      border-radius: 4px;
      border: 1px solid #ccc;
    }
  
    .sort-button {
      white-space: nowrap;
    }
  </style>
  