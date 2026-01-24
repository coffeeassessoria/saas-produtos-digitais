-- Table for tracking user access logs (login/logout)
CREATE TABLE public.user_access_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    email text NOT NULL,
    event_type text NOT NULL CHECK (event_type IN ('login', 'logout')),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    user_agent text,
    ip_address text
);

-- Enable RLS
ALTER TABLE public.user_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all access logs"
ON public.user_access_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own access logs"
ON public.user_access_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_user_access_logs_user_id ON public.user_access_logs(user_id);
CREATE INDEX idx_user_access_logs_created_at ON public.user_access_logs(created_at DESC);

-- Table for recipe suggestions/requests
CREATE TABLE public.recipe_suggestions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    user_email text NOT NULL,
    title text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'completed')),
    vote_count integer NOT NULL DEFAULT 0,
    admin_notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recipe_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all suggestions"
ON public.recipe_suggestions
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view all suggestions"
ON public.recipe_suggestions
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create suggestions"
ON public.recipe_suggestions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_recipe_suggestions_status ON public.recipe_suggestions(status);
CREATE INDEX idx_recipe_suggestions_vote_count ON public.recipe_suggestions(vote_count DESC);

-- Table for tracking votes on suggestions (prevent duplicate votes)
CREATE TABLE public.recipe_suggestion_votes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    suggestion_id uuid NOT NULL REFERENCES public.recipe_suggestions(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(suggestion_id, user_id)
);

-- Enable RLS
ALTER TABLE public.recipe_suggestion_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all votes"
ON public.recipe_suggestion_votes
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own votes"
ON public.recipe_suggestion_votes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add votes"
ON public.recipe_suggestion_votes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own votes"
ON public.recipe_suggestion_votes
FOR DELETE
USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_recipe_suggestion_votes_suggestion ON public.recipe_suggestion_votes(suggestion_id);
CREATE INDEX idx_recipe_suggestion_votes_user ON public.recipe_suggestion_votes(user_id);

-- Trigger to update vote_count automatically
CREATE OR REPLACE FUNCTION public.update_suggestion_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE recipe_suggestions SET vote_count = vote_count + 1, updated_at = now() WHERE id = NEW.suggestion_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE recipe_suggestions SET vote_count = vote_count - 1, updated_at = now() WHERE id = OLD.suggestion_id;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_update_vote_count
AFTER INSERT OR DELETE ON public.recipe_suggestion_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_suggestion_vote_count();

-- Trigger to update updated_at on recipe_suggestions
CREATE TRIGGER update_recipe_suggestions_updated_at
BEFORE UPDATE ON public.recipe_suggestions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Table for platform feedback
CREATE TABLE public.platform_feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    user_email text NOT NULL,
    rating integer CHECK (rating >= 1 AND rating <= 5),
    message text NOT NULL,
    category text NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'bug', 'feature', 'content')),
    is_read boolean NOT NULL DEFAULT false,
    admin_response text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all feedback"
ON public.platform_feedback
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create feedback"
ON public.platform_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback"
ON public.platform_feedback
FOR SELECT
USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_platform_feedback_created_at ON public.platform_feedback(created_at DESC);
CREATE INDEX idx_platform_feedback_is_read ON public.platform_feedback(is_read);