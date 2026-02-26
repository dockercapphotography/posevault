// Tutorial step definitions for PoseVault onboarding

export const tutorialSteps = [
  // Step 0: Welcome
  {
    target: 'body',
    content: (
      <div>
        <h2 className="text-xl font-bold mb-2">Welcome to PoseVault! 📸</h2>
        <p className="text-gray-300 mb-3">
          Let's take a quick tour to help you get started using PoseVault to organize your photography pose references.
        </p>
        <p className="text-sm text-gray-400">
          Tip: PoseVault syncs your data both locally and to the cloud, so you always have access to your images.
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  
  // Step 1: Click Add Gallery button (only if no galleries exist)
  {
    target: '.add-gallery-button',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">Create Your First Gallery</h3>
        <p className="text-gray-300">
          Click here to create galleries for different types of shoots like "Portraits", "Engagement", or "Cosplay".
        </p>
      </div>
    ),
    placement: 'bottom',
    spotlightClicks: true
  },
  
  // Step 2: Upload images to gallery
  {
    target: '.tutorial-gallery-card',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">View your Galleries</h3>
        <p className="text-gray-300">
          Click "Add Images" to upload a single or multiple photos at once. Tap the heart icon to mark a Gallery as a Favorite.
        </p>
      </div>
    ),
    placement: 'top',
    spotlightClicks: true,
  },
  
  // Step 3: Gallery List Organize Tools
  {
    target: '.tutorial-gallery-toolbar',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">Organize Your Galleries</h3>
        <p className="text-gray-300 mb-3">
          Use these tools to find and manage your galleries:
        </p>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• <span className="font-semibold">Search</span> - Find galleries by name</li>
          <li>• <span className="font-semibold">Filter & Sort</span> - Filter by tags and sort your galleries</li>
          <li>• <span className="font-semibold">Bulk Select</span> - Edit or delete multiple galleries at once</li>
          <li>• <span className="font-semibold">Grid Columns</span> - Adjust how many galleries appear per row</li>
        </ul>
		<p className="text-sm text-gray-400">
          Tip: Press and hold on a Gallery to enter Bulk Select mode when on a touchscreen device.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  
  // Step 4: Gallery settings
  {
    target: '.tutorial-settings-button',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">Gallery Settings</h3>
        <p className="text-gray-300">
          Access gallery settings to add/change a cover photo, add notes, download your poses, mark galleries as private, share galleries with clients, or delete entire galleries and their contents.
        </p>
      </div>
    ),
    placement: 'left',
  },
  
  // Step 5: Account & Storage menu
  {
    target: '.user-menu-button',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">Account & Storage</h3>
        <p className="text-gray-300 mb-3">
          View your storage usage, manage account settings and logout.
        </p>
        <p className="text-sm text-gray-400">
          Tip: You can also find the link to install PoseVault on your device here.
        </p>
      </div>
    ),
    placement: 'bottom-end',
  },
  
  // Step 6: Sync icon
  {
    target: '.tutorial-sync-button',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">Cloud Sync</h3>
        <p className="text-gray-300 mb-3">
          This icon shows your sync status. Click it to manually sync your data to the cloud.
        </p>
        <p className="text-sm text-gray-400">
          Tip: When synced, you'll see a green checkmark. Your data is automatically synced in the background.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  
  // Step 7: Notifications
  {
    target: '.tutorial-notification-bell',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">Notifications</h3>
        <p className="text-gray-300 mb-3">
          Tap the bell icon to view your notifications. You’ll receive alerts about key gallery activity, including poses being marked as favorites, new users accessing shared galleries, comments on poses, pending gallery uploads, and expired shared gallery links. You can adjust which types of notifications you recieve or enable Do Not Disturb at any time.
        </p>
        <p className="text-sm text-gray-400">
          Tip: A red badge will appear when you have unread notifications.
        </p>
      </div>
    ),
    placement: 'bottom-end',
  },

  // Step 8: Complete
  {
    target: 'body',
    content: (
      <div>
        <h2 className="text-xl font-bold mb-2">You're All Set! 🎉</h2>
        <p className="text-gray-300 mb-3">
          Ready to get started? Try creating a new Gallery and uploading some images, then click into the Gallery to see how to navigate your Images.
        </p>
        <p className="text-sm text-gray-400">
          Tip: Need help? You can find "Show Tutorial Again" in your User Settings to view this tutorial again.
        </p>
      </div>
    ),
    placement: 'center',
  },
];

// Joyride custom styles matching PoseVault theme
export const tutorialStyles = {
  options: {
    primaryColor: '#9333ea', // Purple-600
    textColor: '#ffffff',
    backgroundColor: '#1f2937', // Gray-800
    overlayColor: 'rgba(0, 0, 0, 0.7)',
    arrowColor: '#1f2937',
    zIndex: 10000,
  },
  tooltip: {
    borderRadius: 12,
    padding: 20,
  },
  tooltipContent: {
    padding: '10px 0',
  },
  buttonNext: {
    backgroundColor: '#9333ea',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 600,
  },
  buttonBack: {
    color: '#9ca3af',
    marginRight: 10,
  },
  buttonSkip: {
    color: '#9ca3af',
  },
  beacon: {
    inner: '#9333ea',
    outer: '#9333ea',
  },
};
