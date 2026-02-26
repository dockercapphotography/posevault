// Tutorial step definitions for Image Gallery view

export const imageTutorialSteps = [
  {
    target: 'body',
    content: (
      <div>
        <h2 className="text-xl font-bold mb-2">Image Gallery Tour 📸</h2>
        <p className="text-gray-300">
          Let's explore how to manage and view your pose reference images!
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '.tutorial-add-poses-button',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">Add More Images</h3>
        <p className="text-gray-300">
          Click here to upload additional pose images to this gallery. You can upload multiple images at once.
        </p>
		<p className="text-sm text-gray-400">
		  Tip: You can drag-and-drop photos directly into the gallery to upload when on Desktop.
		</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.tutorial-image-card',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">View & Manage Images</h3>
        <p className="text-gray-300">
          Click any image to view it within a gallery view. Use the heart icon to favorite your most-used poses and click the text-bubble icon to see comments left on images.
        </p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '.tutorial-image-settings',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">Image Settings</h3>
        <p className="text-gray-300">
          Click the menu icon on any image to edit image names, add tags, add notes, mark as favorite, or delete the image.
        </p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '.tutorial-filter-section',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">Filter & Sort</h3>
        <p className="text-gray-300 mb-3">
          Filter by tags or favorites, and sort by date, name, or favorite status to find poses quickly.
        </p>
		<p className="text-gray-300 mb-3">
          Use the "Bulk Select" feature to make changes across multiple images at once.
        </p>
		<p className="text-sm text-gray-400">
		  Tip: "Search poses..." will search all criteria on your images, including names, tags and notes!
		</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: 'body',
    content: (
      <div>
        <h2 className="text-xl font-bold mb-2">You're All Set! 🎉</h2>
        <p className="text-gray-300 mb-3">
          Start building your pose reference library and thank you for using PoseVault!
        </p>
        <p className="text-sm text-gray-400">
          Tip: Add tags to your images to organize them better!
        </p>
      </div>
    ),
    placement: 'center',
  },
];

// Use the same styles from main tutorial
export { tutorialStyles } from './tutorialSteps.jsx';
