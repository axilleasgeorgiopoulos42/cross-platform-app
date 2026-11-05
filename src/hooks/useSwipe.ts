import { useMemo } from 'react';
import { PanResponder, type PanResponderInstance } from 'react-native';
import { swipeDirection } from '../lib/swipe';

interface SwipeHandlers {
  onLeft(): void;
  onRight(): void;
}

export function useSwipe({ onLeft, onRight }: SwipeHandlers): PanResponderInstance['panHandlers'] {
  // Rebuilt only when a handler identity changes, so gestures always call the latest handlers.
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderRelease: (_e, g) => {
          const dir = swipeDirection(g.dx, g.dy);
          if (dir === 'left') onLeft();
          else if (dir === 'right') onRight();
        },
      }),
    [onLeft, onRight],
  );

  return responder.panHandlers;
}
