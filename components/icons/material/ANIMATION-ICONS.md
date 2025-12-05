# Animation & Motion Icons ✨

All 42 animation-related icons are available in `/components/icons/material/`

## Categories

### 🎬 Animation & Motion (8 icons)
Core animation and motion-related icons:

- `Animation` - General animation symbol
- `AutoAwesomeMotion` - Auto motion effects
- `MotionPhotosAuto` - Motion photo auto mode
- `MotionPhotosOff` - Motion photos disabled
- `SlowMotionVideo` - Slow motion video
- `Airplay` - Screen mirroring/casting
- `SmartDisplay` - Smart display/screen
- `TapAndPlay` - Tap to play NFC

### 🔄 Rotation & Flip (12 icons)
Transform and rotate icons:

- `Rotate90DegreesCcw` - Rotate 90° counter-clockwise
- `Rotate90DegreesCw` - Rotate 90° clockwise
- `RotateLeft` - Rotate left
- `RotateRight` - Rotate right
- `CropRotate` - Crop rotation tool
- `Flip` - Flip/mirror
- `FlipCameraAndroid` - Flip Android camera
- `FlipCameraIos` - Flip iOS camera
- `FlipToBack` - Flip to back layer
- `FlipToFront` - Flip to front layer
- `TextRotateUp` - Rotate text upward
- `TextRotateVertical` - Vertical text rotation

### ▶️ Play & Replay (13 icons)
Playback control icons:

- `PlayArrow` - Play button (arrow)
- `PlayCircle` - Play button (circle outline)
- `PlayCircleFilled` - Play button (filled circle)
- `PlayCircleFilledWhite` - Play button (white filled)
- `PlayCircleOutline` - Play button (circle outline)
- `PlayDisabled` - Play disabled state
- `PlayForWork` - Play for work/demo
- `PlayLesson` - Play lesson/tutorial
- `Replay` - Replay/repeat
- `Replay10` - Replay 10 seconds
- `Replay30` - Replay 30 seconds
- `Replay5` - Replay 5 seconds
- `ReplayCircleFilled` - Replay (filled circle)

### 📝 Playlist (9 icons)
Playlist management icons:

- `PlaylistAdd` - Add to playlist
- `PlaylistAddCheck` - Add to playlist (confirmed)
- `PlaylistAddCheckCircle` - Add to playlist (circle check)
- `PlaylistAddCircle` - Add to playlist (circle)
- `PlaylistPlay` - Play playlist
- `PlaylistRemove` - Remove from playlist
- `QueuePlayNext` - Queue play next
- `FeaturedPlayList` - Featured playlist
- `LocalPlay` - Local playback

## Usage Examples

### Basic Animation Icon
```tsx
import { Animation } from '@/components/icons/material';

<Animation size="lg" color="#6366f1" />
```

### Rotation Controls
```tsx
import { 
  RotateLeft, 
  RotateRight,
  Flip 
} from '@/components/icons/material';

<button>
  <RotateLeft size="md" />
  Rotate Left
</button>
<button>
  <RotateRight size="md" />
  Rotate Right
</button>
<button>
  <Flip size="md" />
  Flip
</button>
```

### Play Controls
```tsx
import {
  PlayArrow,
  Replay,
  Replay10,
  SlowMotionVideo
} from '@/components/icons/material';

<div className="video-controls">
  <PlayArrow size="xl" />
  <Replay size="lg" />
  <Replay10 size="md" />
  <SlowMotionVideo size="md" />
</div>
```

### Motion Effects
```tsx
import {
  AutoAwesomeMotion,
  MotionPhotosAuto,
  Animation
} from '@/components/icons/material';

<div className="effects-panel">
  <AutoAwesomeMotion size="lg" className="text-purple-500" />
  <MotionPhotosAuto size="lg" className="text-blue-500" />
  <Animation size="lg" className="text-pink-500" />
</div>
```

### Playlist Manager
```tsx
import {
  PlaylistAdd,
  PlaylistPlay,
  PlaylistRemove,
  QueuePlayNext
} from '@/components/icons/material';

function PlaylistControls() {
  return (
    <div className="flex gap-2">
      <PlaylistAdd size="md" />
      <PlaylistPlay size="md" />
      <PlaylistRemove size="md" />
      <QueuePlayNext size="md" />
    </div>
  );
}
```

### With Animation States
```tsx
import { PlayCircleFilled, ReplayCircleFilled } from '@/components/icons/material';

const [isPlaying, setIsPlaying] = useState(false);

<button onClick={() => setIsPlaying(!isPlaying)}>
  {isPlaying ? (
    <PlayCircleFilled 
      size="xl" 
      className="text-green-500 animate-pulse" 
    />
  ) : (
    <ReplayCircleFilled 
      size="xl" 
      className="text-gray-400" 
    />
  )}
</button>
```

### Airplay/Casting
```tsx
import { Airplay, SmartDisplay } from '@/components/icons/material';

<div className="casting-options">
  <button className="flex items-center gap-2">
    <Airplay size="md" />
    Cast to Device
  </button>
  <button className="flex items-center gap-2">
    <SmartDisplay size="md" />
    Smart Display
  </button>
</div>
```

## Use Cases

### Video Player
Perfect for building video player controls:
- Play/Pause: `PlayArrow`, `PlayCircleFilled`
- Replay: `Replay`, `Replay10`, `Replay30`
- Slow Motion: `SlowMotionVideo`

### Image Editor
Great for image manipulation tools:
- Rotate: `RotateLeft`, `RotateRight`, `Rotate90DegreesCw`
- Flip: `Flip`, `FlipToBack`, `FlipToFront`
- Crop: `CropRotate`

### Music Player
Ideal for music/audio interfaces:
- Playlists: `PlaylistAdd`, `PlaylistPlay`, `PlaylistRemove`
- Queue: `QueuePlayNext`
- Featured: `FeaturedPlayList`

### Animation Tools
For animation and motion design:
- Effects: `Animation`, `AutoAwesomeMotion`
- Motion: `MotionPhotosAuto`, `MotionPhotosOff`

### Casting/Streaming
For screen sharing and casting:
- Cast: `Airplay`, `SmartDisplay`
- NFC: `TapAndPlay`

## Icon Sizes

All icons support these sizes:
- `2xs`, `xs`, `sm`, `md` (default), `lg`, `xl`
- Custom: `"32px"`, `"2rem"`, etc.

## Styling Tips

### With Tailwind Classes
```tsx
<Animation className="w-8 h-8 text-blue-500 hover:text-blue-600 transition-colors" />
```

### With Animations
```tsx
<RotateRight className="animate-spin" />
<PlayCircleFilled className="animate-pulse" />
<Flip className="hover:scale-110 transition-transform" />
```

### Custom Colors
```tsx
<Animation color="#8b5cf6" />
<PlayArrow style={{ color: 'var(--primary-color)' }} />
```

## Import All at Once

```tsx
import {
  // Animation
  Animation,
  AutoAwesomeMotion,
  MotionPhotosAuto,
  SlowMotionVideo,
  
  // Rotation
  RotateLeft,
  RotateRight,
  Flip,
  
  // Playback
  PlayArrow,
  PlayCircleFilled,
  Replay,
  
  // Playlist
  PlaylistAdd,
  PlaylistPlay,
  QueuePlayNext
} from '@/components/icons/material';
```

## Summary

✅ **42 animation icons** ready to use  
🎬 **8 motion/animation** icons  
🔄 **12 rotation/flip** icons  
▶️ **13 play/replay** icons  
📝 **9 playlist** icons  

All icons support custom sizes, colors, and Tailwind classes!
