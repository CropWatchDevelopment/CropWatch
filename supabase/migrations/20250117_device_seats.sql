-- Migration: Create device_seats table for tracking device subscription seats
-- This table manages the mapping between Stripe subscriptions and device assignments

-- Create the device_seats table
CREATE TABLE IF NOT EXISTS public.device_seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT NOT NULL,
    stripe_subscription_item_id TEXT NOT NULL,
    seat_number INTEGER NOT NULL,
    dev_eui TEXT REFERENCES public.cw_devices(dev_eui) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'pending')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure unique seat numbers per subscription
    UNIQUE (stripe_subscription_id, seat_number)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_device_seats_profile_id ON public.device_seats(profile_id);
CREATE INDEX IF NOT EXISTS idx_device_seats_subscription_id ON public.device_seats(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_device_seats_dev_eui ON public.device_seats(dev_eui);

-- Enable Row Level Security
ALTER TABLE public.device_seats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own seats
CREATE POLICY "Users can view their own device seats"
    ON public.device_seats
    FOR SELECT
    USING (auth.uid() = profile_id);

-- Users can insert their own seats
CREATE POLICY "Users can insert their own device seats"
    ON public.device_seats
    FOR INSERT
    WITH CHECK (auth.uid() = profile_id);

-- Users can update their own seats (for assigning devices)
CREATE POLICY "Users can update their own device seats"
    ON public.device_seats
    FOR UPDATE
    USING (auth.uid() = profile_id)
    WITH CHECK (auth.uid() = profile_id);

-- Users can delete their own seats (for cancelled subscriptions)
CREATE POLICY "Users can delete their own device seats"
    ON public.device_seats
    FOR DELETE
    USING (auth.uid() = profile_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_device_seats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER device_seats_updated_at
    BEFORE UPDATE ON public.device_seats
    FOR EACH ROW
    EXECUTE FUNCTION update_device_seats_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.device_seats IS 'Tracks device seat subscriptions and their assignments to specific devices';
COMMENT ON COLUMN public.device_seats.profile_id IS 'The user who owns this seat';
COMMENT ON COLUMN public.device_seats.stripe_subscription_id IS 'The Stripe subscription ID for billing';
COMMENT ON COLUMN public.device_seats.stripe_subscription_item_id IS 'The Stripe subscription item ID (for quantity management)';
COMMENT ON COLUMN public.device_seats.seat_number IS 'The seat number within the subscription (1-based)';
COMMENT ON COLUMN public.device_seats.dev_eui IS 'The device EUI assigned to this seat (NULL if unassigned)';
COMMENT ON COLUMN public.device_seats.status IS 'Seat status: active, cancelled, or pending';
