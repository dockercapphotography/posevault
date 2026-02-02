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
    console.log('[Tutorial] Effect triggered. userId:', userId);
    
    if (!userId) {
      console.log('[Tutorial] No userId, not loading tutorial');
      setIsLoading(false);
      return;
    }

    const checkTutorialStatus = async () => {
      try {
        console.log('[Tutorial] Checking tutorial status for user:', userId);
        const result = await getUserSetting(userId, 'tutorial_completed');
        console.log('[Tutorial] getUserSetting result:', result);
        
        // getUserSetting returns {ok: true, value: ...} or {ok: false, error: ...}
        const hasCompleted = result?.ok ? result.value : null;
        console.log('[Tutorial] tutorial_completed value:', hasCompleted);
        
        // If no setting exists or it's false, show tutorial
        if (hasCompleted === null || hasCompleted === 'false' || hasCompleted === false) {
          console.log('[Tutorial] Starting tutorial (value is null, false, or "false")');
          setRunTutorial(true);
        } else {
          console.log('[Tutorial] Tutorial already completed, not showing');
        }
      } catch (error) {
        console.error('[Tutorial] Error checking tutorial status:', error);
      } finally {
        setIsLoading(false);
        console.log('[Tutorial] Finished loading');
      }
    };

    checkTutorialStatus();
  }, [userId]);

  // Mark tutorial as completed
  const completeTutorial = async () => {
    if (!userId) return;

    console.log('[Tutorial] Completing tutorial for user:', userId);
    try {
      await setUserSetting(userId, 'tutorial_completed', 'true');
      setRunTutorial(false);
      setStepIndex(0);
      console.log('[Tutorial] Tutorial marked as completed');
    } catch (error) {
      console.error('[Tutorial] Error saving tutorial completion:', error);
    }
  };

  // Start tutorial (for manual replay)
  const startTutorial = () => {
    console.log('[Tutorial] Starting tutorial manually');
    setStepIndex(0);
    setRunTutorial(true);
  };

  // Stop tutorial (skip)
  const stopTutorial = async () => {
    console.log('[Tutorial] Stopping tutorial (skip)');
    await completeTutorial();
  };

  console.log('[Tutorial] Current state:', { runTutorial, stepIndex, isLoading });

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
