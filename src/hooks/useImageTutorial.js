import { useState, useEffect } from 'react';
import { getUserSetting, setUserSetting } from '../utils/userSettingsSync';

/**
 * Hook to manage image gallery tutorial state
 * Shows tutorial first time user enters any gallery
 */
export function useImageTutorial(userId, isInGallery) {
  const [runTutorial, setRunTutorial] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user has seen image tutorial when entering a gallery
  useEffect(() => {
    if (!userId || !isInGallery) {
      setIsLoading(false);
      return;
    }

    const checkTutorialStatus = async () => {
      try {
        const result = await getUserSetting(userId, 'image_tutorial_completed');
        const hasCompleted = result?.ok ? result.value : null;
        
        // If no setting exists or it's false, show tutorial
        if (hasCompleted === null || hasCompleted === 'false' || hasCompleted === false) {
          // Small delay to ensure elements are rendered
          setTimeout(() => setRunTutorial(true), 500);
        }
      } catch (error) {
        console.error('Error checking image tutorial status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkTutorialStatus();
  }, [userId, isInGallery]);

  // Mark tutorial as completed
  const completeTutorial = async () => {
    if (!userId) return;

    try {
      await setUserSetting(userId, 'image_tutorial_completed', 'true');
      setRunTutorial(false);
      setStepIndex(0);
    } catch (error) {
      console.error('Error saving image tutorial completion:', error);
    }
  };

  // Start tutorial (for manual replay)
  const startTutorial = () => {
    setStepIndex(0);
    setRunTutorial(true);
  };

  // Reset tutorial completion flag (for "Show Tutorial Again" button)
  const resetTutorial = async () => {
    if (!userId) return;
    
    try {
      await setUserSetting(userId, 'image_tutorial_completed', 'false');
    } catch (error) {
      console.error('Error resetting image tutorial:', error);
    }
  };

  // Stop tutorial (skip)
  const stopTutorial = async () => {
    await completeTutorial();
  };

  return {
    runTutorial,
    stepIndex,
    isLoading,
    startTutorial,
    resetTutorial,
    stopTutorial,
    completeTutorial,
    setStepIndex,
  };
}
