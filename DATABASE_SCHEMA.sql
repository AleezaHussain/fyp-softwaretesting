-- Users Table
CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_user_id TEXT UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(500) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  simulations_ran INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Simulations Table (stores simulation metadata)
CREATE TABLE simulations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  simulation_type VARCHAR(100) NOT NULL, -- 'evaporative', 'chilled_water', 'air_economizer', etc.
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Simulation Results Table (stores results and metrics)
CREATE TABLE simulation_results (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  simulation_id BIGINT NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  runtime_minutes DECIMAL(10, 2),
  energy_consumed_kwh DECIMAL(12, 4),
  cooling_efficiency DECIMAL(5, 2),
  temperature_stability DECIMAL(5, 2),
  cost_saving_percent DECIMAL(5, 2),
  recommendation TEXT,
  result_data JSONB, -- Store detailed results as JSON
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Simulation Parameters Table (stores configuration for each simulation)
CREATE TABLE simulation_parameters (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  simulation_id BIGINT NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  parameter_key VARCHAR(255) NOT NULL,
  parameter_value VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Keep users.simulations_ran synchronized
CREATE OR REPLACE FUNCTION update_user_simulation_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET simulations_ran = simulations_ran + 1 WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET simulations_ran = GREATEST(simulations_ran - 1, 0) WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_user_simulation_count
AFTER INSERT OR DELETE ON simulations
FOR EACH ROW EXECUTE FUNCTION update_user_simulation_count();

-- Create indexes for better query performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_simulations_user_id ON simulations(user_id);
CREATE INDEX idx_simulations_created_at ON simulations(created_at);
CREATE INDEX idx_simulation_results_user_id ON simulation_results(user_id);
CREATE INDEX idx_simulation_results_simulation_id ON simulation_results(simulation_id);
CREATE INDEX idx_simulation_parameters_simulation_id ON simulation_parameters(simulation_id);

-- Enable Row Level Security (RLS) for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_parameters ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admin can access all rows (role='admin'), user can access only own rows
CREATE POLICY "users_select_policy" ON users
  FOR SELECT USING (
    auth.uid()::text = auth_user_id
    OR EXISTS (SELECT 1 FROM users u WHERE u.auth_user_id = auth.uid()::text AND u.role = 'admin')
  );

CREATE POLICY "users_insert_policy" ON users
  FOR INSERT WITH CHECK (
    auth.uid()::text = auth_user_id
    OR EXISTS (SELECT 1 FROM users u WHERE u.auth_user_id = auth.uid()::text AND u.role = 'admin')
  );

CREATE POLICY "users_update_policy" ON users
  FOR UPDATE USING (
    auth.uid()::text = auth_user_id
    OR EXISTS (SELECT 1 FROM users u WHERE u.auth_user_id = auth.uid()::text AND u.role = 'admin')
  );

CREATE POLICY "simulations_select_policy" ON simulations
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM users u WHERE u.auth_user_id = auth.uid()::text AND u.role = 'admin')
  );

CREATE POLICY "simulations_insert_policy" ON simulations
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM users u WHERE u.auth_user_id = auth.uid()::text AND u.role = 'admin')
  );

CREATE POLICY "simulations_update_policy" ON simulations
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM users u WHERE u.auth_user_id = auth.uid()::text AND u.role = 'admin')
  );

CREATE POLICY "simulations_delete_policy" ON simulations
  FOR DELETE USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM users u WHERE u.auth_user_id = auth.uid()::text AND u.role = 'admin')
  );

CREATE POLICY "simulation_results_select_policy" ON simulation_results
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM users u WHERE u.auth_user_id = auth.uid()::text AND u.role = 'admin')
  );

CREATE POLICY "simulation_results_insert_policy" ON simulation_results
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM users u WHERE u.auth_user_id = auth.uid()::text AND u.role = 'admin')
  );

CREATE POLICY "simulation_results_update_policy" ON simulation_results
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM users u WHERE u.auth_user_id = auth.uid()::text AND u.role = 'admin')
  );

CREATE POLICY "simulation_results_delete_policy" ON simulation_results
  FOR DELETE USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM users u WHERE u.auth_user_id = auth.uid()::text AND u.role = 'admin')
  );

CREATE POLICY "simulation_parameters_select_policy" ON simulation_parameters
  FOR SELECT USING (
    simulation_id IN (
      SELECT s.id
      FROM simulations s
      JOIN users u ON u.id = s.user_id
      WHERE u.auth_user_id = auth.uid()::text
    )
    OR EXISTS (SELECT 1 FROM users u WHERE u.auth_user_id = auth.uid()::text AND u.role = 'admin')
  );

CREATE POLICY "simulation_parameters_insert_policy" ON simulation_parameters
  FOR INSERT WITH CHECK (
    simulation_id IN (
      SELECT s.id
      FROM simulations s
      JOIN users u ON u.id = s.user_id
      WHERE u.auth_user_id = auth.uid()::text
    )
    OR EXISTS (SELECT 1 FROM users u WHERE u.auth_user_id = auth.uid()::text AND u.role = 'admin')
  );
