import { useRef } from 'react';
import { PanResponder, type PanResponderInstance } from 'react-native';
import { swipeDirection } from '../lib/swipe';

interface SwipeHandlers {
  onLeft(): void;
  onRight(): void;
}

export function useSwipe(handlers: SwipeHandlers): PanResponderInstance['panHandlers'] {
  const ref = useRef(handlers);
  ref.current = handlers;

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_e, g) => {
        const dir = swipeDirection(g.dx, g.dy);
        if (dir === 'left') ref.current.onLeft();
        else if (dir === 'right') ref.current.onRight();
      },
    }),
  ).current;

  return responder.panHandlers;
}
