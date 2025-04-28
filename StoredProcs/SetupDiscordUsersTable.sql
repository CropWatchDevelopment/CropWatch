-- Create user_discord_connections table
CREATE TABLE IF NOT EXISTS public.user_discord_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    discord_user_id TEXT NOT NULL,
    discord_username TEXT NOT NULL,
    avatar TEXT,
    access_token TEXT NOT NULL,
    token_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT user_discord_connections_user_id_unique UNIQUE (user_id)
);

-- Set up RLS policies
ALTER TABLE public.user_discord_connections ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own Discord connections
CREATE POLICY "Users can view their own Discord connections" 
ON public.user_discord_connections 
FOR SELECT USING (auth.uid() = user_id);

-- Allow users to update their own Discord connections
CREATE POLICY "Users can update their own Discord connections" 
ON public.user_discord_connections 
FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to insert their own Discord connections
CREATE POLICY "Users can insert their own Discord connections" 
ON public.user_discord_connections 
FOR INSERT WITH CHECK (auth.uid() = user_id);