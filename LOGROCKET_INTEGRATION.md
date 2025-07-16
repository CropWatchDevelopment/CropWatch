# LogRocket Integration

This project includes LogRocket integration for session recording, error tracking, and user analytics.

## Setup

1. **Environment Variables**: Add your LogRocket App ID to the `.env` file:
   ```env
   PUBLIC_LOGROCKET_APP_ID=your-app-id-here
   ```

2. **Get your App ID**: Sign up at [LogRocket](https://logrocket.com) and create a new project to get your App ID.

## Features

### Automatic Tracking
- **Session Recording**: All user interactions are automatically recorded
- **Error Tracking**: Unhandled errors and promise rejections are captured
- **Page Navigation**: Route changes are tracked
- **Form Submissions**: Form validation and submission events are logged
- **User Identification**: Users are automatically identified when they log in

### Manual Tracking
You can manually track custom events using the LogRocket store:

```typescript
import { logRocketStore } from '$lib/services/logrocketStore';

// Track user actions
logRocketStore.trackUserAction('button_click', { button: 'export_data' });

// Track custom errors
logRocketStore.trackError('api_call_failed', { endpoint: '/api/data' });

// Track form submissions
logRocketStore.trackFormSubmit('contact_form', true);
```

### Direct LogRocket API
For advanced usage, you can import LogRocket directly:

```typescript
import { LogRocket } from '$lib/services/logrocket';

// Use any LogRocket API
LogRocket.getSessionURL((sessionURL) => {
  console.log('Session URL:', sessionURL);
});
```

## Files Created/Modified

### New Files
- `src/lib/services/logrocket.ts` - Main LogRocket service
- `src/lib/services/logrocketStore.ts` - Svelte store for LogRocket state
- `src/hooks.client.ts` - Global error handling
- `LOGROCKET_INTEGRATION.md` - This documentation

### Modified Files
- `src/routes/+layout.svelte` - Added LogRocket initialization and user identification
- `src/routes/+error.svelte` - Added error tracking
- `src/lib/actions/formValidation.ts` - Added form submission tracking
- `src/lib/index.ts` - Added exports for LogRocket services
- `.env` - Added LogRocket App ID variable

## Privacy Considerations

LogRocket records user sessions and may capture sensitive information. Ensure you:
- Comply with privacy laws (GDPR, CCPA, etc.)
- Add privacy notices to your terms of service
- Consider sanitizing sensitive data before it's sent to LogRocket
- Use LogRocket's privacy controls to exclude sensitive elements

## Production Deployment

Before deploying to production:
1. Set up your production LogRocket App ID
2. Update the `PUBLIC_LOGROCKET_APP_ID` environment variable
3. Test that sessions are being recorded correctly
4. Set up alerts and dashboards in LogRocket console

## Troubleshooting

- **LogRocket not initializing**: Check that `PUBLIC_LOGROCKET_APP_ID` is set correctly
- **No sessions recorded**: Verify the App ID is correct and the browser supports LogRocket
- **Console errors**: Check the browser console for any initialization errors
