import { useState, useEffect } from 'react';
import { Keyboard, Platform, KeyboardEvent } from 'react-native';

/**
 * Hook that listens to native keyboard show/hide events and returns the dynamic
 * bottom padding required so that bottom inputs are pushed above the soft keyboard.
 */
export function useKeyboardBottomInset(extraOffset: number = 40): number {
  const [bottomInset, setBottomInset] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: KeyboardEvent) => {
      setBottomInset(e.endCoordinates.height + extraOffset);
    };

    const onHide = () => {
      setBottomInset(0);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [extraOffset]);

  return bottomInset;
}
