-- Atomic function to join a community (insert member + increment count in a transaction)
CREATE OR REPLACE FUNCTION join_community_atomic(p_community_id UUID, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Insert the member (will fail if already exists due to unique constraint)
  INSERT INTO public.community_members (community_id, user_id, role)
  VALUES (p_community_id, p_user_id, 'member');

  -- Increment the members count
  UPDATE public.communities
  SET members_count = members_count + 1
  WHERE id = p_community_id;

  v_result := json_build_object('success', true, 'message', 'Joined community');
  RETURN v_result;
EXCEPTION
  WHEN unique_violation THEN
    v_result := json_build_object('success', false, 'error', 'already_member', 'message', 'You are already a member of this community');
    RETURN v_result;
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Atomic function to leave a community (delete member + decrement count in a transaction)
CREATE OR REPLACE FUNCTION leave_community_atomic(p_community_id UUID, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_deleted_count INTEGER;
  v_result JSON;
BEGIN
  -- Delete the member
  DELETE FROM public.community_members
  WHERE community_id = p_community_id AND user_id = p_user_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count = 0 THEN
    v_result := json_build_object('success', false, 'error', 'not_member', 'message', 'You are not a member of this community');
    RETURN v_result;
  END IF;

  -- Decrement the members count
  UPDATE public.communities
  SET members_count = GREATEST(0, members_count - 1)
  WHERE id = p_community_id;

  v_result := json_build_object('success', true, 'message', 'Left community');
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
