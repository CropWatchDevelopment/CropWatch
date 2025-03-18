export interface StripeProduct {
  id: string
  name: string
  description: string
  image: any
  active: boolean
  default_price?: DefaultPrice
  metadata: Metadata2
  prices: Price[]
}

export interface DefaultPrice {
  id: string
  object: string
  active: boolean
  billing_scheme: string
  created: number
  currency: string
  custom_unit_amount: any
  livemode: boolean
  lookup_key: any
  metadata: Metadata
  nickname: any
  product: string
  recurring: Recurring
  tax_behavior: string
  tiers_mode: any
  transform_quantity: any
  type: string
  unit_amount: number
  unit_amount_decimal: string
}

export interface Metadata {}

export interface Recurring {
  aggregate_usage: any
  interval: string
  interval_count: number
  meter: any
  trial_period_days: any
  usage_type: string
}

export interface Metadata2 {}

export interface Price {
  id: string
  object: string
  active: boolean
  billing_scheme: string
  created: number
  currency: string
  custom_unit_amount: any
  livemode: boolean
  lookup_key?: string
  metadata: Metadata3
  nickname: any
  product: string
  recurring: Recurring2
  tax_behavior: string
  tiers_mode: any
  transform_quantity: any
  type: string
  unit_amount: number
  unit_amount_decimal: string
}

export interface Metadata3 {}

export interface Recurring2 {
  aggregate_usage: any
  interval: string
  interval_count: number
  meter: any
  trial_period_days: any
  usage_type: string
}
