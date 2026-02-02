// Tutorial step definitions for PoseVault onboarding

export const tutorialSteps = [
  {
    target: 'body',
    content: (
      <div>
        <h2 className="text-xl font-bold mb-2">Welcome to PoseVault! 📸</h2>
        <p className="text-gray-300">
          Let's take a quick tour to help you get started organizing your photography poses.
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '.add-gallery-button',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">Create Your First Gallery</h3>
        <p className="text-gray-300">
          Click here to create galleries for different types of shoots like "Maternity", "Newborn", or "Portraits".
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.tutorial-gallery-card',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">Upload Pose Images</h3>
        <p className="text-gray-300">
          Add reference photos to your galleries. Click "Add Images" to upload multiple poses at once.
        </p>
      </div>
    ),
    placement: 'top',
    spotlightClicks: true,
  },
  {
    target: '.tutorial-settings-button',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">Gallery Settings</h3>
        <p className="text-gray-300">
          Access gallery settings to add a cover photo, download your poses, or mark galleries as private.
        </p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '.user-menu-button',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">Account & Storage</h3>
        <p className="text-gray-300">
          View your storage usage, manage account settings, and access this tutorial again anytime.
        </p>
      </div>
    ),
    placement: 'bottom-end',
  },
  {
    target: 'body',
    content: (
      <div>
        <h2 className="text-xl font-bold mb-2">You're All Set! 🎉</h2>
        <p className="text-gray-300 mb-3">
          Start building your pose reference collection. Need help? Find "Show Tutorial" in your user settings.
        </p>
        <p className="text-sm text-gray-400">
          Tip: Use the heart icon to favorite your most-used poses!
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
