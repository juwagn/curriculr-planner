import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { TOUR_STEPS } from './tour-steps';
import { useUiStore } from '@/stores/ui';

export function TourManager() {
  const tourPending = useUiStore((s) => s.tourPending);
  const setTourPending = useUiStore((s) => s.setTourPending);

  useEffect(() => {
    if (!tourPending) return;
    setTourPending(false);
    const driverObj = driver({
      showProgress: true,
      steps: TOUR_STEPS,
      nextBtnText: 'Weiter →',
      prevBtnText: '← Zurück',
      doneBtnText: 'Fertig',
      progressText: '{{current}} / {{total}}',
    });
    driverObj.drive();
  }, [tourPending, setTourPending]);

  return null;
}
