import { useState, useEffect } from 'react';
import { getUserSetting, setUserSetting } from '../utils/userSettingsSync';

/**
 * Hook to manage tutorial state
 * Checks if user has completed tutorial and provides control functions
 */
export function useTutorial(userId) {
  const [runTutorial, setRunTutorial] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user has completed tutorial on mount
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const checkTutorialStatus = async () => {
      try {
        const result = await getUserSetting(userId, 'tutorial_completed');
        const hasCompleted = result?.ok ? result.value : null;
        
        // If no setting exists or it's false, show tutorial
        if (hasCompleted === null || hasCompleted === 'false' || hasCompleted === false) {
          setRunTutorial(true);
        }
      } catch (error) {
        console.error('Error checking tutorial status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkTutorialStatus();
  }, [userId]);

  // Mark tutorial as completed
  const completeTutorial = async () => {
    if (!userId) return;

    try {
      await setUserSetting(userId, 'tutorial_completed', 'true');
      setRunTutorial(false);
      setStepIndex(0);
    } catch (error) {
      console.error('Error saving tutorial completion:', error);
    }
  };

  // Start tutorial (for manual replay)
  const startTutorial = () => {
    setStepIndex(0);
    setRunTutorial(true);
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
    stopTutorial,
    completeTutorial,
    setStepIndex,
  };
}
