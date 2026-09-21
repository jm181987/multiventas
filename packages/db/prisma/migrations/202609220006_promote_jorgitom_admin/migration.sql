UPDATE "users"
SET
  "roles" = CASE
    WHEN 'ADMIN'::"UserRole" = ANY("roles") THEN "roles"
    ELSE array_append("roles", 'ADMIN'::"UserRole")
  END,
  "status" = 'ACTIVE',
  "updated_at" = CURRENT_TIMESTAMP
WHERE lower("email") = lower('jorgitom18@gmail.com')
  AND "deleted_at" IS NULL;
