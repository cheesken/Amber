-- 202602280002_alter_users_gender_enum.sql
-- create the new enum type
DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_enum') THEN
       CREATE TYPE gender_enum AS ENUM('male', 'female', 'non-binary', 'prefer not to say', 'other');
   END IF;
END$$;

-- alter the column type
ALTER TABLE users
ALTER COLUMN gender TYPE gender_enum USING gender::gender_enum;