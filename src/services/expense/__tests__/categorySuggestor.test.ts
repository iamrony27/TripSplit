import { suggestCategoryFromTitle, getSmartSuggestions } from '../categorySuggestor';

describe('categorySuggestor', () => {
  it('correctly maps common food items to food or restaurant categories', () => {
    expect(suggestCategoryFromTitle('Dinner with team')).toBe('restaurant');
    expect(suggestCategoryFromTitle('Hot Pepperoni Pizza')).toBe('food');
    expect(suggestCategoryFromTitle('Biryani lunch')).toBe('food');
    expect(suggestCategoryFromTitle('Breakfast buffet')).toBe('food');
  });

  it('correctly maps transport and commute items', () => {
    expect(suggestCategoryFromTitle('Uber to airport')).toBe('transport');
    expect(suggestCategoryFromTitle('Ola cab booking')).toBe('transport');
    expect(suggestCategoryFromTitle('Auto rickshaw fare')).toBe('transport');
    expect(suggestCategoryFromTitle('Metro card recharge')).toBe('transport');
  });

  it('correctly maps hotel and flight stays', () => {
    expect(suggestCategoryFromTitle('Grand Hotel Candolim')).toBe('hotel');
    expect(suggestCategoryFromTitle('IndiGo flight tickets')).toBe('travel');
    expect(suggestCategoryFromTitle('Airbnb villa booking')).toBe('accommodation');
  });

  it('correctly maps fuel and coffee items', () => {
    expect(suggestCategoryFromTitle('Shell Petrol Refill')).toBe('fuel');
    expect(suggestCategoryFromTitle('Morning Starbucks Coffee')).toBe('teaCoffee');
    expect(suggestCategoryFromTitle('Chai and biscuits')).toBe('teaCoffee');
  });

  it('returns null for unrecognized titles', () => {
    expect(suggestCategoryFromTitle('')).toBeNull();
    expect(suggestCategoryFromTitle('Randomxyz123')).toBeNull();
  });

  it('returns default smart suggestions when query is empty', () => {
    const suggestions = getSmartSuggestions('');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0]).toHaveProperty('title');
    expect(suggestions[0]).toHaveProperty('categoryId');
    expect(suggestions[0]).toHaveProperty('emoji');
  });

  it('returns filtered suggestions when query matches item', () => {
    const suggestions = getSmartSuggestions('pizza');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some((s) => s.title.toLowerCase().includes('pizza'))).toBe(true);
  });
});
