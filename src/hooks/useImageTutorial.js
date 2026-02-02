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
    console.log('[Image Tutorial] Effect triggered. userId:', userId, 'isInGallery:', isInGallery);
    
    if (!userId || !isInGallery) {
      console.log('[Image Tutorial] Not in gallery or no userId');
      setIsLoading(false);
      return;
    }

    const checkTutorialStatus = async () => {
      try {
        console.log('[Image Tutorial] Checking tutorial status for user:', userId);
        const result = await getUserSetting(userId, 'image_tutorial_completed');
        console.log('[Image Tutorial] getUserSetting result:', result);
        
        const hasCompleted = result?.ok ? result.value : null;
        console.log('[Image Tutorial] image_tutorial_completed value:', hasCompleted);
        
        // If no setting exists or it's false, show tutorial
        if (hasCompleted === null || hasCompleted === 'false' || hasCompleted === false) {
          console.log('[Image Tutorial] Starting tutorial');
          // Small delay to ensure elements are rendered
          setTimeout(() => setRunTutorial(true), 500);
        } else {
          console.log('[Image Tutorial] Tutorial already completed');
        }
      } catch (error) {
        console.error('[Image Tutorial] Error checking tutorial status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkTutorialStatus();
  }, [userId, isInGallery]);

  // Mark tutorial as completed
  const completeTutorial = async () => {
    if (!userId) return;

    console.log('[Image Tutorial] Completing tutorial for user:', userId);
    try {
      await setUserSetting(userId, 'image_tutorial_completed', 'true');
      setRunTutorial(false);
      setStepIndex(0);
      console.log('[Image Tutorial] Tutorial marked as completed');
    } catch (error) {
      console.error('[Image Tutorial] Error saving tutorial completion:', error);
    }
  };

  // Start tutorial (for manual replay)
  const startTutorial = () => {
    console.log('[Image Tutorial] Starting tutorial manually');
    setStepIndex(0);
    setRunTutorial(true);
  };

  // Reset tutorial completion flag (for "Show Tutorial Again" button)
  const resetTutorial = async () => {
    if (!userId) return;
    
    console.log('[Image Tutorial] Resetting tutorial completion flag');
    try {
      await setUserSetting(userId, 'image_tutorial_completed', 'false');
      console.log('[Image Tutorial] Tutorial reset - will show next time user enters gallery');
    } catch (error) {
      console.error('[Image Tutorial] Error resetting tutorial:', error);
    }
  };

  // Stop tutorial (skip)
  const stopTutorial = async () => {
    console.log('[Image Tutorial] Stopping tutorial (skip)');
    await completeTutorial();
  };

  console.log('[Image Tutorial] Current state:', { runTutorial, stepIndex, isLoading });

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
