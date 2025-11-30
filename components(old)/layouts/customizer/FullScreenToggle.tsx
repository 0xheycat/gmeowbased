'use client';
import { useState } from 'react';
import { LuFullscreen, LuMinimize } from 'react-icons/lu';

const FullScreenToggle = () => {
  const [fullScreenOn, setFullScreenOn] = useState(false);

  const toggleFullScreen = () => {
    const document: any = window.document;
    if (
      !document.fullscreenElement &&
      /* alternative standard method */ !document.mozFullScreenElement &&
      !document.webkitFullscreenElement
    ) {
      // current working methods
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.mozRequestFullScreen) {
        document.documentElement.mozRequestFullScreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
      }
      setFullScreenOn(true);
    } else {
      if (document.cancelFullScreen) {
        document.cancelFullScreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen();
      }
      setFullScreenOn(false);
    }
  };

  return (
    <button
      className="btn size-9 rounded-full btn-sm hover:bg-default-150 group"
      id="fullscreenBtn"
      data-toggle="fullscreen"
      aria-label="Full Screen"
      onClick={toggleFullScreen}
    >
      {fullScreenOn ? <LuMinimize className="size-5" /> : <LuFullscreen className="size-5" />}
    </button>
  );
};

export default FullScreenToggle;
