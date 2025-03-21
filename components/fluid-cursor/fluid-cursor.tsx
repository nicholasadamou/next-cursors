'use client';

import { useEffect } from 'react';

import fluidCursor from '@/hooks/use-fluid-cursor';

const FluidCursor = () => {
  useEffect(() => {
    fluidCursor();
  }, []);

  return (
    <div className='pointer-events-none fixed inset-0'>
      <canvas id='fluid' className='w-screen h-screen' />
    </div>
  );
};
export default FluidCursor;
