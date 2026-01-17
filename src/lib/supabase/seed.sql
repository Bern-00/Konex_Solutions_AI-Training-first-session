-- LMS MODULE 1: INTRODUCTION AUX LLMs (OVERHAUL)
INSERT INTO public.modules (title, description, slug, order_index, required_score) VALUES
('Introduction to LLMs', 'Basics of Large Language Models', 'intro-to-llms', 1, 75),
('Prompt Engineering Mastery', 'Advanced AI interaction techniques', 'prompt-engineering', 2, 80),
('Data Annotation & Training', 'Hands-on labeling for AI models', 'data-annotation', 3, 75),
('Model Evaluation', 'Testing and validating AI systems', 'model-evaluation', 4, 80),
('Final Assessment', 'Comprehensive certification exam', 'final-assessment', 5, 85)
ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;

-- Chapters and Questions are now more complex and seeded via a separate script or the SQL editor.
-- This file remains a reference for the core modules.