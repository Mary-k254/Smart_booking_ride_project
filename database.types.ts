// src/lib/database.types.ts
export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    role: 'passenger' | 'driver'
                    full_name: string
                    phone_number: string
                    created_at: string
                }
                Insert: {
                    id: string
                    role: 'passenger' | 'driver'
                    full_name: string
                    phone_number: string
                }
            }
            trips: {
                Row: {
                    id: string
                    driver_id: string | null
                    passenger_id: string
                    pickup_lat: number
                    pickup_lng: number
                    dropoff_lat: number | null
                    dropoff_lng: number | null
                    pickup_address: string | null
                    dropoff_address: string | null
                    status: 'pending' | 'accepted' | 'picked_up' | 'completed' | 'cancelled'
                    fare: number | null
                    distance_km: number | null
                    created_at: string
                }
            }
            vehicles: {
                Row: {
                    id: string
                    driver_id: string
                    plate_number: string
                    current_lat: number | null
                    current_lng: number | null
                    is_online: boolean
                }
            }
        }
    }
}