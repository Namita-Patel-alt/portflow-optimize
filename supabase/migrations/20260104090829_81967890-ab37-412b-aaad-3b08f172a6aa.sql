-- Create enum for app roles (crane_operator and supervisor for now)
CREATE TYPE public.app_role AS ENUM ('crane_operator', 'supervisor', 'higher_authority');

-- Create enum for delay reasons
CREATE TYPE public.delay_reason AS ENUM (
  'crane_malfunction',
  'vehicle_unavailability', 
  'weather_conditions',
  'operator_break',
  'vessel_repositioning',
  'safety_incident'
);

-- Create enum for vehicle status
CREATE TYPE public.vehicle_status AS ENUM ('available', 'in_use', 'maintenance', 'unavailable');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  employee_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create work_shifts table
CREATE TABLE public.work_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create lift_logs table
CREATE TABLE public.lift_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shift_id UUID REFERENCES work_shifts(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  hour_slot TIME NOT NULL,
  lifts_count INTEGER NOT NULL DEFAULT 0 CHECK (lifts_count >= 0),
  target_met BOOLEAN GENERATED ALWAYS AS (lifts_count >= 24) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create delay_records table
CREATE TABLE public.delay_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shift_id UUID REFERENCES work_shifts(id) ON DELETE CASCADE,
  lift_log_id UUID REFERENCES lift_logs(id) ON DELETE CASCADE,
  delay_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delay_start TIME NOT NULL,
  delay_end TIME NOT NULL,
  reason delay_reason NOT NULL,
  notes TEXT,
  duration_minutes INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (delay_end - delay_start)) / 60
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create vehicles table
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_number TEXT UNIQUE NOT NULL,
  vehicle_type TEXT NOT NULL,
  status vehicle_status DEFAULT 'available' NOT NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create performance_ratings table
CREATE TABLE public.performance_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  rating_date DATE NOT NULL DEFAULT CURRENT_DATE,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lift_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delay_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_ratings ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Supervisors can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'higher_authority'));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Supervisors can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'higher_authority'));

-- RLS Policies for work_shifts
CREATE POLICY "Operators can manage their own shifts"
  ON public.work_shifts FOR ALL
  TO authenticated
  USING (auth.uid() = operator_id);

CREATE POLICY "Supervisors can view all shifts"
  ON public.work_shifts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'higher_authority'));

-- RLS Policies for lift_logs
CREATE POLICY "Operators can manage their own lift logs"
  ON public.lift_logs FOR ALL
  TO authenticated
  USING (auth.uid() = operator_id);

CREATE POLICY "Supervisors can view all lift logs"
  ON public.lift_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'higher_authority'));

-- RLS Policies for delay_records
CREATE POLICY "Operators can manage their own delays"
  ON public.delay_records FOR ALL
  TO authenticated
  USING (auth.uid() = operator_id);

CREATE POLICY "Supervisors can view all delays"
  ON public.delay_records FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'higher_authority'));

-- RLS Policies for vehicles
CREATE POLICY "Everyone can view vehicles"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Supervisors can manage vehicles"
  ON public.vehicles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'higher_authority'));

-- RLS Policies for performance_ratings
CREATE POLICY "Operators can view their own ratings"
  ON public.performance_ratings FOR SELECT
  TO authenticated
  USING (auth.uid() = operator_id);

CREATE POLICY "Supervisors can manage ratings"
  ON public.performance_ratings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'higher_authority'));

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, employee_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'New User'),
    COALESCE(NEW.raw_user_meta_data ->> 'employee_id', 'EMP-' || SUBSTRING(NEW.id::text, 1, 8))
  );
  
  -- Insert role from metadata
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'crane_operator')
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_work_shifts_updated_at
  BEFORE UPDATE ON public.work_shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lift_logs_updated_at
  BEFORE UPDATE ON public.lift_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.lift_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delay_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_shifts;