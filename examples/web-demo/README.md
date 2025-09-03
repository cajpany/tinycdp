# TinyCDP Web Demo

A complete demo web application showcasing the TinyCDP SDK in action.

## Features

This demo demonstrates:

- **User Identification**: Create and identify users with traits
- **Event Tracking**: Track user actions like page views and purchases
- **Real-time Decisions**: Check feature flags for personalization
- **Event Batching**: See how events are queued and flushed
- **Error Handling**: Graceful handling of API errors
- **Performance Monitoring**: Real-time stats on SDK usage

## Setup

1. **Start TinyCDP Backend**:
   ```bash
   cd ../../
   encore run
   ```

2. **Create API Keys**:
   ```bash
   npx tsx scripts/create-admin-key.ts
   ```

3. **Update Configuration**:
   Edit `index.html` and update the `TINYCDP_CONFIG` object with your actual API keys:
   ```javascript
   const TINYCDP_CONFIG = {
     endpoint: 'http://localhost:4000',
     writeKey: 'your-actual-write-key',
     readKey: 'your-actual-read-key',
     debug: true,
   };
   ```

4. **Seed Data** (Optional):
   ```bash
   cd ../../
   npm run seed
   ```

5. **Open Demo**:
   Open `index.html` in your browser or serve it with a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (if you have http-server installed)
   npx http-server
   
   # Then open http://localhost:8000
   ```

## Usage

### 1. Identify a User
Click "Identify User" to create a new demo user with traits. This will:
- Create a user with a random ID
- Set basic traits (email, plan, joinedAt)
- Track a page_view event

### 2. Track Events
Click any "Purchase" button to track purchase events. Each purchase:
- Tracks an event with product and amount details
- Gets queued for batching
- Shows in the event log

### 3. Check Feature Flags
Use the feature flag buttons to make real-time decisions:
- **Premium Features**: Check if user has access to premium features
- **Discount Offer**: Check if user should see discount offers

### 4. Monitor SDK Activity
The status panel shows:
- **Queue Size**: Number of events waiting to be sent
- **Events Sent**: Total events successfully sent to TinyCDP
- **Decisions Made**: Total feature flag checks performed

### 5. Manual Controls
- **Flush Events**: Manually send all queued events
- **Clear Log**: Clear the event log display

## How It Works

### Event Flow
1. User actions trigger `track()` calls
2. Events are queued in memory
3. Events are batched and sent to TinyCDP API
4. TinyCDP computes traits and segments
5. Feature flag decisions use computed data

### Feature Flags
The demo checks two flags:
- `premium_features`: Based on user segments or traits
- `discount_offer`: Based on purchase history

### Real-time Updates
The interface updates in real-time to show:
- Queue size changes
- Event transmission status
- Feature flag decision results

## Customization

### Adding New Events
Track custom events by adding new buttons:

```javascript
tinycdp.track({
  userId: currentUser,
  event: 'custom_action',
  properties: {
    action_type: 'button_click',
    element_id: 'my-button',
  },
});
```

### Adding New Feature Flags
Create new flag checks:

```javascript
const decision = await tinycdp.decide({
  userId: currentUser,
  flag: 'new_feature',
});

if (decision.allow) {
  // Show new feature
}
```

### Styling
The demo uses Tailwind CSS. Customize the appearance by modifying the CSS classes in `index.html`.

## Troubleshooting

### Common Issues

1. **"SDK not initialized" errors**:
   - Check that your API keys are correct
   - Verify TinyCDP backend is running
   - Check browser console for network errors

2. **"Please identify a user first" warnings**:
   - Click "Identify User" before tracking events or checking flags
   - User state is reset on page reload

3. **Feature flag decisions always return false**:
   - Ensure you have trait and segment definitions in TinyCDP
   - Check that your flags reference existing segments/traits
   - Use the admin API to verify your configuration

4. **Events not being sent**:
   - Check network tab for failed requests
   - Verify write key permissions
   - Look for CORS issues if running on different ports

### Debug Mode
The demo runs with `debug: true` enabled. Check the browser console for detailed SDK logs.

### Backend Verification
You can verify events are being received by checking the TinyCDP logs or using the admin API:

```bash
# Check system metrics
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:4000/v1/admin/metrics

# Search for your demo user
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:4000/v1/admin/users/search?query=demo-user"
```

## Next Steps

After exploring the demo:

1. **Set up real traits**: Define meaningful traits for your use case
2. **Create segments**: Build user segments based on behavior
3. **Configure flags**: Set up feature flags for your features
4. **Integrate SDK**: Add the SDK to your actual application
5. **Monitor usage**: Use the admin API to monitor your CDP

This demo provides a complete example of how to integrate TinyCDP into a web application for real-time personalization and feature flagging.
