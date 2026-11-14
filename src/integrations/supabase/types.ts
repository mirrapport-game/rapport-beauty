export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          condition: Json
          description: string | null
          icon: string
          id: string
          title: string
        }
        Insert: {
          condition?: Json
          description?: string | null
          icon?: string
          id: string
          title: string
        }
        Update: {
          condition?: Json
          description?: string | null
          icon?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      assessment_results: {
        Row: {
          answers: Json
          completed_at: string
          id: string
          level: string
          scale_mapping: Json | null
          scores: Json
          test_id: string
          test_scores: Json | null
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string
          id?: string
          level?: string
          scale_mapping?: Json | null
          scores?: Json
          test_id?: string
          test_scores?: Json | null
          user_id?: string
        }
        Update: {
          answers?: Json
          completed_at?: string
          id?: string
          level?: string
          scale_mapping?: Json | null
          scores?: Json
          test_id?: string
          test_scores?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      assessment_tests: {
        Row: {
          author_concept: string | null
          description: string | null
          estimated_minutes: number
          id: string
          is_active: boolean
          question_count: number
          scale_mapping: Json
          scales: Json
          title: string
          version: number
        }
        Insert: {
          author_concept?: string | null
          description?: string | null
          estimated_minutes?: number
          id: string
          is_active?: boolean
          question_count?: number
          scale_mapping?: Json
          scales?: Json
          title: string
          version?: number
        }
        Update: {
          author_concept?: string | null
          description?: string | null
          estimated_minutes?: number
          id?: string
          is_active?: boolean
          question_count?: number
          scale_mapping?: Json
          scales?: Json
          title?: string
          version?: number
        }
        Relationships: []
      }
      batch_imports: {
        Row: {
          batch_id: string
          counts: Json | null
          errors: Json | null
          id: string
          imported_at: string
          imported_by: string | null
          imported_by_name: string | null
          source_file: string | null
          status: string | null
        }
        Insert: {
          batch_id: string
          counts?: Json | null
          errors?: Json | null
          id?: string
          imported_at?: string
          imported_by?: string | null
          imported_by_name?: string | null
          source_file?: string | null
          status?: string | null
        }
        Update: {
          batch_id?: string
          counts?: Json | null
          errors?: Json | null
          id?: string
          imported_at?: string
          imported_by?: string | null
          imported_by_name?: string | null
          source_file?: string | null
          status?: string | null
        }
        Relationships: []
      }
      card_assignments: {
        Row: {
          assigned_at: string
          card_id: string
          card_type: string
          id: string
          participant_id: string
          play_mode: string | null
          revealed: boolean
          revealed_at: string | null
          revealed_by: string | null
          round_stage: string | null
          session_id: string
          turn_no: number
        }
        Insert: {
          assigned_at?: string
          card_id: string
          card_type: string
          id?: string
          participant_id: string
          play_mode?: string | null
          revealed?: boolean
          revealed_at?: string | null
          revealed_by?: string | null
          round_stage?: string | null
          session_id: string
          turn_no?: number
        }
        Update: {
          assigned_at?: string
          card_id?: string
          card_type?: string
          id?: string
          participant_id?: string
          play_mode?: string | null
          revealed?: boolean
          revealed_at?: string | null
          revealed_by?: string | null
          round_stage?: string | null
          session_id?: string
          turn_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "card_assignments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_assignments_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "session_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_assignments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          batch_id: string | null
          card_no: string | null
          categories: Json | null
          category_id: string | null
          claim_type: string | null
          created_at: string
          criteria: Json | null
          description: string | null
          dialogue: Json | null
          direction_id: string | null
          example_dialogue: string | null
          formula: string | null
          how_to_apply: Json | null
          id: string
          is_active: boolean
          level: number | null
          linked_skill_id: string | null
          opening_line: string | null
          paired_with: string | null
          scenario_id: string | null
          steps: Json | null
          tags: Json | null
          task: string | null
          title: string
          type: string
          updated_at: string
          why_learn: string | null
        }
        Insert: {
          batch_id?: string | null
          card_no?: string | null
          categories?: Json | null
          category_id?: string | null
          claim_type?: string | null
          created_at?: string
          criteria?: Json | null
          description?: string | null
          dialogue?: Json | null
          direction_id?: string | null
          example_dialogue?: string | null
          formula?: string | null
          how_to_apply?: Json | null
          id: string
          is_active?: boolean
          level?: number | null
          linked_skill_id?: string | null
          opening_line?: string | null
          paired_with?: string | null
          scenario_id?: string | null
          steps?: Json | null
          tags?: Json | null
          task?: string | null
          title: string
          type: string
          updated_at?: string
          why_learn?: string | null
        }
        Update: {
          batch_id?: string | null
          card_no?: string | null
          categories?: Json | null
          category_id?: string | null
          claim_type?: string | null
          created_at?: string
          criteria?: Json | null
          description?: string | null
          dialogue?: Json | null
          direction_id?: string | null
          example_dialogue?: string | null
          formula?: string | null
          how_to_apply?: Json | null
          id?: string
          is_active?: boolean
          level?: number | null
          linked_skill_id?: string | null
          opening_line?: string | null
          paired_with?: string | null
          scenario_id?: string | null
          steps?: Json | null
          tags?: Json | null
          task?: string | null
          title?: string
          type?: string
          updated_at?: string
          why_learn?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_direction_id_fkey"
            columns: ["direction_id"]
            isOneToOne: false
            referencedRelation: "directions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_linked_skill_id_fkey"
            columns: ["linked_skill_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      career_ladder_progress: {
        Row: {
          completed_steps: Json
          current_step: number
          ladder_id: string
          role_mode: string
          scores_by_step: Json
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_steps?: Json
          current_step?: number
          ladder_id?: string
          role_mode?: string
          scores_by_step?: Json
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          completed_steps?: Json
          current_step?: number
          ladder_id?: string
          role_mode?: string
          scores_by_step?: Json
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          deck: string
          description: string | null
          id: string
          is_active: boolean
          rubric_no: number | null
          sort_order: number
          title: string
        }
        Insert: {
          deck?: string
          description?: string | null
          id: string
          is_active?: boolean
          rubric_no?: number | null
          sort_order?: number
          title: string
        }
        Update: {
          deck?: string
          description?: string | null
          id?: string
          is_active?: boolean
          rubric_no?: number | null
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      clinic_members: {
        Row: {
          clinic_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_members_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          join_code: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          join_code?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          join_code?: string
          name?: string
        }
        Relationships: []
      }
      daily_answers: {
        Row: {
          answer_text: string | null
          card_id: string
          created_at: string
          feedback_json: Json | null
          id: string
          slot: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          answer_text?: string | null
          card_id: string
          created_at?: string
          feedback_json?: Json | null
          id?: string
          slot: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          answer_text?: string | null
          card_id?: string
          created_at?: string
          feedback_json?: Json | null
          id?: string
          slot?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_answers_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "daily_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_answers_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "daily_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_cards: {
        Row: {
          answer_audio_url: string | null
          answer_text: string | null
          feedback_json: Json | null
          id: string
          issued_at: string
          issued_date: string
          model_answer_shown: boolean
          role_id: string | null
          status: string
          streak_day: number
          task_id: string | null
          user_id: string
        }
        Insert: {
          answer_audio_url?: string | null
          answer_text?: string | null
          feedback_json?: Json | null
          id?: string
          issued_at?: string
          issued_date: string
          model_answer_shown?: boolean
          role_id?: string | null
          status?: string
          streak_day?: number
          task_id?: string | null
          user_id: string
        }
        Update: {
          answer_audio_url?: string | null
          answer_text?: string | null
          feedback_json?: Json | null
          id?: string
          issued_at?: string
          issued_date?: string
          model_answer_shown?: boolean
          role_id?: string | null
          status?: string
          streak_day?: number
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_cards_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "daily_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_cards_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "daily_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_role_context: {
        Row: {
          id: string
          key_phrase: string | null
          role_id: string
          what_is_happening: string | null
          what_to_remember: string | null
          what_you_fear: string | null
          what_you_feel: string | null
          what_you_want: string | null
          where_you_are: string | null
          who_you_are: string | null
        }
        Insert: {
          id?: string
          key_phrase?: string | null
          role_id: string
          what_is_happening?: string | null
          what_to_remember?: string | null
          what_you_fear?: string | null
          what_you_feel?: string | null
          what_you_want?: string | null
          where_you_are?: string | null
          who_you_are?: string | null
        }
        Update: {
          id?: string
          key_phrase?: string | null
          role_id?: string
          what_is_happening?: string | null
          what_to_remember?: string | null
          what_you_fear?: string | null
          what_you_feel?: string | null
          what_you_want?: string | null
          where_you_are?: string | null
          who_you_are?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_role_context_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "daily_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_roles: {
        Row: {
          category_id: string | null
          description: string | null
          id: string
          is_active: boolean
          tags: Json | null
          title: string
        }
        Insert: {
          category_id?: string | null
          description?: string | null
          id: string
          is_active?: boolean
          tags?: Json | null
          title: string
        }
        Update: {
          category_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          tags?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_roles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_tasks: {
        Row: {
          criteria: Json | null
          id: string
          level: number | null
          model_answer: string | null
          question: string
          role_id: string
          type: string
        }
        Insert: {
          criteria?: Json | null
          id: string
          level?: number | null
          model_answer?: string | null
          question: string
          role_id: string
          type: string
        }
        Update: {
          criteria?: Json | null
          id?: string
          level?: number | null
          model_answer?: string | null
          question?: string
          role_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_tasks_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "daily_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      directions: {
        Row: {
          category_id: string | null
          id: string
          is_active: boolean
          title: string
        }
        Insert: {
          category_id?: string | null
          id: string
          is_active?: boolean
          title: string
        }
        Update: {
          category_id?: string | null
          id?: string
          is_active?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "directions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          from_name: string
          from_role: string
          from_user: string
          good: string | null
          id: string
          improve: string | null
          overall_rating: number | null
          score_contact: number | null
          score_empathy: number | null
          score_solution: number | null
          scores: Json
          session_id: string
          to_participant: string
          turn_no: number
        }
        Insert: {
          created_at?: string
          from_name?: string
          from_role?: string
          from_user?: string
          good?: string | null
          id?: string
          improve?: string | null
          overall_rating?: number | null
          score_contact?: number | null
          score_empathy?: number | null
          score_solution?: number | null
          scores?: Json
          session_id: string
          to_participant: string
          turn_no: number
        }
        Update: {
          created_at?: string
          from_name?: string
          from_role?: string
          from_user?: string
          good?: string | null
          id?: string
          improve?: string | null
          overall_rating?: number | null
          score_contact?: number | null
          score_empathy?: number | null
          score_solution?: number | null
          scores?: Json
          session_id?: string
          to_participant?: string
          turn_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          category_ids: Json
          code: string
          created_at: string
          current_card_id: string | null
          current_participant: string | null
          current_skill_id: string | null
          feedback_anonymous: boolean
          finished_at: string | null
          id: string
          leader_id: string
          max_participants: number
          mode: string
          rubric_no: number | null
          stage: number
          stage_durations: Json
          started_at: string | null
          status: string
          timer_duration: number
          timer_remaining: number | null
          timer_started_at: string | null
          title: string
          turn_no: number
          turn_role: string | null
        }
        Insert: {
          category_ids?: Json
          code: string
          created_at?: string
          current_card_id?: string | null
          current_participant?: string | null
          current_skill_id?: string | null
          feedback_anonymous?: boolean
          finished_at?: string | null
          id?: string
          leader_id: string
          max_participants?: number
          mode?: string
          rubric_no?: number | null
          stage?: number
          stage_durations?: Json
          started_at?: string | null
          status?: string
          timer_duration?: number
          timer_remaining?: number | null
          timer_started_at?: string | null
          title: string
          turn_no?: number
          turn_role?: string | null
        }
        Update: {
          category_ids?: Json
          code?: string
          created_at?: string
          current_card_id?: string | null
          current_participant?: string | null
          current_skill_id?: string | null
          feedback_anonymous?: boolean
          finished_at?: string | null
          id?: string
          leader_id?: string
          max_participants?: number
          mode?: string
          rubric_no?: number | null
          stage?: number
          stage_durations?: Json
          started_at?: string | null
          status?: string
          timer_duration?: number
          timer_remaining?: number | null
          timer_started_at?: string | null
          title?: string
          turn_no?: number
          turn_role?: string | null
        }
        Relationships: []
      }
      guest_invites: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_open: boolean
          participant_id: string | null
          session_id: string
          token: string
          used_by: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          is_open?: boolean
          participant_id?: string | null
          session_id: string
          token?: string
          used_by?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_open?: boolean
          participant_id?: string | null
          session_id?: string
          token?: string
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_invites_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      leader_notes: {
        Row: {
          created_at: string
          id: string
          note: string
          participant_id: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note: string
          participant_id?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          participant_id?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leader_notes_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "session_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leader_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          clinic: string | null
          created_at: string
          display_name: string
          id: string
          onboarded_at: string | null
          play_roles: string[]
          play_scope: string
          prof_role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          clinic?: string | null
          created_at?: string
          display_name?: string
          id: string
          onboarded_at?: string | null
          play_roles?: string[]
          play_scope?: string
          prof_role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          clinic?: string | null
          created_at?: string
          display_name?: string
          id?: string
          onboarded_at?: string | null
          play_roles?: string[]
          play_scope?: string
          prof_role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scenarios: {
        Row: {
          batch_id: string | null
          category_id: string | null
          claim_type: string | null
          direction_id: string | null
          id: string
          is_active: boolean
          level: number | null
          situation_id: string | null
          skill_ids: Json | null
          solution_id: string | null
          title: string | null
        }
        Insert: {
          batch_id?: string | null
          category_id?: string | null
          claim_type?: string | null
          direction_id?: string | null
          id: string
          is_active?: boolean
          level?: number | null
          situation_id?: string | null
          skill_ids?: Json | null
          solution_id?: string | null
          title?: string | null
        }
        Update: {
          batch_id?: string | null
          category_id?: string | null
          claim_type?: string | null
          direction_id?: string | null
          id?: string
          is_active?: boolean
          level?: number | null
          situation_id?: string | null
          skill_ids?: Json | null
          solution_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenarios_direction_id_fkey"
            columns: ["direction_id"]
            isOneToOne: false
            referencedRelation: "directions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenarios_situation_id_fkey"
            columns: ["situation_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenarios_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      session_participants: {
        Row: {
          display_name: string
          id: string
          joined_at: string
          pair_category_id: string | null
          pair_side: string
          session_id: string
          status: string
          user_id: string
        }
        Insert: {
          display_name: string
          id?: string
          joined_at?: string
          pair_category_id?: string | null
          pair_side?: string
          session_id: string
          status?: string
          user_id: string
        }
        Update: {
          display_name?: string
          id?: string
          joined_at?: string
          pair_category_id?: string | null
          pair_side?: string
          session_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_pair_category_id_fkey"
            columns: ["pair_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_results: {
        Row: {
          card_ids: Json
          completed: boolean
          completed_at: string | null
          feedback_count: number
          id: string
          overall_avg: number | null
          participant_id: string
          scores_avg: Json
          session_id: string
          user_id: string
        }
        Insert: {
          card_ids?: Json
          completed?: boolean
          completed_at?: string | null
          feedback_count?: number
          id?: string
          overall_avg?: number | null
          participant_id: string
          scores_avg?: Json
          session_id: string
          user_id: string
        }
        Update: {
          card_ids?: Json
          completed?: boolean
          completed_at?: string | null
          feedback_count?: number
          id?: string
          overall_avg?: number | null
          participant_id?: string
          scores_avg?: Json
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_results_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "session_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_progress: {
        Row: {
          avg_score: number
          category_id: string | null
          id: string
          last_used_at: string | null
          sessions_count: number
          skill_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_score?: number
          category_id?: string | null
          id?: string
          last_used_at?: string | null
          sessions_count?: number
          skill_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_score?: number
          category_id?: string | null
          id?: string
          last_used_at?: string | null
          sessions_count?: number
          skill_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_progress_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_progress_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      solo_feedback: {
        Row: {
          ai_generated: boolean
          comments_what_to_improve: string | null
          comments_what_worked: string | null
          created_at: string
          id: string
          scores: Json | null
          solo_session_id: string
        }
        Insert: {
          ai_generated?: boolean
          comments_what_to_improve?: string | null
          comments_what_worked?: string | null
          created_at?: string
          id?: string
          scores?: Json | null
          solo_session_id: string
        }
        Update: {
          ai_generated?: boolean
          comments_what_to_improve?: string | null
          comments_what_worked?: string | null
          created_at?: string
          id?: string
          scores?: Json | null
          solo_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solo_feedback_solo_session_id_fkey"
            columns: ["solo_session_id"]
            isOneToOne: false
            referencedRelation: "solo_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      solo_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender: string
          solo_session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender: string
          solo_session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender?: string
          solo_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solo_messages_solo_session_id_fkey"
            columns: ["solo_session_id"]
            isOneToOne: false
            referencedRelation: "solo_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      solo_sessions: {
        Row: {
          finished_at: string | null
          id: string
          role_id: string | null
          scenario_id: string | null
          situation_id: string | null
          skill_id: string | null
          solution_id: string | null
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          finished_at?: string | null
          id?: string
          role_id?: string | null
          scenario_id?: string | null
          situation_id?: string | null
          skill_id?: string | null
          solution_id?: string | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Update: {
          finished_at?: string | null
          id?: string
          role_id?: string | null
          scenario_id?: string | null
          situation_id?: string | null
          skill_id?: string | null
          solution_id?: string | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solo_sessions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solo_sessions_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solo_sessions_situation_id_fkey"
            columns: ["situation_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solo_sessions_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solo_sessions_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      turn_log: {
        Row: {
          action: string
          actor: string
          at: string
          card_id: string | null
          id: string
          participant_id: string | null
          session_id: string
        }
        Insert: {
          action: string
          actor?: string
          at?: string
          card_id?: string | null
          id?: string
          participant_id?: string | null
          session_id: string
        }
        Update: {
          action?: string
          actor?: string
          at?: string
          card_id?: string | null
          id?: string
          participant_id?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turn_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_daily_preferences: {
        Row: {
          enabled: boolean
          mode: string | null
          my_role_id: string | null
          preferred_time: string
          role_ids: Json | null
          timezone: string
          user_id: string
        }
        Insert: {
          enabled?: boolean
          mode?: string | null
          my_role_id?: string | null
          preferred_time?: string
          role_ids?: Json | null
          timezone?: string
          user_id: string
        }
        Update: {
          enabled?: boolean
          mode?: string | null
          my_role_id?: string | null
          preferred_time?: string
          role_ids?: Json | null
          timezone?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_scenario_solutions: {
        Row: {
          author_id: string
          scenario_id: string
          solution: string
          task: string
        }
        Insert: {
          author_id?: string
          scenario_id: string
          solution: string
          task: string
        }
        Update: {
          author_id?: string
          scenario_id?: string
          solution?: string
          task?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_scenario_solutions_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: true
            referencedRelation: "user_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_scenarios: {
        Row: {
          author_id: string
          author_name: string
          clinic_id: string | null
          created_at: string
          dialogue: Json
          id: string
          rubric: string
          rubric_no: number
          situation: string
          title: string
        }
        Insert: {
          author_id?: string
          author_name?: string
          clinic_id?: string | null
          created_at?: string
          dialogue?: Json
          id?: string
          rubric: string
          rubric_no: number
          situation: string
          title: string
        }
        Update: {
          author_id?: string
          author_name?: string
          clinic_id?: string | null
          created_at?: string
          dialogue?: Json
          id?: string
          rubric?: string
          rubric_no?: number
          situation?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_scenarios_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_clinic: { Args: { _cid: string }; Returns: undefined }
      admin_join_as_player: { Args: { _sid: string }; Returns: undefined }
      admin_list_clinics: {
        Args: never
        Returns: {
          id: string
          join_code: string
          managers: string
          members: number
          name: string
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          clinic: string
          created_at: string
          display_name: string
          email: string
          id: string
          roles: string[]
        }[]
      }
      admin_restart_my_progress: { Args: never; Returns: undefined }
      admin_set_clinic_manager: {
        Args: { _cid: string; _email: string }
        Returns: undefined
      }
      award_achievements: { Args: { _uid: string }; Returns: undefined }
      choose_daily_role: { Args: { _role: string }; Returns: string }
      choose_my_pair: {
        Args: { _cat: string; _sid: string; _side?: string }
        Returns: undefined
      }
      claim_guest_invite: { Args: { _token: string }; Returns: string }
      clinic_manage_member: {
        Args: { _action: string; _uid: string }
        Returns: undefined
      }
      clinic_new_code: { Args: never; Returns: string }
      clinic_stats: {
        Args: { _cid: string }
        Returns: {
          avg_score: number
          daily_done: number
          display_name: string
          email: string
          games: number
          is_leader: boolean
          member_role: string
          scenarios: number
          solo_count: number
          user_id: string
        }[]
      }
      clinic_streak: { Args: never; Returns: Json }
      create_clinic: { Args: { _name: string }; Returns: string }
      create_game_session: {
        Args: { _rubric: number; _title: string }
        Returns: string
      }
      get_turn_skill: { Args: { _sid: string }; Returns: string }
      get_user_solution: {
        Args: { _card: string }
        Returns: {
          solution: string
          task: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_clinic_manager: { Args: { _cid: string }; Returns: boolean }
      is_session_leader: { Args: { _sid: string }; Returns: boolean }
      is_session_member: { Args: { _sid: string }; Returns: boolean }
      issue_all_daily_cards: { Args: never; Returns: number }
      issue_daily_card_for: { Args: { _uid: string }; Returns: string }
      issue_my_daily_card: { Args: never; Returns: string }
      join_clinic: { Args: { _code: string }; Returns: string }
      join_game_session: { Args: { _code: string }; Returns: string }
      leave_clinic: { Args: never; Returns: undefined }
      my_clinic_id: { Args: never; Returns: string }
      my_feedback: {
        Args: { _sid: string }
        Returns: {
          created_at: string
          from_name: string
          from_role: string
          good: string
          id: string
          improve: string
          overall_rating: number
          scores: Json
          turn_no: number
        }[]
      }
      session_cards: {
        Args: { _sid: string; _turn: number }
        Returns: {
          assignment_id: string
          card: Json
          card_type: string
          participant_id: string
          revealed: boolean
        }[]
      }
      set_turn_skill: {
        Args: { _sid: string; _skill: string }
        Returns: undefined
      }
      solution_access: { Args: { _sid: string }; Returns: string }
    }
    Enums: {
      app_role: "player" | "leader" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["player", "leader", "admin"],
    },
  },
} as const
