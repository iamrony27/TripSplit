import { DEFAULT_CATEGORIES, CategoryDefinition } from '../../constants/categories';

/**
 * Keyword dictionary mapping common expense names/items to category IDs.
 */
const KEYWORD_CATEGORY_MAP: Record<string, string> = {
  // Food & Dining / Restaurant
  dinner: 'restaurant',
  lunch: 'restaurant',
  breakfast: 'food',
  brunch: 'food',
  meal: 'food',
  food: 'food',
  restaurant: 'restaurant',
  cafe: 'teaCoffee',
  pizza: 'food',
  burger: 'food',
  biryani: 'food',
  dosa: 'food',
  roti: 'food',
  curry: 'food',
  thali: 'food',
  samosa: 'snacks',
  swiggy: 'food',
  zomato: 'food',
  mcdonalds: 'food',
  dominos: 'food',
  kfc: 'food',
  subway: 'food',
  buffet: 'restaurant',
  dhaba: 'restaurant',
  starbucks: 'teaCoffee',

  // Tea, Coffee & Drinks
  tea: 'teaCoffee',
  coffee: 'teaCoffee',
  chai: 'teaCoffee',
  latte: 'teaCoffee',
  cappuccino: 'teaCoffee',
  espresso: 'teaCoffee',
  juice: 'teaCoffee',
  shake: 'teaCoffee',
  lassi: 'teaCoffee',

  // Snacks & Quick Bites
  snack: 'snacks',
  snacks: 'snacks',
  chips: 'snacks',
  lays: 'snacks',
  kurkure: 'snacks',
  maggi: 'snacks',
  icecream: 'snacks',
  ice: 'snacks',
  dessert: 'snacks',
  sweets: 'snacks',
  pastry: 'snacks',
  cake: 'snacks',
  cookie: 'snacks',
  biscuit: 'snacks',
  popcorn: 'snacks',
  chocolate: 'snacks',

  // Transport & Commute
  uber: 'transport',
  ola: 'transport',
  rapido: 'transport',
  cab: 'transport',
  taxi: 'transport',
  auto: 'transport',
  rickshaw: 'transport',
  bus: 'transport',
  metro: 'transport',
  subway_train: 'transport',
  ferry: 'transport',
  boat: 'transport',
  ride: 'transport',

  // Travel & Long Distance
  flight: 'travel',
  airline: 'travel',
  indigo: 'travel',
  airindia: 'travel',
  spicejet: 'travel',
  vistara: 'travel',
  train: 'travel',
  irctc: 'travel',
  railway: 'travel',
  boarding: 'travel',
  visa: 'travel',
  travel: 'travel',
  trip: 'travel',

  // Stay & Accommodation
  hotel: 'hotel',
  resort: 'hotel',
  airbnb: 'accommodation',
  stay: 'hotel',
  room: 'hotel',
  hostel: 'accommodation',
  homestay: 'accommodation',
  villa: 'accommodation',
  lodge: 'hotel',
  cottage: 'accommodation',
  booking: 'hotel',

  // Fuel & Vehicle
  fuel: 'fuel',
  petrol: 'fuel',
  diesel: 'fuel',
  gas: 'fuel',
  cng: 'fuel',
  hp: 'fuel',
  iocl: 'fuel',
  bpcl: 'fuel',
  shell: 'fuel',
  ev_charge: 'fuel',

  // Parking & Toll
  toll: 'parking',
  fastag: 'parking',
  parking: 'parking',
  valet: 'parking',

  // Groceries & Daily Needs
  grocery: 'groceries',
  groceries: 'groceries',
  supermarket: 'groceries',
  blinkit: 'groceries',
  zepto: 'groceries',
  instamart: 'groceries',
  vegetables: 'groceries',
  fruits: 'groceries',
  milk: 'groceries',
  bread: 'groceries',
  egg: 'groceries',
  eggs: 'groceries',
  water: 'groceries',
  bisleri: 'groceries',
  aquafina: 'groceries',

  // Entertainment & Fun
  movie: 'entertainment',
  cinema: 'entertainment',
  theatre: 'entertainment',
  pvr: 'entertainment',
  inox: 'entertainment',
  club: 'entertainment',
  pub: 'entertainment',
  bar: 'entertainment',
  beer: 'entertainment',
  drinks: 'entertainment',
  party: 'entertainment',
  cocktail: 'entertainment',
  bowling: 'entertainment',
  scuba: 'entertainment',
  jetski: 'entertainment',
  trek: 'entertainment',
  game: 'entertainment',
  arcade: 'entertainment',

  // Tickets & Sightseeing
  ticket: 'tickets',
  tickets: 'tickets',
  entry: 'tickets',
  pass: 'tickets',
  museum: 'tickets',
  monument: 'tickets',
  zoo: 'tickets',
  aquarium: 'tickets',
  fort: 'tickets',
  temple: 'tickets',

  // Shopping & Personal
  shopping: 'shopping',
  clothes: 'shopping',
  dress: 'shopping',
  shoes: 'shopping',
  zara: 'shopping',
  'h&m': 'shopping',
  mall: 'shopping',
  souvenir: 'shopping',
  gift: 'shopping',

  // Medical & Health
  medicine: 'medical',
  medical: 'medical',
  pharmacy: 'medical',
  chemist: 'medical',
  doctor: 'medical',
  hospital: 'medical',
  clinic: 'medical',
  tablet: 'medical',
  firstaid: 'medical',
};

/**
 * Preset smart suggestion templates for rapid one-tap expense creation.
 */
export interface SmartExpenseSuggestion {
  title: string;
  categoryId: string;
  icon: string;
  emoji: string;
}

export const POPULAR_EXPENSE_SUGGESTIONS: SmartExpenseSuggestion[] = [
  { title: 'Dinner with Group', categoryId: 'restaurant', icon: 'silverware-fork-knife', emoji: '🍽️' },
  { title: 'Uber / Cab Ride', categoryId: 'transport', icon: 'taxi', emoji: '🚕' },
  { title: 'Hotel / Resort Stay', categoryId: 'hotel', icon: 'bed', emoji: '🏨' },
  { title: 'Petrol / Fuel Refill', categoryId: 'fuel', icon: 'gas-station', emoji: '⛽' },
  { title: 'Chai & Snacks', categoryId: 'teaCoffee', icon: 'coffee', emoji: '☕' },
  { title: 'Evening Drinks & Pub', categoryId: 'entertainment', icon: 'glass-cocktail', emoji: '🍻' },
  { title: 'Blinkit / Groceries', categoryId: 'groceries', icon: 'cart', emoji: '🛒' },
  { title: 'Highway Toll / Fastag', categoryId: 'parking', icon: 'parking', emoji: '🛣️' },
  { title: 'Entry Tickets & Tour', categoryId: 'tickets', icon: 'ticket-confirmation', emoji: '🎟️' },
  { title: 'Pizza & Cold Drinks', categoryId: 'food', icon: 'pizza', emoji: '🍕' },
];

/**
 * Predicts the most likely category ID based on the entered expense title.
 * Returns null if no strong match is found.
 */
export function suggestCategoryFromTitle(title: string): string | null {
  if (!title || !title.trim()) return null;

  const normalized = title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = normalized.split(/\s+/).filter(Boolean);

  // 1. Direct word match
  for (const word of words) {
    if (KEYWORD_CATEGORY_MAP[word]) {
      return KEYWORD_CATEGORY_MAP[word];
    }
  }

  // 2. Substring matching for multi-word or compound names
  for (const [keyword, categoryId] of Object.entries(KEYWORD_CATEGORY_MAP)) {
    if (normalized.includes(keyword)) {
      return categoryId;
    }
  }

  return null;
}

/**
 * Filters smart suggestions based on user input.
 * If input is empty, returns popular default suggestions.
 */
export function getSmartSuggestions(query: string): SmartExpenseSuggestion[] {
  if (!query || !query.trim()) {
    return POPULAR_EXPENSE_SUGGESTIONS.slice(0, 6);
  }

  const q = query.toLowerCase().trim();
  const matched = POPULAR_EXPENSE_SUGGESTIONS.filter(
    (s) => s.title.toLowerCase().includes(q) || s.categoryId.toLowerCase().includes(q)
  );

  if (matched.length > 0) return matched;

  // If user typed something specific, dynamically generate a contextual suggestion
  const deducedCategory = suggestCategoryFromTitle(query);
  if (deducedCategory) {
    const cat = DEFAULT_CATEGORIES.find((c) => c.id === deducedCategory);
    return [
      {
        title: query.trim(),
        categoryId: deducedCategory,
        icon: cat?.icon || 'tag',
        emoji: '✨',
      },
    ];
  }

  return [];
}
