export interface Category {
  slug: string;
  name: string;
  shortName?: string;
  image?: string;
  title?: string;
  count?: number;
  children?: Category[];
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  brand: string;
  line?: string;
  category: string;
  price: number;
  oldPrice?: number | null;
  volume?: string;
  inStock: boolean;
  hit?: boolean;
  recommend?: boolean;
  sale?: boolean;
  isNew?: boolean;
  purpose?: string[];
  hairType?: string[];
  palette?: string[];
  images: string[];
}

export interface CartLine {
  id: number;
  qty: number;
}

export interface SortOption {
  id: string;
  label: string;
}

export interface FilterState {
  q: string;
  brands: string[];
  volumes: string[];
  purposes: string[];
  hairTypes: string[];
  inStockOnly: boolean;
  hit: boolean;
  sale: boolean;
  recommend: boolean;
  isNew: boolean;
  priceFrom: number | null;
  priceTo: number | null;
  sort: string;
  page: number;
}

export const EMPTY_FILTERS: FilterState = {
  q: '',
  brands: [],
  volumes: [],
  purposes: [],
  hairTypes: [],
  inStockOnly: false,
  hit: false,
  sale: false,
  recommend: false,
  isNew: false,
  priceFrom: null,
  priceTo: null,
  sort: 'popular',
  page: 1,
};
