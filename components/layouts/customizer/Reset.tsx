'use client';

import { useLayoutContext } from '@/contexts/useLayoutContext';

const Reset = () => {
  const { reset } = useLayoutContext();
  return (
    <button type="button" className="btn bg-default-150 grow" id="reset-layout" onClick={reset}>
      Reset
    </button>
  );
};

export default Reset;
