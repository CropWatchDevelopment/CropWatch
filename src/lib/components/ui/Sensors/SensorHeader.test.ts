// SensorStatus.test.ts

import { readable } from 'svelte/store';
import { render, screen } from '@testing-library/svelte';
import { describe, it, vi, beforeEach, afterEach } from 'vitest';

// Mock the svelte-i18n module
vi.mock('svelte-i18n', () => {
  return { _: readable((key: string) => key) };
});

// Mock image imports
vi.mock('$lib/images/UI/cw-10.svg', () => ({
  default: 'active-image-mock',
}));
vi.mock('$lib/images/UI/cw_sensor_status_inactive.svg', () => ({
  default: 'inactive-image-mock',
}));

// Mock svelte-ux components
vi.mock('svelte-ux', () => ({
  CopyButton: {},
  Duration: {},
  Tooltip: {},
}));

// Import the component under test after the mocks
import SensorHeader from './SensorHeader.svelte';

describe('SensorHeader component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders active status when isActiveRecently is true', () => {
    const sensorName = 'Test Sensor';
    const lastSeen = new Date('2023-01-01T11:55:00Z'); // 5 minutes ago
    const upload_interval = 10; // 10 minutes

    render(SensorHeader, {
      props: {
        sensorName,
        lastSeen,
        upload_interval,
      },
    });


  });

  it('renders inactive status when isActiveRecently is false', () => {
    const sensorName = 'Test Sensor';
    const lastSeen = new Date('2023-01-01T11:20:00Z'); // 40 minutes ago
    const upload_interval = 10; // 10 minutes

    render(SensorHeader, {
      props: {
        sensorName,
        lastSeen,
        upload_interval,
      },
    });


  });
});
