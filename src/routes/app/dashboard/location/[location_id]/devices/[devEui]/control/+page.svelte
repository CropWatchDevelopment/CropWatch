<!-- CityControlSystem.svelte -->
<script lang="ts">
  // Type definitions
  interface Device {
    id: string;
    name: string;
    status: 'on' | 'off' | 'locked' | 'unlocked';
  }

  interface Building {
    id: number;
    name: string;
    x: number;
    y: number;
    lights: Device[];
    locks: Device[];
  }

  // Mock data for buildings and their devices - using $state for reactivity
  let buildings: Building[] = $state([
    {
      id: 1,
      name: "City Hall",
      x: 300,
      y: 200,
      lights: [
        { id: 'ch-l1', name: 'Main Lobby', status: 'on' },
        { id: 'ch-l2', name: 'Council Chamber', status: 'off' },
        { id: 'ch-l3', name: 'Mayor Office', status: 'on' },
        { id: 'ch-l4', name: 'Emergency Exit', status: 'on' }
      ],
      locks: [
        { id: 'ch-d1', name: 'Main Entrance', status: 'locked' },
        { id: 'ch-d2', name: 'Security Office', status: 'locked' },
        { id: 'ch-d3', name: 'Storage Room', status: 'unlocked' }
      ]
    },
    {
      id: 2,
      name: "Police Station",
      x: 150,
      y: 350,
      lights: [
        { id: 'ps-l1', name: 'Reception', status: 'on' },
        { id: 'ps-l2', name: 'Holding Cells', status: 'on' },
        { id: 'ps-l3', name: 'Detective Office', status: 'off' },
        { id: 'ps-l4', name: 'Evidence Room', status: 'on' }
      ],
      locks: [
        { id: 'ps-d1', name: 'Main Door', status: 'unlocked' },
        { id: 'ps-d2', name: 'Armory', status: 'locked' },
        { id: 'ps-d3', name: 'Evidence Vault', status: 'locked' },
        { id: 'ps-d4', name: 'Cell Block', status: 'locked' }
      ]
    },
    {
      id: 3,
      name: "Fire Department",
      x: 450,
      y: 300,
      lights: [
        { id: 'fd-l1', name: 'Bay Area', status: 'on' },
        { id: 'fd-l2', name: 'Equipment Room', status: 'off' },
        { id: 'fd-l3', name: 'Office', status: 'on' }
      ],
      locks: [
        { id: 'fd-d1', name: 'Bay Doors', status: 'unlocked' },
        { id: 'fd-d2', name: 'Equipment Storage', status: 'locked' }
      ]
    },
    {
      id: 4,
      name: "Library",
      x: 250,
      y: 450,
      lights: [
        { id: 'lib-l1', name: 'Reading Area', status: 'on' },
        { id: 'lib-l2', name: 'Computer Lab', status: 'on' },
        { id: 'lib-l3', name: 'Archive', status: 'off' },
        { id: 'lib-l4', name: 'Study Rooms', status: 'on' }
      ],
      locks: [
        { id: 'lib-d1', name: 'Main Entrance', status: 'unlocked' },
        { id: 'lib-d2', name: 'Archive Door', status: 'locked' },
        { id: 'lib-d3', name: 'Staff Room', status: 'locked' }
      ]
    },
    {
      id: 5,
      name: "Hospital",
      x: 400,
      y: 150,
      lights: [
        { id: 'hosp-l1', name: 'Emergency Room', status: 'on' },
        { id: 'hosp-l2', name: 'Surgery Suite', status: 'on' },
        { id: 'hosp-l3', name: 'Patient Rooms', status: 'on' },
        { id: 'hosp-l4', name: 'Pharmacy', status: 'off' }
      ],
      locks: [
        { id: 'hosp-d1', name: 'Main Entrance', status: 'unlocked' },
        { id: 'hosp-d2', name: 'Pharmacy', status: 'locked' },
        { id: 'hosp-d3', name: 'Medical Storage', status: 'locked' },
        { id: 'hosp-d4', name: 'ICU Access', status: 'locked' }
      ]
    }
  ]);
  
  let selectedBuilding: Building | null = $state(null);
  let viewMode: 'lights' | 'locks' = $state('lights');
  
  function selectBuilding(building: Building) {
    selectedBuilding = building;
  }
  
  function toggleDevice(device: Device) {
    if (viewMode === 'lights') {
      device.status = device.status === 'on' ? 'off' : 'on';
    } else {
      device.status = device.status === 'locked' ? 'unlocked' : 'locked';
    }
  }
  
  function getDeviceColor(device: Device): string {
    if (viewMode === 'lights') {
      return device.status === 'on' ? '#22c55e' : '#ef4444';
    } else {
      return device.status === 'locked' ? '#ef4444' : '#22c55e';
    }
  }
  
  function getBuildingColor(building: Building): string {
    if (viewMode === 'lights') {
      const onCount = building.lights.filter((l: Device) => l.status === 'on').length;
      const total = building.lights.length;
      return onCount === total ? '#22c55e' : onCount > 0 ? '#f59e0b' : '#ef4444';
    } else {
      const lockedCount = building.locks.filter((l: Device) => l.status === 'locked').length;
      const total = building.locks.length;
      return lockedCount === total ? '#ef4444' : lockedCount > 0 ? '#f59e0b' : '#22c55e';
    }
  }
</script>

<div class="max-w-7xl mx-auto p-5 font-sans bg-gradient-to-br from-indigo-500 to-purple-600 min-h-screen">
  <header class="bg-white/95 p-5 rounded-xl mb-5 flex md:flex-row flex-col md:justify-between md:items-center gap-4 md:text-left text-center shadow-lg">
    <h1 class="m-0 text-gray-800 text-3xl font-bold">City Infrastructure Control System</h1>
    <div class="flex gap-2.5">
      <button 
        class={`px-5 py-2.5 border-2 border-gray-200 bg-white rounded-lg cursor-pointer text-base font-semibold transition-all duration-200 hover:border-indigo-500 hover:-translate-y-px ${viewMode === 'lights' ? 'bg-indigo-500 text-white border-indigo-500' : ''}`}
        onclick={() => viewMode = 'lights'}
      >
        💡 Lights
      </button>
      <button 
        class={`px-5 py-2.5 border-2 border-gray-200 bg-white rounded-lg cursor-pointer text-base font-semibold transition-all duration-200 hover:border-indigo-500 hover:-translate-y-px ${viewMode === 'locks' ? 'bg-indigo-500 text-white border-indigo-500' : ''}`}
        onclick={() => viewMode = 'locks'}
      >
        🔒 Locks
      </button>
    </div>
  </header>

  <div class="grid md:grid-cols-2 grid-cols-1 gap-5 md:h-[calc(100vh-140px)] h-auto">
    <div class="bg-white/95 rounded-xl p-5 shadow-lg overflow-y-auto">
      <h2 class="text-gray-800 mt-0">City Map</h2>
      <div class="mb-5">
        <svg viewBox="0 0 600 600" class="w-full md:h-96 h-80 border-2 border-gray-200 rounded-lg bg-gray-50">
          <!-- Grid lines -->
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" stroke-width="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          <!-- Streets -->
          <rect x="0" y="100" width="600" height="20" fill="#6b7280" />
          <rect x="0" y="280" width="600" height="20" fill="#6b7280" />
          <rect x="0" y="420" width="600" height="20" fill="#6b7280" />
          <rect x="100" y="0" width="20" height="600" fill="#6b7280" />
          <rect x="320" y="0" width="20" height="600" fill="#6b7280" />
          
          <!-- Buildings -->
          {#each buildings as building (building.id)}
            <g onclick={() => selectBuilding(building)} class="cursor-pointer" role="button" tabindex="0">
              <circle
                cx={building.x}
                cy={building.y}
                r="25"
                fill={getBuildingColor(building)}
                stroke={selectedBuilding?.id === building.id ? '#1f2937' : '#374151'}
                stroke-width={selectedBuilding?.id === building.id ? '3' : '2'}
                class="transition-all duration-200 hover:r-30 hover:drop-shadow-lg"
              />
              <text
                x={building.x}
                y={building.y + 40}
                text-anchor="middle"
                class="text-xs font-semibold fill-gray-700"
              >
                {building.name}
              </text>
            </g>
          {/each}
        </svg>
      </div>
      
      <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 class="m-0 mb-2.5 text-base text-gray-700">Status Legend</h3>
        <div class="flex flex-col gap-2">
          {#if viewMode === 'lights'}
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-full border border-gray-300" style="background-color: #22c55e;"></div>
              <span>All lights on</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-full border border-gray-300" style="background-color: #f59e0b;"></div>
              <span>Some lights on</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-full border border-gray-300" style="background-color: #ef4444;"></div>
              <span>All lights off</span>
            </div>
          {:else}
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-full border border-gray-300" style="background-color: #ef4444;"></div>
              <span>All doors locked</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-full border border-gray-300" style="background-color: #f59e0b;"></div>
              <span>Some doors locked</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-full border border-gray-300" style="background-color: #22c55e;"></div>
              <span>All doors unlocked</span>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div class="bg-white/95 rounded-xl p-5 shadow-lg overflow-y-auto">
      {#if selectedBuilding}
        <h2 class="text-gray-800 mt-0">{selectedBuilding.name} - {viewMode === 'lights' ? 'Lights' : 'Door Locks'}</h2>
        
        <div class="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4 mb-5">
          {#each viewMode === 'lights' ? selectedBuilding.lights : selectedBuilding.locks as device (device.id)}
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 flex justify-between items-center transition-all duration-200 hover:border-indigo-500 hover:-translate-y-0.5 hover:shadow-lg">
              <div>
                <h4 class="m-0 mb-1 text-gray-800 text-base">{device.name}</h4>
                <span class="font-semibold text-sm" style="color: {getDeviceColor(device)};">
                  {#if viewMode === 'lights'}
                    {device.status === 'on' ? '💡 ON' : '🌙 OFF'}
                  {:else}
                    {device.status === 'locked' ? '🔒 LOCKED' : '🔓 UNLOCKED'}
                  {/if}
                </span>
              </div>
              <button 
                class={`px-4 py-2 border-2 border-gray-200 bg-white rounded-md cursor-pointer font-semibold transition-all duration-200 hover:border-indigo-500 ${device.status === 'on' || device.status === 'locked' ? 'bg-red-500 text-white border-red-500' : ''}`}
                onclick={() => toggleDevice(device)}
              >
                {#if viewMode === 'lights'}
                  {device.status === 'on' ? 'Turn Off' : 'Turn On'}
                {:else}
                  {device.status === 'locked' ? 'Unlock' : 'Lock'}
                {/if}
              </button>
            </div>
          {/each}
        </div>
        
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 class="m-0 mb-2.5 text-blue-700">Building Summary</h3>
          {#if viewMode === 'lights'}
            <p>
              {selectedBuilding.lights.filter((l: Device) => l.status === 'on').length} of {selectedBuilding.lights.length} lights are on
            </p>
          {:else}
            <p>
              {selectedBuilding.locks.filter((l: Device) => l.status === 'locked').length} of {selectedBuilding.locks.length} doors are locked
            </p>
          {/if}
        </div>
      {:else}
        <div class="text-center py-10 px-5">
          <h2 class="text-gray-800 mt-0">Select a Building</h2>
          <p>Click on a building marker on the map to view and control its {viewMode}.</p>
          
          <div class="mt-8 text-left">
            <h3 class="text-gray-800 mt-0">Available Buildings:</h3>
            {#each buildings as building (building.id)}
              <button 
                class="flex items-center gap-3 w-full p-3 mb-2 border border-gray-200 bg-white rounded-lg cursor-pointer transition-all duration-200 hover:border-indigo-500 hover:translate-x-1"
                onclick={() => selectBuilding(building)}
              >
                <span class="w-3 h-3 rounded-full border border-gray-300" style="background-color: {getBuildingColor(building)};"></span>
                {building.name}
                <span class="ml-auto text-sm text-gray-500">
                  {#if viewMode === 'lights'}
                    {building.lights.length} lights
                  {:else}
                    {building.locks.length} locks
                  {/if}
                </span>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>