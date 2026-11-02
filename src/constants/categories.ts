import { ExpenseCategory } from '../types/expense';
import { M3Colors } from '../theme/colors';

export const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: 'food', name: 'Food & Dining', icon: 'restaurant', color: M3Colors.categories.food.bg },
  { id: 'restaurant', name: 'Restaurant', icon: 'silverware-fork-knife', color: M3Colors.categories.restaurant.bg },
  { id: 'travel', name: 'Travel & Flights', icon: 'airplane', color: M3Colors.categories.travel.bg },
  { id: 'transport', name: 'Transport & Cab', icon: 'taxi', color: M3Colors.categories.transport.bg },
  { id: 'hotel', name: 'Hotel & Stay', icon: 'bed', color: M3Colors.categories.hotel.bg },
  { id: 'accommodation', name: 'Accommodation', icon: 'home-city', color: M3Colors.categories.accommodation.bg },
  { id: 'fuel', name: 'Fuel & Petrol', icon: 'gas-station', color: M3Colors.categories.fuel.bg },
  { id: 'snacks', name: 'Snacks', icon: 'cookie', color: M3Colors.categories.snacks.bg },
  { id: 'teaCoffee', name: 'Tea & Coffee', icon: 'coffee', color: M3Colors.categories.teaCoffee.bg },
  { id: 'groceries', name: 'Groceries', icon: 'cart', color: M3Colors.categories.groceries.bg },
  { id: 'shopping', name: 'Shopping', icon: 'shopping', color: M3Colors.categories.shopping.bg },
  { id: 'entertainment', name: 'Entertainment', icon: 'movie-open', color: M3Colors.categories.entertainment.bg },
  { id: 'tickets', name: 'Tickets & Entry', icon: 'ticket-confirmation', color: M3Colors.categories.tickets.bg },
  { id: 'parking', name: 'Parking & Toll', icon: 'parking', color: M3Colors.categories.parking.bg },
  { id: 'medical', name: 'Medical & Health', icon: 'hospital-box', color: M3Colors.categories.medical.bg },
  { id: 'other', name: 'Other', icon: 'dots-horizontal-circle', color: M3Colors.categories.other.bg },
];

export function getCategoryById(id: string): ExpenseCategory {
  const found = DEFAULT_CATEGORIES.find((c) => c.id === id);
  return found || {
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    icon: 'tag',
    color: M3Colors.surfaceContainerHigh,
  };
}
