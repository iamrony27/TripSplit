import { safeGoBack } from '../navigation';

describe('safeGoBack navigation utility', () => {
  let mockRouter: any;

  beforeEach(() => {
    mockRouter = {
      back: jest.fn(),
      replace: jest.fn(),
      canGoBack: jest.fn(),
    };
  });

  test('calls router.back() when router.canGoBack() returns true', () => {
    mockRouter.canGoBack.mockReturnValue(true);

    safeGoBack(mockRouter, '/(tabs)');

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  test('calls router.replace with specified fallback when router.canGoBack() returns false', () => {
    mockRouter.canGoBack.mockReturnValue(false);

    safeGoBack(mockRouter, '/(tabs)/trips');

    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/trips');
  });

  test('falls back to default /(tabs) when fallback route is omitted and canGoBack() is false', () => {
    mockRouter.canGoBack.mockReturnValue(false);

    safeGoBack(mockRouter);

    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });

  test('falls back to replace if canGoBack is not a function', () => {
    mockRouter.canGoBack = undefined;

    safeGoBack(mockRouter, '/(auth)/login');

    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/login');
  });

  test('falls back to replace if canGoBack() throws', () => {
    mockRouter.canGoBack.mockImplementation(() => {
      throw new Error('Navigation state error');
    });

    safeGoBack(mockRouter, '/(tabs)');

    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });
});
