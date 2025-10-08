/*
  # Create update_updated_at_column trigger function

  Creates a reusable trigger function for automatically updating
  the updated_at timestamp column on row updates.
*/

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
