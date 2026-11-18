-- Run this once in the NeonDB SQL editor.
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE categories (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE tickets (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id),        -- FK: every ticket has an owner
  category_id INT REFERENCES categories(id),            -- FK: nullable, AI may not match
  title       VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  priority    VARCHAR(10) NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')),
  summary     TEXT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed data
INSERT INTO categories (name) VALUES
  ('Account Access'), ('Billing'), ('Bug'), ('Feature Request'), ('Other');

INSERT INTO users (name) VALUES ('Priya');

INSERT INTO tickets (user_id, category_id, title, description, priority, summary)
VALUES (1, 1, 'Cannot log in',
        'Password reset twice but still invalid credentials.',
        'High', 'User is locked out after two password resets.');
