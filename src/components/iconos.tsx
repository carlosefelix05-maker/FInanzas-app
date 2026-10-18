import {
  Baby, Banknote, Briefcase, Bus, Car, CircleDollarSign, CirclePlus, Clapperboard, Coffee, CreditCard, Dog, Dumbbell,
  Ellipsis, Fuel, Gift, GraduationCap, HeartPulse, House, Landmark, Plane, Presentation, Repeat, Shirt,
  ShoppingBag, ShoppingCart, Smartphone, Stethoscope, Store, Tag, TrendingUp, Tv, Utensils, Wallet, Wifi, Wrench, Zap,
  type LucideIcon,
} from 'lucide-react';

export const ICONOS: Record<string, LucideIcon> = {
  utensils: Utensils,
  coffee: Coffee,
  'shopping-cart': ShoppingCart,
  'shopping-bag': ShoppingBag,
  fuel: Fuel,
  car: Car,
  bus: Bus,
  plane: Plane,
  house: House,
  zap: Zap,
  wifi: Wifi,
  smartphone: Smartphone,
  'heart-pulse': HeartPulse,
  stethoscope: Stethoscope,
  'graduation-cap': GraduationCap,
  presentation: Presentation,
  repeat: Repeat,
  tv: Tv,
  shirt: Shirt,
  clapperboard: Clapperboard,
  dumbbell: Dumbbell,
  gift: Gift,
  baby: Baby,
  dog: Dog,
  wrench: Wrench,
  briefcase: Briefcase,
  store: Store,
  'trending-up': TrendingUp,
  banknote: Banknote,
  'circle-dollar-sign': CircleDollarSign,
  'circle-plus': CirclePlus,
  wallet: Wallet,
  landmark: Landmark,
  'credit-card': CreditCard,
  ellipsis: Ellipsis,
  tag: Tag,
};

export function iconoPorNombre(nombre: string): LucideIcon {
  return ICONOS[nombre] ?? Tag;
}

export function IconoCategoria({ icono, color, tam = 40 }: { icono: string; color: string; tam?: number }) {
  const Icono = iconoPorNombre(icono);
  return (
    <span
      className="icono-cat"
      style={{ width: tam, height: tam, background: `${color}1f`, color }}
      aria-hidden="true"
    >
      <Icono size={Math.round(tam * 0.5)} strokeWidth={1.75} />
    </span>
  );
}
