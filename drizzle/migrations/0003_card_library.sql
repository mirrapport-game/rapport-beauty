CREATE TABLE public.categories (id text PRIMARY KEY, title text NOT NULL, description text, sort_order int NOT NULL DEFAULT 0, rubric_no int, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.directions (id text PRIMARY KEY, title text NOT NULL, category_id text REFERENCES public.categories(id), is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.cards (
  id text PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('role','situation','skill','solution')),
  category_id text REFERENCES public.categories(id),
  direction_id text REFERENCES public.directions(id),
  scenario_id text, title text NOT NULL, description text,
  opening_line text, task text,
  claim_type text CHECK (claim_type IN ('justified','unjustified')),
  level int CHECK (level BETWEEN 1 AND 3),
  formula text, how_to_apply jsonb, why_learn text,
  linked_skill_id text REFERENCES public.cards(id),
  steps jsonb, criteria jsonb, example_dialogue text,
  tags jsonb, categories jsonb, dialogue jsonb, card_no text,
  paired_with text, batch_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.scenarios (id text PRIMARY KEY, category_id text REFERENCES public.categories(id), direction_id text REFERENCES public.directions(id), claim_type text, title text, level int, situation_id text REFERENCES public.cards(id), skill_ids jsonb, solution_id text REFERENCES public.cards(id), batch_id text, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.batch_imports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), batch_id text NOT NULL, imported_by uuid DEFAULT auth.uid(), imported_by_name text, imported_at timestamptz NOT NULL DEFAULT now(), source_file text, counts jsonb, status text, errors jsonb);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories, public.directions, public.cards, public.scenarios, public.batch_imports TO authenticated;
GRANT ALL ON public.categories, public.directions, public.cards, public.scenarios, public.batch_imports TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories read" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories admin" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "directions read" ON public.directions FOR SELECT TO authenticated USING (true);
CREATE POLICY "directions admin" ON public.directions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "cards read" ON public.cards FOR SELECT TO authenticated USING (type <> 'solution' OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'leader'));
CREATE POLICY "cards admin" ON public.cards FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "scenarios read" ON public.scenarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "scenarios admin" ON public.scenarios FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "imports admin" ON public.batch_imports FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER cards_touch BEFORE UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();