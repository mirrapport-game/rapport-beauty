CREATE TABLE public.assessment_tests (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  author_concept text,
  scales jsonb NOT NULL DEFAULT '[]'::jsonb,
  scale_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  question_count int NOT NULL DEFAULT 0,
  estimated_minutes int NOT NULL DEFAULT 5,
  version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.assessment_tests TO authenticated;
GRANT ALL ON public.assessment_tests TO service_role;
ALTER TABLE public.assessment_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tests read" ON public.assessment_tests FOR SELECT TO authenticated USING (true);

INSERT INTO public.assessment_tests (id, title, description, author_concept, scales, scale_mapping, question_count, estimated_minutes) VALUES
('hall_v1','Тест Н. Холла (адаптированный)','Оценивает способность понимать свои и чужие эмоции, управлять ими, уровень эмпатии и самомотивации.','На основе концепции Н. Холла',
 '[{"id":"empathy","title":"Эмпатия"},{"id":"emotion_management","title":"Управление эмоциями"},{"id":"self_motivation","title":"Самомотивация"},{"id":"social_skills","title":"Социальные навыки"},{"id":"stress","title":"Стрессоустойчивость"},{"id":"self_awareness","title":"Понимание себя"}]',
 '{"empathy":["empathy"],"listening":["empathy","self_awareness"],"argumentation":["social_skills","self_motivation"],"stress":["stress","emotion_management"],"teamwork":["social_skills"],"upselling":["self_motivation","social_skills"]}',15,7),
('emin_v1','Тест ЭмИн (адаптированный)','Измеряет способность распознавать, понимать и регулировать свои эмоции и эмоции других людей.','На основе концепции Д. В. Люсина (ЭмИн)',
 '[{"id":"empathy","title":"Эмпатия"},{"id":"emotion_management","title":"Управление эмоциями"},{"id":"self_motivation","title":"Самомотивация"},{"id":"social_skills","title":"Социальные навыки"},{"id":"stress","title":"Стрессоустойчивость"},{"id":"self_awareness","title":"Понимание себя"}]',
 '{"empathy":["empathy"],"listening":["empathy","self_awareness"],"argumentation":["social_skills","self_motivation"],"stress":["stress","emotion_management"],"teamwork":["social_skills"],"upselling":["self_motivation","social_skills"]}',15,6),
('goleman_v1','Тест Д. Гоулмана (адаптированный)','Оценивает самосознание, саморегуляцию, мотивацию, эмпатию и социальные навыки.','На основе концепции Дэниела Гоулмана',
 '[{"id":"empathy","title":"Эмпатия"},{"id":"emotion_management","title":"Саморегуляция"},{"id":"self_motivation","title":"Мотивация"},{"id":"social_skills","title":"Социальные навыки"},{"id":"stress","title":"Стрессоустойчивость"},{"id":"self_awareness","title":"Самосознание"}]',
 '{"empathy":["empathy"],"listening":["empathy","self_awareness"],"argumentation":["social_skills","self_motivation"],"stress":["stress","emotion_management"],"teamwork":["social_skills"],"upselling":["self_motivation","social_skills"]}',15,7);

ALTER TABLE public.assessment_results ADD COLUMN scale_mapping jsonb;
ALTER TABLE public.assessment_results ADD COLUMN test_scores jsonb;