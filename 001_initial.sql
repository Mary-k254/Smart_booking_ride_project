-- supabase/migrations/001_initial.sql

-- Enable RLS
ALTER DATABASE postgres SET "app.settings.jwt_secret" TO 'your-jwt-secret';

-- Profiles table
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    role TEXT CHECK (role IN ('passenger', 'driver')) NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicles table (drivers only)
CREATE TABLE vehicles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID REFERENCES profiles(id) UNIQUE,
    plate_number TEXT UNIQUE NOT NULL,
    current_lat FLOAT,
    current_lng FLOAT,
    is_online BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trips table
CREATE TABLE trips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID REFERENCES profiles(id),
    passenger_id UUID REFERENCES profiles(id),
    pickup_lat FLOAT NOT NULL,
    pickup_lng FLOAT NOT NULL,
    dropoff_lat FLOAT,
    dropoff_lng FLOAT,
    pickup_address TEXT,
    dropoff_address TEXT,
    status TEXT CHECK (status IN ('pending', 'accepted', 'picked_up', 'completed', 'cancelled')) DEFAULT 'pending',
    fare INTEGER,
    distance_km FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID REFERENCES trips(id),
    amount INTEGER NOT NULL,
    mpesa_receipt TEXT,
    phone_number TEXT,
    status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Trips
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trips"
    ON trips FOR SELECT
    TO authenticated
    USING (passenger_id = auth.uid() OR driver_id = auth.uid());

CREATE POLICY "Passengers can create trips"
    ON trips FOR INSERT
    TO authenticated
    WITH CHECK (passenger_id = auth.uid());

CREATE POLICY "Drivers can update assigned trips"
    ON trips FOR UPDATE
    TO authenticated
    USING (driver_id = auth.uid() OR passenger_id = auth.uid());

-- Vehicles
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vehicles are viewable when online"
    ON vehicles FOR SELECT
    TO authenticated
    USING (is_online = true OR driver_id = auth.uid());

CREATE POLICY "Drivers can update own vehicle"
    ON vehicles FOR UPDATE
    USING (driver_id = auth.uid());

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();