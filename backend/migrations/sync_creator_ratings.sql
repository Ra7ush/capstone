-- One-time sync script to update all creator aggregate ratings from existing reviews
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT user_id FROM creators LOOP
        -- Calculate new average and count by UNIONing results from both tables
        UPDATE creators
        SET
            average_rating = sub.v_avg,
            total_ratings = sub.v_count,
            updated_at = NOW()
        FROM (
            WITH all_ratings AS (
                SELECT rating FROM creator_ratings WHERE creator_id = r.user_id
                UNION ALL
                SELECT sr.rating
                FROM service_reviews sr
                JOIN services s ON sr.service_id = s.id
                WHERE s.creator_id = r.user_id
            )
            SELECT
                COALESCE(ROUND(AVG(rating)::numeric, 1), 0) as v_avg,
                COALESCE(COUNT(*), 0) as v_count
            FROM all_ratings
        ) sub
        WHERE user_id = r.user_id;
    END LOOP;
END $$;
