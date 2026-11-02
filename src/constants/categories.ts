import { ExpenseCategory } from '../types/expense';
import { M3Colors } from '../theme/colors';

export interface CategoryDefinition extends ExpenseCategory {
  textColor: string;
}

export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  { id: 'food', name: 'Food & Dining', icon: 'food-fork-drink', color: M3Colors.categories.food.primary, textColor: M3Colors.categories.food.text },
  { id: 'restaurant', name: 'Restaurant', icon: 'silverware-fork-knife', color: M3Colors.categories.restaurant.primary, textColor: M3Colors.categories.restaurant.text },
  { id: 'travel', name: 'Travel & Flights', icon: 'airplane', color: M3Colors.categories.travel.primary, textColor: M3Colors.categories.travel.text },
  { id: 'transport', name: 'Transport & Cab', icon: 'taxi', color: M3Colors.categories.transport.primary, textColor: M3Colors.categories.transport.text },
  { id: 'hotel', name: 'Hotel & Stay', icon: 'bed', color: M3Colors.categories.hotel.primary, textColor: M3Colors.categories.hotel.text },
  { id: 'accommodation', name: 'Accommodation', icon: 'home-city', color: M3Colors.categories.accommodation.primary, textColor: M3Colors.categories.accommodation.text },
  { id: 'fuel', name: 'Fuel & Petrol', icon: 'gas-station', color: M3Colors.categories.fuel.primary, textColor: M3Colors.categories.fuel.text },
  { id: 'snacks', name: 'Snacks', icon: 'cookie', color: M3Colors.categories.snacks.primary, textColor: M3Colors.categories.snacks.text },
  { id: 'teaCoffee', name: 'Tea & Coffee', icon: 'coffee', color: M3Colors.categories.teaCoffee.primary, textColor: M3Colors.categories.teaCoffee.text },
  { id: 'groceries', name: 'Groceries', icon: 'cart', color: M3Colors.categories.groceries.primary, textColor: M3Colors.categories.groceries.text },
  { id: 'shopping', name: 'Shopping', icon: 'shopping', color: M3Colors.categories.shopping.primary, textColor: M3Colors.categories.shopping.text },
  { id: 'entertainment', name: 'Entertainment', icon: 'movie-open', color: M3Colors.categories.entertainment.primary, textColor: M3Colors.categories.entertainment.text },
  { id: 'tickets', name: 'Tickets & Entry', icon: 'ticket-confirmation', color: M3Colors.categories.tickets.primary, textColor: M3Colors.categories.tickets.text },
  { id: 'parking', name: 'Parking & Toll', icon: 'parking', color: M3Colors.categories.parking.primary, textColor: M3Colors.categories.parking.text },
  { id: 'medical', name: 'Medical & Health', icon: 'hospital-box', color: M3Colors.categories.medical.primary, textColor: M3Colors.categories.medical.text },
  { id: 'other', name: 'Other', icon: 'dots-horizontal-circle', color: M3Colors.categories.other.primary, textColor: M3Colors.categories.other.text },
];

export function getCategoryById(id: string): CategoryDefinition {
  const found = DEFAULT_CATEGORIES.find((c) => c.id === id);
  return found || {
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    icon: 'tag',
    color: M3Colors.surfaceContainerHigh,
    textColor: M3Colors.onSurface,
  };
}
