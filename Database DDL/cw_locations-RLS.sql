CREATE POLICY "update_if_user_owns_table"
ON cw_locations
FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM cw_location_owners
        WHERE cw_location_owners.user_id = auth.uid()
          AND cw_location_owners.location_id = cw_locations.location_id
          AND cw_location_owners.is_active = true -- Assuming you have a similar condition
    )
);
