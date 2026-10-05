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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      configuracoes: {
        Row: {
          id: number
          regras: Json
          updated_at: string
        }
        Insert: {
          id?: number
          regras?: Json
          updated_at?: string
        }
        Update: {
          id?: number
          regras?: Json
          updated_at?: string
        }
        Relationships: []
      }
      ticket_public_stats: {
        Row: {
          categoria: string
          mes: string
          prioridade: string
          setor: string
          status: string
          total: number
        }
        Insert: {
          categoria: string
          mes: string
          prioridade: string
          setor: string
          status: string
          total: number
        }
        Update: {
          categoria?: string
          mes?: string
          prioridade?: string
          setor?: string
          status?: string
          total?: number
        }
        Relationships: []
      }
      tickets: {
        Row: {
          aberto_em: string
          categoria: string | null
          contato: string | null
          created_at: string
          criado_por: string | null
          descricao: string
          fechado_em: string | null
          hora: string
          horario: string | null
          id: number
          local: string
          prioridade: string
          procedimento: string | null
          responsavel: string | null
          setor: string
          sla_reiniciado_em: string | null
          sla_pausado?: boolean
          sla_pausado_em?: string | null
          sla_pausa_motivo?: string | null
          sla_pausa_autor?: string | null
          sla_historico_pausas?: Json
          sla_segundos_pausados_acumulados?: number
          solicitante: string
          solicitante_email: string | null
          status: string
          updated_at: string
        }
        Insert: {
          aberto_em?: string
          categoria?: string | null
          contato?: string | null
          created_at?: string
          criado_por?: string | null
          descricao: string
          fechado_em?: string | null
          hora?: string
          horario?: string | null
          id?: number
          local?: string
          prioridade?: string
          procedimento?: string | null
          responsavel?: string | null
          setor: string
          sla_reiniciado_em?: string | null
          sla_pausado?: boolean
          sla_pausado_em?: string | null
          sla_pausa_motivo?: string | null
          sla_pausa_autor?: string | null
          sla_historico_pausas?: Json
          sla_segundos_pausados_acumulados?: number
          solicitante: string
          solicitante_email?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          aberto_em?: string
          categoria?: string | null
          contato?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string
          fechado_em?: string | null
          hora?: string
          horario?: string | null
          id?: number
          local?: string
          prioridade?: string
          procedimento?: string | null
          responsavel?: string | null
          setor?: string
          sla_reiniciado_em?: string | null
          sla_pausado?: boolean
          sla_pausado_em?: string | null
          sla_pausa_motivo?: string | null
          sla_pausa_autor?: string | null
          sla_historico_pausas?: Json
          sla_segundos_pausados_acumulados?: number
          solicitante?: string
          solicitante_email?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ticket_mensagens: {
        Row: {
          id: string
          ticket_id: number
          user_id: string | null
          autor_nome: string
          autor_email: string
          autor_tipo: "solicitante" | "equipe" | "sistema"
          mensagem: string
          criado_em: string
        }
        Insert: {
          id?: string
          ticket_id: number
          user_id?: string | null
          autor_nome: string
          autor_email: string
          autor_tipo: "solicitante" | "equipe" | "sistema"
          mensagem: string
          criado_em?: string
        }
        Update: {
          id?: string
          ticket_id?: number
          user_id?: string | null
          autor_nome?: string
          autor_email?: string
          autor_tipo?: "solicitante" | "equipe" | "sistema"
          mensagem?: string
          criado_em?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_ticket_information: {
        Args: { additional_text: string; ticket_id: number }
        Returns: boolean
      }
      admin_get_users: {
        Args: never
        Returns: {
          id: string
          email: string
          nome: string | null
          foto_url: string | null
          role: string
          bloqueado: boolean
          status: string
          provedor: string | null
          total_chamados: number
          ultimo_acesso: string | null
          created_at: string
        }[]
      }
      claim_manager_access: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_named_manager: { Args: never; Returns: boolean }
      open_public_ticket_with_receipt: {
        Args: {
          p_categoria: string
          p_contato: string
          p_descricao: string
          p_email: string
          p_local: string
          p_setor: string
          p_solicitante: string
        }
        Returns: number
      }
      public_ticket_progress: {
        Args: never
        Returns: {
          aberto_em: string
          categoria: string
          fechado_em: string
          id: number
          prioridade: string
          status: string
        }[]
      }
      public_ticket_sla_progress: {
        Args: never
        Returns: {
          aberto_em: string
          categoria: string
          fechado_em: string
          hora: string
          horario: string
          id: number
          prioridade: string
          sla_reiniciado_em: string
          sla_pausado?: boolean
          sla_pausado_em?: string | null
          sla_pausa_motivo?: string | null
          sla_segundos_pausados_acumulados?: number
          status: string
        }[]
      }
      verified_ticket_owner: {
        Args: { ticket_email: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "gestor"
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
      app_role: ["gestor"],
    },
  },
} as const
