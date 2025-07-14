import { forwardRef } from 'react';
import Player from 'lottie-react';

interface LoadingOverlayProps {
  visible: boolean;
  interactive: boolean;
  overlayRef: React.Ref<HTMLDivElement>;
  lottieRef: React.Ref<any>;
  animationData: any;
  onComplete: () => void;
}

export const LoadingOverlay = forwardRef<HTMLDivElement, LoadingOverlayProps>(
  ({ visible, interactive, overlayRef, lottieRef, animationData, onComplete }, _ref) => {
    if (!visible) return null;
    return (
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 flex items-center justify-center bg-white"
        style={{ pointerEvents: interactive ? 'auto' : 'none' }}
      >
        <div className="absolute inset-0 flex items-center justify-center w-full h-full">
          <div>
            <Player
              animationData={animationData}
              autoplay
              loop={false}
              style={{ width: 400, height: 400 }}
              onComplete={onComplete}
              lottieRef={lottieRef}
            />
          </div>
        </div>
      </div>
    );
  }
); 