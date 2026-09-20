import { useScaffoldStore } from './useScaffoldStore';

describe('useScaffoldStore', () => {
  it('starts at zero and increments on ping', () => {
    expect(useScaffoldStore.getState().pingCount).toBe(0);

    useScaffoldStore.getState().ping();

    expect(useScaffoldStore.getState().pingCount).toBe(1);
  });
});
