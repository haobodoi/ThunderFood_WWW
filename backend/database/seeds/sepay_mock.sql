USE thunderfood;

-- Keep the demo restaurant available when developers test outside business hours.
UPDATE restaurant_opening_hours
SET open_time = '00:00:00', close_time = '23:59:59'
WHERE restaurant_id = 1;
