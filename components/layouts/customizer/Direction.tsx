'use client';
import { useLayoutContext, type LayoutDirectionType } from '@/contexts/useLayoutContext';

const Direction = () => {
  const { dir, updateSettings } = useLayoutContext();
  const changeDirection = (newDir: LayoutDirectionType) => {
    updateSettings({ dir: newDir });
  };
  return (
    <div className="p-6">
      <h5 className="font-semibold text-sm mb-3">Direction</h5>

      <div className="flex gap-2">
        <div>
          <input
            className="hidden"
            type="radio"
            name="dir"
            id="direction-ltr"
            value="ltr"
            checked={dir === 'ltr'}
            onChange={() => changeDirection('ltr')}
          />
          <label className="form-label btn bg-default-150" htmlFor="direction-ltr">
            LTR Mode
          </label>
        </div>

        <div>
          <input
            className="hidden"
            type="radio"
            name="dir"
            id="direction-rtl"
            value="rtl"
            checked={dir === 'rtl'}
            onChange={() => changeDirection('rtl')}
          />
          <label className="form-label btn bg-default-150" htmlFor="direction-rtl">
            RTL Mode
          </label>
        </div>
      </div>
    </div>
  );
};

export default Direction;
